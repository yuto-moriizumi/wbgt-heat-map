"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { TimeSlider } from "./TimeSlider";
import { MapRenderer } from "./MapRenderer";
import { DisplayModeSelector } from "./DisplayModeSelector";
import dayjs from "@/lib/dayjs";
import { WbgtGeoJSON, DisplayMode } from "@/lib/types";

interface WbgtMapProps {
  wbgtData: WbgtGeoJSON;
  times: string[];
}

export function PageClientComponent({ wbgtData, times }: WbgtMapProps) {
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('HOURLY');

  // dates: timesから各日時を取り出したもの（日別の一意な日付）
  const dates = useMemo(() => {
    const dateSet = new Set<string>();
    times.forEach((timePoint) => {
      const date = dayjs(timePoint).format("YYYY-MM-DD");
      dateSet.add(date);
    });
    return Array.from(dateSet).sort();
  }, [times]);

  // timePointsを計算値として定義
  const timePoints = useMemo(() => {
    if (displayMode === 'DAILY_MAX' || displayMode === 'DAILY_AVERAGE') {
      return dates.map((date) => dayjs(date).startOf("day").toISOString());
    }
    return times;
  }, [displayMode, dates, times]);

  // ISO文字列をDayjsオブジェクトに復元
  const parsedTimePoints = useMemo(() => {
    return timePoints.map((iso) => dayjs(iso).tz("Asia/Tokyo"));
  }, [timePoints]);

  const effectiveTimePoints = parsedTimePoints;

  // 現在のtimeIndexが有効範囲を超えている場合の調整
  useEffect(() => {
    if (currentTimeIndex >= effectiveTimePoints.length) {
      setCurrentTimeIndex(Math.max(0, effectiveTimePoints.length - 1));
    }
  }, [currentTimeIndex, effectiveTimePoints.length]);

  // 時刻変更のハンドラー
  const handleTimeChange = useCallback((timeIndex: number) => {
    setCurrentTimeIndex(timeIndex);
  }, []);

  // 再生/一時停止のハンドラー
  const handlePlayToggle = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // displayMode変更ハンドラー
  const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
    setDisplayMode(mode);
    setCurrentTimeIndex(0); // インデックスをリセット
  }, []);

  return (
    <div className="h-[calc(100vh)]">
      <MapRenderer
        wbgtData={wbgtData}
        currentTimeIndex={currentTimeIndex}
        displayMode={displayMode}
      />

      {/* 時系列スライダー */}
      {effectiveTimePoints.length > 1 && (
        <div className="absolute top-14 left-4">
          <TimeSlider
            timePoints={effectiveTimePoints}
            currentTimeIndex={currentTimeIndex}
            onTimeChange={handleTimeChange}
            isPlaying={isPlaying}
            onPlayToggle={handlePlayToggle}
            playbackSpeed={500}
            displayMode={displayMode}
          />
        </div>
      )}

      {/* 表示モード選択 */}
      <DisplayModeSelector
        displayMode={displayMode}
        onDisplayModeChange={handleDisplayModeChange}
      />
    </div>
  );
}
