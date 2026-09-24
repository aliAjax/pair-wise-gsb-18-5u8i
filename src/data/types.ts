// 病例资料：类型定义与派生状态
export type Stage = "开髓" | "测长" | "根管预备" | "封药" | "充填" | "结案";

export const STAGES: Stage[] = ["开髓", "测长", "根管预备", "封药", "充填", "结案"];

export type Role = "resident" | "attending";

export const ROLE_LABEL: Record<Role, string> = {
  resident: "住院医师",
  attending: "主诊医生",
};

/** 单根管记录：工作长度、主尖锉号、器械清点 */
export interface CanalRecord {
  name: string;
  workingLengthMm: number | null;
  masterApicalFile: string;
  instrumentCount: number | null;
}

/** 复核规则检查结果（提交时快照保存） */
export interface RuleCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

/** 主诊医生审批结果 */
export interface ReviewRecord {
  outcome: "approved" | "rejected";
  reviewer: string;
  reason: string;
  reviewedAt: string;
}

/** 一次提交即一个版本，旧版本与旧审批结果永久保留 */
export interface CaseVersion {
  version: number;
  intent: "progress" | "closure";
  stage: Stage;
  canals: CanalRecord[];
  note: string;
  submittedAt: string;
  checks: RuleCheck[];
  review: ReviewRecord | null;
}

export interface EndoCase {
  id: string;
  patientCode: string;
  tooth: string;
  canalCount: number;
  resident: string;
  diagnosis: string;
  createdAt: string;
  versions: CaseVersion[];
}

export type CaseStatus = "in-progress" | "pending" | "approved" | "rejected";

export const STATUS_LABEL: Record<CaseStatus, string> = {
  "in-progress": "在研",
  pending: "待复核",
  approved: "已完成",
  rejected: "已退回",
};

export function latestVersion(item: EndoCase): CaseVersion {
  return item.versions[item.versions.length - 1];
}

/** 状态由最新版本推导：审批结果 > 提交意图 */
export function caseStatus(item: EndoCase): CaseStatus {
  const latest = latestVersion(item);
  if (latest.review?.outcome === "approved") return "approved";
  if (latest.review?.outcome === "rejected") return "rejected";
  if (latest.intent === "closure") return "pending";
  return "in-progress";
}
