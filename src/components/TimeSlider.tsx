"use client";

import React, { useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import type { Dayjs } from "dayjs";
import type { DisplayMode } from "../lib/types";

interface TimeSliderProps {
  /** 時間ポイントのDayjsオブジェクト配列 */
  timePoints: Dayjs[];
  /** 現在の時間インデックス */
  currentTimeIndex: number;
  /** 時間変更時のコールバック関数 */
  onTimeChange: (index: number) => void;
  /** 再生中かどうか */
  isPlaying: boolean;
  /** 再生/停止トグルのコールバック関数 */
  onPlayToggle: () => void;
  /** 再生速度（ミリ秒単位、オプション） */
  playbackSpeed?: number;
  /** 表示モード */
  displayMode: DisplayMode;
}

export function TimeSlider({
  timePoints,
  currentTimeIndex,
  onTimeChange,
  isPlaying,
  onPlayToggle,
  playbackSpeed = 500,
  displayMode,
}: TimeSliderProps) {
  const t = useTranslations("TimeSlider");
  const locale = useLocale();

  // 自動再生機能
  useEffect(() => {
    if (!isPlaying || timePoints.length <= 1) return;

    const interval = setInterval(() => {
      onTimeChange((currentTimeIndex + 1) % timePoints.length);
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [
    isPlaying,
    currentTimeIndex,
    timePoints.length,
    playbackSpeed,
    onTimeChange,
  ]);

  const handlePrevious = useCallback(() => {
    const newIndex =
      currentTimeIndex > 0 ? currentTimeIndex - 1 : timePoints.length - 1;
    onTimeChange(newIndex);
  }, [currentTimeIndex, timePoints.length, onTimeChange]);

  const handleNext = useCallback(() => {
    const newIndex = (currentTimeIndex + 1) % timePoints.length;
    onTimeChange(newIndex);
  }, [currentTimeIndex, timePoints.length, onTimeChange]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const index = parseInt(e.target.value);
      onTimeChange(index);
    },
    [onTimeChange]
  );

  if (timePoints.length <= 1) {
    return null; // 時系列データが不十分な場合は何も表示しない
  }

  const formatTime = (timeObj: Dayjs): string => {
    try {
      // ロケールに応じてdayjsのロケールを設定
      const localizedTime = timeObj.locale(locale);
      
      if (displayMode === 'DAILY_MAX' || displayMode === 'DAILY_AVERAGE') {
        // 日次モードでは日付と曜日を表示
        return localizedTime.format('YYYY/MM/DD (ddd)');
      } else {
        // 通常モードではM/D HH:mm と曜日を表示
        return localizedTime.format('M/D (ddd) HH:mm');
      }
    } catch {
      return timeObj.toString(); // エラー時はtoStringで返す
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          {displayMode === 'DAILY_MAX' || displayMode === 'DAILY_AVERAGE' ? t("dateSelection") : t("timeSelection")}
        </h3>
        <div className="text-xs text-gray-500">
          {currentTimeIndex + 1} / {timePoints.length}
        </div>
      </div>

      {/* 現在時刻の表示 */}
      <div className="text-center mb-3">
        <div className="text-lg font-mono font-bold text-gray-800">
          {formatTime(timePoints[currentTimeIndex] || "")}
        </div>
      </div>

      {/* スライダー */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={timePoints.length - 1}
          value={currentTimeIndex}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
              (currentTimeIndex / (timePoints.length - 1)) * 100
            }%, #e5e7eb ${
              (currentTimeIndex / (timePoints.length - 1)) * 100
            }%, #e5e7eb 100%)`,
          }}
        />
      </div>

       {/* コントロールボタン */}
       <div className="flex items-center justify-center gap-2">
          <button
            onClick={handlePrevious}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title={t("previous")}
          >
            <SkipBack size={16} className="text-gray-700" />
          </button>

          <button
            onClick={onPlayToggle}
            className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            title={isPlaying ? t("pause") : t("play")}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            onClick={handleNext}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title={t("next")}
          >
            <SkipForward size={16} className="text-gray-700" />
          </button>
       </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
