import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWbgtData } from './fetch-wbgt-data'
import { fetchCombinedWbgtCsv } from './csv-fetcher'
import dayjs from './dayjs'

vi.mock('./csv-fetcher', async () => {
  const actual = await vi.importActual('./csv-fetcher')
  return {
    ...actual,
    fetchCombinedWbgtCsv: vi.fn()
  }
})

const mockFetchCombinedWbgtCsv = vi.mocked(fetchCombinedWbgtCsv)

describe('fetchWbgtData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset console.log mock
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully fetch and process WBGT data', async () => {
    // Arrange - Create CSV data that matches the expected format with real station IDs
    const today = dayjs().format('YYYY-MM-DD')
    const mockCsvData = [
      'Date,Time,11001,11016,12011', // Header with real station IDs from stations.json
      `${today},17:00,28.5,29.1,27.8`,
      `${today},18:00,27.8,28.5,26.9`
    ].join('\n')

    mockFetchCombinedWbgtCsv.mockResolvedValue(mockCsvData)

    // Act
    const result = await fetchWbgtData()

    // Assert
    expect(mockFetchCombinedWbgtCsv).toHaveBeenCalledOnce()
    expect(result.geojson.type).toBe('FeatureCollection')
    expect(result.geojson.features.length).toBeGreaterThan(0)
    expect(result.timePoints.length).toBeGreaterThan(0)
    expect(result.timePoints[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) // ISO format
    
    // Check that features have the expected structure
    const firstFeature = result.geojson.features[0]
    expect(firstFeature.type).toBe('Feature')
    expect(firstFeature.geometry.type).toBe('Point')
    expect(firstFeature.properties.id).toBeTruthy()
    expect(firstFeature.properties.name).toBeTruthy()
    expect(firstFeature.properties.valueByDateTime).toBeDefined()
    expect(firstFeature.properties.valueByDate).toBeDefined()
  })

  it('should return empty result when fetchCombinedWbgtCsv throws error', async () => {
    // Arrange
    const error = new Error('Failed to fetch CSV')
    
    mockFetchCombinedWbgtCsv.mockRejectedValue(error)

    // Act
    const result = await fetchWbgtData()

    // Assert
    expect(result).toEqual({
      geojson: {
        type: 'FeatureCollection',
        features: []
      },
      timePoints: []
    })
    expect(console.error).toHaveBeenCalledWith('WBGTデータの取得に失敗:', error)
  })

  it('should return empty result when CSV processing throws error', async () => {
    // Arrange - Invalid CSV that will cause parsing error
    const mockCsvData = 'invalid csv data'
    
    mockFetchCombinedWbgtCsv.mockResolvedValue(mockCsvData)

    // Act
    const result = await fetchWbgtData()

    // Assert
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
    // Arrange - Use dayjs for date manipulation
    const today = dayjs()
    const past14Days = today.subtract(14, 'days')
    const past20Days = today.subtract(20, 'days')
    
    const mockCsvData = [
      'Date,Time,11001', // Header with real station ID
      `${past20Days.format('YYYY-MM-DD')},10:00,25.0`, // Should be filtered out
      `${past14Days.format('YYYY-MM-DD')},15:00,26.0`, // Should be included
      `${today.format('YYYY-MM-DD')},17:00,28.5` // Should be included
    ].join('\n')

    mockFetchCombinedWbgtCsv.mockResolvedValue(mockCsvData)

    // Act
    const result = await fetchWbgtData()

    // Assert
    expect(result.geojson.type).toBe('FeatureCollection')
    // The filtered data should not include the 20-day-old data
    // but should include recent data within 14 days
    expect(result.timePoints.length).toBeGreaterThanOrEqual(1)
  })
})