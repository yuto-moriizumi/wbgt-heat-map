import dayjs from "./dayjs";

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

// リスクレベルと色を決定する関数
export function getRiskLevel(wbgt: number): { level: string; color: string } {
  if (wbgt >= 35) {
    return { level: "災害級の危険", color: "#800080" }; // 紫
  } else if (wbgt >= 33) {
    return { level: "極めて危険", color: "#FF0000" }; // 赤
  } else if (wbgt >= 31) {
    return { level: "危険", color: "#FF4500" }; // オレンジレッド
  } else if (wbgt >= 28) {
    return { level: "厳重警戒", color: "#FFA500" }; // オレンジ
  } else if (wbgt >= 25) {
    return { level: "警戒", color: "#FFFF00" }; // 黄
  } else if (wbgt >= 21) {
    return { level: "注意", color: "#00FFFF" }; // シアン
  } else {
    return { level: "ほぼ安全", color: "#0000FF" }; // 青
  }
}

// WBGTの色を取得する関数
export function getWBGTColor(wbgt: number): string {
  return getRiskLevel(wbgt).color;
}

// WBGTのレベルを取得する関数
export function getWBGTLevel(wbgt: number): string {
  return getRiskLevel(wbgt).level;
}