import { parse } from "csv-parse/sync";
import dayjs from "./dayjs";
import { TimeSeriesData, WbgtGeoJSON, WbgtDataResult, Station } from "./types";
import { normalizeDateTime } from "./utils";

function createGeoJSON(csvText: string, stations: Station[]): WbgtDataResult {
  // CSVをパース
  const records = parse(csvText, {
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
  for (let stationIndex = 0; stationIndex < stationIds.length; stationIndex++) {
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
}

export { createGeoJSON as createWbgtGeoJSONFromCsv };
