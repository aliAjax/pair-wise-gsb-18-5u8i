import { useEffect, useState } from "react";
import type { CaseRecord, CaseStatus, Role } from "../data/types";
import { STAGE_LABELS } from "../data/constants";
import { deriveStatus, STATUS_LABELS, STATUS_ORDER } from "../rules/stats";
import { listRecords, STORE_EVENT } from "../storage/store";
import { formatDateTime } from "../utils/format";
import { EmptyState, StatusBadge } from "../components/ui";

type Filter = CaseStatus | "all";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "全部" },
  ...STATUS_ORDER.map((s) => ({ key: s as Filter, label: STATUS_LABELS[s] })),
];

export function CaseList({ role }: { role: Role }) {
  const [records, setRecords] = useState<CaseRecord[]>(() => listRecords());
  const [filter, setFilter] = useState<Filter>("all");
  const [keyword, setKeyword] = useState("");

  // 返回列表、窗口聚焦或存储数据变更（提交/复核/重置）时重新读取
  useEffect(() => {
    const reload = () => setRecords(listRecords());
    window.addEventListener("focus", reload);
    window.addEventListener("hashchange", reload);
    window.addEventListener(STORE_EVENT, reload);
    return () => {
      window.removeEventListener("focus", reload);
      window.removeEventListener("hashchange", reload);
      window.removeEventListener(STORE_EVENT, reload);
    };
  }, []);

  const shown = records.filter((r) => {
    const status = deriveStatus(r);
    if (filter !== "all" && status !== filter) return false;
    const kw = keyword.trim().toUpperCase();
    if (kw === "") return true;
    return (
      r.patientCode.toUpperCase().includes(kw) ||
      r.tooth.includes(kw) ||
      r.id.toUpperCase().includes(kw) ||
      r.diagnosis.toUpperCase().includes(kw)
    );
  });

  return (
    <>
      <section className="panel list-toolbar">
        <div className="filter-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={filter === f.key ? "tab active" : "tab"}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <input
            className="search-input"
            placeholder="搜索患者代号 / 牙位 / 编号 / 诊断"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <a className="btn btn-primary" href="#/cases/new">
            + 登记新病例
          </a>
        </div>
      </section>

      <section className="panel">
        {shown.length === 0 ? (
          <EmptyState text="没有符合条件的病例，点击右上角「登记新病例」开始。" />
        ) : (
          <div className="table-wrap">
            <table className="case-table">
              <thead>
                <tr>
                  <th>编号</th>
                  <th>患者代号</th>
                  <th>牙位</th>
                  <th>诊断</th>
                  <th>根管数</th>
                  <th>阶段</th>
                  <th>版本</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const status = deriveStatus(r);
                  const latest = r.versions[r.versions.length - 1];
                  return (
                    <tr key={r.id}>
                      <td className="mono">{r.id}</td>
                      <td>{r.patientCode || "—"}</td>
                      <td className="strong">{r.tooth || "—"}</td>
                      <td className="muted-cell">{r.diagnosis || "—"}</td>
                      <td>{r.canalCount}</td>
                      <td>{r.stage ? STAGE_LABELS[r.stage] : "未选择"}</td>
                      <td className="mono">
                        {latest ? `v${latest.no}` : "—"}
                      </td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                      <td className="muted-cell nowrap">
                        {formatDateTime(r.updatedAt)}
                      </td>
                      <td className="nowrap">
                        <a className="link-btn" href={`#/cases/${r.id}`}>
                          {role === "attending" && status === "pending"
                            ? "去复核"
                            : "查看"}
                        </a>
                        {role === "resident" && status !== "approved" && (
                          <a
                            className="link-btn"
                            href={`#/cases/${r.id}/edit`}
                          >
                            {status === "rejected" ? "补齐" : "编辑"}
                          </a>
                        )}
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
