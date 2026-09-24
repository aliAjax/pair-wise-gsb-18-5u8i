// 页面：病例登记（住院医师录入/补齐，提交结案前自动检查记录是否齐全）
import { useMemo, useState } from "react";
import type { CanalRecord, EndoCase, Stage } from "../data/types";
import { STAGES, latestVersion } from "../data/types";
import {
  WORKING_LENGTH_RANGE,
  allChecksPassed,
  runReviewChecks,
} from "../rules/reviewRules";

export interface CaseDraft {
  id: string | null;
  patientCode: string;
  tooth: string;
  canalCount: number;
  resident: string;
  diagnosis: string;
  stage: Stage;
  canals: CanalRecord[];
  note: string;
}

const CANAL_SUGGESTIONS = ["MB", "MB2", "ML", "DB", "DL", "D", "P", "L", "B", "单根管"];

function emptyCanal(index: number): CanalRecord {
  return { name: `根管${index + 1}`, workingLengthMm: null, masterApicalFile: "", instrumentCount: null };
}

function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

interface Props {
  initialCase: EndoCase | null;
  onSave: (draft: CaseDraft, intent: "progress" | "closure") => void;
  onCancel: () => void;
}

export default function RegisterPage({ initialCase, onSave, onCancel }: Props) {
  const base = initialCase ? latestVersion(initialCase) : null;
  const [patientCode, setPatientCode] = useState(initialCase?.patientCode ?? "");
  const [tooth, setTooth] = useState(initialCase?.tooth ?? "");
  const [resident, setResident] = useState(initialCase?.resident ?? "");
  const [diagnosis, setDiagnosis] = useState(initialCase?.diagnosis ?? "");
  const [canalCount, setCanalCount] = useState(initialCase?.canalCount ?? 1);
  const [stage, setStage] = useState<Stage>(base?.stage ?? "开髓");
  const [canals, setCanals] = useState<CanalRecord[]>(
    base ? base.canals.map((c) => ({ ...c })) : [emptyCanal(0)]
  );
  const [note, setNote] = useState(base?.note ?? "");
  const [blocked, setBlocked] = useState(false);

  const checks = useMemo(
    () => runReviewChecks({ patientCode, tooth, canalCount, stage, canals }),
    [patientCode, tooth, canalCount, stage, canals]
  );
  const ready = allChecksPassed(checks);

  function updateCanal(index: number, patch: Partial<CanalRecord>) {
    setCanals((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function buildDraft(): CaseDraft {
    return {
      id: initialCase?.id ?? null,
      patientCode: patientCode.trim(),
      tooth: tooth.trim(),
      canalCount,
      resident: resident.trim(),
      diagnosis: diagnosis.trim(),
      stage,
      canals: canals.map((c) => ({ ...c })),
      note: note.trim(),
    };
  }

  function submit(intent: "progress" | "closure") {
    if (intent === "closure" && !ready) {
      setBlocked(true);
      return;
    }
    onSave(buildDraft(), intent);
  }

  const nextVersion = initialCase ? initialCase.versions.length + 1 : 1;

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>住院医师</p>
          <h2>{initialCase ? `补齐病例 ${initialCase.patientCode}（将生成第 ${nextVersion} 版）` : "登记新病例"}</h2>
        </div>
        <button className="btn-ghost" onClick={onCancel}>返回复核台</button>
      </div>

      <div className="field-grid">
        <label>
          <span>患者代号 *</span>
          <input value={patientCode} onChange={(e) => setPatientCode(e.target.value)} placeholder="如 PT-0417" />
        </label>
        <label>
          <span>牙位（FDI）*</span>
          <input value={tooth} onChange={(e) => setTooth(e.target.value)} placeholder="如 36" maxLength={2} />
        </label>
        <label>
          <span>住院医师</span>
          <input value={resident} onChange={(e) => setResident(e.target.value)} placeholder="姓名" />
        </label>
        <label>
          <span>诊断</span>
          <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="如 慢性根尖周炎" />
        </label>
        <label>
          <span>根管数（影像/探查）*</span>
          <input
            type="number"
            min={1}
            max={8}
            value={canalCount}
            onChange={(e) => setCanalCount(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <label>
          <span>阶段</span>
          <select value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="section-heading sub">
        <h3>根管记录（工作长度 {WORKING_LENGTH_RANGE.min}–{WORKING_LENGTH_RANGE.max}mm）</h3>
        <button className="btn-ghost" onClick={() => setCanals((prev) => [...prev, emptyCanal(prev.length)])}>
          + 添加根管
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>根管</th>
            <th>工作长度 (mm)</th>
            <th>主尖锉号</th>
            <th>器械清点</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {canals.map((c, i) => (
            <tr key={i}>
              <td>
                <input
                  list="canal-names"
                  value={c.name}
                  onChange={(e) => updateCanal(i, { name: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.5"
                  value={c.workingLengthMm ?? ""}
                  onChange={(e) => updateCanal(i, { workingLengthMm: parseNumber(e.target.value) })}
                  placeholder="—"
                />
              </td>
              <td>
                <input
                  value={c.masterApicalFile}
                  onChange={(e) => updateCanal(i, { masterApicalFile: e.target.value })}
                  placeholder="如 #30"
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  value={c.instrumentCount ?? ""}
                  onChange={(e) => updateCanal(i, { instrumentCount: parseNumber(e.target.value) })}
                  placeholder="—"
                />
              </td>
              <td>
                <button
                  className="btn-ghost"
                  disabled={canals.length <= 1}
                  onClick={() => setCanals((prev) => prev.filter((_, j) => j !== i))}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <datalist id="canal-names">
        {CANAL_SUGGESTIONS.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <label className="note-field">
        <span>备注</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="本次提交说明" />
      </label>

      <div className={`check-panel ${blocked && !ready ? "alert" : ""}`}>
        <h3>结案复核规则（提交时自动检查）</h3>
        <ul className="check-list">
          {checks.map((c) => (
            <li key={c.id} className={c.passed ? "pass" : "fail"}>
              <b>{c.passed ? "✓" : "✗"}</b>
              <span>{c.label}</span>
              <em>{c.detail}</em>
            </li>
          ))}
        </ul>
        {blocked && !ready && <p className="block-tip">记录未齐全，无法提交结案，请按上表补齐。</p>}
      </div>

      <div className="action-row">
        <button className="btn-ghost" onClick={() => submit("progress")}>保存进度（不送审）</button>
        <button className="btn-primary" onClick={() => submit("closure")}>提交结案复核</button>
      </div>
    </section>
  );
}
