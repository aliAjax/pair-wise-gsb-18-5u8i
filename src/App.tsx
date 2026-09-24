import { useEffect, useState } from "react";
import "./styles.css";
import type { CaseVersion, EndoCase, Role } from "./data/types";
import { ROLE_LABEL } from "./data/types";
import { loadCases, resetCases, saveCases } from "./storage/caseStore";
import { runReviewChecks } from "./rules/reviewRules";
import RegisterPage, { type CaseDraft } from "./pages/RegisterPage";
import ReviewPage from "./pages/ReviewPage";
import StatsPage from "./pages/StatsPage";

type PageKey = "review" | "register" | "stats";

const NAV: Array<{ key: PageKey; label: string }> = [
  { key: "review", label: "复核台" },
  { key: "register", label: "病例登记" },
  { key: "stats", label: "完成统计" },
];

function nowText(): string {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function App() {
  const [cases, setCases] = useState<EndoCase[]>(() => loadCases());
  const [page, setPage] = useState<PageKey>("review");
  const [role, setRole] = useState<Role>("resident");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    saveCases(cases);
  }, [cases]);

  const editingCase = cases.find((c) => c.id === editingId) ?? null;

  function handleSave(draft: CaseDraft, intent: "progress" | "closure") {
    const version: CaseVersion = {
      version: 0, // 下面按既有版本数赋值
      intent,
      stage: draft.stage,
      canals: draft.canals,
      note: draft.note,
      submittedAt: nowText(),
      checks: intent === "closure" ? runReviewChecks(draft) : [],
      review: null,
    };

    setCases((prev) => {
      const existing = prev.find((c) => c.id === draft.id);
      if (existing) {
        return prev.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                patientCode: draft.patientCode,
                tooth: draft.tooth,
                canalCount: draft.canalCount,
                resident: draft.resident,
                diagnosis: draft.diagnosis,
                versions: [...c.versions, { ...version, version: c.versions.length + 1 }],
              }
            : c
        );
      }
      const item: EndoCase = {
        id: `HX-${Date.now().toString(36).toUpperCase()}`,
        patientCode: draft.patientCode,
        tooth: draft.tooth,
        canalCount: draft.canalCount,
        resident: draft.resident,
        diagnosis: draft.diagnosis,
        createdAt: nowText(),
        versions: [{ ...version, version: 1 }],
      };
      return [item, ...prev];
    });

    setEditingId(null);
    setPage("review");
  }

  function handleReview(caseId: string, outcome: "approved" | "rejected", reason: string) {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const versions = c.versions.slice();
        const latest = { ...versions[versions.length - 1] };
        latest.review = {
          outcome,
          reviewer: "周医生",
          reason,
          reviewedAt: nowText(),
        };
        versions[versions.length - 1] = latest;
        return { ...c, versions };
      })
    );
  }

  function handleSupplement(caseId: string) {
    setEditingId(caseId);
    setPage("register");
  }

  function goRegister() {
    setEditingId(null);
    setPage("register");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>牙体牙髓病例复核台</h1>
          <p className="subtitle">根管病例登记 · 结案复核 · 版本留痕 · 完成统计</p>
        </div>
        <div className="topbar-actions">
          <div className="role-switch">
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <button key={r} className={role === r ? "active" : ""} onClick={() => setRole(r)}>
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <nav className="nav-tabs">
            {NAV.map((n) => (
              <button
                key={n.key}
                className={page === n.key ? "active" : ""}
                onClick={() => (n.key === "register" ? goRegister() : setPage(n.key))}
              >
                {n.label}
              </button>
            ))}
          </nav>
          <button
            className="btn-ghost"
            onClick={() => {
              if (window.confirm("将清空浏览器内全部病例并恢复示例数据，确定？")) {
                setCases(resetCases());
                setEditingId(null);
              }
            }}
          >
            恢复示例数据
          </button>
        </div>
      </header>

      {page === "register" && (
        <RegisterPage
          key={editingId ?? "new"}
          initialCase={editingCase}
          onSave={handleSave}
          onCancel={() => {
            setEditingId(null);
            setPage("review");
          }}
        />
      )}
      {page === "review" && (
        <ReviewPage cases={cases} role={role} onReview={handleReview} onSupplement={handleSupplement} />
      )}
      {page === "stats" && <StatsPage cases={cases} />}
    </main>
  );
}

export default App;
