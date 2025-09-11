import { TimeSeriesData } from "./types";

/**
 * 指定された日付の各観測点における日中平均WBGT値を計算します（9:00から17:00のデータを使用）
 * @param timeSeriesData 時系列WBGTデータ
 * @param date 対象日付 (YYYY-MM-DD形式)
 * @returns 日中平均WBGT値、データがない場合は0
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

  // 9:00から17:00までのデータをフィルタリング
  const daytimeData = dayData.filter((data) => {
    const timePart = data.time.split(" ")[1]; // HH:mm
    const hour = parseInt(timePart.split(":")[0], 10);
    return hour >= 9 && hour <= 17;
  });

  const validData = daytimeData.filter((data) => data.wbgt > 0); // 0はデータなしとして扱う

  if (validData.length === 0) {
    return 0; // 有効データなし
  }

  const sum = validData.reduce((acc, data) => acc + data.wbgt, 0);
  return Math.round((sum / validData.length) * 10) / 10;
}