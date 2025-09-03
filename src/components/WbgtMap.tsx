"use client";

import { useCallback, useState, useMemo, useRef } from "react";
import {
  Map,
  Source,
  Layer,
  Popup,
  MapMouseEvent,
  MapRef,
  LayerProps,
} from "react-map-gl/maplibre";
import TimeSlider from "./TimeSlider";

const wbgtLayer: LayerProps = {
  id: "wbgt-circles",
  type: "circle",
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 10, 8, 15, 12],
    "circle-color": ["get", "riskColor"],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
    "circle-opacity": 0.8,
  },
};

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
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [popupInfo, setPopupInfo] = useState<{
    longitude: number;
    latitude: number;
    name: string;
    wbgt: number;
    riskLevel: string;
    time: string;
    id: string;
  } | null>(null);
  const mapRef = useRef<MapRef>(null);

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

  // 各時刻に対応するGeoJSONデータを事前に計算
  const geoJSONByTime = useMemo(() => {
    performance.mark("geoJSONByTime-start");

    if (timePoints.length === 0) {
      performance.mark("geoJSONByTime-end");
      const measure = performance.measure(
        "geoJSONByTime",
        "geoJSONByTime-start",
        "geoJSONByTime-end"
      );
      console.log(`geoJSONByTime calculation time: ${measure.duration} ms`);
      return [wbgtData];
    }

    const result = timePoints.map((targetTime) => {
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
            return null;
          }
          // 時系列データがない場合は元のデータを使用
          return feature;
        })
        .filter((feature): feature is GeoJSON.Feature => feature !== null);

      return {
        type: "FeatureCollection" as const,
        features,
      };
    });

    performance.mark("geoJSONByTime-end");
    const measure = performance.measure(
      "geoJSONByTime",
      "geoJSONByTime-start",
      "geoJSONByTime-end"
    );
    console.log(`geoJSONByTime calculation time: ${measure.duration} ms`);

    return result;
  }, [wbgtData, timePoints]);

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
  const handleTimeChange = useCallback((timeIndex: number) => {
    setCurrentTimeIndex(timeIndex);
  }, []);

  // 再生/一時停止のハンドラー
  const handlePlayToggle = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // 地図クリックのハンドラー
  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      const { features } = event;
      if (features && features.length > 0) {
        const feature = features[0];
        const { name, wbgt, id, time } = feature.properties;
        const translatedRiskLevel = getTranslatedRiskLevel(wbgt);
        setPopupInfo({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
          name,
          wbgt,
          riskLevel: translatedRiskLevel,
          time: time || "",
          id,
        });
      } else {
        setPopupInfo(null);
      }
    },
    [getTranslatedRiskLevel]
  );

  const currentGeoJSON = useMemo(
    () =>
      geoJSONByTime[currentTimeIndex] || {
        type: "FeatureCollection" as const,
        features: [],
      },
    [geoJSONByTime, currentTimeIndex]
  );

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 139.7671,
          latitude: 35.6812,
          zoom: 5,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={{
          version: 8,
          sources: {
            "gsi-std": {
              type: "raster",
              tiles: [
                "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
              ],
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
        }}
        onClick={handleMapClick}
        interactiveLayerIds={["wbgt-circles"]}
      >
        <Source id="wbgt-points" type="geojson" data={currentGeoJSON}>
          <Layer {...wbgtLayer} />
        </Source>

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            anchor="bottom"
          >
            <div className="p-3">
              <h3 className="font-bold text-lg text-black">{popupInfo.name}</h3>
              <p
                className="text-2xl font-bold"
                style={{
                  color:
                    popupInfo.riskLevel === translations.disaster
                      ? "#800080"
                      : popupInfo.riskLevel === translations.extreme
                      ? "#FF0000"
                      : popupInfo.riskLevel === translations.danger
                      ? "#FF4500"
                      : popupInfo.riskLevel === translations.caution
                      ? "#FFA500"
                      : popupInfo.riskLevel === translations.warning
                      ? "#FFFF00"
                      : popupInfo.riskLevel === translations.attention
                      ? "#00FFFF"
                      : "#0000FF",
                }}
              >
                {popupInfo.wbgt}
              </p>
              <p className="text-sm text-black font-medium">
                {popupInfo.riskLevel}
              </p>
              {popupInfo.time && (
                <p className="text-xs text-gray-600 mt-1">
                  時刻: {popupInfo.time}
                </p>
              )}
              <p className="text-xs text-gray-700 mt-1">
                {translations.stationName}: {popupInfo.id}
              </p>
            </div>
          </Popup>
        )}
      </Map>

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
    </div>
  );
}
