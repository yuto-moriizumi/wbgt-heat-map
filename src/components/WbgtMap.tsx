"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import TimeSlider from "./TimeSlider";
import WbgtMapCore from "./WbgtMapCore";
import DailyMaxToggle from "./DailyMaxToggle";
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
    dailyMaxLabel: string;
  };
  showDailyMax?: boolean;
}

export default function WbgtMap({
  wbgtData: initialWbgtData,
  timePoints: initialTimePoints,
  translations,
  showDailyMax: initialShowDailyMax = false,
}: WbgtMapProps) {
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timePoints, setTimePoints] = useState(initialTimePoints);
  const [showDailyMax, setShowDailyMax] = useState(initialShowDailyMax);

  // ISO文字列をDayjsオブジェクトに復元
  const parsedTimePoints = useMemo(() => {
    if (showDailyMax) {
      // 日最高モードでは、stateに保持されているISO文字列をDayjsオブジェクトに変換
      return timePoints.map(iso => dayjs(iso).tz("Asia/Tokyo"));
    }
    // 通常モード
    return initialTimePoints.map(iso => dayjs(iso).tz("Asia/Tokyo"));
  }, [timePoints, initialTimePoints, showDailyMax]);

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

  // showDailyMax変更ハンドラー
  const handleShowDailyMaxChange = useCallback((show: boolean) => {
    setShowDailyMax(show);
    setCurrentTimeIndex(0); // インデックスをリセット

    if (show) {
      // 日最高値モード: valueByDateから日付リストを生成
      const dateSet = new Set<string>();
      initialWbgtData.features.forEach(feature => {
        if (feature.properties?.valueByDate) {
          feature.properties.valueByDate.forEach((item: { date: string; wbgt: number }) => {
            if (item.date && item.wbgt > 0) {
              dateSet.add(item.date);
            }
          });
        }
      });
      const sortedDates = Array.from(dateSet).sort().reverse();
      setTimePoints(sortedDates.map(date => dayjs(date).startOf('day').toISOString()));
    } else {
      // 通常モード: 元の時間リストに戻す
      setTimePoints(initialTimePoints);
    }
  }, [initialWbgtData, initialTimePoints]);

  return (
    <div className="relative w-full h-full">
      <WbgtMapCore
        wbgtData={initialWbgtData}
        currentTimeIndex={currentTimeIndex}
        translations={translations}
        timePoints={effectiveTimePoints}
        showDailyMax={showDailyMax}
      />

      {/* 時系列スライダー */}
      {effectiveTimePoints.length > 1 && (
        <div className="absolute top-4 left-4">
          <TimeSlider
            timePoints={effectiveTimePoints}
            currentTimeIndex={currentTimeIndex}
            onTimeChange={handleTimeChange}
            isPlaying={isPlaying}
            onPlayToggle={handlePlayToggle}
            playbackSpeed={500}
            isDailyMaxMode={showDailyMax}
          />
        </div>
      )}

      {/* 日最高値表示チェックボックス */}
      <DailyMaxToggle
        showDailyMax={showDailyMax}
        onShowDailyMaxChange={handleShowDailyMaxChange}
        label={translations.dailyMaxLabel || "日の最高値を表示"}
      />
    </div>
  );
}