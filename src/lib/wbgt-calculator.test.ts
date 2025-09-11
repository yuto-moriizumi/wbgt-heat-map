import { describe, it, expect } from 'vitest'
import { calculateDailyAverage } from './wbgt-calculator'
import { TimeSeriesData } from './types'

describe('calculateDailyAverage', () => {
  it('should calculate average of daytime data (9:00-17:00) correctly', () => {
    const mockData: TimeSeriesData[] = [
      { time: '2025-09-01 08:00', wbgt: 25.0 }, // 8:00 - 範囲外
      { time: '2025-09-01 09:00', wbgt: 26.0 }, // 9:00 - 範囲内
      { time: '2025-09-01 10:00', wbgt: 27.0 }, // 10:00 - 範囲内
      { time: '2025-09-01 11:00', wbgt: 28.0 }, // 11:00 - 範囲内
      { time: '2025-09-01 12:00', wbgt: 29.0 }, // 12:00 - 範囲内
      { time: '2025-09-01 13:00', wbgt: 30.0 }, // 13:00 - 範囲内
      { time: '2025-09-01 14:00', wbgt: 31.0 }, // 14:00 - 範囲内
      { time: '2025-09-01 15:00', wbgt: 32.0 }, // 15:00 - 範囲内
      { time: '2025-09-01 16:00', wbgt: 33.0 }, // 16:00 - 範囲内
      { time: '2025-09-01 17:00', wbgt: 34.0 }, // 17:00 - 範囲内
      { time: '2025-09-01 18:00', wbgt: 35.0 }, // 18:00 - 範囲外
      { time: '2025-09-02 10:00', wbgt: 26.0 }  // 別の日付
    ]

    const result = calculateDailyAverage(mockData, '2025-09-01')
    const expectedAverage = (26.0 + 27.0 + 28.0 + 29.0 + 30.0 + 31.0 + 32.0 + 33.0 + 34.0) / 9
    expect(result).toBe(expectedAverage)
  })

  it('should return 0 when no daytime data exists', () => {
    const mockData: TimeSeriesData[] = [
      { time: '2025-09-01 08:00', wbgt: 25.0 }, // 8:00 - 範囲外
      { time: '2025-09-01 18:00', wbgt: 35.0 }, // 18:00 - 範囲外
      { time: '2025-09-02 10:00', wbgt: 26.0 }  // 別の日付
    ]

    const result = calculateDailyAverage(mockData, '2025-09-01')
    expect(result).toBe(0)
  })

  it('should return 0 when only invalid data (wbgt <= 0) exists in daytime', () => {
    const mockData: TimeSeriesData[] = [
      { time: '2025-09-01 09:00', wbgt: 0 },   // 無効データ
      { time: '2025-09-01 10:00', wbgt: -1 },  // 無効データ
      { time: '2025-09-01 11:00', wbgt: 0.5 }, // 有効データ
      { time: '2025-09-01 12:00', wbgt: 0 }    // 無効データ
    ]

    const result = calculateDailyAverage(mockData, '2025-09-01')
    expect(result).toBe(0.5) // 0.5のみ有効
  })

  it('should return 0 when no data exists for the specified date', () => {
    const mockData: TimeSeriesData[] = [
      { time: '2025-09-02 10:00', wbgt: 26.0 }
    ]

    const result = calculateDailyAverage(mockData, '2025-09-01')
    expect(result).toBe(0)
  })

  it('should handle mixed valid and invalid daytime data correctly', () => {
    const mockData: TimeSeriesData[] = [
      { time: '2025-09-01 08:00', wbgt: 25.0 }, // 範囲外
      { time: '2025-09-01 09:00', wbgt: 26.0 }, // 有効
      { time: '2025-09-01 10:00', wbgt: 0 },    // 無効
      { time: '2025-09-01 11:00', wbgt: 28.0 }, // 有効
      { time: '2025-09-01 12:00', wbgt: -1 },   // 無効
      { time: '2025-09-01 13:00', wbgt: 30.0 }, // 有効
      { time: '2025-09-01 17:00', wbgt: 34.0 }, // 有効
      { time: '2025-09-01 18:00', wbgt: 35.0 }  // 範囲外
    ]

    const result = calculateDailyAverage(mockData, '2025-09-01')
    const expectedAverage = (26.0 + 28.0 + 30.0 + 34.0) / 4
    expect(result).toBe(expectedAverage)
  })

  it('should handle edge case of exactly 9:00 and 17:00', () => {
    const mockData: TimeSeriesData[] = [
      { time: '2025-09-01 09:00', wbgt: 26.0 },
      { time: '2025-09-01 17:00', wbgt: 34.0 }
    ]

    const result = calculateDailyAverage(mockData, '2025-09-01')
    const expectedAverage = (26.0 + 34.0) / 2
    expect(result).toBe(expectedAverage)
  })
})