"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { WbgtGeoJSON, getWBGTColor, getWBGTLevel } from "@/lib/wbgt-data";

interface MapDisplayProps {
  wbgtData: WbgtGeoJSON;
}

export default function MapDisplay({ wbgtData }: MapDisplayProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // 利用可能な時刻リストを取得
  useEffect(() => {
    const times = Array.from(
      new Set(
        wbgtData.features
          .map((feature) => feature.properties.time)
          .filter((time): time is string => time !== undefined)
      )
    ).sort();

    setAvailableTimes(times);
    if (times.length > 0) {
      // 最新の時刻をデフォルトに設定
      setSelectedTime(times[times.length - 1]);
    }
  }, [wbgtData]);

  // 地図の初期化
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "gsi-std": {
            type: "raster",
            tiles: [
              "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
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
      },
      center: [139.7671, 35.6812], // 東京駅付近
      zoom: 5,
      maxZoom: 18,
    });

    // WBGTデータソースとレイヤーを追加
    map.on("load", () => {
      map.addSource("wbgt-points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "wbgt-points",
        type: "circle",
        source: "wbgt-points",
        paint: {
          "circle-radius": ["case", ["has", "wbgt"], 8, 4],
          "circle-color": [
            "case",
            [">=", ["get", "wbgt"], 31],
            "#ff0000", // 危険
            [">=", ["get", "wbgt"], 28],
            "#ff8c00", // 厳重警戒
            [">=", ["get", "wbgt"], 25],
            "#ffff00", // 警戒
            [">=", ["get", "wbgt"], 21],
            "#00ff00", // 注意
            ["has", "wbgt"],
            "#0080ff", // ほぼ安全
            "#cccccc", // データなし
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.8,
        },
      });

      // クリックイベント
      map.on("click", "wbgt-points", (e) => {
        if (e.features && e.features[0]) {
          const feature = e.features[0];
          const props = feature.properties;

          if (props) {
            const wbgt = props.wbgt;
            const temperature = props.temperature;
            const humidity = props.humidity;

            const popupContent = `
              <div class="p-3">
                <h3 class="font-bold text-lg mb-2 text-black">${props.name}</h3>
                <p class="text-sm text-black mb-2">${props.prefecture}</p>
                ${
                  wbgt !== null
                    ? `
                  <div class="mb-2">
                    <span class="font-semibold text-black">WBGT:</span> 
                    <span class="font-bold" style="color: ${getWBGTColor(
                      wbgt
                    )}">${wbgt}</span>
                    <span class="text-sm ml-1 text-black">(${getWBGTLevel(
                      wbgt
                    )})</span>
                  </div>
                `
                    : ""
                }
                ${
                  temperature !== null
                    ? `
                  <div class="mb-1">
                    <span class="font-semibold text-black">気温:</span> <span class="text-black">${temperature}°C</span>
                  </div>
                `
                    : ""
                }
                ${
                  humidity !== null
                    ? `
                  <div class="mb-1">
                    <span class="font-semibold text-black">湿度:</span> <span class="text-black">${humidity}%</span>
                  </div>
                `
                    : ""
                }
                <div class="text-xs text-gray-700 mt-2">
                  観測時刻: ${props.time}
                </div>
              </div>
            `;

            new maplibregl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(popupContent)
              .addTo(map);
          }
        }
      });

      // カーソル変更
      map.on("mouseenter", "wbgt-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "wbgt-points", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  // 選択された時刻に基づいてデータを更新
  useEffect(() => {
    if (!mapRef.current || !selectedTime) return;

    const filteredFeatures = wbgtData.features.filter(
      (feature) => feature.properties.time === selectedTime
    );

    const source = mapRef.current.getSource(
      "wbgt-points"
    ) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: filteredFeatures,
      });
    }
  }, [selectedTime, wbgtData]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 時刻スライダー */}
      {availableTimes.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4">
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              観測時刻: {selectedTime}
            </label>
            <input
              type="range"
              min={0}
              max={availableTimes.length - 1}
              value={availableTimes.indexOf(selectedTime)}
              onChange={(e) =>
                setSelectedTime(availableTimes[parseInt(e.target.value)])
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{availableTimes[0]}</span>
            <span>{availableTimes[availableTimes.length - 1]}</span>
          </div>
        </div>
      )}

      {/* 凡例 */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 text-sm">
        <h3 className="font-bold mb-2">WBGT 危険度</h3>
        <div className="space-y-1">
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#ff0000" }}
            ></div>
            <span>危険 (31°C以上)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#ff8c00" }}
            ></div>
            <span>厳重警戒 (28-30°C)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#ffff00" }}
            ></div>
            <span>警戒 (25-27°C)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#00ff00" }}
            ></div>
            <span>注意 (21-24°C)</span>
          </div>
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: "#0080ff" }}
            ></div>
            <span>ほぼ安全 (21°C未満)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
