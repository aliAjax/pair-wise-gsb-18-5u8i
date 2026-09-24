import { useMemo, useState } from "react";
import {
  CANAL_NAME_SUGGESTIONS,
  createBlankCase,
  createCanalId,
  DEFAULT_RESIDENT,
  defaultCanalNames,
  STAGE_HINTS,
  STAGE_LABELS,
  STAGE_ORDER,
} from "../data/constants";
import type { CaseData, CaseRecord, Stage } from "../data/types";
import { blockingErrors, canSubmitForClosing, warnings } from "../rules/checks";
import { deriveStatus } from "../rules/stats";
import { createDraft, getRecord, saveDraft, submitVersion } from "../storage/store";
import { notify } from "../components/Toast";
import { CheckList } from "../components/ui";

interface Props {
  /** null 表示新建病例 */
  record: CaseRecord | null;
}

/** 从已有记录（含草稿）构造表单数据；新建则空白 */
function toFormData(record: CaseRecord | null): CaseData {
  if (!record) return createBlankCase(DEFAULT_RESIDENT);
  const { id, createdAt, updatedAt, versions, ...data } = record;
  void id;
  void createdAt;
  void updatedAt;
  void versions;
  return JSON.parse(JSON.stringify(data)) as CaseData;
}

export function CaseEdit({ record }: Props) {
  const isNew = record === null;
  const [form, setForm] = useState<CaseData>(() => toFormData(record));
  const [showPreview, setShowPreview] = useState(false);

  const patch = (partial: Partial<CaseData>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  // 已通过的病例为结案锁定状态
  const locked = record ? deriveStatus(record) === "approved" : false;

  // 根管数变化时同步逐根明细行（保留已录入内容）
  const setCanalCount = (count: number) => {
    if (!Number.isInteger(count) || count < 1 || count > 6) return;
    setForm((prev) => {
      const canals = prev.canals.slice(0, count);
      if (count > canals.length) {
        const names = defaultCanalNames(count);
        for (let i = canals.length; i < count; i += 1) {
          canals.push({
            id: createCanalId(),
            name: names[i] || `根管${i + 1}`,
            workingLength: "",
            masterFile: "",
          });
        }
      }
      return { ...prev, canalCount: count, canals };
    });
  };

  const patchCanal = (idx: number, partial: Partial<CaseData["canals"][number]>) =>
    setForm((prev) => ({
      ...prev,
      canals: prev.canals.map((c, i) => (i === idx ? { ...c, ...partial } : c)),
    }));

  const closing = form.stage === "obturation";

  // 提交前预检（根管充填阶段才给出完整结论）
  const precheck = useMemo(
    () => canSubmitForClosing(form),
    [form],
  );
  const errors = blockingErrors(precheck.results);
  const warns = warnings(precheck.results);

  const persistDraft = () => {
    if (locked) return;
    if (isNew) {
      const id = createDraft(form);
      notify("草稿已保存", "success");
      window.location.hash = `#/cases/${id}/edit`;
    } else if (record) {
      saveDraft(record.id, form);
      notify("草稿已保存", "success");
    }
  };

  const doSubmit = () => {
    if (!closing) {
      notify("只有「根管充填（结案）」阶段才能提交结案", "error");
      return;
    }
    if (errors.length > 0) {
      notify(`仍有 ${errors.length} 项记录不齐全，不能提交`, "error");
      return;
    }
    if (!record) {
      const id = createDraft(form);
      const created = getRecord(id);
      if (!created) {
        notify("病例创建失败", "error");
        return;
      }
      const res = submitVersion(id, form, form.resident);
      if (!res.ok) {
        notify(res.error || "提交失败", "error");
        return;
      }
      notify(`已提交 v${res.versionNo}，等待主诊医生复核`, "success");
      window.location.hash = `#/cases/${id}`;
      return;
    }
    const res = submitVersion(record.id, form, form.resident);
    if (!res.ok) {
      notify(res.error || "提交失败", "error");
      return;
    }
    notify(`新版本 v${res.versionNo} 已提交，等待主诊医生复核`, "success");
    window.location.hash = `#/cases/${record.id}`;
  };

  if (locked && record) {
    return (
      <section className="panel lock-panel">
        <h2>病例已结案锁定</h2>
        <p>
          {record.id}（{record.patientCode} · {record.tooth}）已由主诊医生复核通过，
          资料不可再修改。
        </p>
        <a className="btn btn-primary" href={`#/cases/${record.id}`}>
          查看结案资料与历史版本
        </a>
      </section>
    );
  }

  return (
    <div className="edit-grid">
      <section className="panel">
        <div className="panel-head">
          <h2>{isNew ? "登记根管病例" : `补齐 / 编辑病例 ${record?.id}`}</h2>
          <a className="link-btn" href={isNew ? "#/" : `#/cases/${record?.id}`}>
            返回
          </a>
        </div>

        {record && deriveStatus(record) === "rejected" && (
          <div className="notice notice-reject">
            <strong>上一版本被退回：</strong>
            {record.versions[record.versions.length - 1]?.review?.reason}
            <br />
            请按原因补齐资料后提交新版本；旧版本审批记录仍会保留。
          </div>
        )}

        <div className="form-grid">
          <label className="field">
            <span>患者代号 *</span>
            <input
              value={form.patientCode}
              placeholder="如 P-0538（字母/数字/连字符，2–12 位）"
              onChange={(e) => patch({ patientCode: e.target.value })}
            />
          </label>
          <label className="field">
            <span>牙位（FDI）*</span>
            <input
              value={form.tooth}
              placeholder="如 26、36、11"
              onChange={(e) =>
                patch({ tooth: e.target.value.replace(/\s/g, "") })
              }
            />
          </label>
          <label className="field field-wide">
            <span>诊断 *</span>
            <input
              value={form.diagnosis}
              placeholder="如 慢性根尖周炎（26）"
              onChange={(e) => patch({ diagnosis: e.target.value })}
            />
          </label>
          <label className="field">
            <span>登记学员</span>
            <input
              value={form.resident}
              onChange={(e) => patch({ resident: e.target.value })}
            />
          </label>
          <label className="field">
            <span>治疗阶段 *</span>
            <select
              value={form.stage}
              onChange={(e) => patch({ stage: e.target.value as Stage | "" })}
            >
              <option value="">请选择阶段</option>
              {STAGE_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
            {form.stage && (
              <small className="field-hint">{STAGE_HINTS[form.stage]}</small>
            )}
          </label>
          <label className="field">
            <span>根管数（1–6）*</span>
            <input
              type="number"
              min={1}
              max={6}
              value={form.canalCount}
              onChange={(e) => setCanalCount(Number(e.target.value))}
            />
          </label>
        </div>

        <h3 className="form-subhead">逐根工作长度与主尖锉</h3>
        <p className="form-tip">
          主诊医生按根管逐颗确认工作长度；请逐行填写，不得缺项。
          名称可用候选：{CANAL_NAME_SUGGESTIONS.join(" / ")}
        </p>
        <div className="canal-rows">
          <div className="canal-row canal-row-head">
            <span>#</span>
            <span>根管名称</span>
            <span>工作长度 (mm)</span>
            <span>主尖锉号{closing ? " *" : "（充填时必填）"}</span>
          </div>
          {form.canals.map((canal, idx) => (
            <div className="canal-row" key={canal.id}>
              <span className="canal-idx">{idx + 1}</span>
              <input
                list="canal-name-options"
                value={canal.name}
                placeholder="如 MB"
                onChange={(e) => patchCanal(idx, { name: e.target.value })}
              />
              <input
                inputMode="decimal"
                value={canal.workingLength}
                placeholder="如 20.5"
                onChange={(e) =>
                  patchCanal(idx, { workingLength: e.target.value })
                }
              />
              <input
                value={canal.masterFile}
                placeholder={closing ? "如 #30/04" : "充填阶段填写"}
                disabled={!closing}
                onChange={(e) => patchCanal(idx, { masterFile: e.target.value })}
              />
            </div>
          ))}
          <datalist id="canal-name-options">
            {CANAL_NAME_SUGGESTIONS.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>

        {closing && (
          <label className="field field-wide obturation-field">
            <span>充填方式 *</span>
            <input
              value={form.obturationMethod}
              placeholder="如 热牙胶垂直加压 + 封闭剂"
              onChange={(e) => patch({ obturationMethod: e.target.value })}
            />
          </label>
        )}

        <h3 className="form-subhead">器械清点</h3>
        <div className="form-grid">
          <label className="field">
            <span>术前清点 *</span>
            <input
              value={form.instruments.before}
              placeholder="如 K锉×6，H锉×4，机用锉×4"
              onChange={(e) =>
                patch({
                  instruments: { ...form.instruments, before: e.target.value },
                })
              }
            />
          </label>
          <label className="field">
            <span>术后清点 *</span>
            <input
              value={form.instruments.after}
              placeholder="如 K锉×6，H锉×4，机用锉×4"
              onChange={(e) =>
                patch({
                  instruments: { ...form.instruments, after: e.target.value },
                })
              }
            />
          </label>
        </div>
        <label className="consent-check">
          <input
            type="checkbox"
            checked={form.instruments.consistent}
            onChange={(e) =>
              patch({
                instruments: {
                  ...form.instruments,
                  consistent: e.target.checked,
                },
              })
            }
          />
          学员确认：术前、术后器械数量一致（不一致须在备注说明去向，否则不得结案）
        </label>

        <h3 className="form-subhead">备注</h3>
        <textarea
          className="note-input"
          rows={3}
          value={form.note}
          placeholder="根管变异、术中特殊情况、复诊计划等"
          onChange={(e) => patch({ note: e.target.value })}
        />

        <div className="form-actions">
          <button className="btn" onClick={persistDraft}>
            保存草稿
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowPreview(true)}
            disabled={!closing}
            title={closing ? undefined : "仅根管充填阶段可提交结案"}
          >
            提交结案
          </button>
          {!closing && (
            <span className="form-tip inline">
              当前阶段未到结案节点，不能提交；可先保存草稿。
            </span>
          )}
        </div>
      </section>

      {showPreview && (
        <section className="panel preview-panel">
          <div className="panel-head">
            <h2>提交前齐全性核对</h2>
            <button className="link-btn" onClick={() => setShowPreview(false)}>
              返回修改
            </button>
          </div>
          {errors.length > 0 && (
            <div className="notice notice-reject">
              有 {errors.length} 项阻断问题，补齐后才能提交。
            </div>
          )}
          {warns.length > 0 && (
            <div className="notice notice-warn">
              {warns.length} 项提醒（不阻断提交），请确认数据是否准确。
            </div>
          )}
          <CheckList results={precheck.results} />
          <div className="form-actions">
            <button className="btn" onClick={() => setShowPreview(false)}>
              返回修改
            </button>
            <button
              className="btn btn-primary"
              disabled={errors.length > 0}
              onClick={doSubmit}
            >
              确认提交{record ? `新版本 v${record.versions.length + 1}` : ""}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
