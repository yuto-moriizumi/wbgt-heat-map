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

export interface DailyMaxData {
  date: string;
  wbgt: number;
}

export interface WbgtProperties {
  id: string;
  name: string;
  valueByDateTime: TimeSeriesData[];
  valueByDate: DailyMaxData[];
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

export interface Station {
  id: string;
  name: string;
  lat: string;
  lng: string;
}
