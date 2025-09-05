"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  Map as MapGL,
  Source,
  Layer,
  Popup,
  MapMouseEvent,
  MapRef,
  LayerProps,
} from "react-map-gl/maplibre";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Dayjs } from "dayjs";

// マップスタイルをコンポーネント外に定義（ちらつき防止）
const baseMapStyle = {
  version: 8 as const,
  sources: {
    "gsi-std": {
      type: "raster" as const,
      tiles: ["https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '地図データ © <a href="https://www.gsi.go.jp/" target="_blank" rel="noreferrer">国土地理院</a>',
    },
  },
  layers: [
    {
      id: "gsi-std",
      type: "raster" as const,
      source: "gsi-std",
    },
  ],
};

const wbgtLayer: LayerProps = {
  id: "wbgt-circles",
  type: "circle",
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 10, 8, 15, 12],
    "circle-color": [
      "coalesce",
      ["feature-state", "riskColor"],
      "#cccccc", // デフォルト色
    ],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
    "circle-opacity": 0.8,
  },
};

interface WbgtMapCoreProps {
  wbgtData: GeoJSON.FeatureCollection;
  currentTimeIndex: number;
  timePoints: Dayjs[];
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

export default function WbgtMapCore({
  wbgtData,
  currentTimeIndex,
  timePoints,
  translations,
}: WbgtMapCoreProps) {
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

  // 地図クリックのハンドラー
  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      const { features } = event;
      if (features && features.length > 0) {
        const feature = features[0];
        const { name, id, timeSeriesData } = feature.properties;
        const map = mapRef.current?.getMap();
        if (map) {
          const featureState = map.getFeatureState({
            source: "wbgt-points",
            id: id,
          });
          const wbgt = featureState?.wbgt || (timeSeriesData && timeSeriesData.length > 0 ? timeSeriesData[0].wbgt : 0);

          const time = featureState?.time || (timeSeriesData && timeSeriesData.length > 0 ? timeSeriesData[0].time : "");
          const translatedRiskLevel = getTranslatedRiskLevel(wbgt);
          setPopupInfo({
            longitude: event.lngLat.lng,
            latitude: event.lngLat.lat,
            name,
            wbgt,
            riskLevel: translatedRiskLevel,
            time,
            id,
          });
        }
      } else {
        setPopupInfo(null);
      }
    },
    [getTranslatedRiskLevel]
  );

  // ルックアップマップ: stationId -> timeSeriesData[]
  const timeSeriesLookup = (() => {
    const lookup = new Map<
      string,
      { time: string; wbgt: number; riskLevel: string; riskColor: string }[]
    >();
    wbgtData.features.forEach((feature) => {
      const id = feature.properties?.id;
      const timeSeriesData = feature.properties?.timeSeriesData as
        | { time: string; wbgt: number; riskLevel: string; riskColor: string }[]
        | undefined;
      if (id && timeSeriesData) {
        lookup.set(id, timeSeriesData);
      }
    });
    return lookup;
  })();

  // feature-stateを適用する関数
  const applyFeatureState = useCallback((map: MapLibreMap, time: string) => {
    timeSeriesLookup.forEach(
      (
        timeSeriesData: {
          time: string;
          wbgt: number;
          riskLevel: string;
          riskColor: string;
        }[],
        stationId: string
      ) => {
        const dataForTime = timeSeriesData.find((data) => data.time === time);
        if (dataForTime) {
          map.setFeatureState(
            {
              source: "wbgt-points",
              id: stationId,
            },
            {
              riskColor: dataForTime.riskColor,
              wbgt: dataForTime.wbgt,
              riskLevel: dataForTime.riskLevel,
              time: dataForTime.time,
            }
          );
        }
      }
    );
  }, [timeSeriesLookup]);

  // currentTimeIndex変更時にfeature-stateを更新
  useEffect(() => {
    if (!mapRef.current || timePoints.length === 0) return;

    const map = mapRef.current.getMap();
    const currentTime = timePoints[currentTimeIndex].format('YYYY/MM/DD HH:mm');
    applyFeatureState(map, currentTime);
  }, [currentTimeIndex, timePoints, applyFeatureState, timeSeriesLookup]);

  // マップロード時の初期feature-state設定
  const handleMapLoad = useCallback(
    (event: { target: MapLibreMap }) => {
      const map = event.target;
      const currentTime = timePoints[currentTimeIndex]?.format('YYYY/MM/DD HH:mm');

      const applyInitialState = () => {
        if (map.getSource("wbgt-points")) {
          if (currentTime) {
            applyFeatureState(map, currentTime);
          } else {
            // 初期状態ではtimeSeriesDataの最初の要素を使用
            wbgtData.features.forEach((feature) => {
              const id = feature.properties?.id;
              const timeSeriesData = feature.properties?.timeSeriesData;
              if (id && timeSeriesData && timeSeriesData.length > 0) {
                const initialData = timeSeriesData[0];
                map.setFeatureState(
                  {
                    source: "wbgt-points",
                    id: id,
                  },
                  {
                    riskColor: initialData.riskColor,
                    wbgt: initialData.wbgt,
                    riskLevel: initialData.riskLevel,
                    time: initialData.time,
                  }
                );
              }
            });
          }
        }
      };

      if (map.isStyleLoaded()) {
        applyInitialState();
      } else {
        map.on("style.load", applyInitialState);
      }
    },
    [timePoints, currentTimeIndex, applyFeatureState, wbgtData]
  );

  return (
    <div className="relative w-full h-full">
      <MapGL
        ref={mapRef}
        initialViewState={{
          longitude: 139.7671,
          latitude: 35.6812,
          zoom: 5,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={baseMapStyle}
        onClick={handleMapClick}
        onLoad={handleMapLoad}
        interactiveLayerIds={["wbgt-circles"]}
      >
        <Source id="wbgt-points" type="geojson" data={wbgtData}>
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
      </MapGL>
    </div>
  );
}
