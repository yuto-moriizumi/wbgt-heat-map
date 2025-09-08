import { Popup } from "react-map-gl/maplibre";
import { getWbgtLevelInfo } from "@/lib/wbgt-config";
import { useCallback } from "react";
import { useTranslations } from "next-intl";

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
}

export function WbgtPopup({
  popupInfo,
  onClose,
  showDailyMax,
}: WbgtPopupProps) {
  const tMap = useTranslations("WbgtMap");
  
  const getTranslatedRiskLevel = useCallback(
    (wbgt: number): string => {
      const levelInfo = getWbgtLevelInfo(wbgt);
      switch (levelInfo.level) {
        case "disaster":
          return tMap("disaster");
        case "extreme":
          return tMap("extreme");
        case "danger":
          return tMap("danger");
        case "caution":
          return tMap("caution");
        case "warning":
          return tMap("warning");
        case "attention":
          return tMap("attention");
        case "safe":
          return tMap("safe");
        default:
          return tMap("safe");
      }
    },
    [tMap]
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
            {tMap("dailyMaxLabel")}
          </p>
        )}
        <p className="text-xs text-gray-700 mt-1">
          {tMap("stationName")}: {popupInfo.id}
        </p>
      </div>
    </Popup>
  );
}
