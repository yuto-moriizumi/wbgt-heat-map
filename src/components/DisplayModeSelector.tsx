"use client";

import React from "react";
import { DISPLAY_MODES } from "@/lib/wbgt-config";

interface DisplayModeSelectorProps {
  displayMode: 'HOURLY' | 'DAILY_MAX' | 'DAILY_AVERAGE';
  onDisplayModeChange: (mode: 'HOURLY' | 'DAILY_MAX' | 'DAILY_AVERAGE') => void;
}

export function DisplayModeSelector({
  displayMode,
  onDisplayModeChange,
}: DisplayModeSelectorProps) {
  return (
    <div className="absolute top-14 right-4 bg-white p-3 rounded-lg shadow-lg">
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium text-black mb-2">表示モード</h4>
        {Object.entries(DISPLAY_MODES).map(([key, value]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="radio"
              name="displayMode"
              value={key}
              checked={displayMode === key}
              onChange={(e) => onDisplayModeChange(e.target.value as 'HOURLY' | 'DAILY_MAX' | 'DAILY_AVERAGE')}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-black">{value}</span>
          </label>
        ))}
      </div>
    </div>
  );
}