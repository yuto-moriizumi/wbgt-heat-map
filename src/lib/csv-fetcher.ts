import dayjs from "./dayjs";

async function fetchCombinedWbgtCsv(): Promise<string> {
  // 現在の年月を取得（dayjsを使用）
  const now = dayjs();
  const currentYearMonth = now.format("YYYYMM");
  const prevYearMonth = now.subtract(1, "month").format("YYYYMM");

  console.log(`今月: ${currentYearMonth}, 先月: ${prevYearMonth}`);

  // 今月と先月の両方のデータを取得（先月、今月の順で）
  const urls = [
    `https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_${prevYearMonth}.csv`,
    `https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_${currentYearMonth}.csv`,
  ];

  // 両方のURLからデータを並行して取得
  const fetchPromises = urls.map(async (url) => {
    try {
      console.log(`データ取得を試行: ${url}`);
      const response = await fetch(url);
      if (response.ok) {
        const csvText = await response.text();
        console.log(`データ取得成功: ${url}`);
        return csvText;
      } else {
        console.log(`データ取得失敗 (${response.status}): ${url}`);
        return null;
      }
    } catch (error) {
      console.log(`接続エラー: ${url} - ${error}`);
      return null;
    }
  });

  const csvTexts = (await Promise.all(fetchPromises)).filter(
    (text): text is string => text !== null
  );

  console.log(`${csvTexts.length}つのCSVデータを取得しました`);

  // 複数のCSVデータを時系列順に正しく結合
  const processedData = csvTexts
    .map(csvText => csvText.trim().split(/\r?\n/))
    .filter(lines => lines.length > 0);

  const header = processedData.find(lines => lines.length > 0)?.[0] || "";
  
  const allDataRows = processedData
    .flatMap(lines => lines.slice(1).filter(line => line.trim() !== ""));

  if (header === "") {
    throw new Error("有効なCSVヘッダーが見つかりませんでした");
  }

  const combinedCsvText = [header, ...allDataRows].join("\n");

  console.log(
    "CSVデータを結合・ソートしました:",
    combinedCsvText.substring(0, 400) + "..."
  );

  return combinedCsvText;
}

function filterCsvDataByDateRange(csvText: string, days: number): string {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return csvText; // ヘッダーしかない場合はそのまま返す
  }

  const header = lines[0];
  const dataRows = lines.slice(1);

  const cutoffStartDate = dayjs().subtract(days, "days").startOf("day");
  const cutoffEndDate = dayjs().endOf("day");

  // フィルタリングされたデータ行を収集
  const filteredRows = dataRows.filter(row => {
    const columns = row.split(",");
    if (columns.length < 2) return false; // DateとTimeの列がない場合はスキップ

    const dateStr = columns[0].trim();
    if (!dateStr) return false;

    // 日付をパース（YYYY/MM/DD形式を想定）
    const rowDate = dayjs(dateStr);
    if (!rowDate.isValid()) return false;

    // 指定期間内かチェック
    return (rowDate.isAfter(cutoffStartDate) || rowDate.isSame(cutoffStartDate, "day")) &&
           (rowDate.isBefore(cutoffEndDate) || rowDate.isSame(cutoffEndDate, "day"));
  });

  // ヘッダーとフィルタリングされた行を結合
  return [header, ...filteredRows].join("\n");
}


async function fetchPredictionCsv(): Promise<string> {
  const url = "https://www.wbgt.env.go.jp/prev15WG/dl/yohou_all.csv";
  try {
    console.log(`予測データ取得を試行: ${url}`);
    const response = await fetch(url);
    if (response.ok) {
      const csvText = await response.text();
      console.log(`予測データ取得成功: ${url}`);
      return csvText;
    } else {
      console.log(`予測データ取得失敗 (${response.status}): ${url}`);
      return "";
    }
  } catch (error) {
    console.log(`予測データ接続エラー: ${url} - ${error}`);
    return "";
  }
}

export { fetchCombinedWbgtCsv, fetchPredictionCsv, filterCsvDataByDateRange };
