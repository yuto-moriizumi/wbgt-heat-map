import { readFileSync } from "fs";
import path from "path";
import { Station } from "./types";

export async function getStations(): Promise<Station[]> {
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