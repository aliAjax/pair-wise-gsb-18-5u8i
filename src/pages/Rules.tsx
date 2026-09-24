import { RULE_CATALOG } from "../rules/checks";
import { STAGE_LABELS } from "../data/constants";

export function Rules() {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>复核规则说明</h2>
      </div>
      <p className="form-tip">
        本页规则即系统在学员「提交结案」时实际执行的检查（规则集中维护，与页面、存储分离）。
        <strong>阻断项</strong>任一不通过则不能提交；<strong>提醒项</strong>
        不阻断，但会随版本快照提供给主诊医生参考。
      </p>

      <div className="rule-flow">
        <div className="flow-step">
          <span className="flow-no">1</span>
          <p>学员登记</p>
          <small>患者代号、牙位、根管数、逐根工作长度、器械清点、阶段</small>
        </div>
        <div className="flow-arrow">→</div>
        <div className="flow-step">
          <span className="flow-no">2</span>
          <p>提交结案核对</p>
          <small>
            仅「{STAGE_LABELS.obturation}」阶段可提交；阻断项全部通过才生成新版本
          </small>
        </div>
        <div className="flow-arrow">→</div>
        <div className="flow-step">
          <span className="flow-no">3</span>
          <p>主诊复核</p>
          <small>逐颗查看工作长度与器械清点；可通过或退回（必填原因）</small>
        </div>
        <div className="flow-arrow">→</div>
        <div className="flow-step">
          <span className="flow-no">4</span>
          <p>补齐出新版</p>
          <small>退回病例补齐后生成新版本，旧版本审批结果保留、可追溯</small>
        </div>
      </div>

      <div className="table-wrap">
        <table className="rules-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>级别</th>
              <th style={{ width: 160 }}>规则</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {RULE_CATALOG.map((r) => (
              <tr key={r.key}>
                <td>
                  <span
                    className={
                      r.level === "阻断" ? "tag tag-bad" : "tag tag-warn"
                    }
                  >
                    {r.level}
                  </span>
                </td>
                <td className="strong">{r.title}</td>
                <td className="muted-cell">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="notice notice-warn">
        统计口径：未通过（含退回、待复核、草稿）的病例<strong>不进入完成统计</strong>；
        新版本通过后按新版本计入，历史退回不影响最终完成状态。
      </div>
    </section>
  );
}
