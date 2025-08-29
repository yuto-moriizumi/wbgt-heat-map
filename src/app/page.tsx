import { fetchWbgtData } from "@/lib/wbgt-data";
import WbgtMap from "@/components/WbgtMap";

export default async function Home() {
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

  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm border-b px-4 py-1">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-black">WBGT Heat Map</h1>
          <p className="text-black text-sm">全国暑さ指数（WBGT）マップ</p>
          {wbgtGeoJSON.features.length > 0 && (
            <p className="text-xs text-gray-700">
              表示地点数: {wbgtGeoJSON.features.length}地点
            </p>
          )}
        </div>
      </header>
      <div className="h-[calc(100vh-45px)]">
        <WbgtMap wbgtData={wbgtGeoJSON} />
      </div>
    </div>
  );
}
