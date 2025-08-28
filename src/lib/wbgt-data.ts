import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import path from 'path';

export interface WbgtData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  wbgt: number;
  riskLevel: string;
  riskColor: string;
}

export interface WbgtGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      id: string;
      name: string;
      wbgt: number;
      riskLevel: string;
      riskColor: string;
    };
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
  }>;
}

interface Station {
  id: string;
  name: string;
  lat: string;
  lng: string;
}

// リスクレベルと色を決定する関数
function getRiskLevel(wbgt: number): { level: string; color: string } {
  if (wbgt >= 35) {
    return { level: '災害級の危険', color: '#800080' }; // 紫
  } else if (wbgt >= 33) {
    return { level: '極めて危険', color: '#FF0000' }; // 赤
  } else if (wbgt >= 31) {
    return { level: '危険', color: '#FF4500' }; // オレンジレッド
  } else if (wbgt >= 28) {
    return { level: '厳重警戒', color: '#FFA500' }; // オレンジ
  } else if (wbgt >= 25) {
    return { level: '警戒', color: '#FFFF00' }; // 黄
  } else if (wbgt >= 21) {
    return { level: '注意', color: '#00FFFF' }; // シアン
  } else {
    return { level: 'ほぼ安全', color: '#0000FF' }; // 青
  }
}

// 地点マスタデータを取得
async function getStations(): Promise<Station[]> {
  try {
    const stationsPath = path.join(process.cwd(), 'public', 'data', 'stations.json');
    const stationsData = readFileSync(stationsPath, 'utf-8');
    const stations: Station[] = JSON.parse(stationsData);
    return stations;
  } catch (error) {
    console.error('地点マスタデータの取得に失敗:', error);
    return [];
  }
}

export async function fetchWbgtData(): Promise<WbgtGeoJSON> {
  try {
    // 現在の年月を取得
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentYearMonth = `${year}${month}`;

    console.log(`現在の年月: ${currentYearMonth}`);

    // 現在月のデータ取得を試行
    let csvUrl = `https://www.wbgt.env.go.jp/data_service_sample/wbgt_all_${currentYearMonth}.csv`;
    
    let response = await fetch(csvUrl);
    
    // 現在月のデータが存在しない場合、サンプルデータ（2019年7月）を使用
    if (!response.ok) {
      console.log(`現在月のデータが存在しないため、サンプルデータを使用: ${csvUrl}`);
      csvUrl = 'https://www.wbgt.env.go.jp/data_service_sample/wbgt_all_201907.csv';
      response = await fetch(csvUrl);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();
    console.log('CSVデータを取得しました:', csvText.substring(0, 200) + '...');

    // 地点マスタデータを取得
    const stations = await getStations();
    console.log(`地点マスタデータを取得: ${stations.length}地点`);

    // CSVをパース
    const records = parse(csvText, {
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`CSVレコード数: ${records.length}`);

    if (records.length < 2) {
      throw new Error('CSVデータが空または不正です');
    }

    // ヘッダー行から地点IDを取得
    const header = records[0];
    const stationIds = header.slice(2); // 最初の2列（Date, Time）をスキップ

    console.log(`ヘッダーから地点ID数: ${stationIds.length}個`);

    // GeoJSONフィーチャーを作成
    const features = [];

    // 各地点に対してデータを処理
    for (let stationIndex = 0; stationIndex < stationIds.length; stationIndex++) {
      const stationId = String(stationIds[stationIndex]).trim();
      
      // 対応する地点情報を検索
      const station = stations.find(s => s.id === stationId);
      if (!station) {
        console.log(`地点ID ${stationId} が地点マスタに見つかりません`);
        continue;
      }

      // 最新のWBGTデータを取得（最後の行から最新データを探す）
      let latestWbgt = null;
      for (let rowIndex = records.length - 1; rowIndex > 0; rowIndex--) {
        const row = records[rowIndex];
        if (!row || row.length <= stationIndex + 2) continue;
        
        const value = row[stationIndex + 2]; // Date, Timeの後の列
        if (value && value !== '' && !isNaN(Number(value))) {
          latestWbgt = Number(value);
          break;
        }
      }

      if (latestWbgt === null) {
        console.log(`地点ID ${stationId} にWBGTデータがありません`);
        continue;
      }

      // WBGTが10倍されている場合の調整
      if (latestWbgt > 100) {
        latestWbgt = latestWbgt / 10;
      }

      const { level, color } = getRiskLevel(latestWbgt);

      features.push({
        type: 'Feature' as const,
        properties: {
          id: stationId,
          name: station.name,
          wbgt: latestWbgt,
          riskLevel: level,
          riskColor: color,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [parseFloat(station.lng), parseFloat(station.lat)] as [number, number],
        },
      });
    }

    console.log(`GeoJSONフィーチャー作成完了: ${features.length}地点`);

    const geoJson: WbgtGeoJSON = {
      type: 'FeatureCollection',
      features,
    };

    return geoJson;
  } catch (error) {
    console.error('WBGTデータの取得に失敗:', error);
    // エラー時は空のGeoJSONを返す
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }
}
