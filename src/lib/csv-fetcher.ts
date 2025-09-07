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
  let header = "";
  const allDataRows: string[] = [];

  for (let i = 0; i < csvTexts.length; i++) {
    const lines = csvTexts[i].trim().split(/\r?\n/);
    if (lines.length === 0) continue;

    // 最初の有効なCSVからヘッダーを取得
    if (header === "" && lines.length > 0) {
      header = lines[0];
    }

    // データ行を収集
    const dataRows = lines.slice(1).filter((line) => line.trim() !== "");
    allDataRows.push(...dataRows);
  }

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

function filterCsvDataByDateRange(csvText: string, days: number): string;
function filterCsvDataByDateRange(csvText: string, startDate: dayjs.Dayjs, endDate: dayjs.Dayjs): string;
function filterCsvDataByDateRange(csvText: string, startOrDays: number | dayjs.Dayjs, endDate?: dayjs.Dayjs): string {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return csvText; // ヘッダーしかない場合はそのまま返す
  }

  const header = lines[0];
  const dataRows = lines.slice(1);

  let cutoffStartDate: dayjs.Dayjs;
  let cutoffEndDate: dayjs.Dayjs;

  if (typeof startOrDays === 'number') {
    // days指定の場合
    cutoffStartDate = dayjs().subtract(startOrDays, "days").startOf("day");
    cutoffEndDate = dayjs().endOf("day");
  } else {
    // startDateとendDate指定の場合
    cutoffStartDate = startOrDays.startOf("day");
    cutoffEndDate = (endDate as dayjs.Dayjs).endOf("day");
  }

  // フィルタリングされたデータ行を収集
  const filteredRows: string[] = [];

  for (const row of dataRows) {
    const columns = row.split(",");
    if (columns.length < 2) continue; // DateとTimeの列がない場合はスキップ

    const dateStr = columns[0].trim();
    if (!dateStr) continue;

    // 日付をパース（YYYY-MM-DD形式を想定）
    const rowDate = dayjs(dateStr, "YYYY-MM-DD");
    if (!rowDate.isValid()) continue;

    // 指定期間内かチェック
    if ((rowDate.isAfter(cutoffStartDate) || rowDate.isSame(cutoffStartDate, "day")) &&
        (rowDate.isBefore(cutoffEndDate) || rowDate.isSame(cutoffEndDate, "day"))) {
      filteredRows.push(row);
    }
  }

  // ヘッダーとフィルタリングされた行を結合
  return [header, ...filteredRows].join("\n");
}

export { fetchCombinedWbgtCsv, filterCsvDataByDateRange };
