// 复核规则层：病例状态派生与完成统计
//
// 状态完全由「最新一次提交版本的审批结果」派生：
//   draft     从未提交（草稿）
//   pending   最新版本已提交、待主诊医生复核
//   approved  最新版本复核通过
//   rejected  最新版本被退回 —— 不进入完成统计，学员补齐后生成新版本

import type { CaseRecord, CaseStatus } from "../data/types";

export function deriveStatus(record: CaseRecord): CaseStatus {
  if (record.versions.length === 0) return "draft";
  const latest = record.versions[record.versions.length - 1];
  if (latest.review === null) return "pending";
  return latest.review.decision === "approved" ? "approved" : "rejected";
}

export const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "草稿",
  pending: "待复核",
  approved: "已通过",
  rejected: "已退回",
};

export const STATUS_ORDER: CaseStatus[] = [
  "draft",
  "pending",
  "rejected",
  "approved",
];

export interface DashboardStats {
  total: number;
  draft: number;
  pending: number;
  rejected: number;
  /** 完成统计：仅统计最新版本复核通过的病例 */
  approved: number;
  /** 已通过病例的平均工作长度（全部根管，单位 mm） */
  avgWorkingLength: number | null;
  /** 已通过病例的根管总数 */
  approvedCanals: number;
  /** 历次退回次数（旧版本），用于观察补件质量 */
  rejectionRounds: number;
  /** 审批通过率：通过病例数 / 有提交记录的病例数 */
  approvalRate: number | null;
}

/**
 * 完成统计口径：
 * 病例的「当前状态」只看最新版本；最新版本未通过（草稿/待复核/退回）一律不计入完成。
 * 被退回后重新提交并通过的，以新版本结果计入完成；旧版本退回原因仍保留在版本记录中。
 */
export function buildStats(records: CaseRecord[]): DashboardStats {
  let draft = 0;
  let pending = 0;
  let rejected = 0;
  let approved = 0;
  let approvedCanals = 0;
  let wlTotal = 0;
  let wlCount = 0;
  let rejectionRounds = 0;
  let submitted = 0;

  for (const record of records) {
    const status = deriveStatus(record);
    if (status === "draft") draft += 1;
    if (status === "pending") pending += 1;
    if (status === "rejected") rejected += 1;
    if (status === "approved") {
      approved += 1;
      approvedCanals += record.canals.length;
      for (const c of record.canals) {
        const v = Number(c.workingLength);
        if (Number.isFinite(v) && v > 0) {
          wlTotal += v;
          wlCount += 1;
        }
      }
    }
    if (record.versions.length > 0) submitted += 1;
    // 所有历史版本中的退回都计入退回轮次
    rejectionRounds += record.versions.filter(
      (v) => v.review?.decision === "rejected",
    ).length;
  }

  return {
    total: records.length,
    draft,
    pending,
    rejected,
    approved,
    approvedCanals,
    avgWorkingLength: wlCount > 0 ? wlTotal / wlCount : null,
    rejectionRounds,
    approvalRate: submitted > 0 ? approved / submitted : null,
  };
}
