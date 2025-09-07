import { readFileSync } from "fs";
import path from "path";
import { Station } from "./types";

// サーバー専用関数としてマーク
export async function getStations(): Promise<Station[]> {
  // この関数はサーバーサイドでのみ動作します
  if (typeof window !== 'undefined') {
    throw new Error('getStations can only be called on the server side');
  }

  try {
    const stationsPath = path.join(
      process.cwd(),
      "public",
      "data",
      "stations.json"
    );
    const stationsData = readFileSync(stationsPath, "utf-8");
    const stations: Station[] = JSON.parse(stationsData);
    return stations;
  } catch (error) {
    console.error("地点マスタデータの取得に失敗:", error);
    return [];
  }
}