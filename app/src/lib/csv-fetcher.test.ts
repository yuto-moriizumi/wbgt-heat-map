import { describe, it, expect } from 'vitest'
import { filterCsvDataByDateRange } from './csv-fetcher'
import dayjs from './dayjs'

describe('filterCsvDataByDateRange', () => {
  it('should filter CSV data to include only data within specified date range', () => {
    const today = dayjs()
    const past10Days = today.subtract(10, 'days')
    const past20Days = today.subtract(20, 'days')
    
    const mockCsvData = [
      'Date,Time,11001,11016,12011',
      `${past20Days.format('YYYY/M/D')},10:00,25.0,25.5,24.5`,
      `${past10Days.format('YYYY/M/D')},15:00,26.0,26.5,25.5`,
      `${today.format('YYYY/M/D')},17:00,28.5,29.0,28.0`
    ].join('\n')

    const result = filterCsvDataByDateRange(mockCsvData, 14)
    const lines = result.trim().split('\n')
    
    expect(lines[0]).toBe('Date,Time,11001,11016,12011') // Header should be preserved
    expect(lines.length).toBe(3) // Header + 2 data rows (within 14 days)
    
    // Should include data from 10 days ago and today
    expect(lines[1]).toContain(past10Days.format('YYYY/M/D'))
    expect(lines[2]).toContain(today.format('YYYY/M/D'))
    
    // Should not include data from 20 days ago
    expect(result).not.toContain(past20Days.format('YYYY/M/D'))
  })

  it('should return original CSV when all data is within range', () => {
    const today = dayjs()
    const past5Days = today.subtract(5, 'days')
    
    const mockCsvData = [
      'Date,Time,11001,11016,12011',
      `${past5Days.format('YYYY/M/D')},10:00,25.0,25.5,24.5`,
      `${today.format('YYYY/M/D')},17:00,28.5,29.0,28.0`
    ].join('\n')

    const result = filterCsvDataByDateRange(mockCsvData, 14)
    
    expect(result).toBe(mockCsvData)
  })

  it('should return header only when no data is within range', () => {
    const past30Days = dayjs().subtract(30, 'days')
    const past25Days = dayjs().subtract(25, 'days')
    
    const mockCsvData = [
      'Date,Time,11001,11016,12011',
      `${past30Days.format('YYYY/M/D')},10:00,25.0,25.5,24.5`,
      `${past25Days.format('YYYY/M/D')},15:00,26.0,26.5,25.5`
    ].join('\n')

    const result = filterCsvDataByDateRange(mockCsvData, 14)
    const lines = result.trim().split('\n')
    
    expect(lines.length).toBe(1) // Only header
    expect(lines[0]).toBe('Date,Time,11001,11016,12011')
  })

  it('should handle CSV with only header', () => {
    const mockCsvData = 'Date,Time,11001,11016,12011'
    
    const result = filterCsvDataByDateRange(mockCsvData, 14)
    
    expect(result).toBe(mockCsvData)
  })

  it('should handle empty CSV', () => {
    const mockCsvData = ''
    
    const result = filterCsvDataByDateRange(mockCsvData, 14)
    
    expect(result).toBe(mockCsvData)
  })

  it('should skip rows with invalid date format', () => {
    const today = dayjs()
    
    const mockCsvData = [
      'Date,Time,11001,11016,12011',
      'invalid-date,10:00,25.0,25.5,24.5',
      `${today.format('YYYY/M/D')},17:00,28.5,29.0,28.0`,
      ',15:00,26.0,26.5,25.5' // Empty date
    ].join('\n')

    const result = filterCsvDataByDateRange(mockCsvData, 14)
    const lines = result.trim().split('\n')
    
    expect(lines.length).toBe(2) // Header + 1 valid data row
    expect(lines[1]).toContain(today.format('YYYY/M/D'))
  })

  it('should handle different day ranges correctly', () => {
    const today = dayjs()
    const past3Days = today.subtract(3, 'days')
    const past7Days = today.subtract(7, 'days')
    const past10Days = today.subtract(10, 'days')
    
    const mockCsvData = [
      'Date,Time,11001,11016,12011',
      `${past10Days.format('YYYY/M/D')},10:00,25.0,25.5,24.5`,
      `${past7Days.format('YYYY/M/D')},15:00,26.0,26.5,25.5`,
      `${past3Days.format('YYYY/M/D')},17:00,28.5,29.0,28.0`
    ].join('\n')

    // Test with 5 days range
    const result5Days = filterCsvDataByDateRange(mockCsvData, 5)
    const lines5Days = result5Days.trim().split('\n')
    expect(lines5Days.length).toBe(2) // Header + 1 row (only past3Days)
    
    // Test with 8 days range
    const result8Days = filterCsvDataByDateRange(mockCsvData, 8)
    const lines8Days = result8Days.trim().split('\n')
    expect(lines8Days.length).toBe(3) // Header + 2 rows (past7Days and past3Days)
    
    // Test with 15 days range
    const result15Days = filterCsvDataByDateRange(mockCsvData, 15)
    const lines15Days = result15Days.trim().split('\n')
    expect(lines15Days.length).toBe(4) // Header + all 3 rows
  })
})