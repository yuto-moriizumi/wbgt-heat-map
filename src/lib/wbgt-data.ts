import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import path from "path";
import dayjs from "./dayjs";

export interface WbgtData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  wbgt: number;
  riskLevel: string;
  riskColor: string;
}

export interface TimeSeriesData {
  time: string;
  wbgt: number;
}

export interface WbgtProperties {
  id: string;
  name: string;
  timeSeriesData: TimeSeriesData[];
}

export type WbgtGeoJSON = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  WbgtProperties
>;

export interface WbgtDataResult {
  geojson: WbgtGeoJSON;
  /**
   * WBGTデータが存在する時刻のISO文字列配列。
   * JST（日本標準時）として扱われます。
   * @example ["2025-09-04T17:00:00.000Z", "2025-09-04T18:00:00.000Z"]
   */
  timePoints: string[];
}

interface Station {
  id: string;
  name: string;
  lat: string;
  lng: string;
}

// 日時文字列を正規化する関数
function normalizeDateTime(date: string, time: string): string {
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
function getRiskLevel(wbgt: number): { level: string; color: string } {
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

// 地点マスタデータを取得
async function getStations(): Promise<Station[]> {
  try {
    const stationsPath = path.join(
      process.cwd(),
      "public",
      "data",
      "stations.json"
    );
    const stationsData = readFileSync(stationsPath, "utf-8");
    const stations: Station[] = JSON.parse(stationsData);
    return stations;
  } catch (error) {
    console.error("地点マスタデータの取得に失敗:", error);
    return [];
  }
}

export async function fetchWbgtData(): Promise<WbgtDataResult> {
  try {
    // 現在の年月を取得（dayjsを使用）
    const now = dayjs();
    const currentYearMonth = now.format("YYYYMM");
    const prevYearMonth = now.subtract(1, "month").format("YYYYMM");

    console.log(`今月: ${currentYearMonth}, 先月: ${prevYearMonth}`);

    // 今月と先月の両方のデータを取得（先月、今月の順で）
    const urls = [
      `https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_${prevYearMonth}.csv`,
      `https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_${currentYearMonth}.csv`,
    ];

    // 両方のURLからデータを並行して取得
    const fetchPromises = urls.map(async (url) => {
      try {
        console.log(`データ取得を試行: ${url}`);
        const response = await fetch(url);
        if (response.ok) {
          const csvText = await response.text();
          console.log(`データ取得成功: ${url}`);
          return csvText;
        } else {
          console.log(`データ取得失敗 (${response.status}): ${url}`);
          return null;
        }
      } catch (error) {
        console.log(`接続エラー: ${url} - ${error}`);
        return null;
      }
    });

    const csvTexts = (await Promise.all(fetchPromises)).filter(
      (text): text is string => text !== null
    );

    console.log(`${csvTexts.length}つのCSVデータを取得しました`);

    // 複数のCSVデータを時系列順に正しく結合
    let header = "";
    const allDataRows: string[] = [];

    for (let i = 0; i < csvTexts.length; i++) {
      const lines = csvTexts[i].trim().split(/\r?\n/);
      if (lines.length === 0) continue;

      // 最初の有効なCSVからヘッダーを取得
      if (header === "" && lines.length > 0) {
        header = lines[0];
      }

      // データ行を収集
      const dataRows = lines.slice(1).filter((line) => line.trim() !== "");
      allDataRows.push(...dataRows);
    }

    if (header === "") {
      throw new Error("有効なCSVヘッダーが見つかりませんでした");
    }

    const combinedCsvText = [header, ...allDataRows].join("\n");

    console.log(
      "CSVデータを結合・ソートしました:",
      combinedCsvText.substring(0, 400) + "..."
    );

    // 地点マスタデータを取得
    const stations = await getStations();
    console.log(`地点マスタデータを取得: ${stations.length}地点`);

    // CSVをパース
    const records = parse(combinedCsvText, {
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`CSVレコード数: ${records.length}`);

    if (records.length < 2) {
      throw new Error("CSVデータが空または不正です");
    }

    // ヘッダー行から地点IDを取得
    const csvHeader = records[0];
    const stationIds = csvHeader.slice(2); // 最初の2列（Date, Time）をスキップ

    console.log(`ヘッダーから地点ID数: ${stationIds.length}個`);

    // 行ごとの正規化済み時刻と、行に有効値があるかを事前計算
    const rowTimes: string[] = [];
    const rowHasAny: boolean[] = [];
    const timePoints: string[] = [];
    const timeSeen = new Set<string>();

    for (let rowIndex = 1; rowIndex < records.length; rowIndex++) {
      const row = records[rowIndex];
      if (!row) continue;
      const date = String(row[0] ?? "");
      const time = String(row[1] ?? "");
      const t = normalizeDateTime(date, time);
      rowTimes[rowIndex] = t;

      let hasAny = false;
      for (let col = 2; col < row.length; col++) {
        const v = row[col];
        if (v !== undefined && v !== "" && !isNaN(Number(v))) {
          hasAny = true;
          break;
        }
      }
      rowHasAny[rowIndex] = hasAny;
      if (hasAny && !timeSeen.has(t)) {
        timeSeen.add(t);
        timePoints.push(dayjs.tz(t, "Asia/Tokyo").toISOString()); // JSTとしてISO文字列に変換
      }
    }

    // GeoJSONフィーチャーを作成
    const features = [];

    // 各地点に対してデータを処理
    for (
      let stationIndex = 0;
      stationIndex < stationIds.length;
      stationIndex++
    ) {
      const stationId = String(stationIds[stationIndex]).trim();

      // 対応する地点情報を検索
      const station = stations.find((s) => s.id === stationId);
      if (!station) {
        console.log(`地点ID ${stationId} が地点マスタに見つかりません`);
        continue;
      }

      // 時系列データを収集
      const timeSeriesData: TimeSeriesData[] = [];

      // 各時刻のデータを処理（ヘッダー行をスキップ）
      for (let rowIndex = 1; rowIndex < records.length; rowIndex++) {
        const row = records[rowIndex];
        if (!row || row.length <= stationIndex + 2) continue;

        const value = row[stationIndex + 2]; // Date, Timeの後の列

        if (value && value !== "" && !isNaN(Number(value))) {
          let wbgt = Number(value);

          // WBGTが10倍されている場合の調整
          if (wbgt > 100) {
            wbgt = wbgt / 10;
          }

          const timeString = rowTimes[rowIndex];

          timeSeriesData.push({
            time: timeString,
            wbgt: wbgt,
          });
        }
      }

      if (timeSeriesData.length === 0) {
        console.log(`地点ID ${stationId} にWBGTデータがありません`);
        continue;
      }

      features.push({
        type: "Feature" as const,
        id: stationId, // トップレベルidを追加
        properties: {
          id: stationId,
          name: station.name,
          timeSeriesData: timeSeriesData,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [parseFloat(station.lng), parseFloat(station.lat)] as [
            number,
            number
          ],
        },
      });
    }

    console.log(`GeoJSONフィーチャー作成完了: ${features.length}地点`);

    const geojson: WbgtGeoJSON = {
      type: "FeatureCollection",
      features,
    };

    return { geojson, timePoints };
  } catch (error) {
    console.error("WBGTデータの取得に失敗:", error);
    // エラー時は空のGeoJSONと空のtimePointsを返す
    return {
      geojson: {
        type: "FeatureCollection",
        features: [],
      },
      timePoints: [],
    };
  }
}
