// 复核规则层：学员提交结案时的记录齐全性检查
//
// 规则分为两级：
//   error   阻断项 —— 记录不齐全，禁止提交结案
//   warning 提醒项 —— 允许提交，主诊医生复核时重点关注
//
// 规则集中在此处维护，页面与存储均不内置规则，便于科室调整。

import { CLOSING_STAGE } from "../data/constants";
import type { CaseData, CheckResult } from "../data/types";

const FDI_TOOTH = /^(1[1-8]|2[1-8]|3[1-8]|4[1-8]|5[1-5])$/;
const PATIENT_CODE = /^[A-Za-z0-9-]{2,12}$/;
const WL_MIN = 8;
const WL_MAX = 32;

export interface RuleContext {
  /** 提交结案时为 true；保存草稿仅做轻量校验（目前草稿不做校验，保留扩展位） */
  closing: boolean;
}

/** 对病例资料逐条执行复核规则，返回全部检查结果 */
export function runChecks(
  data: CaseData,
  ctx: RuleContext = { closing: true },
): CheckResult[] {
  const closing = ctx.closing;
  const results: CheckResult[] = [];
  const push = (
    key: string,
    label: string,
    pass: boolean,
    detail?: string,
    level: "error" | "warning" = "error",
  ) => {
    results.push({ key, label, pass, detail, level });
  };

  // 1. 患者代号
  push(
    "patient",
    "患者代号已登记（2–12 位字母/数字/连字符）",
    PATIENT_CODE.test(data.patientCode.trim()),
    data.patientCode.trim() ? `当前：${data.patientCode.trim()}` : "未填写",
  );

  // 2. 牙位（FDI 两位制）
  push(
    "tooth",
    "牙位为有效 FDI 牙位（11–48、51–55）",
    FDI_TOOTH.test(data.tooth.trim()),
    data.tooth.trim() ? `当前：${data.tooth.trim()}` : "未填写",
  );

  // 3. 根管数与明细一致
  const countOk =
    Number.isInteger(data.canalCount) &&
    data.canalCount >= 1 &&
    data.canalCount <= 6 &&
    data.canals.length === data.canalCount;
  push(
    "canal-count",
    "根管数为 1–6，且逐根明细行数与根管数一致",
    countOk,
    `登记 ${data.canalCount} 根 / 明细 ${data.canals.length} 行`,
  );

  // 4. 每根根管均有名称，且不重复
  const names = data.canals.map((c) => c.name.trim());
  const named = names.every((n) => n.length > 0);
  const unique = new Set(names).size === names.length;
  push(
    "canal-name",
    "每根根管均有命名且互不重复",
    named && unique,
    !named
      ? "存在未命名的根管"
      : !unique
        ? "根管名称重复，请逐根区分（如 MB、MB2）"
        : names.join("、"),
  );

  // 5. 工作长度逐根登记且数值合理
  const missingWL: string[] = [];
  const oddWL: string[] = [];
  for (const c of data.canals) {
    const label = c.name.trim() || "未命名根管";
    const raw = c.workingLength.trim();
    if (raw === "") {
      missingWL.push(label);
      continue;
    }
    const v = Number(raw);
    if (!Number.isFinite(v) || v < WL_MIN || v > WL_MAX) {
      oddWL.push(`${label}=${raw}mm`);
    }
  }
  if (missingWL.length > 0) {
    push(
      "working-length",
      "每根根管均已逐颗确认工作长度",
      false,
      `缺失：${missingWL.join("、")}`,
    );
  } else if (oddWL.length > 0) {
    // 已填写但超出生理范围：提醒项，不阻断
    push(
      "working-length",
      "每根根管均已逐颗确认工作长度",
      true,
      `以下长度超出 ${WL_MIN}–${WL_MAX}mm 常规范围，请核对：${oddWL.join("、")}`,
      "warning",
    );
  } else {
    push(
      "working-length",
      "每根根管均已逐颗确认工作长度",
      true,
      data.canals.map((c) => `${c.name.trim()} ${c.workingLength.trim()}mm`).join("、"),
    );
  }

  // 6. 阶段必须为根管充填（结案）
  const atClosing = data.stage === CLOSING_STAGE;
  push(
    "stage",
    "治疗阶段为「根管充填」，达到结案节点",
    atClosing,
    atClosing ? undefined : `当前阶段为「${data.stage || "未选择"}」`,
  );

  // 结案专属规则
  if (closing && atClosing) {
    // 7. 主尖锉逐根登记
    const missingFile = data.canals
      .filter((c) => c.masterFile.trim() === "")
      .map((c) => c.name.trim() || "未命名根管");
    push(
      "master-file",
      "充填结案：每根根管主尖锉号已登记",
      missingFile.length === 0,
      missingFile.length ? `缺失：${missingFile.join("、")}` : undefined,
    );

    // 8. 充填方式
    push(
      "obturation",
      "充填结案：充填方式已填写",
      data.obturationMethod.trim().length > 0,
      data.obturationMethod.trim() || "未填写",
    );
  }

  // 9. 器械清点：术前、术后均登记，且学员确认一致
  const log = data.instruments;
  const logged = log.before.trim() !== "" && log.after.trim() !== "";
  push(
    "instruments",
    "器械清点术前、术后均已登记，且数量一致确认",
    logged && log.consistent,
    !logged
      ? "术前或术后清点记录为空"
      : log.consistent
        ? `术前：${log.before.trim()}；术后：${log.after.trim()}`
        : "学员尚未勾选「术前术后数量一致」",
  );

  return results;
}

export function blockingErrors(results: CheckResult[]): CheckResult[] {
  return results.filter((r) => r.level === "error" && !r.pass);
}

export function warnings(results: CheckResult[]): CheckResult[] {
  return results.filter((r) => r.level === "warning" && r.pass);
}

/** 保存/提交前的快速判定：是否允许提交结案 */
export function canSubmitForClosing(data: CaseData): {
  ok: boolean;
  results: CheckResult[];
} {
  const results = runChecks(data, { closing: true });
  return { ok: blockingErrors(results).length === 0, results };
}

/** 规则清单（供「复核规则」页面展示，保持与 runChecks 同步） */
export const RULE_CATALOG: Array<{
  key: string;
  title: string;
  level: "阻断" | "提醒";
  detail: string;
}> = [
  {
    key: "patient",
    title: "患者代号",
    level: "阻断",
    detail: "必须登记患者代号（2–12 位字母、数字或连字符），避免纸质签字无法对应患者。",
  },
  {
    key: "tooth",
    title: "牙位 FDI 校验",
    level: "阻断",
    detail: "牙位采用 FDI 两位制（恒牙 11–48，乳牙 51–55），杜绝牙位误记。",
  },
  {
    key: "canal-count",
    title: "根管数与明细一致",
    level: "阻断",
    detail: "根管数限定 1–6，且逐根明细行数必须与登记的根管数完全一致。",
  },
  {
    key: "canal-name",
    title: "根管逐根命名",
    level: "阻断",
    detail: "每根根管必须命名（如 MB、MB2、DB、P）且不可重复，确保逐颗核对。",
  },
  {
    key: "working-length",
    title: "工作长度逐颗确认",
    level: "阻断",
    detail: "每根根管都必须填写工作长度（mm），主诊医生逐颗确认；数值超出 8–32mm 常规范围仅作提醒，不阻断提交。",
  },
  {
    key: "stage",
    title: "结案阶段",
    level: "阻断",
    detail: "仅当治疗阶段为「根管充填（结案）」时才允许提交结案。",
  },
  {
    key: "master-file",
    title: "主尖锉号",
    level: "阻断",
    detail: "充填结案时，每根根管的主尖锉号必须逐根登记。",
  },
  {
    key: "obturation",
    title: "充填方式",
    level: "阻断",
    detail: "充填结案时必须记录充填方式（如热牙胶垂直加压、冷侧压等）。",
  },
  {
    key: "instruments",
    title: "器械清点",
    level: "阻断",
    detail: "术前、术后清点记录均不能为空，且学员须勾选确认术前术后数量一致。",
  },
];
