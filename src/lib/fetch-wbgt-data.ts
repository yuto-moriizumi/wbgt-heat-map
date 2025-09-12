"use server";

import { getStations } from "./get-stations";
import { fetchCombinedWbgtCsv, fetchPredictionCsv, filterCsvDataByDateRange } from "./csv-fetcher";
import { createWbgtGeoJSONFromCsv, parsePredictionCsv } from "./create-geo-json";
import { WbgtDataResult } from "./types";

export async function fetchWbgtData(): Promise<WbgtDataResult> {
  try {
    // 地点マスタデータを取得
    const stations = await getStations();

    // 実測値データを取得
    const measuredCsvText = await fetchCombinedWbgtCsv();
    const filteredMeasuredCsvText = filterCsvDataByDateRange(measuredCsvText, 14);

    // 予測データを取得
    const predictionCsvText = await fetchPredictionCsv();
    
    let combinedCsvText = filteredMeasuredCsvText;
    
    // 予測データがある場合は変換して結合
    if (predictionCsvText.trim()) {
      const parsedPredictionCsvText = parsePredictionCsv(predictionCsvText);
      
      if (parsedPredictionCsvText.trim()) {
        // 実測値データと予測データを結合
        // 両方とも同じ形式（Date,Time,StationID1,StationID2,...）になっているはず
        const measuredLines = filteredMeasuredCsvText.trim().split('\n');
        const predictionLines = parsedPredictionCsvText.trim().split('\n');
        
        if (measuredLines.length > 0 && predictionLines.length > 1) {
          // ヘッダーは実測値データのものを使用し、予測データの行のみを追加
          combinedCsvText = measuredLines.concat(predictionLines.slice(1)).join('\n');
        }
      }
    }
    
    // CSVからGeoJSONを作成
    const result = createWbgtGeoJSONFromCsv(combinedCsvText, stations);

    return result;
  } catch (error) {
    console.error("WBGTデータの取得に失敗:", error);
    // エラー時は空のGeoJSONと空のtimePointsを返す
    return {
      geojson: {
        type: "FeatureCollection",
        features: [],
      },
      hourlyTimePoints: [],
      dailyTimePoints: [],
    };
  }
}
