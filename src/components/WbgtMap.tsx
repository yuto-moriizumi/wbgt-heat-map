"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import TimeSlider from "./TimeSlider";

interface TimeSeriesData {
  time: string;
  wbgt: number;
  riskLevel: string;
  riskColor: string;
}

interface WbgtMapProps {
  wbgtData: GeoJSON.FeatureCollection;
  translations: {
    stationName: string;
    wbgt: string;
    riskLevel: string;
    legendTitle: string;
    disaster: string;
    extreme: string;
    danger: string;
    caution: string;
    warning: string;
    attention: string;
    safe: string;
  };
}

export default function WbgtMap({ wbgtData, translations }: WbgtMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 全ての時系列データから時刻一覧を取得
  const timePoints = useMemo(() => {
    const timeSet = new Set<string>();

    wbgtData.features.forEach((feature) => {
      const timeSeriesData = feature.properties?.timeSeriesData as
        | TimeSeriesData[]
        | undefined;
      if (timeSeriesData) {
        timeSeriesData.forEach((data) => timeSet.add(data.time));
      }
    });

    return Array.from(timeSet).sort();
  }, [wbgtData]);

  // 指定した時刻でのGeoJSONデータを生成
  const getGeoJSONForTime = useCallback(
    (timeIndex: number): GeoJSON.FeatureCollection => {
      if (timePoints.length === 0) return wbgtData;

      const targetTime = timePoints[timeIndex];

      const features = wbgtData.features
        .map((feature) => {
          const timeSeriesData = feature.properties?.timeSeriesData as
            | TimeSeriesData[]
            | undefined;

          if (timeSeriesData) {
            const dataForTime = timeSeriesData.find(
              (data) => data.time === targetTime
            );
            if (dataForTime) {
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  wbgt: dataForTime.wbgt,
                  riskLevel: dataForTime.riskLevel,
                  riskColor: dataForTime.riskColor,
                  time: dataForTime.time,
                },
              };
            }
          }

          // 時系列データがない場合は元のデータを使用
          return feature;
        })
        .filter((feature) => feature !== null);

      return {
        type: "FeatureCollection",
        features,
      };
    },
    [wbgtData, timePoints]
  );

  // WBGTの値から翻訳されたリスクレベルを取得する関数
  const getTranslatedRiskLevel = useCallback(
    (wbgt: number): string => {
      if (wbgt >= 35) return translations.disaster;
      if (wbgt >= 33) return translations.extreme;
      if (wbgt >= 31) return translations.danger;
      if (wbgt >= 28) return translations.caution;
      if (wbgt >= 25) return translations.warning;
      if (wbgt >= 21) return translations.attention;
      return translations.safe;
    },
    [translations]
  );

  // 時刻変更のハンドラー
  const handleTimeChange = useCallback(
    (timeIndex: number) => {
      setCurrentTimeIndex(timeIndex);

      if (mapRef.current) {
        const currentGeoJSON = getGeoJSONForTime(timeIndex);
        const source = mapRef.current.getSource(
          "wbgt-points"
        ) as maplibregl.GeoJSONSource;
        if (source) {
          source.setData(currentGeoJSON);
        }
      }
    },
    [getGeoJSONForTime]
  );

  // 再生/一時停止のハンドラー
  const handlePlayToggle = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 初期表示用のGeoJSONデータ
    const initialGeoJSON = getGeoJSONForTime(currentTimeIndex);

    // 地図を初期化
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "gsi-std": {
            type: "raster",
            tiles: ["https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '地図データ © <a href="https://www.gsi.go.jp/" target="_blank" rel="noreferrer">国土地理院</a>',
          },
        },
        layers: [
          {
            id: "gsi-std",
            type: "raster",
            source: "gsi-std",
          },
        ],
      },
      center: [139.7671, 35.6812], // 東京駅付近
      zoom: 5,
      maxZoom: 18,
    });

    mapRef.current = map;

    // 地図読み込み完了後にWBGTデータを追加
    map.on("load", () => {
      // WBGTデータソースを追加
      map.addSource("wbgt-points", {
        type: "geojson",
        data: initialGeoJSON,
      });

      // WBGT観測点を円で表示
      map.addLayer({
        id: "wbgt-circles",
        type: "circle",
        source: "wbgt-points",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            4,
            10,
            8,
            15,
            12,
          ],
          "circle-color": ["get", "riskColor"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.8,
        },
      });

      // ポップアップの設定
      map.on("click", "wbgt-circles", (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const { name, wbgt, id, time } = feature.properties!;
          const translatedRiskLevel = getTranslatedRiskLevel(wbgt);

          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
              `
              <div class="p-3">
                <h3 class="font-bold text-lg text-black">${name}</h3>
                <p class="text-2xl font-bold" style="color: ${
                  feature.properties!.riskColor
                }">
                  ${wbgt}
                </p>
                <p class="text-sm text-black font-medium">${translatedRiskLevel}</p>
                ${
                  time
                    ? `<p class="text-xs text-gray-600 mt-1">時刻: ${time}</p>`
                    : ""
                }
                <p class="text-xs text-gray-700 mt-1">${
                  translations.stationName
                }: ${id}</p>
              </div>
            `
            )
            .addTo(map);
        }
      });

      // カーソル変更
      map.on("mouseenter", "wbgt-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "wbgt-circles", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
    };
  }, [
    getGeoJSONForTime,
    currentTimeIndex,
    translations,
    getTranslatedRiskLevel,
  ]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 時系列スライダー */}
      {timePoints.length > 1 && (
        <div className="absolute top-4 left-4">
          <TimeSlider
            timePoints={timePoints}
            currentTimeIndex={currentTimeIndex}
            onTimeChange={handleTimeChange}
            isPlaying={isPlaying}
            onPlayToggle={handlePlayToggle}
            playbackSpeed={2000}
          />
        </div>
      )}

      {/* 凡例 */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg">
        <h4 className="font-bold text-sm mb-2 text-black">
          {translations.legendTitle}
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#800080" }}
            ></div>
            <span className="text-black font-medium">
              {translations.disaster}
            </span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#FF0000" }}
            ></div>
            <span className="text-black font-medium">
              {translations.extreme}
            </span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#FF4500" }}
            ></div>
            <span className="text-black font-medium">
              {translations.danger}
            </span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#FFA500" }}
            ></div>
            <span className="text-black font-medium">
              {translations.caution}
            </span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#FFFF00" }}
            ></div>
            <span className="text-black font-medium">
              {translations.warning}
            </span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#00FFFF" }}
            ></div>
            <span className="text-black font-medium">
              {translations.attention}
            </span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#0000FF" }}
            ></div>
            <span className="text-black font-medium">{translations.safe}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
