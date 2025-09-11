"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  Map as MapGL,
  Source,
  Layer,
  MapMouseEvent,
  MapRef,
  LayerProps,
  GeolocateControl,
  ScaleControl,
  NavigationControl,
} from "react-map-gl/maplibre";
import type { MapLibreEvent, Map as MapLibreMap } from "maplibre-gl";
import {
  createMapLibreColorExpression,
  CIRCLE_STROKE_COLOR,
} from "@/lib/wbgt-config";
import { WbgtGeoJSON, DisplayMode } from "@/lib/types";
import { getWbgtValue } from "@/lib/utils";
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
  displayMode?: DisplayMode;
}

export function MapRenderer({
  wbgtData,
  currentTimeIndex,
  displayMode = "HOURLY",
}: WbgtMapCoreProps) {
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const mapRef = useRef<MapRef>(null);

  const updateFeatureStates = useCallback(
    (map: MapLibreMap) => {
      wbgtData.features.forEach(({ properties }) => {
        const wbgt = getWbgtValue(properties, currentTimeIndex, displayMode);
        map.setFeatureState(
          { source: "wbgt-points", id: properties.id },
          { wbgt }
        );
      });
    },
    [currentTimeIndex, displayMode, wbgtData]
  );

  /** 初期ロード時にFeatureStateを設定 */
  const onLoad = useCallback(
    (e: MapLibreEvent) => {
      updateFeatureStates(e.target);
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
    setPopupInfo({
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
      name,
      id,
    });
  }, []);

  // currentTimeIndex, showDailyMax, wbgtData 変更時にfeature-stateを更新
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    updateFeatureStates(map);
  }, [updateFeatureStates]);

  // popupInfoのwbgt値を計算
  const popupWbgt = useMemo(() => {
    if (!popupInfo) return 0;
    const feature = wbgtData.features.find(f => f.properties.id === popupInfo.id);
    if (!feature) return 0;
    return getWbgtValue(feature.properties, currentTimeIndex, displayMode);
  }, [popupInfo, wbgtData, currentTimeIndex, displayMode]);

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
      <NavigationControl position="bottom-right" />
      <ScaleControl position="bottom-left" />
      <GeolocateControl position="bottom-right" />
      <Source id="wbgt-points" type="geojson" data={wbgtData}>
        <Layer {...wbgtLayer} />
      </Source>
      {popupInfo && (
        <WbgtPopup
          popupInfo={popupInfo}
          wbgt={popupWbgt}
          onClose={() => setPopupInfo(null)}
          showDailyMax={
            displayMode === "DAILY_MAX" || displayMode === "DAILY_AVERAGE"
          }
        />
      )}
    </MapGL>
  );
}
