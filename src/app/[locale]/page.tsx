import { fetchWbgtData } from "@/lib/fetch-wbgt-data";
import { WbgtDataResult } from "@/lib/types";
import { PageClientComponent } from "@/components/PageClientComponent";
import { getTranslations } from "next-intl/server";
import { LEGEND_ITEMS } from "@/lib/wbgt-config";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // サーバーサイドでWBGTデータを取得
  let wbgtBundle: WbgtDataResult;
  try {
    wbgtBundle = await fetchWbgtData();
  } catch (error) {
    console.error("Failed to fetch WBGT data:", error);
    // エラー時は空のGeoJSONと空のtimePointsを返す
    wbgtBundle = {
      geojson: {
        type: "FeatureCollection" as const,
        features: [],
      },
      timePoints: [],
    };
  }

  const t = await getTranslations({ locale, namespace: "HomePage" });
  const tMap = await getTranslations({ locale, namespace: "WbgtMap" });

  const mapTranslations = {
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
  };

  // 凡例の項目を統一定義から生成
  const legendItems = LEGEND_ITEMS.map(
    (item: { color: string; level: string }) => ({
      color: item.color,
      label: mapTranslations[item.level as keyof typeof mapTranslations],
    })
  );

  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm border-b px-4 py-1">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-black">{t("title")}</h1>
          <p className="text-black text-sm">{t("description")}</p>
          {wbgtBundle.geojson.features.length > 0 && (
            <p className="text-xs text-gray-700">
              表示地点数: {wbgtBundle.geojson.features.length}地点
            </p>
          )}
        </div>
      </header>
      <div className="h-[calc(100vh-45px)] relative">
        <PageClientComponent
          wbgtData={wbgtBundle.geojson}
          timePoints={wbgtBundle.timePoints}
          translations={mapTranslations}
          showDailyMax={false}
        />

        {/* 日最高値表示チェックボックス - WbgtMapコンポーネント内に統合 */}

        {/* 凡例 */}
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg">
          <h4 className="font-bold text-sm mb-2 text-black">
            {mapTranslations.legendTitle}
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
