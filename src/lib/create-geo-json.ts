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

  if (records.length < 2) {
    throw new Error("CSVデータが空または不正です");
  }

  // ヘッダー行から地点IDを取得
  const csvHeader = records[0];
  const stationIds = csvHeader.slice(2); // 最初の2列（Date, Time）をスキップ

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

  // モードごとのtimePointsを生成
  const hourlyTimePoints = timePoints;

  // 日別データが利用可能な日付を抽出（午前9時以降のデータが存在する日）
  const dailyTimePoints = Array.from(
    new Set(
      rowData
        .filter((item) => {
          const dateTime = dayjs.tz(item.normalizedTime, "Asia/Tokyo");
          const hour = dateTime.hour();
          return item.hasValidData && hour >= 9; // 午前9時以降のデータがある日
        })
        .map((item) =>
          dayjs
            .tz(item.normalizedTime, "Asia/Tokyo")
            .startOf("day")
            .hour(12)
            .toISOString()
        )
    )
  ).sort();

  const modeTimePoints = {
    hourlyTimePoints,
    dailyTimePoints,
  };

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
        // 日付部分を抽出（YYYY/MM/DD HH:mm 形式に対応）
        const datePart = data.time.split(" ")[0];
        const date = datePart.includes("/") 
          ? datePart.replace(/\//g, "-") // YYYY/MM/DD を YYYY-MM-DD に変換
          : datePart; // すでに YYYY-MM-DD 形式の場合はそのまま
        
        if (!maxWbgtByDate[date] || data.wbgt > maxWbgtByDate[date]) {
          maxWbgtByDate[date] = data.wbgt;
        }
      });

      // 日付ごとの平均値を効率的に計算
      const valueByDateAverage = calculateDailyAverage(
        timeSeriesData,
        dailyTimePoints
      );

      // maxByDateを作成
      const maxByDate = Object.entries(maxWbgtByDate).map(([, wbgt]) => wbgt);

      const result = {
        type: "Feature" as const,
        id: trimmedStationId,
        properties: {
          id: trimmedStationId,
          name: station.name,
          valueByDateTime: timeSeriesData.map((data) => data.wbgt),
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

      return result;
    })
    .filter(
      (feature): feature is NonNullable<typeof feature> => feature !== null
    );

  const geojson: WbgtGeoJSON = {
    type: "FeatureCollection",
    features,
  };

  return { geojson, ...modeTimePoints };
}

function parsePredictionCsv(csvText: string): string {
  const lines = csvText
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    return "";
  }

  const header = lines[0];
  const dataRows = lines.slice(1);

  // ヘッダーから日時情報を抽出
  const headerColumns = header.split(",");
  const dateTimeColumns = headerColumns.slice(2); // 最初の2列（空列、地点ID列）をスキップ

  // 時系列データを整理: { "YYYY/M/D H:mm": { stationId: wbgtValue } }
  const timeSeriesMap: { [timeKey: string]: { [stationId: string]: string } } =
    {};
  const allStationIds = new Set<string>();

  // 各データ行を処理
  dataRows.forEach((row) => {
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
  sortedTimeKeys.forEach((timeKey) => {
    const stationData = timeSeriesMap[timeKey];
    const values = sortedStationIds.map(
      (stationId) => stationData[stationId] || ""
    );
    csvRows.push(`${timeKey},${values.join(",")}`);
  });

  return csvRows.join("\n");
}

export { createGeoJSON as createWbgtGeoJSONFromCsv, parsePredictionCsv };
