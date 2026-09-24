import type { CaseRecord } from "../data/types";
import { buildStats } from "../rules/stats";
import { listRecords } from "../storage/store";
import { deriveStatus } from "../rules/stats";
import { formatDateTime } from "../utils/format";
import { EmptyState, StatusBadge } from "../components/ui";

export function Stats() {
  const records = listRecords();
  const stats = buildStats(records);
  const completed = records.filter((r) => deriveStatus(r) === "approved");

  const cards = [
    { label: "病例总数", value: String(stats.total), tone: "neutral" },
    { label: "完成（复核通过）", value: String(stats.approved), tone: "ok" },
    { label: "待主诊复核", value: String(stats.pending), tone: "warn" },
    { label: "已退回（不计入完成）", value: String(stats.rejected), tone: "bad" },
    { label: "草稿", value: String(stats.draft), tone: "neutral" },
    {
      label: "通过病例平均工作长度",
      value:
        stats.avgWorkingLength === null
          ? "—"
          : `${stats.avgWorkingLength.toFixed(1)} mm`,
      tone: "neutral",
    },
    { label: "通过病例根管总数", value: String(stats.approvedCanals), tone: "neutral" },
    {
      label: "审批通过率",
      value:
        stats.approvalRate === null
          ? "—"
          : `${Math.round(stats.approvalRate * 100)}%`,
      tone: "ok",
    },
    { label: "累计退回轮次", value: String(stats.rejectionRounds), tone: "bad" },
  ];

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>完成统计口径</h2>
        </div>
        <p className="form-tip">
          只有<strong>最新提交版本经主诊医生复核通过</strong>的病例才计入完成统计；
          草稿、待复核、已退回一律不计。退回后补齐再提交并通过的病例，以新版本结果计入，
          旧版本退回原因仍可在病例详情中追溯。
        </p>
        <div className="stat-grid">
          {cards.map((c) => (
            <article key={c.label} className={`stat-card stat-${c.tone}`}>
              <span>{c.label}</span>
              <strong>{c.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>计入完成的病例（{completed.length}）</h2>
        </div>
        {completed.length === 0 ? (
          <EmptyState text="暂无复核通过病例。" />
        ) : (
          <div className="table-wrap">
            <table className="case-table">
              <thead>
                <tr>
                  <th>编号</th>
                  <th>患者代号</th>
                  <th>牙位</th>
                  <th>根管</th>
                  <th>工作长度</th>
                  <th>通过时间</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((r) => {
                  const latest = r.versions[r.versions.length - 1];
                  return (
                    <tr key={r.id}>
                      <td className="mono">{r.id}</td>
                      <td>{r.patientCode}</td>
                      <td className="strong">{r.tooth}</td>
                      <td>{r.canalCount}</td>
                      <td>
                        {r.canals
                          .map((c) => `${c.name} ${c.workingLength || "?"}mm`)
                          .join("、")}
                      </td>
                      <td className="muted-cell nowrap">
                        {latest?.review ? formatDateTime(latest.review.at) : "—"}
                      </td>
                      <td>
                        <StatusBadge status="approved" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
