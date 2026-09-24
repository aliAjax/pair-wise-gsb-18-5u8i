// 浏览器存储：localStorage 读写与示例数据恢复
import type { EndoCase } from "../data/types";
import { seedCases } from "../data/seed";

const STORAGE_KEY = "hxwl04.endo-review.v1";

export function loadCases(): EndoCase[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EndoCase[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // 数据损坏时回退到示例数据
  }
  const seeded = seedCases();
  saveCases(seeded);
  return seeded;
}

export function saveCases(cases: EndoCase[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  } catch {
    // 存储不可用（如隐私模式）时静默失败，页面内状态仍可用
  }
}

export function resetCases(): EndoCase[] {
  const seeded = seedCases();
  saveCases(seeded);
  return seeded;
}
