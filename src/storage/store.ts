// 浏览器存储层：localStorage 持久化（不增加任何依赖）
//
// 仅本文件直接接触 localStorage，页面与规则层不读写浏览器 API。
// 数据版本号独立于病例版本号，用于未来结构迁移。

import {
  DEFAULT_ATTENDING,
  DEFAULT_RESIDENT,
} from "../data/constants";
import { SEED_RECORDS } from "../data/seed";
import type {
  CaseData,
  CaseRecord,
  CaseVersion,
  Role,
} from "../data/types";
import { runChecks } from "../rules/checks";

const STORE_KEY = "rct-review.cases.v1";
const ROLE_KEY = "rct-review.role.v1";
const SCHEMA = 1;

/** 数据写入后派发，供页面在无路由变化时刷新 */
export const STORE_EVENT = "rct-store-changed";

interface StoreShape {
  schema: number;
  records: CaseRecord[];
}

// ---------- 基础读写 ----------

function isRecord(value: unknown): value is CaseRecord {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    Array.isArray(v.versions) &&
    Array.isArray(v.canals)
  );
}

function readStore(): StoreShape {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as StoreShape;
      if (parsed.schema === SCHEMA && Array.isArray(parsed.records)) {
        return { schema: SCHEMA, records: parsed.records.filter(isRecord) };
      }
    } catch {
      // 数据损坏时回落到种子数据
      console.warn("根管复核台：本地数据解析失败，已重置为演示数据。");
    }
  }
  return { schema: SCHEMA, records: seedRecords() };
}

function writeStore(store: StoreShape): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(STORE_EVENT));
}

/** 种子版本提交时，用当前复核规则实时生成检查快照 */
function seedRecords(): CaseRecord[] {
  return SEED_RECORDS.map((record) => ({
    ...record,
    versions: record.versions.map((v) => ({
      ...v,
      checks: runChecks(v.snapshot, { closing: true }),
    })),
  }));
}

// ---------- 对外查询 ----------

export function listRecords(): CaseRecord[] {
  return readStore()
    .records.slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getRecord(id: string): CaseRecord | null {
  return readStore().records.find((r) => r.id === id) ?? null;
}

// ---------- 写入：草稿 / 提交 / 复核 ----------

function nowIso(): string {
  return new Date().toISOString();
}

function nextId(existing: CaseRecord[]): string {
  const ym = new Date();
  const prefix = `RC-${ym.getFullYear()}${String(ym.getMonth() + 1).padStart(
    2,
    "0",
  )}-`;
  let max = 0;
  for (const r of existing) {
    if (r.id.startsWith(prefix)) {
      const n = Number(r.id.slice(prefix.length));
      if (Number.isInteger(n)) max = Math.max(max, n);
    }
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/** 深拷贝业务字段（数据均为 JSON 结构） */
function cloneData(data: CaseData): CaseData {
  return JSON.parse(JSON.stringify(data)) as CaseData;
}

function applyData(record: CaseRecord, data: CaseData, at: string): CaseRecord {
  return {
    ...record,
    ...cloneData(data),
    updatedAt: at,
  };
}

/** 新建病例草稿，返回新病例 id */
export function createDraft(data: CaseData): string {
  const store = readStore();
  const at = nowIso();
  const id = nextId(store.records);
  const record: CaseRecord = {
    ...cloneData(data),
    id,
    createdAt: at,
    updatedAt: at,
    versions: [],
  };
  writeStore({ schema: SCHEMA, records: [...store.records, record] });
  return id;
}

/** 保存草稿（不产生版本、不进入审批流） */
export function saveDraft(id: string, data: CaseData): void {
  const store = readStore();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("病例不存在，无法保存草稿");
  store.records[idx] = applyData(store.records[idx], data, nowIso());
  writeStore(store);
}

export interface SubmitResult {
  ok: boolean;
  /** 提交成功后的新版本号；失败时为 null */
  versionNo: number | null;
  error?: string;
}

/**
 * 学员提交结案：
 * - 存储层重新执行复核规则（不信任页面传入结果），阻断项任一不通过则拒绝提交；
 * - 通过则把资料快照 + 检查结果固化为「新版本」，旧版本与旧审批结果原样保留。
 */
export function submitVersion(
  id: string,
  data: CaseData,
  submittedBy = DEFAULT_RESIDENT,
): SubmitResult {
  const store = readStore();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, versionNo: null, error: "病例不存在" };

  const results = runChecks(data, { closing: true });
  const errors = results.filter((r) => r.level === "error" && !r.pass);
  if (errors.length > 0) {
    return {
      ok: false,
      versionNo: null,
      error: `记录不齐全（${errors.length} 项），不能提交结案`,
    };
  }

  const current = store.records[idx];
  if (
    current.versions.length > 0 &&
    current.versions[current.versions.length - 1].review === null
  ) {
    return { ok: false, versionNo: null, error: "已有待复核版本，请等待主诊医生结论" };
  }
  if (deriveApprovedLocally(current)) {
    return { ok: false, versionNo: null, error: "病例已通过复核并结案，不能再次提交" };
  }

  const at = nowIso();
  const versionNo = current.versions.length + 1;
  const version: CaseVersion = {
    no: versionNo,
    submittedAt: at,
    submittedBy,
    snapshot: cloneData(data),
    checks: JSON.parse(JSON.stringify(results)),
    review: null,
  };
  const updated: CaseRecord = {
    ...applyData(current, data, at),
    versions: [...current.versions, version],
  };
  store.records[idx] = updated;
  writeStore(store);
  return { ok: true, versionNo };
}

function deriveApprovedLocally(record: CaseRecord): boolean {
  if (record.versions.length === 0) return false;
  const last = record.versions[record.versions.length - 1];
  return last.review?.decision === "approved";
}

export interface ReviewInput {
  decision: "approved" | "rejected";
  reviewer?: string;
  /** 退回时必须填写原因；通过时可填意见 */
  reason: string;
}

export interface ReviewResult {
  ok: boolean;
  error?: string;
}

/** 主诊医生对最新待复核版本给出结论 */
export function reviewLatest(
  id: string,
  input: ReviewInput,
): ReviewResult {
  const store = readStore();
  const idx = store.records.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, error: "病例不存在" };

  const record = store.records[idx];
  const latest = record.versions[record.versions.length - 1];
  if (!latest) return { ok: false, error: "该病例尚无提交版本" };
  if (latest.review !== null) {
    return { ok: false, error: "该版本已有审批结论" };
  }
  if (input.decision === "rejected" && input.reason.trim() === "") {
    return { ok: false, error: "退回病例必须填写退回原因" };
  }

  const reviewed: CaseVersion = {
    ...latest,
    review: {
      decision: input.decision,
      reviewer: input.reviewer || DEFAULT_ATTENDING,
      at: nowIso(),
      reason: input.reason.trim(),
    },
  };
  const versions = record.versions.slice();
  versions[versions.length - 1] = reviewed;
  store.records[idx] = { ...record, versions, updatedAt: nowIso() };
  writeStore(store);
  return { ok: true };
}

/** 清空并重新载入演示数据（页脚「重置演示数据」使用） */
export function resetToSeed(): void {
  writeStore({ schema: SCHEMA, records: seedRecords() });
}

// ---------- 当前角色（简单角色切换，无权限系统依赖） ----------

export function readRole(): Role {
  const v = localStorage.getItem(ROLE_KEY);
  return v === "attending" ? "attending" : "resident";
}

export function writeRole(role: Role): void {
  localStorage.setItem(ROLE_KEY, role);
}
