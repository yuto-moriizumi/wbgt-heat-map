"use client";

import { useCallback, useState, useMemo } from "react";
import TimeSlider from "./TimeSlider";
import WbgtMapCore from "./WbgtMapCore";

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
