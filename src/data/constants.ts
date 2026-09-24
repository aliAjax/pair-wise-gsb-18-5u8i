// 病例资料层：阶段、角色、牙位等常量与空白病例工厂

import type { CaseData, Role, Stage } from "./types";

export const DEFAULT_RESIDENT = "林禾";
export const DEFAULT_ATTENDING = "周敏";

export const ROLE_LABELS: Record<Role, string> = {
  resident: "住院医师（学员）",
  attending: "主诊医生",
};

export const STAGE_ORDER: Stage[] = ["access", "length", "prep", "obturation"];

export const STAGE_LABELS: Record<Stage, string> = {
  access: "髓腔入路",
  length: "工作长度测定",
  prep: "根管预备与封药",
  obturation: "根管充填（结案）",
};

export const STAGE_HINTS: Record<Stage, string> = {
  access: "开髓、建立直线通路，登记初步根管数目",
  length: "电测结合 X 线片逐根确认工作长度",
  prep: "完成根管预备、冲洗与根管封药",
  obturation: "试尖、根管充填；此阶段资料齐全后方可提交结案",
};

/** 只有根管充填阶段允许「提交结案」 */
export const CLOSING_STAGE: Stage = "obturation";

/** 常见根管名称（输入框候选） */
export const CANAL_NAME_SUGGESTIONS = [
  "单根管",
  "MB",
  "MB2",
  "DB",
  "P",
  "ML",
  "DL",
  "B",
  "L",
];

/** 按根管数给出默认命名，仅用于新增行时预填 */
export function defaultCanalNames(count: number): string[] {
  const presets: Record<number, string[]> = {
    1: ["单根管"],
    2: ["B", "L"],
    3: ["MB", "DB", "P"],
    4: ["MB", "ML", "DB", "DL"],
    5: ["MB2", "MB", "ML", "DB", "DL"],
  };
  const base = presets[count] ?? [];
  const names = base.slice(0, count);
  while (names.length < count) names.push(`根管${names.length + 1}`);
  return names;
}

export function createBlankCase(resident: string): CaseData {
  return {
    patientCode: "",
    tooth: "",
    diagnosis: "",
    resident,
    stage: "",
    canalCount: 1,
    canals: [
      {
        id: createCanalId(),
        name: "单根管",
        workingLength: "",
        masterFile: "",
      },
    ],
    instruments: { before: "", after: "", consistent: false },
    obturationMethod: "",
    note: "",
  };
}

export function createCanalId(): string {
  return `canal-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}
