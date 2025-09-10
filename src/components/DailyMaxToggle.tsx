"use client";

import React from "react";

interface DailyMaxToggleProps {
  showDailyMax: boolean;
  onShowDailyMaxChange: (show: boolean) => void;
  label: string;
}

export function DailyMaxToggle({
  showDailyMax,
  onShowDailyMaxChange,
  label,
}: DailyMaxToggleProps) {
  return (
    <div className="absolute top-14 right-4 bg-white p-3 rounded-lg shadow-lg">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={showDailyMax}
          onChange={(e) => onShowDailyMaxChange(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm font-medium text-black">{label}</span>
      </label>
    </div>
  );
}
