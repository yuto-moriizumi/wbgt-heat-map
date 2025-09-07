// WBGT指数の設定と色定義を統一管理するファイル

interface WbgtLevel {
  threshold: number;
  level: string;
  color: string;
  description: string;
}

// WBGT指数レベルの定義（閾値の降順に並べる）
const WBGT_LEVELS: WbgtLevel[] = [
  {
    threshold: 35,
    level: "disaster",
    color: "#800080",
    description: "災害級の危険",
  },
  {
    threshold: 33,
    level: "extreme",
    color: "#FF0000",
    description: "極めて危険",
  },
  {
    threshold: 31,
    level: "danger",
    color: "#FF4500",
    description: "危険",
  },
  {
    threshold: 28,
    level: "caution",
    color: "#FFA500",
    description: "厳重警戒",
  },
  {
    threshold: 25,
    level: "warning",
    color: "#FFFF00",
    description: "警戒",
  },
  {
    threshold: 21,
    level: "attention",
    color: "#00FFFF",
    description: "注意",
  },
  {
    threshold: 0,
    level: "safe",
    color: "#0000FF",
    description: "ほぼ安全",
  },
];

// データなし（WBGT値が0）の場合の色
const NO_DATA_COLOR = "#808080";

// マップストロークの色
export const CIRCLE_STROKE_COLOR = "#ffffff";

// WBGT値からレベル情報を取得する関数
export function getWbgtLevelInfo(wbgt: number): WbgtLevel {
  // 0の場合は特別扱い（データなし）
  if (wbgt === 0) {
    return {
      threshold: 0,
      level: "safe",
      color: NO_DATA_COLOR,
      description: "データなし",
    };
  }

  // 閾値以上の最初のレベルを返す
  for (const level of WBGT_LEVELS) {
    if (wbgt >= level.threshold) {
      return level;
    }
  }

  // フォールバック（通常は到達しない）
  return WBGT_LEVELS[WBGT_LEVELS.length - 1];
}

// MapLibre GL用のステップ式カラー表現を生成する関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMapLibreColorExpression(): any[] {
  const expression = [
    "case",
    ["==", ["feature-state", "wbgt"], 0],
    NO_DATA_COLOR, // データなしの場合
    [
      "step",
      ["feature-state", "wbgt"],
      WBGT_LEVELS[WBGT_LEVELS.length - 1].color, // デフォルト色（最も安全なレベル）
      ...WBGT_LEVELS.slice(0, -1)
        .reverse()
        .flatMap((level) => [level.threshold, level.color]),
    ],
  ];
  return expression;
}

// 凡例用のアイテムを生成する関数
export function createLegendItems(): { color: string; level: string }[] {
  return WBGT_LEVELS.map((level) => ({
    color: level.color,
    level: level.level,
  }));
}