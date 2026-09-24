// 页面：完成统计（仅审批通过的病例计入完成）
import type { EndoCase } from "../data/types";
import { STATUS_LABEL, STAGES, caseStatus, latestVersion } from "../data/types";

interface Props {
  cases: EndoCase[];
}

export default function StatsPage({ cases }: Props) {
  const total = cases.length;
  const approved = cases.filter((c) => caseStatus(c) === "approved");
  const pending = cases.filter((c) => caseStatus(c) === "pending");
  const rejected = cases.filter((c) => caseStatus(c) === "rejected");
  const inProgress = cases.filter((c) => caseStatus(c) === "in-progress");
  const completionRate = total === 0 ? 0 : Math.round((approved.length / total) * 100);

  const stageCounts = STAGES.map((stage) => ({
    stage,
    count: cases.filter((c) => latestVersion(c).stage === stage).length,
  })).filter((s) => s.count > 0);

  const residents = Array.from(new Set(cases.map((c) => c.resident || "未署名"))).map(
    (name) => {
      const mine = cases.filter((c) => (c.resident || "未署名") === name);
      return {
        name,
        total: mine.length,
        approved: mine.filter((c) => caseStatus(c) === "approved").length,
      };
    }
  );

  const metrics = [
    { label: "登记病例", value: total },
    { label: "已完成（通过复核）", value: approved.length },
    { label: "待复核", value: pending.length },
    { label: "已退回 / 在研", value: `${rejected.length} / ${inProgress.length}` },
  ];

  return (
    <>
      <section className="metrics-grid">
        {metrics.map((m) => (
          <article key={m.label} className="metric-card">
            <span>{m.label}</span>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>完成统计</p>
            <h2>完成率 {completionRate}%</h2>
          </div>
        </div>
        <p className="muted">
          仅「{STATUS_LABEL.approved}」计入完成统计；已退回与在研病例不计入，待复核病例待主诊医生确认后计入。
        </p>

        <div className="stats-columns">
          <div>
            <h3>最新阶段分布</h3>
            <ul className="stat-list">
              {stageCounts.map((s) => (
                <li key={s.stage}>
                  <span>{s.stage}</span>
                  <b>{s.count}</b>
                </li>
              ))}
              {stageCounts.length === 0 && <li className="muted">暂无数据</li>}
            </ul>
          </div>
          <div>
            <h3>学员完成情况</h3>
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>住院医师</th>
                  <th>登记</th>
                  <th>完成（通过）</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.total}</td>
                    <td>{r.approved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
