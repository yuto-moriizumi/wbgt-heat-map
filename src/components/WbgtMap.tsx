"use client";

import { useCallback, useMemo, useState } from "react";
import TimeSlider from "./TimeSlider";
import WbgtMapCore from "./WbgtMapCore";
import dayjs from "@/lib/dayjs";

interface WbgtMapProps {
  wbgtData: GeoJSON.FeatureCollection;
  timePoints: string[];
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

export default function WbgtMap({
  wbgtData,
  timePoints,
  translations,
}: WbgtMapProps) {
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // ISO文字列をDayjsオブジェクトに復元
  const parsedTimePoints = useMemo(
    () => timePoints.map(iso => dayjs(iso).tz("Asia/Tokyo")),
    [timePoints]
  );

  // 時刻変更のハンドラー
  const handleTimeChange = useCallback((timeIndex: number) => {
    setCurrentTimeIndex(timeIndex);
  }, []);

  // 再生/一時停止のハンドラー
  const handlePlayToggle = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return (
    <div className="relative w-full h-full">
      <WbgtMapCore
        wbgtData={wbgtData}
        currentTimeIndex={currentTimeIndex}
        translations={translations}
        timePoints={parsedTimePoints}
      />

      {/* 時系列スライダー */}
      {parsedTimePoints.length > 1 && (
        <div className="absolute top-4 left-4">
          <TimeSlider
            timePoints={parsedTimePoints}
            currentTimeIndex={currentTimeIndex}
            onTimeChange={handleTimeChange}
            isPlaying={isPlaying}
            onPlayToggle={handlePlayToggle}
            playbackSpeed={500}
          />
        </div>
      )}
    </div>
  );
}
