import { fetchWbgtData } from "@/lib/fetch-wbgt-data";
import { WbgtDataResult } from "@/lib/types";
import { PageClientComponent } from "@/components/PageClientComponent";
import { getTranslations } from "next-intl/server";

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
      <PageClientComponent
        wbgtData={wbgtBundle.geojson}
        timePoints={wbgtBundle.timePoints}
        showDailyMax={false}
      />
    </div>
  );
}
