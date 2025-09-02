import { fetchWbgtData } from "@/lib/wbgt-data";
import WbgtMap from "@/components/WbgtMap";
import { getTranslations } from "next-intl/server";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // サーバーサイドでWBGTデータを取得
  let wbgtGeoJSON;
  try {
    wbgtGeoJSON = await fetchWbgtData();
  } catch (error) {
    console.error("Failed to fetch WBGT data:", error);
    // エラー時は空のGeoJSONを返す
    wbgtGeoJSON = {
      type: "FeatureCollection" as const,
      features: [],
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
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm border-b px-4 py-1">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-black">{t("title")}</h1>
          <p className="text-black text-sm">{t("description")}</p>
          {wbgtGeoJSON.features.length > 0 && (
            <p className="text-xs text-gray-700">
              表示地点数: {wbgtGeoJSON.features.length}地点
            </p>
          )}
        </div>
      </header>
      <div className="h-[calc(100vh-45px)]">
        <WbgtMap wbgtData={wbgtGeoJSON} translations={mapTranslations} />
      </div>
    </div>
  );
}
