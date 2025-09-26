import { TimeSeriesData } from "./types";

/**
 * 複数の日付の日中平均WBGT値を効率的に計算します（9:00から17:00のデータを使用）
 * @param timeSeriesData 時系列WBGTデータ
 * @param dailyTimePoints 対象日付のISO文字列配列
 * @returns dailyTimePointsの順序に対応した日中平均WBGT値の配列、データがない場合は0
 */
export function calculateDailyAverage(
  timeSeriesData: TimeSeriesData[],
  dailyTimePoints: string[]
): number[] {
  // dailyTimePointsをYYYY-MM-DD形式に変換してインデックスマップを作成
  const dateToIndexMap = new Map<string, number>();
  dailyTimePoints.forEach((timePoint, index) => {
    const date = new Date(timePoint).toISOString().split("T")[0]; // YYYY-MM-DD
    dateToIndexMap.set(date, index);
  });

  // 日付ごとの集計データを格納
  const dailyAggregation = new Map<string, { sum: number; count: number }>();

  // 時系列データを一度だけループして集計
  timeSeriesData.forEach((data) => {
    // 日付部分を抽出（YYYY/MM/DD HH:mm または YYYY-MM-DD HH:mm 形式に対応）
    const datePart = data.time.split(" ")[0];
    const dataDate = datePart.includes("/") 
      ? datePart.replace(/\//g, "-") // YYYY/MM/DD を YYYY-MM-DD に変換
      : datePart; // すでに YYYY-MM-DD 形式の場合はそのまま

    // 対象日付でない場合はスキップ
    if (!dateToIndexMap.has(dataDate)) {
      return;
    }

    // 9:00から17:00までの時間帯をチェック
    const timePart = data.time.split(" ")[1]; // HH:mm
    const hour = parseInt(timePart.split(":")[0], 10);
    if (hour < 9 || hour > 17) {
      return;
    }

    // 有効なWBGT値のみを集計
    if (data.wbgt > 0) {
      const existing = dailyAggregation.get(dataDate) || { sum: 0, count: 0 };
      existing.sum += data.wbgt;
      existing.count += 1;
      dailyAggregation.set(dataDate, existing);
    }
  });

  // dailyTimePointsの順序に従って平均値の配列を作成
  return dailyTimePoints.map((timePoint) => {
    const date = new Date(timePoint).toISOString().split("T")[0]; // YYYY-MM-DD
    const aggregation = dailyAggregation.get(date);

    if (!aggregation || aggregation.count === 0) {
      return 0; // データがない場合は0
    }

    const average = aggregation.sum / aggregation.count;
    return Math.round(average * 10) / 10;
  });
}
