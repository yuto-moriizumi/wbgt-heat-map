import { Popup } from "react-map-gl/maplibre";
import { getWbgtLevelInfo } from "@/lib/wbgt-config";

export interface PopupInfo {
  longitude: number;
  latitude: number;
  name: string;
  wbgt: number;
  riskLevel: string;
  time: string;
  id: string;
}

interface WbgtPopupProps {
  popupInfo: PopupInfo;
  onClose: () => void;
  showDailyMax: boolean;
  translations: {
    stationName: string;
    dailyMaxLabel: string;
  };
}

export function WbgtPopup({
  popupInfo,
  onClose,
  showDailyMax,
  translations,
}: WbgtPopupProps) {
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
        <p className="text-sm text-black font-medium">{popupInfo.riskLevel}</p>
        {showDailyMax ? (
          <p className="text-xs text-gray-600 mt-1">
            {translations.dailyMaxLabel}
          </p>
        ) : (
          popupInfo.time && (
            <p className="text-xs text-gray-600 mt-1">時刻: {popupInfo.time}</p>
          )
        )}
        <p className="text-xs text-gray-700 mt-1">
          {translations.stationName}: {popupInfo.id}
        </p>
      </div>
    </Popup>
  );
}
