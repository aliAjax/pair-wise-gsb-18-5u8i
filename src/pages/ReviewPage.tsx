// 页面：复核台（主诊医生审批/退回，版本历史留痕）
import { useState } from "react";
import type { CaseStatus, EndoCase, Role } from "../data/types";
import { STATUS_LABEL, caseStatus, latestVersion } from "../data/types";

interface Props {
  cases: EndoCase[];
  role: Role;
  onReview: (caseId: string, outcome: "approved" | "rejected", reason: string) => void;
  onSupplement: (caseId: string) => void;
}

const FILTERS: Array<{ key: CaseStatus | "all"; label: string }> = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待复核" },
  { key: "rejected", label: "已退回" },
  { key: "approved", label: "已完成" },
  { key: "in-progress", label: "在研" },
];

function ReviewBox({
  item,
  onReview,
}: {
  item: EndoCase;
  onReview: Props["onReview"];
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function submit(outcome: "approved" | "rejected") {
    if (outcome === "rejected" && !reason.trim()) {
      setError("退回必须填写原因，便于学员补齐。");
      return;
    }
    onReview(item.id, outcome, outcome === "approved" ? reason.trim() || "复核通过。" : reason.trim());
    setReason("");
    setError("");
  }

  return (
    <div className="review-box">
      <textarea
        rows={2}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setError("");
        }}
        placeholder="审批意见；退回时必填原因"
      />
      {error && <p className="block-tip">{error}</p>}
      <div className="action-row">
        <button className="btn-danger" onClick={() => submit("rejected")}>退回</button>
        <button className="btn-primary" onClick={() => submit("approved")}>通过</button>
      </div>
    </div>
  );
}

function CaseCard({ item, role, onReview, onSupplement }: Props & { item: EndoCase }) {
  const status = caseStatus(item);
  const latest = latestVersion(item);

  return (
    <article className="case-card">
      <header className="case-head">
        <div>
          <strong>{item.patientCode}</strong>
          <span className="tooth">牙位 {item.tooth}</span>
          <span className="muted">
            {item.canalCount} 根管 · {item.diagnosis || "未填诊断"} · 学员 {item.resident || "—"}
          </span>
        </div>
        <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
      </header>

      <p className="muted">
        最新：第 {latest.version} 版 · {latest.stage} · {latest.intent === "closure" ? "结案送审" : "进度保存"} · {latest.submittedAt}
        {latest.note ? ` · ${latest.note}` : ""}
      </p>

      <table className="data-table compact">
        <thead>
          <tr>
            <th>根管</th>
            <th>工作长度</th>
            <th>主尖锉</th>
            <th>器械清点</th>
          </tr>
        </thead>
        <tbody>
          {latest.canals.map((c, i) => (
            <tr key={i}>
              <td>{c.name}</td>
              <td>{c.workingLengthMm === null ? "—" : `${c.workingLengthMm}mm`}</td>
              <td>{c.masterApicalFile || "—"}</td>
              <td>{c.instrumentCount === null ? "—" : c.instrumentCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {latest.intent === "closure" && latest.checks.length > 0 && (
        <ul className="check-list inline">
          {latest.checks.map((c) => (
            <li key={c.id} className={c.passed ? "pass" : "fail"}>
              <b>{c.passed ? "✓" : "✗"}</b>
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      )}

      {latest.review && (
        <p className={`review-result ${latest.review.outcome}`}>
          {latest.review.outcome === "approved" ? "通过" : "退回"} · {latest.review.reviewer} · {latest.review.reviewedAt}
          <br />
          {latest.review.reason}
        </p>
      )}

      {role === "attending" && status === "pending" && (
        <ReviewBox item={item} onReview={onReview} />
      )}
      {role === "resident" && (status === "rejected" || status === "in-progress") && (
        <div className="action-row">
          <button className="btn-primary" onClick={() => onSupplement(item.id)}>
            {status === "rejected" ? "按退回原因补齐，提交新版本" : "继续完善记录"}
          </button>
        </div>
      )}

      <details className="history">
        <summary>版本历史（{item.versions.length} 版，旧审批结果留痕可查）</summary>
        <ol reversed>
          {[...item.versions].reverse().map((v) => (
            <li key={v.version}>
              <div>
                第 {v.version} 版 · {v.stage} · {v.intent === "closure" ? "结案送审" : "进度保存"} · {v.submittedAt}
                {v.note ? ` · ${v.note}` : ""}
              </div>
              {v.review ? (
                <div className={`review-result ${v.review.outcome}`}>
                  {v.review.outcome === "approved" ? "通过" : "退回"} · {v.review.reviewer} · {v.review.reviewedAt} · {v.review.reason}
                </div>
              ) : (
                <div className="muted">待主诊医生复核</div>
              )}
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}

export default function ReviewPage({ cases, role, onReview, onSupplement }: Props) {
  const [filter, setFilter] = useState<CaseStatus | "all">("all");
  const visible = cases.filter((c) => filter === "all" || caseStatus(c) === filter);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>复核台</p>
          <h2>{role === "attending" ? "待复核与已审病例" : "我的病例"}</h2>
        </div>
        <div className="filter-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={filter === f.key ? "active" : ""}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="muted">当前筛选下没有病例。</p>
      ) : (
        <div className="case-list">
          {visible.map((item) => (
            <CaseCard
              key={item.id}
              item={item}
              cases={cases}
              role={role}
              onReview={onReview}
              onSupplement={onSupplement}
            />
          ))}
        </div>
      )}
    </section>
  );
}
