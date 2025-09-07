import { getStations } from "./get-stations";
import { fetchCombinedWbgtCsv, filterCsvDataByDateRange } from "./csv-fetcher";
import { createWbgtGeoJSONFromCsv } from "./create-geo-json";
import { WbgtDataResult } from "./types";

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
