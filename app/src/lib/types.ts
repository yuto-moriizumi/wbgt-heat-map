export interface TimeSeriesData {
  time: string;
  wbgt: number;
}

/**
 * 観測地点のWBGTデータプロパティ
 */
export interface WbgtProperties {
  /** 観測地点ID */
  id: string;
  /** 観測地点名 */
  name: string;
  /**
   * 時系列WBGT値の配列。
   * timePointsの各インデックスに対応する時刻のWBGT値。
   * HOURLYモードで使用される。
   * 実績データと予測データ（翌日・翌々日）の両方を含む。
   */
  valueByDateTime: number[];
  /**
   * 日別最大WBGT値の配列。
   * timePointsの各日に対応する日の最大WBGT値。
   * DAILY_MAXモードで使用される。
   */
  maxByDate: number[];
  /**
   * 日別平均WBGT値の配列。
   * timePointsの各日に対応する日の平均WBGT値。
   * DAILY_AVERAGEモードで使用される。
   */
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
   * 全ての有効な時刻（HOURLYモード用）
   * JST（日本標準時）として扱われます。
   * @example ["2025-09-04T17:00:00.000Z", "2025-09-04T18:00:00.000Z"]
   */
  hourlyTimePoints: string[];
  /**
   * 日別データが利用可能な日付（DAILY_MAXとDAILY_AVERAGEモード用）
   * JST（日本標準時）として扱われます。
   * @example ["2025-09-04T00:00:00.000Z", "2025-09-05T00:00:00.000Z"]
   */
  dailyTimePoints: string[];
}

export interface Station {
  id: string;
  name: string;
  lat: string;
  lng: string;
}