// 病例资料层：演示用种子数据（首次打开时写入浏览器存储）

import { DEFAULT_ATTENDING, DEFAULT_RESIDENT } from "./constants";
import type { CaseRecord } from "./types";

const DAY = 24 * 60 * 60 * 1000;

/** 固定的演示时间基准，便于展示；实际登记使用当前时间 */
const base = Date.parse("2026-09-22T09:30:00+08:00");

export const SEED_RECORDS: CaseRecord[] = [
  {
    id: "RC-202609-001",
    patientCode: "P-0427",
    tooth: "26",
    diagnosis: "慢性根尖周炎（26）",
    resident: DEFAULT_RESIDENT,
    stage: "obturation",
    canalCount: 3,
    canals: [
      { id: "seed-1-mb", name: "MB", workingLength: "20.5", masterFile: "#30/04" },
      { id: "seed-1-db", name: "DB", workingLength: "19.0", masterFile: "#25/04" },
      { id: "seed-1-p", name: "P", workingLength: "21.5", masterFile: "#35/04" },
    ],
    instruments: {
      before: "K锉×6，H锉×4，机用锉×4",
      after: "K锉×6，H锉×4，机用锉×4",
      consistent: true,
    },
    obturationMethod: "热牙胶垂直加压 + AH-Plus 封闭",
    note: "试尖片到位，MB 轻度弯曲，充填后片示恰填。",
    createdAt: new Date(base - 6 * DAY).toISOString(),
    updatedAt: new Date(base).toISOString(),
    versions: [
      {
        no: 1,
        submittedAt: new Date(base - 1 * DAY).toISOString(),
        submittedBy: DEFAULT_RESIDENT,
        // 种子版本的检查结果在 storage 初始化时由复核规则实时生成，保证规则一致
        snapshot: {
          patientCode: "P-0427",
          tooth: "26",
          diagnosis: "慢性根尖周炎（26）",
          resident: DEFAULT_RESIDENT,
          stage: "obturation",
          canalCount: 3,
          canals: [
            { id: "seed-1-mb", name: "MB", workingLength: "20.5", masterFile: "#30/04" },
            { id: "seed-1-db", name: "DB", workingLength: "19.0", masterFile: "#25/04" },
            { id: "seed-1-p", name: "P", workingLength: "21.5", masterFile: "#35/04" },
          ],
          instruments: {
            before: "K锉×6，H锉×4，机用锉×4",
            after: "K锉×6，H锉×4，机用锉×4",
            consistent: true,
          },
          obturationMethod: "热牙胶垂直加压 + AH-Plus 封闭",
          note: "试尖片到位，MB 轻度弯曲，充填后片示恰填。",
        },
        checks: [],
        review: {
          decision: "approved",
          reviewer: DEFAULT_ATTENDING,
          at: new Date(base).toISOString(),
          reason: "工作长度逐根确认无误，器械清点一致，充填质量可，准予结案。",
        },
      },
    ],
  },
  {
    id: "RC-202609-002",
    patientCode: "P-0511",
    tooth: "36",
    diagnosis: "急性牙髓炎（36）",
    resident: DEFAULT_RESIDENT,
    stage: "obturation",
    canalCount: 4,
    canals: [
      { id: "seed-2-mb", name: "MB", workingLength: "20.0", masterFile: "#30/04" },
      { id: "seed-2-ml", name: "ML", workingLength: "20.0", masterFile: "#30/04" },
      { id: "seed-2-db", name: "DB", workingLength: "21.0", masterFile: "#30/04" },
      // DL 工作长度与主尖锉缺失：模拟被退回病例
      { id: "seed-2-dl", name: "DL", workingLength: "", masterFile: "" },
    ],
    instruments: {
      before: "K锉×6，H锉×4，机用锉×5",
      after: "K锉×6，H锉×4，机用锉×4",
      consistent: false,
    },
    obturationMethod: "",
    note: "远中舌根显露困难，下次复诊处理。",
    createdAt: new Date(base - 4 * DAY).toISOString(),
    updatedAt: new Date(base - 2 * DAY + 3600_000).toISOString(),
    versions: [
      {
        no: 1,
        submittedAt: new Date(base - 2 * DAY).toISOString(),
        submittedBy: DEFAULT_RESIDENT,
        snapshot: {
          patientCode: "P-0511",
          tooth: "36",
          diagnosis: "急性牙髓炎（36）",
          resident: DEFAULT_RESIDENT,
          stage: "obturation",
          canalCount: 4,
          canals: [
            { id: "seed-2-mb", name: "MB", workingLength: "20.0", masterFile: "#30/04" },
            { id: "seed-2-ml", name: "ML", workingLength: "20.0", masterFile: "#30/04" },
            { id: "seed-2-db", name: "DB", workingLength: "21.0", masterFile: "#30/04" },
            { id: "seed-2-dl", name: "DL", workingLength: "", masterFile: "" },
          ],
          instruments: {
            before: "K锉×6，H锉×4，机用锉×5",
            after: "K锉×6，H锉×4，机用锉×4",
            consistent: false,
          },
          obturationMethod: "",
          note: "远中舌根显露困难，下次复诊处理。",
        },
        checks: [],
        review: {
          decision: "rejected",
          reviewer: DEFAULT_ATTENDING,
          at: new Date(base - 2 * DAY + 3600_000).toISOString(),
          reason:
            "1. DL 根管工作长度、主尖锉缺失，未做到逐颗确认；2. 术后机用锉 4 支、术前 5 支，数量不一致且未说明去向；3. 充填方式未填写。补齐并重新清点器械后提交新版本。",
        },
      },
    ],
  },
  {
    id: "RC-202609-003",
    patientCode: "P-0530",
    tooth: "11",
    diagnosis: "外伤后牙冠变色（11）",
    resident: DEFAULT_RESIDENT,
    stage: "obturation",
    canalCount: 1,
    canals: [
      { id: "seed-3-1", name: "单根管", workingLength: "22.5", masterFile: "#30/02" },
    ],
    instruments: {
      before: "K锉×4，H锉×2，机用锉×3",
      after: "K锉×4，H锉×2，机用锉×3",
      consistent: true,
    },
    obturationMethod: "冷侧压充填",
    note: "髓腔内漂白拟后续进行，本次完成根管充填。",
    createdAt: new Date(base - 1 * DAY).toISOString(),
    updatedAt: new Date(base + 2 * 3600_000).toISOString(),
    versions: [
      {
        no: 1,
        submittedAt: new Date(base + 2 * 3600_000).toISOString(),
        submittedBy: DEFAULT_RESIDENT,
        snapshot: {
          patientCode: "P-0530",
          tooth: "11",
          diagnosis: "外伤后牙冠变色（11）",
          resident: DEFAULT_RESIDENT,
          stage: "obturation",
          canalCount: 1,
          canals: [
            { id: "seed-3-1", name: "单根管", workingLength: "22.5", masterFile: "#30/02" },
          ],
          instruments: {
            before: "K锉×4，H锉×2，机用锉×3",
            after: "K锉×4，H锉×2，机用锉×3",
            consistent: true,
          },
          obturationMethod: "冷侧压充填",
          note: "髓腔内漂白拟后续进行，本次完成根管充填。",
        },
        checks: [],
        review: null,
      },
    ],
  },
  {
    id: "RC-202609-004",
    patientCode: "P-0538",
    tooth: "46",
    diagnosis: "慢性牙髓炎（46）",
    resident: DEFAULT_RESIDENT,
    stage: "length",
    canalCount: 3,
    canals: [
      { id: "seed-4-mb", name: "MB", workingLength: "19.5", masterFile: "" },
      { id: "seed-4-ml", name: "ML", workingLength: "19.5", masterFile: "" },
      { id: "seed-4-d", name: "D", workingLength: "", masterFile: "" },
    ],
    instruments: { before: "", after: "", consistent: false },
    obturationMethod: "",
    note: "近中双根管，远中根管测长待复诊完成。",
    createdAt: new Date(base - 86400_000).toISOString(),
    updatedAt: new Date(base - 86400_000).toISOString(),
    versions: [],
  },
];
