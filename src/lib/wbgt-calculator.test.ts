import { describe, it, expect } from "vitest";
import { calculateDailyAverage } from "./wbgt-calculator";
import { TimeSeriesData } from "./types";

describe("calculateDailyAverage", () => {
  it("should calculate multiple daily averages correctly", () => {
    const mockData: TimeSeriesData[] = [
      // 2025-09-01データ
      { time: "2025-09-01 08:00", wbgt: 25.0 }, // 範囲外
      { time: "2025-09-01 09:00", wbgt: 26.0 }, // 有効
      { time: "2025-09-01 10:00", wbgt: 27.0 }, // 有効
      { time: "2025-09-01 17:00", wbgt: 34.0 }, // 有効
      { time: "2025-09-01 18:00", wbgt: 35.0 }, // 範囲外
      // 2025-09-02データ
      { time: "2025-09-02 09:00", wbgt: 20.0 }, // 有効
      { time: "2025-09-02 12:00", wbgt: 22.0 }, // 有効
      // 2025-09-03データ（データなし）
    ];

    const dailyTimePoints = [
      "2025-09-01T12:00:00.000Z",
      "2025-09-02T12:00:00.000Z",
      "2025-09-03T12:00:00.000Z",
    ];

    const result = calculateDailyAverage(mockData, dailyTimePoints);

    // 期待値計算
    const expected1 = Math.round(((26.0 + 27.0 + 34.0) / 3) * 10) / 10;
    const expected2 = Math.round(((20.0 + 22.0) / 2) * 10) / 10;
    const expected3 = 0; // データなし

    expect(result).toEqual([expected1, expected2, expected3]);
  });

  it("should return array of zeros when no valid data exists", () => {
    const mockData: TimeSeriesData[] = [
      { time: "2025-09-01 08:00", wbgt: 25.0 }, // 範囲外
      { time: "2025-09-01 18:00", wbgt: 35.0 }, // 範囲外
    ];

    const dailyTimePoints = [
      "2025-09-01T12:00:00.000Z",
      "2025-09-02T12:00:00.000Z",
    ];

    const result = calculateDailyAverage(mockData, dailyTimePoints);
    expect(result).toEqual([0, 0]);
  });

  it("should handle mixed valid and invalid data across multiple days", () => {
    const mockData: TimeSeriesData[] = [
      // 2025-09-01 - 有効データあり
      { time: "2025-09-01 09:00", wbgt: 26.0 },
      { time: "2025-09-01 10:00", wbgt: 0 }, // 無効
      { time: "2025-09-01 11:00", wbgt: 28.0 },
      // 2025-09-02 - 無効データのみ
      { time: "2025-09-02 09:00", wbgt: 0 },
      { time: "2025-09-02 10:00", wbgt: -1 },
      // 2025-09-03 - 有効データあり
      { time: "2025-09-03 15:00", wbgt: 30.0 },
    ];

    const dailyTimePoints = [
      "2025-09-01T12:00:00.000Z",
      "2025-09-02T12:00:00.000Z",
      "2025-09-03T12:00:00.000Z",
    ];

    const result = calculateDailyAverage(mockData, dailyTimePoints);

    const expected1 = Math.round(((26.0 + 28.0) / 2) * 10) / 10;
    const expected2 = 0; // 無効データのみ
    const expected3 = 30.0;

    expect(result).toEqual([expected1, expected2, expected3]);
  });

  it("should return empty array when no dailyTimePoints provided", () => {
    const mockData: TimeSeriesData[] = [
      { time: "2025-09-01 09:00", wbgt: 26.0 },
    ];

    const result = calculateDailyAverage(mockData, []);
    expect(result).toEqual([]);
  });
});
