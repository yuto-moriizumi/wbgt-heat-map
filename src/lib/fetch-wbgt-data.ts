"use server";

import { getStations } from "./get-stations";
import { fetchCombinedWbgtCsv, filterCsvDataByDateRange } from "./csv-fetcher";
import { createWbgtGeoJSONFromCsv } from "./create-geo-json";
import { WbgtDataResult, Station } from "./types";
import { parse } from "csv-parse/sync";
import dayjs from "./dayjs";

export async function fetchWbgtData(): Promise<WbgtDataResult> {
  try {
    // 地点マスタデータを取得
    const stations = await getStations();
    console.log(`地点マスタデータを取得: ${stations.length}地点`);

    // 結合されたCSVデータを取得
    const combinedCsvText = await fetchCombinedWbgtCsv();

    // 過去14日分のデータにフィルタリング
    const filteredCsvText = filterCsvDataByDateRange(combinedCsvText, 14);

    // CSVからGeoJSONを作成
    const result = createWbgtGeoJSONFromCsv(filteredCsvText, stations);

    return result;
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

export async function fetchMultipleDailyMaxWbgtData(
  dateRange: dayjs.Dayjs[] | string[]
): Promise<WbgtDataResult> {
  console.log(
    "fetchMultipleDailyMaxWbgtData called with dateRange length:",
    Array.isArray(dateRange) ? dateRange.length : "not array"
  );

  try {
    // 地点マスタデータを取得
    const stations = await getStations();
    console.log(`地点マスタデータを取得: ${stations.length}地点`);

    // 結合されたCSVデータを取得
    const combinedCsvText = await fetchCombinedWbgtCsv();
    console.log("Combined CSV text length:", combinedCsvText.length);

    // dateRangeがstring[]の場合、dayjsオブジェクトに変換
    const dayjsDateRange: dayjs.Dayjs[] = dateRange.map((date) =>
      typeof date === "string" ? dayjs(date) : date
    );

    console.log("Converted to dayjs objects, length:", dayjsDateRange.length);
    console.log(
      "Date range:",
      dayjsDateRange.map((d) => d.format("YYYY-MM-DD"))
    );

    // 指定された日付範囲のデータをフィルタリング
    const startDate = dayjsDateRange[0];
    const endDate = dayjsDateRange[dayjsDateRange.length - 1];
    const filteredCsvText = filterCsvDataByDateRange(
      combinedCsvText,
      startDate,
      endDate
    );

    console.log("Filtered CSV text length:", filteredCsvText.length);

    // CSVから複数日の最高値GeoJSONを作成
    const result = createDailyMaxGeoJSONFromCsvRange(
      filteredCsvText,
      stations,
      startDate,
      endDate
    );

    console.log(
      "Created result with features:",
      result.geojson.features.length,
      "timePoints:",
      result.timePoints.length
    );

    return result;
  } catch (error) {
    console.error("複数日最高WBGTデータの取得に失敗:", error);
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

export async function fetchDailyMaxWbgtDataRange(
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs
): Promise<WbgtDataResult> {
  try {
    // 地点マスタデータを取得
    const stations = await getStations();
    console.log(`地点マスタデータを取得: ${stations.length}地点`);

    // 結合されたCSVデータを取得
    const combinedCsvText = await fetchCombinedWbgtCsv();

    // 指定期間のデータにフィルタリング
    const filteredCsvText = filterCsvDataByDateRange(
      combinedCsvText,
      startDate,
      endDate
    );

    // CSVから日最高値のGeoJSONを作成
    const result = createDailyMaxGeoJSONFromCsvRange(
      filteredCsvText,
      stations,
      startDate,
      endDate
    );

    return result;
  } catch (error) {
    console.error("日最高WBGTデータ範囲の取得に失敗:", error);
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

function createDailyMaxGeoJSONFromCsvRange(
  csvText: string,
  stations: Station[],
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs
): WbgtDataResult {
  // CSVをパース
  const records = parse(csvText, {
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`指定期間のCSVレコード数: ${records.length}`);

  if (records.length < 2) {
    return {
      geojson: {
        type: "FeatureCollection",
        features: [],
      },
      timePoints: [],
    };
  }

  // ヘッダー行から地点IDを取得
  const csvHeader = records[0];
  const stationIds = csvHeader.slice(2); // 最初の2列（Date, Time）をスキップ

  console.log(`ヘッダーから地点ID数: ${stationIds.length}個`);

  // 期間内の各日付の最高WBGT値を計算
  const maxWbgtByStationAndDate: { [key: string]: { [date: string]: number } } =
    {};

  // 期間内の日付リストを作成
  const dateList: string[] = [];
  let currentDate = startDate.clone();
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, "day")) {
    dateList.push(currentDate.format("YYYY-MM-DD"));
    currentDate = currentDate.add(1, "day");
  }

  console.log(`対象日付リスト: ${dateList.join(", ")}`);

  for (let rowIndex = 1; rowIndex < records.length; rowIndex++) {
    const row = records[rowIndex];
    if (!row) continue;

    const dateStr = row[0]?.trim();
    if (!dateStr || !dateList.includes(dateStr)) continue; // 指定期間外はスキップ

    for (
      let stationIndex = 0;
      stationIndex < stationIds.length;
      stationIndex++
    ) {
      const stationId = String(stationIds[stationIndex]).trim();
      const value = row[stationIndex + 2]; // Date, Timeの後の列

      if (value && value !== "" && !isNaN(Number(value))) {
        let wbgt = Number(value);

        // WBGTが10倍されている場合の調整
        if (wbgt > 100) {
          wbgt = wbgt / 10;
        }

        if (!maxWbgtByStationAndDate[stationId]) {
          maxWbgtByStationAndDate[stationId] = {};
        }

        if (
          !maxWbgtByStationAndDate[stationId][dateStr] ||
          wbgt > maxWbgtByStationAndDate[stationId][dateStr]
        ) {
          maxWbgtByStationAndDate[stationId][dateStr] = wbgt;
        }
      }
    }
  }

  console.log(
    `計算された駅の数: ${Object.keys(maxWbgtByStationAndDate).length}`
  );

  // GeoJSONフィーチャーを作成
  const features = [];

  for (const stationId in maxWbgtByStationAndDate) {
    // 対応する地点情報を検索
    const station = stations.find((s) => s.id === stationId);
    if (!station) {
      console.log(`地点ID ${stationId} が地点マスタに見つかりません`);
      continue;
    }

    // 日付ごとの最高値をvalueByDateとしてまとめる
    const valueByDate = dateList.map((date) => ({
      date: date,
      wbgt: maxWbgtByStationAndDate[stationId][date] || 0,
    })); // 0のデータも保持（フィルタリングしない）

    if (valueByDate.length === 0) continue;

    features.push({
      type: "Feature" as const,
      id: stationId,
      properties: {
        id: stationId,
        name: station.name,
        valueByDateTime: [], // 日最高値モードでは使用しない
        valueByDate: valueByDate,
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

  console.log(`日最高値GeoJSONフィーチャー作成完了: ${features.length}地点`);

  const geojson = {
    type: "FeatureCollection" as const,
    features,
  };

  // timePointsは日付のリスト
  const timePoints = dateList.map((date) => dayjs(date).toISOString());

  return { geojson, timePoints };
}
