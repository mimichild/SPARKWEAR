/**
 * 把手動輸入的日期正規化成 YYYY-MM-DD（補零），例如 "2026-11-8" → "2026-11-08"。
 * 資料庫以 TEXT 存日期並依文字排序，未補零會讓 "2026-11-8" 排在 "2026-11-19" 之後。
 * 無法辨識的格式原樣（trim 後）回傳，不吞掉使用者的輸入。
 */
export function normalizeDateString(input: string): string {
  const s = input.trim();
  const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (!m) return s;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}
