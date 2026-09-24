import { useState } from "react";
import type { CaseRecord, Decision } from "../data/types";
import {
  DEFAULT_ATTENDING,
  STAGE_LABELS,
} from "../data/constants";
import { deriveStatus } from "../rules/stats";
import { reviewLatest } from "../storage/store";
import { formatDateTime } from "../utils/format";
import { notify } from "../components/Toast";
import { CheckList, StatusBadge } from "../components/ui";

interface Props {
  record: CaseRecord;
  role: "resident" | "attending";
}

export function CaseDetail({ record, role }: Props) {
  const [openVersion, setOpenVersion] = useState<number | null>(
    record.versions.length > 0
      ? record.versions[record.versions.length - 1].no
      : null,
  );
  const [decision, setDecision] = useState<Decision>("approved");
  const [reason, setReason] = useState("");

  const status = deriveStatus(record);
  const latest = record.versions[record.versions.length - 1];
  const canReview = role === "attending" && status === "pending";
  const canAmend = role === "resident" && status === "rejected";

  const submitReview = () => {
    if (decision === "rejected" && reason.trim() === "") {
      notify("退回必须填写原因", "error");
      return;
    }
    const res = reviewLatest(record.id, {
      decision,
      reviewer: DEFAULT_ATTENDING,
      reason,
    });
    if (!res.ok) {
      notify(res.error || "复核提交失败", "error");
      return;
    }
    notify(
      decision === "approved" ? "已通过，病例计入完成统计" : "已退回并记录原因",
      "success",
    );
    setReason("");
  };

  return (
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head">
          <h2>
            <span className="mono">{record.id}</span>
            <StatusBadge status={status} />
          </h2>
          <div>
            {canAmend && (
              <a
                className="btn btn-primary"
                href={`#/cases/${record.id}/edit`}
              >
                按退回原因补齐并提交新版本
              </a>
            )}
            <a className="link-btn" href="#/">
              返回列表
            </a>
          </div>
        </div>

        {status === "rejected" && latest?.review && (
          <div className="notice notice-reject">
            <strong>
              v{latest.no} 被 {latest.review.reviewer} 退回（
              {formatDateTime(latest.review.at)}）：
            </strong>
            <br />
            {latest.review.reason}
          </div>
        )}

        <dl className="info-grid">
          <div>
            <dt>患者代号</dt>
            <dd>{record.patientCode || "—"}</dd>
          </div>
          <div>
            <dt>牙位</dt>
            <dd className="tooth-strong">{record.tooth || "—"}</dd>
          </div>
          <div>
            <dt>诊断</dt>
            <dd>{record.diagnosis || "—"}</dd>
          </div>
          <div>
            <dt>登记学员</dt>
            <dd>{record.resident || "—"}</dd>
          </div>
          <div>
            <dt>当前阶段</dt>
            <dd>{record.stage ? STAGE_LABELS[record.stage] : "未选择"}</dd>
          </div>
          <div>
            <dt>根管数</dt>
            <dd>{record.canalCount}</dd>
          </div>
          <div>
            <dt>最近更新</dt>
            <dd>{formatDateTime(record.updatedAt)}</dd>
          </div>
          <div>
            <dt>建稿时间</dt>
            <dd>{formatDateTime(record.createdAt)}</dd>
          </div>
        </dl>

        <h3 className="form-subhead">逐根工作长度 / 主尖锉</h3>
        <div className="table-wrap">
          <table className="canal-table">
            <thead>
              <tr>
                <th>#</th>
                <th>根管名称</th>
                <th>工作长度</th>
                <th>主尖锉号</th>
              </tr>
            </thead>
            <tbody>
              {record.canals.map((c, i) => (
                <tr key={c.id}>
                  <td>{i + 1}</td>
                  <td className="strong">{c.name || "—"}</td>
                  <td>{c.workingLength ? `${c.workingLength} mm` : "未登记"}</td>
                  <td>{c.masterFile || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="form-subhead">器械清点</h3>
        <dl className="info-grid">
          <div>
            <dt>术前清点</dt>
            <dd>{record.instruments.before || "未登记"}</dd>
          </div>
          <div>
            <dt>术后清点</dt>
            <dd>{record.instruments.after || "未登记"}</dd>
          </div>
          <div>
            <dt>数量一致确认</dt>
            <dd>
              {record.instruments.consistent ? (
                <span className="tag tag-ok">学员已确认一致</span>
              ) : (
                <span className="tag tag-bad">未确认一致</span>
              )}
            </dd>
          </div>
          <div>
            <dt>充填方式</dt>
            <dd>{record.obturationMethod || "—"}</dd>
          </div>
        </dl>
        {record.note && (
          <>
            <h3 className="form-subhead">备注</h3>
            <p className="note-box">{record.note}</p>
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>版本与审批记录</h2>
          <span className="muted-cell">
            共 {record.versions.length} 个提交版本，旧审批结果永久可查
          </span>
        </div>

        {record.versions.length === 0 ? (
          <p className="muted-cell">尚未提交过结案版本（草稿状态）。</p>
        ) : (
          <ol className="version-timeline">
            {[...record.versions].reverse().map((v) => {
              const open = openVersion === v.no;
              const failed = v.checks.some((c) => !c.pass);
              return (
                <li key={v.no} className="version-item">
                  <button
                    className="version-head"
                    onClick={() => setOpenVersion(open ? null : v.no)}
                  >
                    <span className="version-no">v{v.no}</span>
                    <span>
                      提交于 {formatDateTime(v.submittedAt)} · {v.submittedBy}
                    </span>
                    {v.review === null ? (
                      <span className="badge badge-pending">待复核</span>
                    ) : v.review.decision === "approved" ? (
                      <span className="badge badge-approved">已通过</span>
                    ) : (
                      <span className="badge badge-rejected">已退回</span>
                    )}
                    <span className="version-caret">{open ? "收起 ▴" : "展开 ▾"}</span>
                  </button>
                  {open && (
                    <div className="version-body">
                      <CheckList results={v.checks} />
                      {failed && v.review === null && (
                        <p className="muted-cell">
                          注：该版本含未通过检查项，供复核参考。
                        </p>
                      )}
                      {v.review && (
                        <div
                          className={
                            v.review.decision === "approved"
                              ? "review-box review-ok"
                              : "review-box review-bad"
                          }
                        >
                          <p>
                            <strong>
                              {v.review.decision === "approved"
                                ? `通过意见 · ${v.review.reviewer}`
                                : `退回原因 · ${v.review.reviewer}`}
                            </strong>
                            <span className="muted-cell nowrap">
                              {formatDateTime(v.review.at)}
                            </span>
                          </p>
                          <p className="review-reason">{v.review.reason}</p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {canReview && latest && (
          <div className="review-form">
            <h3>主诊复核意见（v{latest.no}）</h3>
            <div className="review-toggle">
              <label className={decision === "approved" ? "seg seg-on seg-ok" : "seg"}>
                <input
                  type="radio"
                  name="decision"
                  checked={decision === "approved"}
                  onChange={() => setDecision("approved")}
                />
                通过，准予结案
              </label>
              <label className={decision === "rejected" ? "seg seg-on seg-bad" : "seg"}>
                <input
                  type="radio"
                  name="decision"
                  checked={decision === "rejected"}
                  onChange={() => setDecision("rejected")}
                />
                退回补齐
              </label>
            </div>
            <label className="field">
              <span>
                {decision === "rejected"
                  ? "退回原因（必填，将随旧版本永久保留）*"
                  : "通过意见（可选）"}
              </span>
              <textarea
                rows={3}
                value={reason}
                placeholder={
                  decision === "rejected"
                    ? "如：DL 工作长度缺失；术后器械数量与术前不一致……"
                    : "如：工作长度逐根确认无误，器械清点一致。"
                }
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={submitReview}>
                提交复核结论
              </button>
            </div>
          </div>
        )}

        {role === "resident" && status === "pending" && (
          <p className="muted-cell review-await">
            v{latest?.no} 已提交，等待主诊医生复核；复核期间不能重复提交。
          </p>
        )}
      </section>
    </div>
  );
}
