"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  Map as MapGL,
  Source,
  Layer,
  MapMouseEvent,
  MapRef,
  LayerProps,
} from "react-map-gl/maplibre";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Dayjs } from "dayjs";
import {
  createMapLibreColorExpression,
  CIRCLE_STROKE_COLOR,
} from "@/lib/wbgt-config";
import { WbgtGeoJSON } from "@/lib/types";
import { WbgtPopup, type PopupInfo } from "./WbgtPopup";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "circle-color": createMapLibreColorExpression() as any,
    "circle-stroke-width": 2,
    "circle-stroke-color": CIRCLE_STROKE_COLOR,
    "circle-opacity": 0.8,
  },
};

interface WbgtMapCoreProps {
  wbgtData: WbgtGeoJSON;
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
    dailyMaxLabel: string;
  };
  showDailyMax?: boolean;
}

export function MapRenderer({
  wbgtData,
  currentTimeIndex,
  timePoints,
  translations,
  showDailyMax = false,
}: WbgtMapCoreProps) {
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const mapRef = useRef<MapRef>(null);

  const updateFeatureStates = useCallback(
    (map: MapLibreMap) => {
      if (showDailyMax) {
        const targetDate =
          timePoints[currentTimeIndex]?.format("YYYY-MM-DD") || "";
        if (!targetDate) return;

        wbgtData.features.forEach(({ properties }) => {
          const id = properties.id;
          const valueByDate = properties.valueByDate;
          const dataForDate = valueByDate.find(
            (item: { date: string; wbgt: number }) => item.date === targetDate
          );
          const wbgt = dataForDate?.wbgt ?? 0;
          map.setFeatureState(
            { source: "wbgt-points", id: id },
            { wbgt: wbgt }
          );
        });
      } else {
        wbgtData.features.forEach(({ properties }) => {
          map.setFeatureState(
            { source: "wbgt-points", id: properties.id },
            { wbgt: properties.valueByDateTime[currentTimeIndex] ?? 0 }
          );
        });
      }
    },
    [currentTimeIndex, timePoints, showDailyMax, wbgtData]
  );

  /** 初期ロード時にFeatureStateを設定 */
  const onLoad = useCallback(
    (evt: { target: MapLibreMap }) => {
      const map = evt.target;
      const handleSourceData = () => {
        if (map.isSourceLoaded("wbgt-points")) {
          updateFeatureStates(map);
        }
      };
      map.on("sourcedata", handleSourceData);
      if (map.isSourceLoaded("wbgt-points")) {
        updateFeatureStates(map);
      }
    },
    [updateFeatureStates]
  );

  // 地図クリックのハンドラー
  const handleMapClick = useCallback((event: MapMouseEvent) => {
    const { features } = event;
    const map = mapRef.current?.getMap();
    if (!map || !features || features.length === 0) {
      setPopupInfo(null);
      return;
    }
    const { name, id } = features[0].properties;
    const featureState = map.getFeatureState({ source: "wbgt-points", id });
    setPopupInfo({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
      name,
      wbgt: featureState?.wbgt ?? 0,
      id,
    });
  }, []);

  // currentTimeIndex, showDailyMax, wbgtData 変更時にfeature-stateを更新
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    updateFeatureStates(map);
  }, [currentTimeIndex, showDailyMax, wbgtData, updateFeatureStates]);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{
        longitude: 139.7671,
        latitude: 35.6812,
        zoom: 5,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={baseMapStyle}
      onLoad={onLoad}
      onClick={handleMapClick}
      interactiveLayerIds={["wbgt-circles"]}
    >
      <Source id="wbgt-points" type="geojson" data={wbgtData}>
        <Layer {...wbgtLayer} />
      </Source>
      {popupInfo && (
        <WbgtPopup
          popupInfo={popupInfo}
          onClose={() => setPopupInfo(null)}
          showDailyMax={showDailyMax}
          translations={{
            stationName: translations.stationName,
            dailyMaxLabel: translations.dailyMaxLabel,
            disaster: translations.disaster,
            extreme: translations.extreme,
            danger: translations.danger,
            caution: translations.caution,
            warning: translations.warning,
            attention: translations.attention,
            safe: translations.safe,
          }}
        />
      )}
    </MapGL>
  );
}
