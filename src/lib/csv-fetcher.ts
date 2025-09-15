import dayjs from "./dayjs";

// WBGT CSVデータを取得する共通関数
async function fetchWbgtCsv(
  yearMonth: string,
  useCache: boolean = false
): Promise<string | null> {
  const url = `https://www.wbgt.env.go.jp/est15WG/dl/wbgt_all_${yearMonth}.csv`;
  try {
    const response = await fetch(url, useCache ? { cache: "force-cache" } : {});
    if (response.ok) {
      const csvText = await response.text();
      return csvText;
    } else {
      console.log(`データ取得失敗 (${response.status}): ${url}`);
      return null;
    }
  } catch (error) {
    console.log(`データ接続エラー: ${url} - ${error}`);
    return null;
  }
}



async function fetchCombinedWbgtCsv(): Promise<string> {
  // 現在の年月を取得（dayjsを使用）
  const now = dayjs();
  const currentYearMonth = now.format("YYYYMM");
  const prevYearMonth = now.subtract(1, "month").format("YYYYMM");

  // 両方のURLからデータを並行して取得（先月分はキャッシュ適用）
  const [prevMonthCsv, currentMonthCsv] = await Promise.all([
    fetchWbgtCsv(prevYearMonth, true),
    fetchWbgtCsv(currentYearMonth, false),
  ]);

  const csvTexts = [prevMonthCsv, currentMonthCsv].filter(
    (text): text is string => text !== null
  );

  // 複数のCSVデータを時系列順に正しく結合
  const processedData = csvTexts
    .map((csvText) => csvText.trim().split(/\r?\n/))
    .filter((lines) => lines.length > 0);

  const header = processedData.find((lines) => lines.length > 0)?.[0] || "";

  const allDataRows = processedData.flatMap((lines) =>
    lines.slice(1).filter((line) => line.trim() !== "")
  );

  if (header === "") {
    throw new Error("有効なCSVヘッダーが見つかりませんでした");
  }

  const combinedCsvText = [header, ...allDataRows].join("\n");
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
  const filteredRows = dataRows.filter((row) => {
    const columns = row.split(",");
    if (columns.length < 2) return false; // DateとTimeの列がない場合はスキップ

    const dateStr = columns[0].trim();
    if (!dateStr) return false;

    // 日付をパース（YYYY/MM/DD形式を想定）
    const rowDate = dayjs(dateStr);
    if (!rowDate.isValid()) return false;

    // 指定期間内かチェック
    return (
      (rowDate.isAfter(cutoffStartDate) ||
        rowDate.isSame(cutoffStartDate, "day")) &&
      (rowDate.isBefore(cutoffEndDate) || rowDate.isSame(cutoffEndDate, "day"))
    );
  });

  // ヘッダーとフィルタリングされた行を結合
  return [header, ...filteredRows].join("\n");
}

async function fetchPredictionCsv(): Promise<string> {
  const url = "https://www.wbgt.env.go.jp/prev15WG/dl/yohou_all.csv";
  try {
    const response = await fetch(url);
    if (response.ok) {
      const csvText = await response.text();
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
