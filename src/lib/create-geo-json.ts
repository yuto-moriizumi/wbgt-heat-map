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

      // maxByDateを作成
      const maxByDate = Object.entries(maxWbgtByDate).map(([, wbgt]) => wbgt);

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
          maxByDate: maxByDate,
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


function parsePredictionCsv(csvText: string): string {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length < 2) {
    return "";
  }

  const header = lines[0];
  const dataRows = lines.slice(1);

  // ヘッダーから日時情報を抽出
  const headerColumns = header.split(",");
  const dateTimeColumns = headerColumns.slice(2); // 最初の2列（空列、地点ID列）をスキップ

  // 時系列データを整理: { "YYYY/M/D H:mm": { stationId: wbgtValue } }
  const timeSeriesMap: { [timeKey: string]: { [stationId: string]: string } } = {};
  const allStationIds = new Set<string>();

  // 各データ行を処理
  dataRows.forEach(row => {
    const columns = row.split(",");
    if (columns.length < 3) return; // 最低3列必要

    const stationId = columns[0].trim();
    if (!stationId) return; // 地点IDが空の場合はスキップ

    allStationIds.add(stationId);

    // 各時間帯のデータを処理
    dateTimeColumns.forEach((dateTimeStr, index) => {
      if (dateTimeStr && dateTimeStr.trim()) {
        const wbgtValue = columns[index + 2]; // 対応するWBGT値

        if (wbgtValue && wbgtValue.trim() && !isNaN(Number(wbgtValue.trim()))) {
          // 日時文字列をパースしてフォーマット (YYYYMMDDHH形式)
          const dateTime = dayjs(dateTimeStr.trim(), "YYYYMMDDHH");
          if (dateTime.isValid()) {
            const formattedDate = dateTime.format("YYYY/M/D"); // 実測値データと同じ形式
            const formattedTime = dateTime.format("H:mm"); // 実測値データと同じ形式
            const timeKey = `${formattedDate},${formattedTime}`;

            if (!timeSeriesMap[timeKey]) {
              timeSeriesMap[timeKey] = {};
            }
            // 予測データの値は10倍されているため、10で割って正しいWBGT値に変換
            const originalValue = Number(wbgtValue.trim());
            const normalizedValue = originalValue / 10;
            console.log(`予測データ正規化: ${wbgtValue.trim()} -> ${originalValue} -> ${normalizedValue}`);
            timeSeriesMap[timeKey][stationId] = normalizedValue.toString();
          }
        }
      }
    });
  });

  if (Object.keys(timeSeriesMap).length === 0) {
    return "";
  }

  // 地点IDをソート
  const sortedStationIds = Array.from(allStationIds).sort();

  // 実測値データと同じ横持ち形式のCSVを作成
  const csvRows: string[] = [];
  
  // ヘッダー行: Date,Time,StationID1,StationID2,...
  csvRows.push(`Date,Time,${sortedStationIds.join(",")}`);

  // データ行を時系列順にソート
  const sortedTimeKeys = Object.keys(timeSeriesMap).sort((a, b) => {
    const [dateA, timeA] = a.split(",");
    const [dateB, timeB] = b.split(",");
    const datetimeA = dayjs(`${dateA} ${timeA}`, "YYYY/M/D H:mm");
    const datetimeB = dayjs(`${dateB} ${timeB}`, "YYYY/M/D H:mm");
    return datetimeA.valueOf() - datetimeB.valueOf();
  });

  // データ行を作成
  sortedTimeKeys.forEach(timeKey => {
    const stationData = timeSeriesMap[timeKey];
    const values = sortedStationIds.map(stationId => stationData[stationId] || "");
    csvRows.push(`${timeKey},${values.join(",")}`);
  });

  return csvRows.join("\n");
}

export { createGeoJSON as createWbgtGeoJSONFromCsv, parsePredictionCsv };
