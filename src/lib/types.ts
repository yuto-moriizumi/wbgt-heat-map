export interface TimeSeriesData {
  time: string;
  wbgt: number;
}

export interface WbgtProperties {
  id: string;
  name: string;
  valueByDateTime: number[];
  maxByDate: number[];
  valueByDateAverage: number[];
}

export type WbgtGeoJSON = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  WbgtProperties
>;

import { DISPLAY_MODES } from "./wbgt-config";

export type DisplayMode = keyof typeof DISPLAY_MODES;

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
