"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { TimeSlider } from "./TimeSlider";
import { MapRenderer } from "./MapRenderer";
import { DailyMaxToggle } from "./DailyMaxToggle";
import dayjs from "@/lib/dayjs";
import { WbgtGeoJSON } from "@/lib/types";
import { LEGEND_ITEMS } from "@/lib/wbgt-config";

interface WbgtMapProps {
  wbgtData: WbgtGeoJSON;
  timePoints: string[];
  showDailyMax?: boolean;
}

export function PageClientComponent({
  wbgtData: initialWbgtData,
  timePoints: initialTimePoints,
  showDailyMax: initialShowDailyMax = false,
}: WbgtMapProps) {
  const tMap = useTranslations("WbgtMap");
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDailyMax, setShowDailyMax] = useState(initialShowDailyMax);

  const translations = useMemo(() => ({
    stationName: tMap("stationName"),
    wbgt: tMap("wbgt"),
    riskLevel: tMap("riskLevel"),
    legendTitle: tMap("legendTitle"),
    disaster: tMap("disaster"),
    extreme: tMap("extreme"),
    danger: tMap("danger"),
    caution: tMap("caution"),
    warning: tMap("warning"),
    attention: tMap("attention"),
    safe: tMap("safe"),
    dailyMaxLabel: tMap("dailyMaxLabel"),
  }), [tMap]);

  const legendItems = useMemo(() => {
    return LEGEND_ITEMS.map((item: { color: string; level: string }) => ({
      color: item.color,
      label: translations[item.level as keyof typeof translations],
    }));
  }, [translations]);

  // times: initialTimePointsをそのまま使用
  const times = initialTimePoints;

  // dates: timesから各日時を取り出したもの（日別の一意な日付）
  const dates = useMemo(() => {
    const dateSet = new Set<string>();
    times.forEach((timePoint) => {
      const date = dayjs(timePoint).format("YYYY-MM-DD");
      dateSet.add(date);
    });
    return Array.from(dateSet).sort().reverse();
  }, [times]);

  // timePointsを計算値として定義
  const timePoints = useMemo(() => {
    if (showDailyMax) {
      return dates.map((date) => dayjs(date).startOf("day").toISOString());
    }
    return times;
  }, [showDailyMax, dates, times]);

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

  // showDailyMax変更ハンドラー
  const handleShowDailyMaxChange = useCallback((show: boolean) => {
    setShowDailyMax(show);
    setCurrentTimeIndex(0); // インデックスをリセット
  }, []);

  return (
    <div className="h-[calc(100vh-45px)] relative">
      <div className="relative w-full h-full">
        <MapRenderer
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

        {/* 凡例 */}
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg">
          <h4 className="font-bold text-sm mb-2 text-black">
            {translations.legendTitle}
          </h4>
          <div className="space-y-1 text-xs">
            {legendItems.map(
              (item: { color: string; label: string }, index: number) => (
                <div key={index} className="flex items-center">
                  <div
                    className="w-4 h-4 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-black font-medium">{item.label}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
