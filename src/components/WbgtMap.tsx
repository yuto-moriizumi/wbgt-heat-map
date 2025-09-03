"use client";

import { useCallback, useState, useMemo, useRef, useEffect } from "react";
import {
  Map,
  Source,
  Layer,
  Popup,
  MapMouseEvent,
  MapRef,
} from "react-map-gl/maplibre";
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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [sourceReady, setSourceReady] = useState(false);

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

  // 静的なGeoJSONデータ（全ての地点を含む）
  const staticGeoJSON = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: wbgtData.features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          // 初期状態では最新のデータを設定
          wbgt: feature.properties?.wbgt || 0,
          riskLevel: feature.properties?.riskLevel || "",
          riskColor: feature.properties?.riskColor || "#cccccc",
        },
      })),
    };
  }, [wbgtData]);

  // 時系列データへの効率的なアクセスのためのルックアップマップ
  const timeSeriesLookup = useMemo(() => {
    const lookupMap = new globalThis.Map<string, TimeSeriesData[]>();
    wbgtData.features.forEach((feature) => {
      const stationId = feature.properties?.id as string;
      const timeSeriesData = feature.properties?.timeSeriesData as
        | TimeSeriesData[]
        | undefined;
      if (stationId && timeSeriesData) {
        lookupMap.set(stationId, timeSeriesData);
      }
    });
    return lookupMap;
  }, [wbgtData]);

  // 時刻変更時にfeature-stateを更新
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !sourceReady || !timePoints.length) {
      console.log("Skipping feature-state update:", {
        mapLoaded,
        sourceReady,
        timePointsLength: timePoints.length,
      });
      return;
    }

    const map = mapRef.current.getMap();

    // ソースが存在するかチェック
    if (!map.getSource("wbgt-points")) {
      console.log("Source wbgt-points not yet available");
      return;
    }

    const targetTime = timePoints[currentTimeIndex];
    console.log("Updating feature states for time:", targetTime);

    wbgtData.features.forEach((feature) => {
      const stationId = feature.properties?.id as string;
      if (!stationId) return;

      const timeSeriesData = timeSeriesLookup.get(stationId);
      if (!timeSeriesData) return;

      const dataForTime = timeSeriesData.find(
        (data: TimeSeriesData) => data.time === targetTime
      );
      if (dataForTime) {
        try {
          map.setFeatureState(
            {
              source: "wbgt-points",
              id: stationId,
            },
            {
              wbgt: dataForTime.wbgt,
              riskColor: dataForTime.riskColor,
            }
          );
        } catch (error) {
          console.error(
            `Failed to set feature state for station ${stationId}:`,
            error
          );
        }
      }
    });
    console.log("Feature state update completed");
  }, [
    currentTimeIndex,
    timePoints,
    wbgtData,
    timeSeriesLookup,
    mapLoaded,
    sourceReady,
  ]);

  // マップロード後にソースが利用可能になったかチェック
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current.getMap();

    // ソースが利用可能になるまで待つ
    const checkSource = () => {
      if (map.getSource("wbgt-points")) {
        console.log("Source wbgt-points is now available");
        setSourceReady(true);
      } else {
        console.log("Checking for source wbgt-points...");
        // 100ms後に再度チェック
        setTimeout(checkSource, 100);
      }
    };

    // 少し遅延してからチェックを開始
    setTimeout(checkSource, 500);
  }, [mapLoaded]);

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
        const { name, id } = feature.properties;
        const map = mapRef.current?.getMap();
        if (!map) return;

        const featureState = map.getFeatureState({
          source: "wbgt-points",
          id: id as string,
        });

        const wbgt = featureState?.wbgt || feature.properties?.wbgt || 0;
        const translatedRiskLevel = getTranslatedRiskLevel(wbgt);

        setPopupInfo({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
          name,
          wbgt,
          riskLevel: translatedRiskLevel,
          time: timePoints[currentTimeIndex] || "",
          id,
        });
      } else {
        setPopupInfo(null);
      }
    },
    [getTranslatedRiskLevel, currentTimeIndex, timePoints]
  );

  // マップロードのハンドラー
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  const currentGeoJSON = staticGeoJSON;

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
        onLoad={handleMapLoad}
        interactiveLayerIds={["wbgt-circles"]}
      >
        <Source id="wbgt-points" type="geojson" data={currentGeoJSON}>
          <Layer
            id="wbgt-circles"
            type="circle"
            paint={{
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
            }}
          />
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
