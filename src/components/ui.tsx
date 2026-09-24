import type { ReactNode } from "react";
import type { CaseStatus, CheckResult } from "../data/types";
import { STATUS_LABELS } from "../rules/stats";
import { esc } from "../utils/format";

export function StatusBadge({ status }: { status: CaseStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function Panel({
  title,
  extra,
  children,
}: {
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

/** 单条规则检查结果的展示（详情页版本快照与提交前确认共用） */
export function CheckList({ results }: { results: CheckResult[] }) {
  return (
    <ul className="check-list">
      {results.map((r) => (
        <li
          key={r.key}
          className={
            r.pass
              ? r.level === "warning"
                ? "check check-warn"
                : "check check-pass"
              : "check check-fail"
          }
        >
          <span className="check-icon" aria-hidden>
            {r.pass ? (r.level === "warning" ? "⚠" : "✓") : "✕"}
          </span>
          <div>
            <p className="check-label">{r.label}</p>
            {r.detail && (
              <p
                className="check-detail"
                dangerouslySetInnerHTML={{ __html: esc(r.detail) }}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
