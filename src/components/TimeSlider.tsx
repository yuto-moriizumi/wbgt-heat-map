"use client";

import { useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import type { Dayjs } from "dayjs";

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
  /** 翻訳オブジェクト（オプション） */
  translations?: {
    /** 再生ボタンのテキスト */
    play?: string;
    /** 停止ボタンのテキスト */
    pause?: string;
    /** 前へボタンのテキスト */
    previous?: string;
    /** 次へボタンのテキスト */
    next?: string;
  };
  /** 日最高値モードかどうか */
  isDailyMaxMode?: boolean;
}

export function TimeSlider({
  timePoints,
  currentTimeIndex,
  onTimeChange,
  isPlaying,
  onPlayToggle,
  playbackSpeed = 500,
  translations = {
    play: "再生",
    pause: "一時停止",
    previous: "前へ",
    next: "次へ",
  },
  isDailyMaxMode = false,
}: TimeSliderProps) {
  // 自動再生機能
  useEffect(() => {
    // 日最高値モードでは自動再生を無効化
    if (isDailyMaxMode) return;
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
    isDailyMaxMode,
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
      if (isDailyMaxMode) {
        // 日最高値モードでは日付のみ表示
        return timeObj.format('YYYY/MM/DD');
      } else {
        // 通常モードではM/D HH:mm形式
        return timeObj.format('M/D HH:mm');
      }
    } catch {
      return timeObj.toString(); // エラー時はtoStringで返す
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          {isDailyMaxMode ? "日付選択" : "時刻選択"}
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

      {/* コントロールボタン - 日最高値モードでは非表示 */}
      {!isDailyMaxMode && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={handlePrevious}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title={translations.previous}
          >
            <SkipBack size={16} className="text-gray-700" />
          </button>

          <button
            onClick={onPlayToggle}
            className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            title={isPlaying ? translations.pause : translations.play}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            onClick={handleNext}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title={translations.next}
          >
            <SkipForward size={16} className="text-gray-700" />
          </button>
        </div>
      )}

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
