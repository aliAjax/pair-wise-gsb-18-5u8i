// 通用展示工具：时间格式化与 HTML 转义

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string): string {
  return formatDateTime(iso).slice(0, 10);
}

/** 所有插入 innerHTML 的动态文本先经此转义，防止 XSS */
export function esc(input: unknown): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(input ?? "").replace(/[&<>"']/g, (ch) => map[ch]);
}

export function formatMm(value: string): string {
  const v = Number(value);
  return Number.isFinite(v) && value.trim() !== "" ? `${v} mm` : "—";
}
