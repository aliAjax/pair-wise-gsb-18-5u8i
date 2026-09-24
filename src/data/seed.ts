// 病例资料：教学演示用示例病例
import type { CanalRecord, CaseVersion, EndoCase, Stage } from "./types";
import { runReviewChecks } from "../rules/reviewRules";

function canal(
  name: string,
  workingLengthMm: number | null,
  masterApicalFile: string,
  instrumentCount: number | null
): CanalRecord {
  return { name, workingLengthMm, masterApicalFile, instrumentCount };
}

interface VersionSeed {
  intent: "progress" | "closure";
  stage: Stage;
  canals: CanalRecord[];
  note: string;
  submittedAt: string;
  review?: CaseVersion["review"];
}

function buildCase(
  id: string,
  patientCode: string,
  tooth: string,
  canalCount: number,
  resident: string,
  diagnosis: string,
  createdAt: string,
  versions: VersionSeed[]
): EndoCase {
  return {
    id,
    patientCode,
    tooth,
    canalCount,
    resident,
    diagnosis,
    createdAt,
    versions: versions.map((v, i) => ({
      version: i + 1,
      intent: v.intent,
      stage: v.stage,
      canals: v.canals,
      note: v.note,
      submittedAt: v.submittedAt,
      checks:
        v.intent === "closure"
          ? runReviewChecks({ patientCode, tooth, canalCount, stage: v.stage, canals: v.canals })
          : [],
      review: v.review ?? null,
    })),
  };
}

/** 每次调用生成全新对象，便于“恢复示例数据” */
export function seedCases(): EndoCase[] {
  return [
    buildCase(
      "HX-001",
      "PT-0417",
      "36",
      3,
      "林一",
      "慢性根尖周炎",
      "2026-09-10 09:20:00",
      [
        {
          intent: "closure",
          stage: "充填",
          canals: [
            canal("MB", 20.5, "#30", 14),
            canal("ML", 21.0, "#30", 14),
            canal("D", 19.5, "#25", null),
          ],
          note: "首次提交结案。",
          submittedAt: "2026-09-18 10:02:00",
          review: {
            outcome: "rejected",
            reviewer: "周医生",
            reason: "D 根管器械清点未记录，请补齐后重新提交。",
            reviewedAt: "2026-09-18 15:40:00",
          },
        },
        {
          intent: "closure",
          stage: "结案",
          canals: [
            canal("MB", 20.5, "#30", 14),
            canal("ML", 21.0, "#30", 14),
            canal("D", 19.5, "#25", 12),
          ],
          note: "已补齐 D 根管器械清点。",
          submittedAt: "2026-09-19 09:12:00",
          review: {
            outcome: "approved",
            reviewer: "周医生",
            reason: "记录齐全，同意结案。",
            reviewedAt: "2026-09-19 11:05:00",
          },
        },
      ]
    ),
    buildCase(
      "HX-002",
      "PT-0523",
      "11",
      1,
      "陈果",
      "外伤后牙髓坏死",
      "2026-09-15 14:00:00",
      [
        {
          intent: "closure",
          stage: "结案",
          canals: [canal("单根管", 22.0, "#35", 10)],
          note: "冷侧压充填完成。",
          submittedAt: "2026-09-22 16:30:00",
        },
      ]
    ),
    buildCase(
      "HX-003",
      "PT-0610",
      "46",
      4,
      "林一",
      "急性牙髓炎",
      "2026-09-16 08:50:00",
      [
        {
          intent: "closure",
          stage: "充填",
          canals: [
            canal("MB", 20.0, "#30", 13),
            canal("ML", 20.5, "#30", 13),
            canal("D", 19.0, "#25", 11),
          ],
          note: "三根管充填。",
          submittedAt: "2026-09-20 11:20:00",
          review: {
            outcome: "rejected",
            reviewer: "周医生",
            reason: "影像提示近中 MB2，登记根管数 4 但仅 3 条记录，请补充。",
            reviewedAt: "2026-09-20 17:02:00",
          },
        },
        {
          intent: "closure",
          stage: "结案",
          canals: [
            canal("MB", 20.0, "#30", 13),
            canal("MB2", 19.5, "#25", 12),
            canal("ML", 20.5, "#30", 13),
            canal("D", 19.0, "#25", 11),
          ],
          note: "已探查并补充 MB2 记录。",
          submittedAt: "2026-09-23 09:45:00",
        },
      ]
    ),
    buildCase(
      "HX-004",
      "PT-0628",
      "26",
      3,
      "王珊",
      "慢性牙髓炎",
      "2026-09-21 10:10:00",
      [
        {
          intent: "progress",
          stage: "封药",
          canals: [
            canal("MB", 19.0, "#25", 12),
            canal("DB", 19.5, "#25", 12),
            canal("P", 21.0, "#30", null),
          ],
          note: "封氢氧化钙，约复诊。",
          submittedAt: "2026-09-21 12:00:00",
        },
      ]
    ),
  ];
}
