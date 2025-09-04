"use client";

import { useCallback, useState } from "react";
import TimeSlider from "./TimeSlider";
import WbgtMapCore from "./WbgtMapCore";

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
        timePoints={timePoints}
      />

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
