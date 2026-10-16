"use client";
import {
  ArrowUpRight,
  ArrowRight,
  Users,
  ClipboardCheck,
  Clock3,
  CalendarDays,
  Check,
  ChevronRight,
  MessageSquareText,
  Bell,
  CircleAlert,
} from "lucide-react";
import { useApp, Badge, StatusBadge, fmt } from "./ui";
import {
  dateLabel,
  getRegister,
  roster,
  stats,
  totals,
  istDate,
  refreshAlerts,
} from "@/lib/domain";
export function Dashboard() {
  const { db, actor, now, go, setDate } = useApp();
  const today = istDate(now),
    cl = actor.className ?? "UKG",
    r = getRegister(db, today, cl),
    children = roster(db, db.activeYear, cl),
    t = totals(r.marks),
    yearStats = stats(db, undefined, db.activeYear, "", today, cl);
  const registerSize = r.submittedAt ? r.roster.length : children.length;
  const computed = structuredClone(db);
  refreshAlerts(computed, now);
  const alerts = computed.alerts.filter((a) => a.active && !a.acknowledged),
    pending = db.corrections.filter((c) => c.status === "Pending");
  const recent = Object.values(db.registers)
    .filter(
      (r) => r.submittedAt && r.yearId === db.activeYear && r.className === cl,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);
  const percentages = recent.map((r) => {
    const s = totals(r.marks);
    return (s.Present / (s.Present + s.Absent + s.Leave)) * 100;
  });
  const points = percentages
    .map(
      (v, i) =>
        `${40 + i * (620 / Math.max(1, percentages.length - 1))},${190 - v * 1.76}`,
    )
    .join(" ");
  const attendance = () => {
    setDate(today);
    go("Attendance");
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {actor.role === "admin"
              ? "YOUR SCHOOL, AT A GLANCE"
              : "YOUR CLASSROOM, AT A GLANCE"}
          </div>
          <h1>
            {actor.role === "admin"
              ? "A good day to grow."
              : `Hello, ${actor.name}.`}
            <span className="heading-dot">•</span>
          </h1>
          <p>
            Here’s how {actor.role === "admin" ? "your school" : cl} is doing
            today.
          </p>
        </div>
        <div className="heading-actions">
          <span className="date-chip">
            <CalendarDays size={16} />
            {dateLabel(today)}
          </span>
          <button className="primary" onClick={attendance}>
            <ClipboardCheck size={17} /> Open attendance{" "}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div className="overview-grid">
        <div className="metric">
          <div className="metric-label">
            Active students
            <Users size={17} />
          </div>
          <strong>{children.length.toString().padStart(2, "0")}</strong>
          <div className="metric-foot">
            <span className="small-purple">{cl}</span>
            <span>A classroom full of possibility</span>
          </div>
        </div>
        {(["Present", "Absent", "Leave"] as const).map((status, i) => (
          <div className="metric" key={status}>
            <div className="metric-label">
              {["Present today", "Absent today", "On leave today"][i]}
              <span className={`status-dot ${status.toLowerCase()}`} />
            </div>
            <strong>
              {r.submittedAt ? t[status].toString().padStart(2, "0") : "—"}
              <small>
                {r.submittedAt ? `/ ${r.roster.length}` : "Awaiting submission"}
              </small>
            </strong>
            <div className="metric-foot">
              <span
                className={
                  r.submittedAt
                    ? ["green-text", "red-text", "amber-text"][i]
                    : "muted"
                }
              >
                {r.submittedAt
                  ? [
                      "Ready to learn",
                      "Recorded absences",
                      "Approved leave status",
                    ][i]
                  : `${t[status]} marked in draft`}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-main">
        <section className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <h2>Attendance overview</h2>
              <p>Submitted school days · {cl}</p>
            </div>
            <Badge>Academic year to date</Badge>
          </div>
          <div className="trend-summary">
            <strong>{fmt(yearStats.percentage)}</strong>
            <span>
              <i className="tiny-dot" /> Overall attendance
              <br />
              <small>Leave is included in the denominator</small>
            </span>
          </div>
          <div
            className="chart"
            role="img"
            aria-label={`Attendance trend over ${recent.length} submitted school days. Overall attendance ${fmt(yearStats.percentage)}.`}
          >
            <svg viewBox="0 0 700 245">
              {[0, 25, 50, 75, 100].map((n) => (
                <g key={n}>
                  <line
                    x1="40"
                    x2="665"
                    y1={190 - n * 1.76}
                    y2={190 - n * 1.76}
                    stroke="#eae8f0"
                    strokeDasharray="3 5"
                  />
                  <text x="3" y={194 - n * 1.76}>
                    {n}%
                  </text>
                </g>
              ))}
              <defs>
                <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#8b78c5" stopOpacity=".19" />
                  <stop offset="100%" stopColor="#8b78c5" stopOpacity=".01" />
                </linearGradient>
              </defs>
              {recent.length > 0 && (
                <>
                  <polygon
                    points={`40,190 ${points} 660,190`}
                    fill="url(#area)"
                  />
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#7660b1"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  {percentages.map((v, i) => (
                    <circle
                      key={i}
                      cx={40 + i * (620 / Math.max(1, percentages.length - 1))}
                      cy={190 - v * 1.76}
                      r="4"
                      fill="white"
                      stroke="#7660b1"
                      strokeWidth="2"
                    />
                  ))}
                </>
              )}
              {recent
                .filter((_, i) => i % 3 === 0 || i === recent.length - 1)
                .map((x) => (
                  <text
                    key={x.date}
                    x={
                      40 +
                      recent.indexOf(x) * (620 / Math.max(1, recent.length - 1))
                    }
                    y="225"
                    textAnchor="middle"
                  >
                    {dateLabel(x.date).split(" ").slice(0, 2).join(" ")}
                  </text>
                ))}
            </svg>
          </div>
          <div className="chart-note">
            <span>
              <i />
              Attendance rate
            </span>
            <span>Drafts and missing registers are excluded</span>
          </div>
        </section>
        <section className="panel today-panel">
          <div className="panel-heading">
            <div>
              <h2>Today’s register</h2>
              <p>
                {cl} · {dateLabel(today)}
              </p>
            </div>
            <span className="round-icon">
              <ClipboardCheck size={20} />
            </span>
          </div>
          <div
            className="progress-ring"
            style={
              {
                "--progress": `${(Object.keys(r.marks).length / Math.max(1, registerSize)) * 100}%`,
              } as React.CSSProperties
            }
          >
            <div>
              <strong>
                {Object.keys(r.marks).length}
                <small>/{registerSize}</small>
              </strong>
              <span>students marked</span>
            </div>
          </div>
          <div className="register-status">
            <StatusBadge value={r.submittedAt ? "Submitted" : "Draft saved"} />
            <p>
              {r.submittedAt
                ? "The official register is locked."
                : `${Math.max(0, registerSize - Object.keys(r.marks).length)} students still need a status.`}
            </p>
          </div>
          <button className="secondary full" onClick={attendance}>
            {r.submittedAt ? "View submitted register" : "Continue attendance"}
            <ArrowRight size={16} />
          </button>
        </section>
      </div>
      <div className="dashboard-lower">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                Needs a little attention{" "}
                <span className="count-pill">
                  {actor.role === "admin"
                    ? alerts.length
                    : pending.filter((c) => c.actor === actor.id).length}
                </span>
              </h2>
              <p>Small actions that make a difference.</p>
            </div>
            <button
              className="text-button"
              onClick={() =>
                go(actor.role === "admin" ? "Alerts" : "Correction Requests")
              }
            >
              View all <ArrowUpRight size={16} />
            </button>
          </div>
          {actor.role === "admin" ? (
            <div className="attention-list">
              {alerts.slice(0, 4).map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    if (a.type === "Missing register") {
                      setDate(a.id.split("|")[2]);
                      go("Attendance");
                    } else
                      go(
                        a.type === "Correction request"
                          ? "Correction Requests"
                          : "Alerts",
                      );
                  }}
                >
                  <span
                    className={`attention-icon ${a.type === "Missing register" ? "amber" : "purple"}`}
                  >
                    {a.type === "Correction request" ? (
                      <MessageSquareText size={18} />
                    ) : a.type === "Missing register" ? (
                      <Clock3 size={18} />
                    ) : (
                      <CircleAlert size={18} />
                    )}
                  </span>
                  <span>
                    <strong>{a.type}</strong>
                    <small>
                      {a.title} · {a.detail}
                    </small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))}
              {!alerts.length && (
                <p className="quiet">All caught up. No outstanding alerts.</p>
              )}
            </div>
          ) : (
            <div className="attention-list">
              {pending
                .filter((c) => c.actor === actor.id)
                .map((c) => (
                  <button key={c.id} onClick={() => go("Correction Requests")}>
                    <span className="attention-icon purple">
                      <MessageSquareText size={18} />
                    </span>
                    <span>
                      <strong>Correction awaiting review</strong>
                      <small>
                        {db.students.find((s) => s.id === c.studentId)?.name} ·{" "}
                        {c.original} → {c.requested}
                      </small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                ))}
              <p className="quiet">
                Your drafts save automatically in this browser.
              </p>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                {actor.role === "admin"
                  ? "Recent activity"
                  : "Classroom information"}
              </h2>
              <p>
                {actor.role === "admin"
                  ? "A clear record of your school day."
                  : "Everything you need for your class."}
              </p>
            </div>
            {actor.role === "admin" && (
              <button
                className="text-button"
                onClick={() => go("Audit History")}
              >
                View log <ArrowUpRight size={16} />
              </button>
            )}
          </div>
          {actor.role === "admin" ? (
            <div className="activity-list">
              {db.audit.slice(0, 3).map((a) => (
                <div key={a.id}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{a.action}</strong>
                    <p>{a.detail}</p>
                    <small>
                      {a.actor} ·{" "}
                      {new Date(a.at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Asia/Kolkata",
                      })}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="class-info">
              <strong>{cl}</strong>
              <p>{children.length} active students · Monday to Saturday</p>
              <p>Attendance window: 8:00 AM – 2:00 PM IST</p>
              <button className="text-button" onClick={() => go("Students")}>
                Open student directory <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>
      </div>
      <section className="panel class-overview">
        <div className="panel-heading">
          <div>
            <h2>Class overview</h2>
            <p>One classroom. Every child accounted for.</p>
          </div>
          <Badge tone="purple">1 active class</Badge>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Class teacher</th>
                <th>Students</th>
                <th>Attendance rate</th>
                <th>Today’s status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="class-tag">{cl}</span>
                </td>
                <td>
                  {db.teachers.find((t) => t.enabled && t.className === cl)
                    ?.name ?? "Unassigned"}
                </td>
                <td>{children.length}</td>
                <td>
                  <div className="inline-progress">
                    <span>{fmt(yearStats.percentage)}</span>
                    <i
                      style={
                        {
                          "--value": `${yearStats.percentage ?? 0}%`,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </td>
                <td>
                  <StatusBadge
                    value={r.submittedAt ? "Submitted" : "Not Submitted"}
                  />
                </td>
                <td>
                  <button className="text-button" onClick={attendance}>
                    Open register <ArrowRight size={16} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
