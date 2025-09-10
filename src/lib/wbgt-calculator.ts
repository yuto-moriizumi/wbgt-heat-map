import { TimeSeriesData } from "./types";

/**
 * 指定された日付の各観測点における1日の平均WBGT値を計算します
 * @param timeSeriesData 時系列WBGTデータ
 * @param date 対象日付 (YYYY-MM-DD形式)
 * @returns 平均WBGT値、データがない場合は0
 */
export function calculateDailyAverage(
  timeSeriesData: TimeSeriesData[],
  date: string
): number {
  const dayData = timeSeriesData.filter((data) => {
    const dataDate = data.time.split(" ")[0]; // YYYY-MM-DD HH:mm から日付部分を抽出
    return dataDate === date;
  });

  if (dayData.length === 0) {
    return 0; // データなし
  }

  const validData = dayData.filter((data) => data.wbgt > 0); // 0はデータなしとして扱う

  if (validData.length === 0) {
    return 0; // 有効データなし
  }

  const sum = validData.reduce((acc, data) => acc + data.wbgt, 0);
  return sum / validData.length;
}