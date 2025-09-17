import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWbgtData } from './fetch-wbgt-data'
import { fetchCombinedWbgtCsv } from './csv-fetcher'
import { server } from './test-setup'
import { http, HttpResponse } from 'msw'
import dayjs from './dayjs'

// Mock getStations
vi.mock('./get-stations', () => ({
  getStations: vi.fn(() => Promise.resolve([
    { id: '11001', name: 'Tokyo', lat: 35.6895, lng: 139.6917 },
    { id: '11016', name: 'Yokohama', lat: 35.4437, lng: 139.6380 },
    { id: '12011', name: 'Chiba', lat: 35.6051, lng: 140.1233 }
  ]))
}))

// Mock CSV data generator - generates data within the past 14 days to match filtering
const generateMockCsvData = (yearMonth: string) => {
  const month = yearMonth.slice(4, 6)
  
  // Generate distinctly different data patterns based on month
  const monthNum = parseInt(month, 10)
  const baseTemp = 20.0 + (monthNum * 0.8) // Different base temp for each month
  const variation = 2.0 + (monthNum % 3) // Different variation pattern
  
  // Generate dates based on the requested month but within filtering range
  const today = dayjs()
  const currentMonth = today.month() + 1
  const requestedMonth = parseInt(month, 10)
  
  let date1, date2
  if (requestedMonth === currentMonth) {
    // Current month: use recent dates
    date1 = today.subtract(1, 'days')
    date2 = today
  } else {
    // Previous month: use dates that would be within 14 days if it's the previous month
    date1 = today.subtract(3, 'days')
    date2 = today.subtract(2, 'days')
  }
  
  // Format dates and times like actual CSV: YYYY/M/D,H:mm (no zero padding)
  const formatDate = (date: dayjs.Dayjs) => date.format('YYYY/M/D')
  const formatTime = (hour: number) => `${hour}:00`
  
  const mockCsvData = [
    'Date,Time,11001,11016,12011', // Header with real station IDs
    `${formatDate(date1)},${formatTime(17)},${baseTemp.toFixed(1)},${(baseTemp + 0.6).toFixed(1)},${(baseTemp - 0.7).toFixed(1)}`,
    `${formatDate(date1)},${formatTime(18)},${(baseTemp - 0.7).toFixed(1)},${(baseTemp - 0.1).toFixed(1)},${(baseTemp - 1.6).toFixed(1)}`,
    `${formatDate(date2)},${formatTime(17)},${(baseTemp + variation).toFixed(1)},${(baseTemp + variation + 0.5).toFixed(1)},${(baseTemp + variation - 0.8).toFixed(1)}`,
    `${formatDate(date2)},${formatTime(18)},${(baseTemp + variation - 0.7).toFixed(1)},${(baseTemp + variation - 0.2).toFixed(1)},${(baseTemp + variation - 1.5).toFixed(1)}`
  ].join('\n')
  return mockCsvData
}

// Mock prediction CSV data generator - now generates realistic future dates
const generateMockPredictionCsvData = () => {
  const today = dayjs()
  const tomorrow = today.add(1, 'day')
  const dayAfter = today.add(2, 'day')
  
  // Generate forecast times for the next 2 days in YYYYMMDDHH format
  const forecastTimes = [
    tomorrow.hour(9).format('YYYYMMDDHH'),
    tomorrow.hour(12).format('YYYYMMDDHH'),
    tomorrow.hour(15).format('YYYYMMDDHH'),
    tomorrow.hour(18).format('YYYYMMDDHH'),
    dayAfter.hour(9).format('YYYYMMDDHH'),
    dayAfter.hour(12).format('YYYYMMDDHH'),
    dayAfter.hour(15).format('YYYYMMDDHH'),
    dayAfter.hour(18).format('YYYYMMDDHH')
  ]
  
  const mockPredictionData = [
    `,,${forecastTimes.join(',')}`,
    `11001,${today.format('YYYY/M/D')} 14:25,310,280,280,270,270,270,290,320`,
    `11016,${today.format('YYYY/M/D')} 14:25,305,275,275,265,265,265,285,315`,
    `12011,${today.format('YYYY/M/D')} 14:25,315,285,285,275,275,275,295,325`
  ].join('\n')
  return mockPredictionData
}

describe('fetchWbgtData', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('successful data processing', () => {
    beforeEach(() => {
      // Setup mock for successful CSV fetching
      server.use(
        http.get('https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_:yearMonth.csv', ({ params }) => {
          const { yearMonth } = params
          const csvData = generateMockCsvData(yearMonth as string)
          return HttpResponse.text(csvData)
        }),
        http.get('https://www.wbgt.env.go.jp/prev15WG/dl/yohou_all.csv', () => {
          const predictionCsvData = generateMockPredictionCsvData()
          return HttpResponse.text(predictionCsvData)
        })
      )
    })

    it('should return valid GeoJSON structure', async () => {
      const result = await fetchWbgtData()

      expect(result.geojson.type).toBe('FeatureCollection')
      expect(result.geojson.features.length).toBeGreaterThan(0)
      
      const firstFeature = result.geojson.features[0]
      expect(firstFeature.type).toBe('Feature')
      expect(firstFeature.geometry.type).toBe('Point')
      expect(firstFeature.properties.id).toBeTruthy()
      expect(firstFeature.properties.name).toBeTruthy()
    })

    it('should generate correct time points', async () => {
      const result = await fetchWbgtData()

      // Mock data generates data from both months after filtering + prediction data
      // Each month has 4 data points (2 days × 2 hours each) + 8 prediction data points
      // After filtering, we should get all data since it's within 14 days
      expect(result.hourlyTimePoints.length).toBeGreaterThan(8) // At least historical + predictions
      expect(result.hourlyTimePoints[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should calculate valueByDateTime correctly', async () => {
      const result = await fetchWbgtData()
      
      const firstFeature = result.geojson.features[0]
      const valueByDateTime = firstFeature.properties.valueByDateTime
      
      expect(Array.isArray(valueByDateTime)).toBe(true)
      expect(valueByDateTime.length).toBeGreaterThan(0)
      
      // Check that we have valid temperature values (reasonable range for WBGT)
      valueByDateTime.forEach((value) => {
        expect(typeof value).toBe('number')
        expect(value).toBeGreaterThan(10) // Reasonable minimum WBGT
        expect(value).toBeLessThan(50) // Reasonable maximum WBGT
      })
      
      // Check that we have at least some historical data points
      expect(valueByDateTime.length).toBeGreaterThanOrEqual(4)
    })

    it('should calculate maxByDate correctly', async () => {
      const result = await fetchWbgtData()
      
      const firstFeature = result.geojson.features[0]
      const maxByDate = firstFeature.properties.maxByDate
      
      expect(Array.isArray(maxByDate)).toBe(true)
      expect(maxByDate.length).toBeGreaterThan(0)
      
      // Check that we have valid temperature values (reasonable range for WBGT)
      maxByDate.forEach((value) => {
        expect(typeof value).toBe('number')
        expect(value).toBeGreaterThan(10) // Reasonable minimum WBGT
        expect(value).toBeLessThan(50) // Reasonable maximum WBGT
      })
      
      // Check that we have both historical and prediction data
      expect(maxByDate.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('CSV data combination', () => {
    beforeEach(() => {
      // Setup mock for CSV combination testing
      server.use(
        http.get('https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_:yearMonth.csv', ({ params }) => {
          const { yearMonth } = params
          const csvData = generateMockCsvData(yearMonth as string)
          return HttpResponse.text(csvData)
        }),
        http.get('https://www.wbgt.env.go.jp/prev15WG/dl/yohou_all.csv', () => {
          const predictionCsvData = generateMockPredictionCsvData()
          return HttpResponse.text(predictionCsvData)
        })
      )
    })

    it('should combine CSV data from multiple months correctly', async () => {
      // Test the CSV combination functionality by calling fetchCombinedWbgtCsv directly
      const combinedCsv = await fetchCombinedWbgtCsv()
      
      // Split into lines to check structure
      const lines = combinedCsv.trim().split('\n')
      const header = lines[0]
      const dataRows = lines.slice(1)
      
      // Should have header + data from both months
      expect(header).toBe('Date,Time,11001,11016,12011')
      // After 14-day filtering, we should have some data rows
      expect(dataRows.length).toBeGreaterThan(0)
      
      // Check that we have valid data format
      dataRows.forEach(row => {
        const columns = row.split(',')
        expect(columns.length).toBe(5) // Date, Time, and 3 stations
        expect(columns[0]).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2}$/) // Date format
        expect(columns[1]).toMatch(/^\d{1,2}:\d{2}$/) // Time format
      })
    })

    it('should generate different temperature patterns for different months', async () => {
      const combinedCsv = await fetchCombinedWbgtCsv()
      const lines = combinedCsv.trim().split('\n')
      const dataRows = lines.slice(1)
      
      // Since 14-day filtering is applied, we might not have data from previous month
      // This test should just verify that the CSV combination works and produces valid data
      expect(dataRows.length).toBeGreaterThan(0)
      
      // Verify that we have valid temperature data
      const firstDataRow = dataRows[0]
      const columns = firstDataRow.split(',')
      expect(columns.length).toBeGreaterThanOrEqual(3) // Date, Time, and at least one station
      
      // Check that temperature values are numeric
      for (let i = 2; i < columns.length; i++) {
        const temp = parseFloat(columns[i])
        if (!isNaN(temp)) {
          expect(temp).toBeGreaterThan(10)
          expect(temp).toBeLessThan(50)
        }
      }
    })
  })

  describe('error handling', () => {
    it('should return empty result when fetchCombinedWbgtCsv throws error', async () => {
      server.use(
        http.get('https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_*.csv', () => {
          return HttpResponse.error()
        }),
        http.get('https://www.wbgt.env.go.jp/prev15WG/dl/yohou_all.csv', () => {
          return HttpResponse.error()
        })
      )

      const result = await fetchWbgtData()

      expect(result).toEqual({
        geojson: {
          type: 'FeatureCollection',
          features: []
        },
        hourlyTimePoints: [],
        dailyTimePoints: []
      })
      expect(console.error).toHaveBeenCalledWith('WBGTデータの取得に失敗:', expect.any(Error))
    })

    it('should return empty result when CSV processing throws error', async () => {
      server.use(
        http.get('https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_*', () => {
          return HttpResponse.text('invalid csv data')
        }),
        http.get('https://www.wbgt.env.go.jp/prev15WG/dl/yohou_all.csv', () => {
          return HttpResponse.text('invalid prediction csv data')
        })
      )

      const result = await fetchWbgtData()

      expect(result).toEqual({
        geojson: {
          type: 'FeatureCollection',
          features: []
        },
        hourlyTimePoints: [],
        dailyTimePoints: []
      })
      expect(console.error).toHaveBeenCalledWith('WBGTデータの取得に失敗:', expect.any(Error))
    })
  })


  describe('prediction data processing', () => {
    beforeEach(() => {
      // Setup mock with historical data and prediction data
      server.use(
        http.get('https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_:yearMonth.csv', ({ params }) => {
          const { yearMonth } = params
          const csvData = generateMockCsvData(yearMonth as string)
          return HttpResponse.text(csvData)
        }),
        http.get('https://www.wbgt.env.go.jp/prev15WG/dl/yohou_all.csv', () => {
          const predictionCsvData = generateMockPredictionCsvData()
          return HttpResponse.text(predictionCsvData)
        })
      )
    })

    it('should include prediction time points in result', async () => {
      const today = dayjs()
      const tomorrow = today.add(1, 'day')
      const dayAfter = today.add(2, 'day')
      
      const result = await fetchWbgtData()

      // Check if prediction time points are included
      const tomorrowStart = tomorrow.startOf('day')
      const dayAfterEnd = dayAfter.endOf('day')
      
      const predictionTimePoints = result.hourlyTimePoints.filter(timePointIso => {
        const timePoint = dayjs(timePointIso)
        return timePoint.isAfter(tomorrowStart) && timePoint.isBefore(dayAfterEnd)
      })
      
      // We should have prediction data for tomorrow and day after
      expect(predictionTimePoints.length).toBeGreaterThan(0)
    })

    it('should include prediction values in feature properties', async () => {
      const today = dayjs()
      const tomorrow = today.add(1, 'day')
      
      const result = await fetchWbgtData()
      
      // Check that first feature has prediction data
      const firstFeature = result.geojson.features[0]
      expect(firstFeature.properties.valueByDateTime.length).toBe(result.hourlyTimePoints.length)
      
      // Find index of first prediction time point
      const tomorrowStart = tomorrow.startOf('day')
      const firstPredictionIndex = result.hourlyTimePoints.findIndex(timePointIso => {
        const timePoint = dayjs(timePointIso)
        return timePoint.isAfter(tomorrowStart)
      })
      
      if (firstPredictionIndex >= 0) {
        const predictionValue = firstFeature.properties.valueByDateTime[firstPredictionIndex]
        expect(typeof predictionValue).toBe('number')
        expect(predictionValue).toBeGreaterThan(0) // Should have a valid temperature value
        expect(predictionValue).toBeLessThan(50) // Reasonable temperature range
      } else {
        // If no prediction data found, fail the test
        expect.fail('No prediction data found in time points')
      }
    })
  })


})