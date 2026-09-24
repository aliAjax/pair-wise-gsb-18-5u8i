import { useEffect, useState, type ReactNode } from "react";
import "./styles.css";
import type { Role } from "./data/types";
import { DEFAULT_ATTENDING, DEFAULT_RESIDENT, ROLE_LABELS } from "./data/constants";
import {
  listRecords,
  readRole,
  resetToSeed,
  STORE_EVENT,
  writeRole,
} from "./storage/store";
import { ToastHost, notify } from "./components/Toast";
import { CaseList } from "./pages/CaseList";
import { CaseEdit } from "./pages/CaseEdit";
import { CaseDetail } from "./pages/CaseDetail";
import { Stats } from "./pages/Stats";
import { Rules } from "./pages/Rules";

type Route =
  | { name: "list" }
  | { name: "new" }
  | { name: "edit"; id: string }
  | { name: "detail"; id: string }
  | { name: "stats" }
  | { name: "rules" };

function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, "") || "/";
  const seg = path.split("/").filter(Boolean);
  if (seg[0] === "cases") {
    if (seg[1] === "new") return { name: "new" };
    if (seg[1]) {
      if (seg[2] === "edit") return { name: "edit", id: seg[1] };
      return { name: "detail", id: seg[1] };
    }
  }
  if (seg[0] === "stats") return { name: "stats" };
  if (seg[0] === "rules") return { name: "rules" };
  return { name: "list" };
}

const NAV: Array<{ href: string; label: string; route: string }> = [
  { href: "#/", label: "病例复核台", route: "list" },
  { href: "#/stats", label: "完成统计", route: "stats" },
  { href: "#/rules", label: "复核规则", route: "rules" },
];

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [role, setRole] = useState<Role>(() => readRole());
  // 存储变更（提交/复核）后重渲染页面；路由不变时同样生效
  const [storeTick, setStoreTick] = useState(0);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    const onStore = () => setStoreTick((t) => t + 1);
    window.addEventListener("hashchange", onHash);
    window.addEventListener(STORE_EVENT, onStore);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener(STORE_EVENT, onStore);
    };
  }, []);
  void storeTick;

  const switchRole = (next: Role) => {
    setRole(next);
    writeRole(next);
    notify(
      `已切换为${ROLE_LABELS[next]}（${next === "attending" ? DEFAULT_ATTENDING : DEFAULT_RESIDENT}）`,
      "info",
    );
  };

  const resetDemo = () => {
    if (window.confirm("确定清空当前数据并恢复演示病例？该操作不可撤销。")) {
      resetToSeed();
      notify("已恢复演示数据", "success");
      window.location.hash = "#/";
      setRoute({ name: "list" });
    }
  };

  let body: ReactNode;
  if (route.name === "list") {
    body = <CaseList role={role} />;
  } else if (route.name === "stats") {
    body = <Stats />;
  } else if (route.name === "rules") {
    body = <Rules />;
  } else if (route.name === "new") {
    if (role !== "resident") {
      body = (
        <section className="panel lock-panel">
          <h2>当前为主诊医生视角</h2>
          <p>病例登记由住院医师完成，请在右上角切换身份后再登记。</p>
        </section>
      );
    } else {
      body = <CaseEdit record={null} />;
    }
  } else if (route.name === "edit") {
    body = <EditRoute id={route.id} />;
  } else {
    body = <DetailRoute id={route.id} role={role} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">牙</span>
          <div>
            <h1>根管治疗病例复核台</h1>
            <p>牙体牙髓科 · 工作长度逐颗确认 · 器械清点闭环</p>
          </div>
        </div>
        <div className="role-switch" role="group" aria-label="角色切换">
          <button
            className={role === "resident" ? "role active" : "role"}
            onClick={() => switchRole("resident")}
          >
            {ROLE_LABELS.resident}
          </button>
          <button
            className={role === "attending" ? "role active" : "role"}
            onClick={() => switchRole("attending")}
          >
            {ROLE_LABELS.attending}
          </button>
        </div>
      </header>

      <nav className="mainnav">
        {NAV.map((n) => (
          <a
            key={n.route}
            href={n.href}
            className={
              (route.name === "list" && n.route === "list") ||
              (route.name === "stats" && n.route === "stats") ||
              (route.name === "rules" && n.route === "rules")
                ? "navlink active"
                : "navlink"
            }
          >
            {n.label}
          </a>
        ))}
        <span className="nav-spacer" />
        <button className="reset-btn" onClick={resetDemo}>
          重置演示数据
        </button>
      </nav>

      <div className="page-body" key={`${route.name}-${"id" in route ? route.id : ""}`}>
        {body}
      </div>

      <footer className="footer">
        数据仅保存在本浏览器（localStorage），不上传服务器、不引入额外依赖。
      </footer>

      <ToastHost />
    </main>
  );
}

function EditRoute({ id }: { id: string }) {
  const record = listRecords().find((r) => r.id === id) ?? null;
  if (!record) return <NotFound />;
  return <CaseEdit record={record} />;
}

function DetailRoute({ id, role }: { id: string; role: Role }) {
  const record = listRecords().find((r) => r.id === id) ?? null;
  if (!record) return <NotFound />;
  return <CaseDetail record={record} role={role} />;
}

function NotFound() {
  return (
    <section className="panel lock-panel">
      <h2>病例不存在</h2>
      <p>该病例可能已被清除，请返回列表查看。</p>
      <a className="btn btn-primary" href="#/">
        返回列表
      </a>
    </section>
  );
}
