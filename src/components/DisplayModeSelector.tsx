"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { DISPLAY_MODES } from "@/lib/wbgt-config";

interface DisplayModeSelectorProps {
  displayMode: 'HOURLY' | 'DAILY_MAX' | 'DAILY_AVERAGE';
  onDisplayModeChange: (mode: 'HOURLY' | 'DAILY_MAX' | 'DAILY_AVERAGE') => void;
}

export function DisplayModeSelector({
  displayMode,
  onDisplayModeChange,
}: DisplayModeSelectorProps) {
  const t = useTranslations("DisplayMode");

  const getDisplayModeLabel = (mode: string) => {
    switch (mode) {
      case 'HOURLY':
        return t("hourly");
      case 'DAILY_MAX':
        return t("dailyMax");
      case 'DAILY_AVERAGE':
        return t("dailyAverage");
      default:
        return mode;
    }
  };

  return (
    <div className="absolute top-14 right-4 bg-white p-3 rounded-lg shadow-lg">
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium text-black mb-2">{t("title")}</h4>
        {Object.entries(DISPLAY_MODES).map(([key]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="radio"
              name="displayMode"
              value={key}
              checked={displayMode === key}
              onChange={(e) => onDisplayModeChange(e.target.value as 'HOURLY' | 'DAILY_MAX' | 'DAILY_AVERAGE')}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-black">{getDisplayModeLabel(key)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}