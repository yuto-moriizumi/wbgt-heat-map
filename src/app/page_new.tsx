"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export default function Home() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

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
      attributionControl: true,
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm border-b p-4">
        <h1 className="text-2xl font-bold text-gray-800">WBGT Heat Map</h1>
        <p className="text-gray-600">全国暑さ指数（WBGT）マップ</p>
      </header>
      <div ref={mapContainerRef} className="w-full h-[calc(100vh-80px)]" />
    </div>
  );
}
