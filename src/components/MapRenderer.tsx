"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  Map as MapGL,
  Source,
  Layer,
  MapMouseEvent,
  MapRef,
  LayerProps,
  AttributionControl,
  GeolocateControl,
} from "react-map-gl/maplibre";
import type { MapLibreEvent, Map as MapLibreMap } from "maplibre-gl";
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
  showDailyMax?: boolean;
}

export function MapRenderer({
  wbgtData,
  currentTimeIndex,
  showDailyMax = false,
}: WbgtMapCoreProps) {
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const mapRef = useRef<MapRef>(null);

  const updateFeatureStates = useCallback(
    (map: MapLibreMap) => {
      if (showDailyMax) {
        wbgtData.features.forEach(({ properties }) => {
          map.setFeatureState(
            { source: "wbgt-points", id: properties.id },
            { wbgt: properties.valueByDate[currentTimeIndex].wbgt ?? 0 }
          );
        });
        return;
      }
      wbgtData.features.forEach(({ properties }) => {
        map.setFeatureState(
          { source: "wbgt-points", id: properties.id },
          { wbgt: properties.valueByDateTime[currentTimeIndex] ?? 0 }
        );
      });
    },
    [currentTimeIndex, showDailyMax, wbgtData]
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
  }, [currentTimeIndex, showDailyMax, updateFeatureStates]);

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
      attributionControl={false}
    >
      <AttributionControl compact={false} />
      <GeolocateControl position="top-right" />
      <Source id="wbgt-points" type="geojson" data={wbgtData}>
        <Layer {...wbgtLayer} />
      </Source>
      {popupInfo && (
        <WbgtPopup
          popupInfo={popupInfo}
          onClose={() => setPopupInfo(null)}
          showDailyMax={showDailyMax}
        />
      )}
    </MapGL>
  );
}
