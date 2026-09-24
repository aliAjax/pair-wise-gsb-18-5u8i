// 病例资料层：根管病例复核台的领域类型定义

/** 治疗阶段：结案阶段为「根管充填」 */
export type Stage = "access" | "length" | "prep" | "obturation";

/** 使用角色：住院医师（学员）/ 主诊医生 */
export type Role = "resident" | "attending";

/** 主诊医生的复核结论 */
export type Decision = "approved" | "rejected";

/** 单根根管的登记信息 */
export interface Canal {
  id: string;
  /** 根管名称，如 MB、DB、P、DL；单根管可登记为「单根管」 */
  name: string;
  /** 工作长度（mm），录入阶段以字符串保存，空串表示未登记 */
  workingLength: string;
  /** 主尖锉号，如 #30/04；充填结案时必填 */
  masterFile: string;
}

/** 器械清点：术前 / 术后登记与数量一致性确认 */
export interface InstrumentLog {
  /** 术前清点，例：K锉×6、H锉×4 */
  before: string;
  /** 术后清点，例：K锉×6、H锉×4 */
  after: string;
  /** 学员确认术前术后数量一致 */
  consistent: boolean;
}

/** 一条复核规则的检查结果（提交时固化到版本快照中） */
export interface CheckResult {
  key: string;
  label: string;
  pass: boolean;
  /** error 为阻断项（不齐全，不能提交结案）；warning 为提醒项 */
  level: "error" | "warning";
  detail?: string;
}

/** 主诊医生审批记录 */
export interface Review {
  decision: Decision;
  reviewer: string;
  at: string;
  /** 通过意见或退回原因（退回时必填） */
  reason: string;
}

/** 每次提交形成的版本：资料快照 + 当时规则检查结果 + 审批结果 */
export interface CaseVersion {
  no: number;
  submittedAt: string;
  submittedBy: string;
  snapshot: CaseData;
  checks: CheckResult[];
  review: Review | null;
}

/** 病例业务字段（草稿与版本快照共用同一结构） */
export interface CaseData {
  patientCode: string;
  /** FDI 两位牙位，如 26、36、11 */
  tooth: string;
  diagnosis: string;
  resident: string;
  stage: Stage | "";
  canalCount: number;
  canals: Canal[];
  instruments: InstrumentLog;
  /** 充填方式，如热牙胶垂直加压、冷侧压 */
  obturationMethod: string;
  note: string;
}

/** 一条完整病例：业务字段 + 元数据 + 历次提交版本 */
export interface CaseRecord extends CaseData {
  id: string;
  createdAt: string;
  updatedAt: string;
  versions: CaseVersion[];
}

/** 由最新版本审批结果派生的病例状态 */
export type CaseStatus = "draft" | "pending" | "approved" | "rejected";
