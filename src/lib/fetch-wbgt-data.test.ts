import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWbgtData } from './fetch-wbgt-data'
import { fetchCombinedWbgtCsv } from './csv-fetcher'
import { server } from './test-setup'
import { http, HttpResponse } from 'msw'
import dayjs from './dayjs'

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
      })
    )

    const result = await fetchWbgtData()

    expect(result.geojson.type).toBe('FeatureCollection')
    expect(result.geojson.features.length).toBeGreaterThan(0)
    expect(result.timePoints.length).toBeGreaterThan(0)
    expect(result.timePoints[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    
    const firstFeature = result.geojson.features[0]
    expect(firstFeature.type).toBe('Feature')
    expect(firstFeature.geometry.type).toBe('Point')
    expect(firstFeature.properties.id).toBeTruthy()
    expect(firstFeature.properties.name).toBeTruthy()
    expect(firstFeature.properties.valueByDateTime).toBeDefined()
    expect(firstFeature.properties.valueByDate).toBeDefined()
  })

  it('should combine CSV data from multiple months correctly', async () => {
    // Setup mock for CSV combination testing
    server.use(
      http.get('https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_:yearMonth.csv', ({ params }) => {
        const { yearMonth } = params
        const csvData = generateMockCsvData(yearMonth as string)
        return HttpResponse.text(csvData)
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
    expect(dataRows.length).toBeGreaterThan(4) // Should have data from both current and previous month
    
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
      })
    )

    const result = await fetchWbgtData()

    expect(result).toEqual({
      geojson: {
        type: 'FeatureCollection',
        features: []
      },
      timePoints: []
    })
    expect(console.error).toHaveBeenCalledWith('WBGTデータの取得に失敗:', expect.any(Error))
  })

  it('should return empty result when CSV processing throws error', async () => {
    server.use(
      http.get('https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_*', () => {
        return HttpResponse.text('invalid csv data')
      })
    )

    const result = await fetchWbgtData()

    expect(result).toEqual({
      geojson: {
        type: 'FeatureCollection',
        features: []
      },
      timePoints: []
    })
    expect(console.error).toHaveBeenCalledWith('WBGTデータの取得に失敗:', expect.any(Error))
  })

  it('should filter CSV data for last 14 days', async () => {
    const today = dayjs()
    const past14Days = today.subtract(14, 'days')
    const past20Days = today.subtract(20, 'days')
    
    const mockCsvData = [
      'Date,Time,11001',
      `${past20Days.format('YYYY/M/D')},10:00,25.0`,
      `${past14Days.format('YYYY/M/D')},15:00,26.0`,
      `${today.format('YYYY/M/D')},17:00,28.5`
    ].join('\n')

    server.use(
      http.get('https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_*', () => {
        return HttpResponse.text(mockCsvData)
      })
    )

    const result = await fetchWbgtData()

    expect(result.geojson.type).toBe('FeatureCollection')
    expect(result.timePoints.length).toBeGreaterThanOrEqual(1)
  })
})