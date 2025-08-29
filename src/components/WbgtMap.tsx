"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

interface WbgtMapProps {
  wbgtData: GeoJSON.FeatureCollection;
}

export default function WbgtMap({ wbgtData }: WbgtMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

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
        data: wbgtData,
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
          const { name, wbgt, riskLevel, id } = feature.properties!;

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
                <p class="text-sm text-black font-medium">${riskLevel}</p>
                <p class="text-xs text-gray-700 mt-1">地点ID: ${id}</p>
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
  }, [wbgtData]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 凡例 */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg">
        <h4 className="font-bold text-sm mb-2 text-black">暑さ指数(WBGT)</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#800080" }}
            ></div>
            <span className="text-black font-medium">災害級の危険(35~)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#FF0000" }}
            ></div>
            <span className="text-black font-medium">極めて危険(33~)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#FF4500" }}
            ></div>
            <span className="text-black font-medium">危険(31~)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#FFA500" }}
            ></div>
            <span className="text-black font-medium">厳重警戒(28~)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#FFFF00" }}
            ></div>
            <span className="text-black font-medium">警戒(25~)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#00FFFF" }}
            ></div>
            <span className="text-black font-medium">注意(21~)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#0000FF" }}
            ></div>
            <span className="text-black font-medium">ほぼ安全(~21)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
