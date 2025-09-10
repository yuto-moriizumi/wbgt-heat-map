import { parse } from "csv-parse/sync";
import dayjs from "./dayjs";
import { TimeSeriesData, WbgtGeoJSON, WbgtDataResult, Station } from "./types";
import { normalizeDateTime } from "./utils";
import { calculateDailyAverage } from "./wbgt-calculator";

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
  const rowData = records
    .slice(1)
    .map((row, index) => {
      if (!row) return null;
      const date = String(row[0] ?? "");
      const time = String(row[1] ?? "");
      const normalizedTime = normalizeDateTime(date, time);

      const hasValidData = row
        .slice(2)
        .some(
          (v) => v !== undefined && v !== "" && v !== null && !isNaN(Number(v))
        );

      return {
        rowIndex: index + 1,
        normalizedTime,
        hasValidData,
        row,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const timePoints = Array.from(
    new Set(
      rowData
        .filter((item) => item.hasValidData)
        .map((item) => item.normalizedTime)
    )
  ).map((time) => dayjs.tz(time, "Asia/Tokyo").toISOString());

  // 各地点に対してデータを処理
  const features = stationIds
    .map((stationId, stationIndex) => {
      const trimmedStationId = String(stationId).trim();

      // 対応する地点情報を検索
      const station = stations.find((s) => s.id === trimmedStationId);
      if (!station) {
        console.log(`地点ID ${trimmedStationId} が地点マスタに見つかりません`);
        return null;
      }

      // 時系列データを収集
      const timeSeriesData: TimeSeriesData[] = rowData
        .map((item) => {
          const row = item.row;
          if (!row || row.length <= stationIndex + 2) return null;

          const value = row[stationIndex + 2]; // Date, Timeの後の列

          if (
            value !== undefined &&
            value !== "" &&
            value !== null &&
            !isNaN(Number(value))
          ) {
            const wbgt = Number(value);

            return {
              time: item.normalizedTime,
              wbgt: wbgt,
            };
          }
          return null;
        })
        .filter((item): item is TimeSeriesData => item !== null);

      if (timeSeriesData.length === 0) {
        console.log(`地点ID ${trimmedStationId} にWBGTデータがありません`);
        return null;
      }

      // 日付ごとの最高値を計算
      const maxWbgtByDate: { [date: string]: number } = {};
      timeSeriesData.forEach((data) => {
        const date = data.time.split(" ")[0]; // YYYY-MM-DD HH:mm から日付部分を抽出
        if (!maxWbgtByDate[date] || data.wbgt > maxWbgtByDate[date]) {
          maxWbgtByDate[date] = data.wbgt;
        }
      });

      // 日付ごとの平均値を計算
      const averageWbgtByDate: { [date: string]: number } = {};
      const uniqueDates = Array.from(new Set(timeSeriesData.map(data => data.time.split(" ")[0])));
      uniqueDates.forEach(date => {
        averageWbgtByDate[date] = calculateDailyAverage(timeSeriesData, date);
      });

      // valueByDateを作成
      const valueByDate = Object.entries(maxWbgtByDate).map(([date, wbgt]) => ({
        date,
        wbgt,
      }));

      // valueByDateAverageを作成
      const valueByDateAverage = Object.entries(averageWbgtByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, wbgt]) => wbgt);

      return {
        type: "Feature" as const,
        id: trimmedStationId,
        properties: {
          id: trimmedStationId,
          name: station.name,
          valueByDateTime: timeSeriesData.map(data => data.wbgt),
          valueByDate: valueByDate,
          valueByDateAverage: valueByDateAverage,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [parseFloat(station.lng), parseFloat(station.lat)] as [
            number,
            number
          ],
        },
      };
    })
    .filter(
      (feature): feature is NonNullable<typeof feature> => feature !== null
    );

  console.log(`GeoJSONフィーチャー作成完了: ${features.length}地点`);

  const geojson: WbgtGeoJSON = {
    type: "FeatureCollection",
    features,
  };

  return { geojson, timePoints };
}

export { createGeoJSON as createWbgtGeoJSONFromCsv };
