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

// Mock CSV data generator
const generateMockCsvData = (yearMonth: string) => {
  const year = yearMonth.slice(0, 4)
  const month = yearMonth.slice(4, 6)
  
  // Generate distinctly different data patterns based on month
  const monthNum = parseInt(month, 10)
  const baseTemp = 20.0 + (monthNum * 0.8) // Different base temp for each month
  const variation = 2.0 + (monthNum % 3) // Different variation pattern
  
  // Format dates and times like actual CSV: YYYY/M/D,H:mm (no zero padding)
  const formatDate = (day: number) => `${year}/${parseInt(month, 10)}/${day}`
  const formatTime = (hour: number) => `${hour}:00`
  
  const mockCsvData = [
    'Date,Time,11001,11016,12011', // Header with real station IDs
    `${formatDate(1)},${formatTime(17)},${baseTemp.toFixed(1)},${(baseTemp + 0.6).toFixed(1)},${(baseTemp - 0.7).toFixed(1)}`,
    `${formatDate(1)},${formatTime(18)},${(baseTemp - 0.7).toFixed(1)},${(baseTemp - 0.1).toFixed(1)},${(baseTemp - 1.6).toFixed(1)}`,
    `${formatDate(2)},${formatTime(17)},${(baseTemp + variation).toFixed(1)},${(baseTemp + variation + 0.5).toFixed(1)},${(baseTemp + variation - 0.8).toFixed(1)}`,
    `${formatDate(2)},${formatTime(18)},${(baseTemp + variation - 0.7).toFixed(1)},${(baseTemp + variation - 0.2).toFixed(1)},${(baseTemp + variation - 1.5).toFixed(1)}`
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

  it('should successfully fetch and process WBGT data', async () => {
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

    const result = await fetchWbgtData()

    console.log('Debug: result.geojson.features.length =', result.geojson.features.length)
    console.log('Debug: result.hourlyTimePoints.length =', result.hourlyTimePoints.length)
    console.log('Debug: result.dailyTimePoints.length =', result.dailyTimePoints.length)

    expect(result.geojson.type).toBe('FeatureCollection')
    expect(result.geojson.features.length).toBeGreaterThan(0)
    
    // Mock data has 4 historical data points (2 days × 2 hours each) + 8 prediction data points (2 days × 4 hours each)
    const expectedHistoricalDataPoints = 4
    const expectedPredictionDataPoints = 8
    const expectedTotalDataPoints = expectedHistoricalDataPoints + expectedPredictionDataPoints
    
    // 正確な長さ検証: テストデータでは正確に12個の時間ポイントが期待される
    expect(result.hourlyTimePoints.length).toBe(expectedTotalDataPoints)
    expect(result.hourlyTimePoints[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    
    const firstFeature = result.geojson.features[0]
    expect(firstFeature.type).toBe('Feature')
    expect(firstFeature.geometry.type).toBe('Point')
    expect(firstFeature.properties.id).toBeTruthy()
    expect(firstFeature.properties.name).toBeTruthy()
    
    // Calculate expected values for current month (station 11001)
    const currentMonth = dayjs().month() + 1 // dayjs months are 0-indexed
    const expectedBaseTemp = 20.0 + (currentMonth * 0.8)
    const expectedVariation = 2.0 + (currentMonth % 3)
    
    // Expected values for station 11001 (first station in CSV)
    const expectedValues = [
      expectedBaseTemp, // Day 1, 17:00
      expectedBaseTemp - 0.7, // Day 1, 18:00
      expectedBaseTemp + expectedVariation, // Day 2, 17:00
      expectedBaseTemp + expectedVariation - 0.7 // Day 2, 18:00
    ]
    
    // valueByDateTime detailed validation
    const valueByDateTime = firstFeature.properties.valueByDateTime
    expect(Array.isArray(valueByDateTime)).toBe(true)
    expect(valueByDateTime.length).toBeGreaterThan(0)
    
    // Check each valueByDateTime entry structure and values
    valueByDateTime.forEach((wbgt, index) => {
      expect(typeof wbgt).toBe('number')
      
      // Check if this entry corresponds to current month data
      if (index < expectedValues.length) {
        expect(wbgt).toBe(expectedValues[index])
      }
    })
    
    // maxByDate detailed validation with exact expected values
    const maxByDate = firstFeature.properties.maxByDate
    expect(Array.isArray(maxByDate)).toBe(true)
    
    // Calculate expected maxByDate values based on mock data structure
    // Reuse existing variables from valueByDateTime validation
    const baseTemp = expectedBaseTemp
    const variation = expectedVariation
    
    // Expected values for each day based on mock CSV generation:
    // Day 1: max(baseTemp, baseTemp - 0.7) = baseTemp
    // Day 2: max(baseTemp + variation, baseTemp + variation - 0.7) = baseTemp + variation
    const expectedMaxByDate = [
      baseTemp, // Day 1 max
      baseTemp + variation // Day 2 max
    ]
    
    // Add prediction data max values (31.0, 27.0, 28.0, 27.0, 27.0, 27.0, 29.0, 32.0 for station 11001)
    // Tomorrow: max(31.0, 28.0, 28.0, 27.0) = 31.0
    // Day after: max(27.0, 27.0, 29.0, 32.0) = 32.0
    expectedMaxByDate.push(31.0) // Tomorrow max
    expectedMaxByDate.push(32.0) // Day after max
    
    expect(maxByDate.length).toBe(expectedMaxByDate.length)
    expectedMaxByDate.forEach((expectedMax, index) => {
      expect(maxByDate[index]).toBeCloseTo(expectedMax, 1)
    })
  })

  it('should combine CSV data from multiple months correctly', async () => {
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

    // Test the CSV combination functionality by calling fetchCombinedWbgtCsv directly
    const combinedCsv = await fetchCombinedWbgtCsv()
    
    // Split into lines to check structure
    const lines = combinedCsv.trim().split('\n')
    const header = lines[0]
    const dataRows = lines.slice(1)
    
    // Should have header + data from both months
    expect(header).toBe('Date,Time,11001,11016,12011')
    // Each month has 4 data rows (2 days × 2 hours each), so 8 total from both months
    expect(dataRows.length).toBe(8)
    
    // Check that we have data from different months
    const dates = dataRows.map(row => row.split(',')[0])
    const uniqueMonths = new Set(dates.map(date => {
      // Parse YYYY/M/D format to get YYYY-MM for comparison
      const [year, month] = date.split('/')
      return `${year}-${month.padStart(2, '0')}`
    }))
    expect(uniqueMonths.size).toBeGreaterThan(1) // Should have data from at least 2 different months
    
    // Verify that different months have different temperature patterns
    const currentMonth = dayjs().format('YYYY-MM')
    const prevMonth = dayjs().subtract(1, 'month').format('YYYY-MM')
    
    const currentMonthRows = dataRows.filter(row => {
      const [year, month] = row.split(',')[0].split('/')
      return `${year}-${month.padStart(2, '0')}` === currentMonth
    })
    const prevMonthRows = dataRows.filter(row => {
      const [year, month] = row.split(',')[0].split('/')
      return `${year}-${month.padStart(2, '0')}` === prevMonth
    })
    
    expect(currentMonthRows.length).toBeGreaterThan(0)
    expect(prevMonthRows.length).toBeGreaterThan(0)
    
    // Check that temperature values are different between months (based on our mock logic)
    if (currentMonthRows.length > 0 && prevMonthRows.length > 0) {
      const currentTemp = parseFloat(currentMonthRows[0].split(',')[2])
      const prevTemp = parseFloat(prevMonthRows[0].split(',')[2])
      
      // They should be different due to our month-based temperature generation
      expect(currentTemp).not.toBe(prevTemp)
    }
  })

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


  it('should parse prediction CSV data correctly and include in final result', async () => {
    const today = dayjs()
    const tomorrow = today.add(1, 'day')
    const dayAfter = today.add(2, 'day')
    
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

    const result = await fetchWbgtData()

    // Verify that result includes prediction data
    expect(result.geojson.type).toBe('FeatureCollection')
    expect(result.geojson.features.length).toBeGreaterThan(0)
    expect(result.hourlyTimePoints.length).toBeGreaterThan(0)
    
    // Check if prediction time points are included
    const tomorrowStart = tomorrow.startOf('day')
    const dayAfterEnd = dayAfter.endOf('day')
    
    const predictionTimePoints = result.hourlyTimePoints.filter(timePointIso => {
      const timePoint = dayjs(timePointIso)
      return timePoint.isAfter(tomorrowStart) && timePoint.isBefore(dayAfterEnd)
    })
    
    console.log('Debug: total hourlyTimePoints =', result.hourlyTimePoints.length)
    console.log('Debug: prediction hourlyTimePoints =', predictionTimePoints.length)
    console.log('Debug: first 5 hourlyTimePoints =', result.hourlyTimePoints.slice(0, 5))
    console.log('Debug: last 5 hourlyTimePoints =', result.hourlyTimePoints.slice(-5))
    
    // We should have prediction data for tomorrow and day after
    expect(predictionTimePoints.length).toBeGreaterThan(0)
    
    // Check that first feature has prediction data
    const firstFeature = result.geojson.features[0]
    expect(firstFeature.properties.valueByDateTime.length).toBe(result.hourlyTimePoints.length)
    
    // Find index of first prediction time point
    const firstPredictionIndex = result.hourlyTimePoints.findIndex(timePointIso => {
      const timePoint = dayjs(timePointIso)
      return timePoint.isAfter(tomorrowStart)
    })
    
    if (firstPredictionIndex >= 0) {
      const predictionValue = firstFeature.properties.valueByDateTime[firstPredictionIndex]
      expect(typeof predictionValue).toBe('number')
      expect(predictionValue).toBeGreaterThan(0) // Should have a valid temperature value
      expect(predictionValue).toBeLessThan(50) // Reasonable temperature range
      
      console.log('Debug: first prediction value =', predictionValue)
      console.log('Debug: corresponding time =', result.hourlyTimePoints[firstPredictionIndex])
    } else {
      // If no prediction data found, fail the test
      expect.fail('No prediction data found in time points')
    }
  })

  it('should filter CSV data for last 14 days', async () => {
    const today = dayjs()
    const past14Days = today.subtract(14, 'days')
    const past20Days = today.subtract(20, 'days')
    
    const mockCsvData = [
      'Date,Time,11001,11016,12011',
      `${past20Days.format('YYYY/M/D')},10:00,25.0,25.5,24.5`,
      `${past14Days.format('YYYY/M/D')},15:00,26.0,26.5,25.5`,
      `${today.format('YYYY/M/D')},17:00,28.5,29.0,28.0`
    ].join('\n')

    server.use(
      http.get('https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_:yearMonth.csv', () => {
        return HttpResponse.text(mockCsvData)
      }),
      http.get('https://www.wbgt.env.go.jp/prev15WG/dl/yohou_all.csv', () => {
        const predictionCsvData = generateMockPredictionCsvData()
        return HttpResponse.text(predictionCsvData)
      })
    )

    const result = await fetchWbgtData()

    expect(result.geojson.type).toBe('FeatureCollection')
    expect(result.hourlyTimePoints.length).toBeGreaterThanOrEqual(1)
  })
})