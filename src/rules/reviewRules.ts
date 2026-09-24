// 复核规则：结案提交时的完整性检查
import type { CanalRecord, RuleCheck, Stage } from "../data/types";

export interface SubmissionDraft {
  patientCode: string;
  tooth: string;
  canalCount: number;
  stage: Stage;
  canals: CanalRecord[];
}

/** FDI 牙位：11-18 / 21-28 / 31-38 / 41-48 */
const FDI_PATTERN = /^(1[1-8]|2[1-8]|3[1-8]|4[1-8])$/;

export const WORKING_LENGTH_RANGE = { min: 5, max: 30 };

export function isValidTooth(tooth: string): boolean {
  return FDI_PATTERN.test(tooth.trim());
}

function checkBasicInfo(draft: SubmissionDraft): RuleCheck {
  const missing: string[] = [];
  if (!draft.patientCode.trim()) missing.push("患者代号");
  if (!isValidTooth(draft.tooth)) missing.push("有效牙位（FDI）");
  return {
    id: "basic-info",
    label: "患者代号与牙位已登记",
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `患者 ${draft.patientCode.trim()}，牙位 ${draft.tooth.trim()}`
        : `缺少：${missing.join("、")}`,
  };
}

function checkCanalCount(draft: SubmissionDraft): RuleCheck {
  const passed = draft.canalCount >= 1 && draft.canals.length === draft.canalCount;
  return {
    id: "canal-count",
    label: "根管数与根管记录条数一致",
    passed,
    detail: `登记根管数 ${draft.canalCount}，实际记录 ${draft.canals.length} 条`,
  };
}

function checkWorkingLength(draft: SubmissionDraft): RuleCheck {
  const { min, max } = WORKING_LENGTH_RANGE;
  const bad = draft.canals.filter(
    (c) => c.workingLengthMm === null || c.workingLengthMm < min || c.workingLengthMm > max
  );
  return {
    id: "working-length",
    label: `每根管工作长度已测（${min}–${max}mm）`,
    passed: draft.canals.length > 0 && bad.length === 0,
    detail:
      bad.length === 0
        ? "各根管工作长度齐全"
        : `未达标：${bad.map((c) => c.name || "未命名").join("、")}`,
  };
}

function checkMasterFile(draft: SubmissionDraft): RuleCheck {
  const bad = draft.canals.filter((c) => !c.masterApicalFile.trim());
  return {
    id: "master-file",
    label: "每根管主尖锉号已记录",
    passed: draft.canals.length > 0 && bad.length === 0,
    detail:
      bad.length === 0
        ? "各根管主尖锉号齐全"
        : `缺少：${bad.map((c) => c.name || "未命名").join("、")}`,
  };
}

function checkInstrumentCount(draft: SubmissionDraft): RuleCheck {
  const bad = draft.canals.filter(
    (c) => c.instrumentCount === null || c.instrumentCount < 0
  );
  return {
    id: "instrument-count",
    label: "器械清点逐根管已记录",
    passed: draft.canals.length > 0 && bad.length === 0,
    detail:
      bad.length === 0
        ? "各根管器械清点齐全"
        : `未清点：${bad.map((c) => c.name || "未命名").join("、")}`,
  };
}

function checkStage(draft: SubmissionDraft): RuleCheck {
  const passed = draft.stage === "充填" || draft.stage === "结案";
  return {
    id: "stage",
    label: "已达充填/结案阶段",
    passed,
    detail: passed ? `当前阶段：${draft.stage}` : `当前阶段：${draft.stage}，尚未充填`,
  };
}

/** 结案提交前逐项检查记录是否齐全 */
export function runReviewChecks(draft: SubmissionDraft): RuleCheck[] {
  return [
    checkBasicInfo(draft),
    checkCanalCount(draft),
    checkWorkingLength(draft),
    checkMasterFile(draft),
    checkInstrumentCount(draft),
    checkStage(draft),
  ];
}

export function allChecksPassed(checks: RuleCheck[]): boolean {
  return checks.every((c) => c.passed);
}
