import { Popup } from "react-map-gl/maplibre";
import { getWbgtLevelInfo } from "@/lib/wbgt-config";
import { useCallback } from "react";

export interface PopupInfo {
  longitude: number;
  latitude: number;
  name: string;
  wbgt: number;
  id: string;
}

interface WbgtPopupProps {
  popupInfo: PopupInfo;
  onClose: () => void;
  showDailyMax: boolean;
  translations: {
    stationName: string;
    dailyMaxLabel: string;
    disaster: string;
    extreme: string;
    danger: string;
    caution: string;
    warning: string;
    attention: string;
    safe: string;
  };
}

export function WbgtPopup({
  popupInfo,
  onClose,
  showDailyMax,
  translations,
}: WbgtPopupProps) {
  // WBGTの値から翻訳されたリスクレベルを取得する関数
  const getTranslatedRiskLevel = useCallback(
    (wbgt: number): string => {
      const levelInfo = getWbgtLevelInfo(wbgt);
      switch (levelInfo.level) {
        case "disaster":
          return translations.disaster;
        case "extreme":
          return translations.extreme;
        case "danger":
          return translations.danger;
        case "caution":
          return translations.caution;
        case "warning":
          return translations.warning;
        case "attention":
          return translations.attention;
        case "safe":
          return translations.safe;
        default:
          return translations.safe;
      }
    },
    [translations]
  );

  const translatedRiskLevel = getTranslatedRiskLevel(popupInfo.wbgt);

  return (
    <Popup
      longitude={popupInfo.longitude}
      latitude={popupInfo.latitude}
      onClose={onClose}
      closeButton={true}
      closeOnClick={false}
      anchor="bottom"
    >
      <div className="p-3">
        <h3 className="font-bold text-lg text-black">{popupInfo.name}</h3>
        <p
          className="text-2xl font-bold"
          style={{
            color: getWbgtLevelInfo(popupInfo.wbgt).color,
          }}
        >
          {popupInfo.wbgt}
        </p>
        <p className="text-sm text-black font-medium">{translatedRiskLevel}</p>
        {showDailyMax && (
          <p className="text-xs text-gray-600 mt-1">
            {translations.dailyMaxLabel}
          </p>
        )}
        <p className="text-xs text-gray-700 mt-1">
          {translations.stationName}: {popupInfo.id}
        </p>
      </div>
    </Popup>
  );
}
