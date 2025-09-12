"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { TimeSlider } from "./TimeSlider";
import { MapRenderer } from "./MapRenderer";
import { DisplayModeSelector } from "./DisplayModeSelector";
import dayjs from "@/lib/dayjs";
import { WbgtGeoJSON, DisplayMode } from "@/lib/types";

interface WbgtMapProps {
  wbgtData: WbgtGeoJSON;
  hourlyTimePoints: string[];
  dailyTimePoints: string[];
}

// 現在時刻に最も近いインデックスを見つけるヘルパー関数
const findClosestTimeIndex = (timePoints: string[]): number => {
  const now = dayjs().tz("Asia/Tokyo");
  let closestIndex = 0;
  let smallestDiff = Math.abs(now.diff(dayjs(timePoints[0]).tz("Asia/Tokyo")));
  
  for (let i = 1; i < timePoints.length; i++) {
    const diff = Math.abs(now.diff(dayjs(timePoints[i]).tz("Asia/Tokyo")));
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestIndex = i;
    }
  }
  
  return closestIndex;
};

export function PageClientComponent({ wbgtData, hourlyTimePoints, dailyTimePoints }: WbgtMapProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('HOURLY');
  
  // 初期時刻インデックスを現在時刻に最も近い値に設定
  const [currentTimeIndex, setCurrentTimeIndex] = useState(() => {
    return findClosestTimeIndex(hourlyTimePoints);
  });
  const [isPlaying, setIsPlaying] = useState(false);

  // timePointsを計算値として定義
  const currentTimePoints = useMemo(() => {
    switch (displayMode) {
      case 'DAILY_AVERAGE':
      case 'DAILY_MAX':
        return dailyTimePoints;
      default:
        return hourlyTimePoints;
    }
  }, [displayMode, hourlyTimePoints, dailyTimePoints]);

  // ISO文字列をDayjsオブジェクトに復元
  const parsedTimePoints = useMemo(() => {
    return currentTimePoints.map((iso) => dayjs(iso).tz("Asia/Tokyo"));
  }, [currentTimePoints]);

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
    const currentTime = effectiveTimePoints[currentTimeIndex];
    
    // 新しいモードに対応するtime pointsを取得
    const newTimePoints = mode === 'DAILY_AVERAGE' || mode === 'DAILY_MAX' 
      ? dailyTimePoints 
      : hourlyTimePoints;
    
    const parsedNewTimePoints = newTimePoints.map((iso) => dayjs(iso).tz("Asia/Tokyo"));
    
    // 現在の日時に最も近いインデックスを検索
    let newIndex = 0;
    if (currentTime) {
      const currentDate = currentTime.format('YYYY-MM-DD');
      const matchingIndex = parsedNewTimePoints.findIndex(
        (timePoint) => timePoint.format('YYYY-MM-DD') === currentDate
      );
      if (matchingIndex !== -1) {
        newIndex = matchingIndex;
      }
    }
    
    setDisplayMode(mode);
    setCurrentTimeIndex(newIndex);
  }, [currentTimeIndex, effectiveTimePoints, hourlyTimePoints, dailyTimePoints]);

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
