import dayjs from "./dayjs";
import type { WbgtProperties, DisplayMode } from "./types";

// 日時文字列を正規化する関数
export function normalizeDateTime(date: string, time: string): string {
  const dateTimeString = `${date} ${time}`;
  // dayjsは "YYYY/MM/DD" 形式の日付と "H:mm" 形式の時刻を解釈できる
  const d = dayjs(dateTimeString);

  if (!d.isValid()) {
    // パース失敗時は元の文字列を結合して返す
    return `${date} ${time}`;
  }

  // YYYY/MM/DD HH:mm 形式に統一して返す（ゼロ埋めされる）
  return d.format("YYYY/MM/DD HH:mm");
}

// displayModeに応じてWBGT値を取得する関数
export function getWbgtValue(
  properties: WbgtProperties,
  timeIndex: number,
  displayMode: DisplayMode
): number {
  if (displayMode === "DAILY_MAX") {
    return properties.valueByDate[timeIndex]?.wbgt ?? 0;
  }
  if (displayMode === "DAILY_AVERAGE") {
    return properties.valueByDateAverage[timeIndex] ?? 0;
  }
  return properties.valueByDateTime[timeIndex] ?? 0;
}
