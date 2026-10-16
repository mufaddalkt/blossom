"use client";
import { useState } from "react";
import {
  Plus,
  Check,
  X,
  CalendarRange,
  KeyRound,
  ShieldCheck,
  Upload,
  RotateCcw,
  ArrowRight,
  Bell,
  Search,
  Download,
} from "lucide-react";
import {
  useApp,
  Modal,
  Field,
  Banner,
  Badge,
  StatusBadge,
  Empty,
  SearchBox,
  Confirm,
} from "./ui";
import {
  Correction,
  Teacher,
  STATUSES,
  Status,
  requestCorrection,
  decideCorrection,
  roster,
  uid,
  saveTeacher,
  saveYear,
  setYear,
  addHoliday,
  removeHoliday,
  audit,
  refreshAlerts,
  dateLabel,
  CLASSES,
} from "@/lib/domain";
import { seed } from "@/lib/seed";
import { hashPassword, Logo } from "./blossom-app";
import { readImage } from "./students";
export function Corrections() {
  const { db, actor, mutate } = useApp();
  const [add, setAdd] = useState(false),
    [filter, setFilter] = useState("All"),
    [decision, setDecision] = useState<{
      c: Correction;
      approve: boolean;
    } | null>(null),
    [reason, setReason] = useState("");
  const list = db.corrections.filter(
    (c) =>
      (actor.role === "admin" || c.actor === actor.id) &&
      (filter === "All" || c.status === filter),
  );
  return (
    <>
      <PageHeading
        eyebrow="A CLEAR PATH TO ACCURATE RECORDS"
        title="Correction requests"
        detail="Every change reviewed. Every original value preserved."
      >
        <button className="primary" onClick={() => setAdd(true)}>
          <Plus size={17} />
          New request
        </button>
      </PageHeading>
      <div className="tabs">
        {["All", "Pending", "Approved", "Rejected"].map((x) => (
          <button
            className={filter === x ? "active" : ""}
            key={x}
            onClick={() => setFilter(x)}
          >
            {x}
            <span>
              {
                db.corrections.filter(
                  (c) =>
                    (actor.role === "admin" || c.actor === actor.id) &&
                    (x === "All" || c.status === x),
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="request-list">
        {list.map((c) => {
          const r = db.registers[c.registerKey];
          return (
            <section className="panel correction-card" key={c.id}>
              <div className="correction-top">
                <div>
                  <span className="eyebrow">
                    {r.className} · {dateLabel(r.date)}
                  </span>
                  <h2>{db.students.find((s) => s.id === c.studentId)?.name}</h2>
                </div>
                <StatusBadge value={c.status} />
              </div>
              <div className="correction-change">
                <StatusBadge value={c.original} />
                <ArrowRight size={17} />
                <StatusBadge value={c.requested} />
              </div>
              <p>{c.reason}</p>
              <div className="correction-footer">
                <span>
                  Requested by{" "}
                  {db.teachers.find((t) => t.id === c.actor)?.name ??
                    "Administrator"}
                </span>
                {c.status === "Pending" && actor.role === "admin" ? (
                  <div className="toolbar-group">
                    <button
                      className="secondary"
                      onClick={() => {
                        setReason("");
                        setDecision({ c, approve: false });
                      }}
                    >
                      <X size={15} />
                      Reject
                    </button>
                    <button
                      className="primary"
                      onClick={() => {
                        setReason("");
                        setDecision({ c, approve: true });
                      }}
                    >
                      <Check size={16} />
                      Review & approve
                    </button>
                  </div>
                ) : c.decision ? (
                  <span className="decision-reason">
                    <strong>{c.decidedBy}:</strong> {c.decision}
                  </span>
                ) : (
                  <span>Awaiting administrator review</span>
                )}
              </div>
            </section>
          );
        })}
        {!list.length && (
          <section className="panel">
            <Empty
              title="No requests here"
              detail="Correction requests and administrator decisions will appear here."
            />
          </section>
        )}
      </div>
      {add && <CorrectionForm onClose={() => setAdd(false)} />}
      {decision && (
        <Modal
          title={
            decision.approve
              ? "Approve this correction?"
              : "Reject this correction?"
          }
          description={
            decision.approve
              ? "The official attendance value and all related statistics will be recalculated."
              : "The official record will remain unchanged. The teacher will see your reason."
          }
          onClose={() => setDecision(null)}
        >
          <Field
            label={
              decision.approve
                ? "Decision note (optional)"
                : "Rejection reason (required)"
            }
          >
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </Field>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setDecision(null)}>
              Cancel
            </button>
            <button
              className="primary"
              onClick={async () => {
                if (
                  await mutate(
                    (d) =>
                      decideCorrection(
                        d,
                        actor,
                        decision.c.id,
                        decision.approve,
                        reason,
                      ),
                    decision.approve
                      ? "Correction approved. Attendance statistics updated."
                      : "Correction rejected. Decision recorded.",
                  )
                )
                  setDecision(null);
              }}
            >
              Confirm {decision.approve ? "approval" : "rejection"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function CorrectionForm({ onClose }: { onClose: () => void }) {
  const { db, actor, mutate } = useApp();
  const cl = actor.className ?? "UKG";
  const registers = Object.values(db.registers)
    .filter(
      (r) => r.submittedAt && r.yearId === db.activeYear && r.className === cl,
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const [date, setDate] = useState(registers[0]?.date ?? ""),
    [id, setId] = useState(""),
    [status, setStatus] = useState<Status>("Present"),
    [reason, setReason] = useState("");
  const r = registers.find((r) => r.date === date);
  return (
    <Modal
      title="Request an attendance correction"
      description="Only submitted records in the active academic year can be corrected."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await mutate(
              (d) => requestCorrection(d, actor, date, id, status, reason, cl),
              "Correction request sent to the administrator dashboard.",
            )
          )
            onClose();
        }}
      >
        <div className="form-grid">
          <Field label="Attendance date">
            <select
              required
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setId("");
              }}
            >
              {registers.map((r) => (
                <option key={r.date} value={r.date}>
                  {dateLabel(r.date)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Student">
            <select required value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">Select student</option>
              {r?.roster.map((id) => (
                <option key={id} value={id}>
                  {db.students.find((s) => s.id === id)?.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Original status">
            <input readOnly value={r?.marks[id] ?? "Select a student"} />
          </Field>
          <Field label="Requested status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Reason">
          <textarea
            required
            minLength={8}
            maxLength={500}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why the original record needs to change…"
          />
        </Field>
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={!registers.length}>
            Send correction request
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function PageHeading({
  eyebrow,
  title,
  detail,
  children,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Teachers() {
  const { db, actor, mutate, notice } = useApp();
  const [edit, setEdit] = useState<Teacher | null>(null),
    [pass, setPass] = useState(""),
    [confirm, setConfirm] = useState<Teacher | null>(null);
  return (
    <>
      <PageHeading
        eyebrow="THE PEOPLE BEHIND EACH CLASSROOM"
        title="Teacher accounts"
        detail="One teacher account. One class. A clear history of responsibility."
      >
        <button
          className="primary"
          onClick={() => {
            setPass("");
            setEdit({
              id: uid(),
              name: "",
              username: "",
              className: "UKG",
              enabled: true,
              passwordHash: "",
            });
          }}
        >
          <Plus size={17} />
          Create teacher
        </button>
      </PageHeading>
      <Banner>
        Demo credentials are local simulations. Use fictional names and
        demo-only passwords. Disable departing accounts; create a new account
        for their replacement.
      </Banner>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Username</th>
                <th>Assigned class</th>
                <th>Status</th>
                <th>Manage account</th>
              </tr>
            </thead>
            <tbody>
              {db.teachers.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="student-cell">
                      <span className="user-avatar">
                        {t.name
                          .split(" ")
                          .slice(-2)
                          .map((x) => x[0])
                          .join("")}
                      </span>
                      <strong>{t.name}</strong>
                    </div>
                  </td>
                  <td>
                    <code>{t.username}</code>
                  </td>
                  <td>
                    <span className="class-tag">{t.className}</span>
                  </td>
                  <td>
                    <StatusBadge value={t.enabled ? "Active" : "Disabled"} />
                  </td>
                  <td>
                    <div className="toolbar-group">
                      <button
                        className="secondary"
                        onClick={() => {
                          setPass("");
                          setEdit({ ...t });
                        }}
                      >
                        <KeyRound size={15} />
                        Reset password
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setConfirm(t)}
                      >
                        {t.enabled ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="future-classes">
        <h3>Room to grow</h3>
        <p>
          Class 1–11 are available for future manual assignments. No preview
          account has access.
        </p>
        <div>
          {CLASSES.slice(1).map((c) => (
            <Badge key={c}>{c} · future</Badge>
          ))}
        </div>
      </div>
      {edit && (
        <Modal
          title={
            edit.passwordHash
              ? "Reset demo password"
              : "Create a teacher account"
          }
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (pass.length < 6) {
                notice(
                  "Choose a demo password with at least 6 characters.",
                  true,
                );
                return;
              }
              const hash = await hashPassword(pass);
              if (
                await mutate(
                  (d) => saveTeacher(d, actor, { ...edit, passwordHash: hash }),
                  "Teacher account saved.",
                )
              )
                setEdit(null);
            }}
          >
            {!edit.passwordHash && (
              <>
                <Field label="Fictional teacher name">
                  <input
                    required
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                </Field>
                <Field label="Username">
                  <input
                    required
                    value={edit.username}
                    onChange={(e) =>
                      setEdit({ ...edit, username: e.target.value })
                    }
                  />
                </Field>
                <Field label="One assigned class">
                  <select
                    value={edit.className}
                    onChange={(e) =>
                      setEdit({ ...edit, className: e.target.value })
                    }
                  >
                    {CLASSES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}
            <Field
              label="Administrator-assigned demo password"
              hint="Minimum 6 characters. Never use a real password."
            >
              <input
                required
                minLength={6}
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </Field>
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEdit(null)}
              >
                Cancel
              </button>
              <button className="primary">Save account</button>
            </div>
          </form>
        </Modal>
      )}
      {confirm && (
        <Confirm
          title={`${confirm.enabled ? "Disable" : "Enable"} ${confirm.name}?`}
          description="Historical submissions retain this teacher’s identity. A disabled teacher cannot sign in or submit."
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            if (
              await mutate(
                (d) =>
                  saveTeacher(d, actor, {
                    ...confirm,
                    enabled: !confirm.enabled,
                  }),
                "Teacher account status updated.",
              )
            )
              setConfirm(null);
          }}
        />
      )}
    </>
  );
}
export function Alerts() {
  const { db, actor, mutate, now, go, setDate } = useApp();
  const [filter, setFilter] = useState("Open");
  const current = structuredClone(db);
  refreshAlerts(current, now);
  const list = current.alerts.filter(
    (a) =>
      filter === "All history" ||
      (filter === "Acknowledged" && a.acknowledged) ||
      (filter === "Open" && a.active && !a.acknowledged),
  );
  return (
    <>
      <PageHeading
        eyebrow="NOTHING IMPORTANT MISSED"
        title="Attendance alerts"
        detail="Current signals and a preserved history of resolved notifications."
      />
      <div className="tabs">
        {["Open", "Acknowledged", "All history"].map((x) => (
          <button
            className={filter === x ? "active" : ""}
            key={x}
            onClick={() => setFilter(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <section className="panel">
        {list.length ? (
          <div className="alert-list">
            {list.map((a) => (
              <div className="alert-row" key={a.id}>
                <span className="attention-icon purple">
                  <Bell size={19} />
                </span>
                <div>
                  <div className="toolbar-group">
                    <strong>{a.title}</strong>
                    <Badge tone={a.active ? "pending" : "neutral"}>
                      {a.type}
                    </Badge>
                    {!a.active && <Badge>Resolved</Badge>}
                  </div>
                  <p>{a.detail}</p>
                  <small>
                    First seen{" "}
                    {new Date(a.firstSeen).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    IST
                  </small>
                </div>
                <div className="toolbar-group">
                  {a.type === "Missing register" && a.active && (
                    <button
                      className="text-button"
                      onClick={() => {
                        setDate(a.id.split("|")[2]);
                        go("Attendance");
                      }}
                    >
                      Open register
                    </button>
                  )}
                  {a.type === "Correction request" && a.active && (
                    <button
                      className="text-button"
                      onClick={() => go("Correction Requests")}
                    >
                      Review request
                    </button>
                  )}
                  {a.acknowledged ? (
                    <Badge tone="approved">Acknowledged</Badge>
                  ) : (
                    <button
                      className="secondary"
                      onClick={() =>
                        mutate((d) => {
                          refreshAlerts(d, now);
                          const record = d.alerts.find((x) => x.id === a.id)!;
                          record.acknowledged = new Date().toISOString();
                          audit(d, actor, "Alert acknowledged", a.id);
                        }, "Alert acknowledged. History preserved.")
                      }
                    >
                      <Check size={15} />
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="All caught up"
            detail="There are no alerts in this view. Historical notifications remain available."
          />
        )}
      </section>
    </>
  );
}
export function Years() {
  const { db, actor, mutate } = useApp();
  const [add, setAdd] = useState(false),
    [name, setName] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [confirm, setConfirm] = useState<{ id: string; archive: boolean } | null>(
      null,
    );
  const active = db.years.find((y) => y.id === db.activeYear)!;
  return (
    <>
      <PageHeading
        eyebrow="A FRESH START, WITH HISTORY INTACT"
        title="Academic years"
        detail="Dates are explicitly configured. No academic calendar is assumed."
      >
        <button className="primary" onClick={() => setAdd(true)}>
          <Plus size={17} />
          Create academic year
        </button>
      </PageHeading>
      <Banner>
        Initial demo setup uses fictional dates: {dateLabel(active.start)}–
        {dateLabel(active.end)}. Create the school’s intended demo calendar
        here; this does not configure a production school.
      </Banner>
      {!db.years.some((y) => y.start > active.end) && (
        <Banner tone="warning">
          The next academic year has not been configured. Create it before
          promoting individual students.
        </Banner>
      )}
      <div className="year-grid">
        {db.years.map((y) => (
          <section className="panel year-card" key={y.id}>
            <div className="toolbar-group">
              <span className="round-icon">
                <CalendarRange size={23} />
              </span>
              <StatusBadge
                value={
                  y.archived
                    ? "Archived"
                    : y.id === db.activeYear
                      ? "Active"
                      : "Configured"
                }
              />
            </div>
            <h2>{y.name}</h2>
            <p>
              {dateLabel(y.start)} — {dateLabel(y.end)}
            </p>
            <small>
              {
                db.students.filter((s) =>
                  s.enrollments.some((e) => e.yearId === y.id),
                ).length
              }{" "}
              student enrollments ·{" "}
              {
                Object.values(db.registers).filter(
                  (r) => r.yearId === y.id && r.submittedAt,
                ).length
              }{" "}
              submitted registers
            </small>
            <div className="dialog-actions">
              {!y.archived && y.id !== db.activeYear && (
                <>
                  <button
                    className="secondary"
                    onClick={() => setConfirm({ id: y.id, archive: true })}
                  >
                    Archive
                  </button>
                  <button
                    className="primary"
                    onClick={() => setConfirm({ id: y.id, archive: false })}
                  >
                    Set active
                  </button>
                </>
              )}
              {y.id === db.activeYear && (
                <Badge tone="purple">Current workspace year</Badge>
              )}
            </div>
          </section>
        ))}
      </div>
      {add && (
        <Modal
          title="Create academic year"
          description="Enter the actual intended start and end dates for this fictional demonstration."
          onClose={() => setAdd(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate(
                  (d) => saveYear(d, actor, name, start, end),
                  "Academic year created.",
                )
              )
                setAdd(false);
            }}
          >
            <Field label="Year name">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2027–28 · Fictional"
              />
            </Field>
            <div className="form-grid">
              <Field label="Start date">
                <input
                  type="date"
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </Field>
              <Field label="End date">
                <input
                  type="date"
                  required
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </Field>
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setAdd(false)}
              >
                Cancel
              </button>
              <button className="primary">Create year</button>
            </div>
          </form>
        </Modal>
      )}
      {confirm && (
        <Confirm
          title={
            confirm.archive
              ? "Archive this academic year?"
              : "Change the active academic year?"
          }
          description={
            confirm.archive
              ? "Archived records remain available as read-only history."
              : "Statistics start from the selected year’s submitted records. Existing enrollments are not automatically promoted. Resolve pending corrections first."
          }
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            if (
              await mutate(
                (d) => setYear(d, actor, confirm.id, confirm.archive),
                "Academic year updated.",
              )
            )
              setConfirm(null);
          }}
        />
      )}
    </>
  );
}
export function Holidays() {
  const { db, actor, mutate } = useApp();
  const [add, setAdd] = useState(false),
    [name, setName] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [exclude, setExclude] = useState(false),
    [remove, setRemove] = useState<string | null>(null);
  const conflict = Object.values(db.registers).some(
    (r) => r.submittedAt && r.date >= start && r.date <= end,
  );
  return (
    <>
      <PageHeading
        eyebrow="SPACE FOR REST AND CELEBRATION"
        title="School holidays"
        detail="Sundays are automatically excluded from school-day calculations."
      >
        <button className="primary" onClick={() => setAdd(true)}>
          <Plus size={17} />
          Add holiday
        </button>
      </PageHeading>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Holiday</th>
                <th>From</th>
                <th>Through</th>
                <th>Type</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {db.holidays.map((h) => (
                <tr key={h.id}>
                  <td>
                    <strong>{h.name}</strong>
                  </td>
                  <td>{dateLabel(h.start)}</td>
                  <td>{dateLabel(h.end)}</td>
                  <td>
                    <Badge>
                      {h.start === h.end ? "Single day" : "Date range"}
                    </Badge>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => setRemove(h.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!db.holidays.length && (
          <Empty
            title="No configured holidays"
            detail="Add individual holidays or a date range. Sundays remain excluded."
          />
        )}
      </section>
      {add && (
        <Modal title="Add a school holiday" onClose={() => setAdd(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate(
                  (d) => addHoliday(d, actor, name, start, end, exclude),
                  "Holiday saved. Attendance calculations refreshed.",
                )
              )
                setAdd(false);
            }}
          >
            <Field label="Holiday name">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label="From">
                <input
                  type="date"
                  required
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    setExclude(false);
                    if (!end) setEnd(e.target.value);
                  }}
                />
              </Field>
              <Field label="Through (inclusive)">
                <input
                  type="date"
                  required
                  value={end}
                  onChange={(e) => {
                    setEnd(e.target.value);
                    setExclude(false);
                  }}
                />
              </Field>
            </div>
            {conflict && (
              <>
                <Banner tone="warning">
                  Submitted attendance exists in this range. Those registers
                  will be preserved but excluded from percentages and absence
                  streaks.
                </Banner>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exclude}
                    onChange={(e) => setExclude(e.target.checked)}
                  />
                  I confirm this exclusion from attendance calculations.
                </label>
              </>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setAdd(false)}
              >
                Cancel
              </button>
              <button className="primary" disabled={conflict && !exclude}>
                Save holiday
              </button>
            </div>
          </form>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="Remove this holiday?"
          description="Preserved attendance on this date will be included in calculations again. This change will be audited."
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            if (
              await mutate(
                (d) => removeHoliday(d, actor, remove),
                "Holiday removed.",
              )
            )
              setRemove(null);
          }}
        />
      )}
    </>
  );
}
export function AuditHistory() {
  const { db } = useApp();
  const [q, setQ] = useState("");
  const list = db.audit.filter((a) =>
    `${a.action} ${a.actor} ${a.detail}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="ACCOUNTABILITY, BUILT IN"
        title="Audit history"
        detail="A local demo record of important changes. Credentials are never logged."
      />
      <section className="panel">
        <div className="table-tools">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Search actions, actors or records…"
          />
          <Badge>{list.length} events</Badge>
        </div>
        <div className="table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp · IST</th>
                <th>Actor</th>
                <th>Action & record</th>
                <th>Before / after</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td>
                    {new Date(a.at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </td>
                  <td>{a.actor}</td>
                  <td>
                    <strong>{a.action}</strong>
                    <small className="cell-sub">{a.detail}</small>
                  </td>
                  <td>
                    {a.before && (
                      <div>
                        <span className="muted">Before: </span>
                        <code>{a.before}</code>
                      </div>
                    )}
                    {a.after && (
                      <div>
                        <span className="muted">After: </span>
                        <code>{a.after}</code>
                      </div>
                    )}
                    {!a.before && !a.after ? "—" : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <Empty title="No matching events" detail="Try a different search." />
        )}
      </section>
    </>
  );
}
export function SettingsPage() {
  const { db, actor, mutate, notice } = useApp();
  const [reset, setReset] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="YOUR DEMONSTRATION WORKSPACE"
        title="Settings"
        detail="A clearly separated, fictional environment for exploring school workflows."
      />
      <div className="settings-grid">
        <section className="panel settings-card">
          <h2>School identity</h2>
          <p>Blossom Kindergarten School</p>
          <div className="brand-setting">
            <Logo db={db} />
            <div>
              <strong>
                {db.logo
                  ? "Approved logo uploaded"
                  : "Original approved logo required"}
              </strong>
              <p>No substitute logo has been generated.</p>
            </div>
          </div>
          <label className="secondary file-button">
            <Upload size={16} />
            Upload exact approved logo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const image = await readImage(file);
                  await mutate((d) => {
                    d.logo = image;
                    audit(
                      d,
                      actor,
                      "School logo uploaded",
                      "Original asset supplied by administrator",
                    );
                  }, "Logo saved for the workspace and reports.");
                } catch (err) {
                  notice((err as Error).message, true);
                }
              }}
            />
          </label>
          <p className="muted">
            Use the supplied original only. PDF exports show “Approved logo
            pending” until it is available.
          </p>
        </section>
        <section className="panel settings-card">
          <h2>Attendance rules</h2>
          <dl>
            <dt>School days</dt>
            <dd>Monday–Saturday, excluding holidays</dd>
            <dt>Submission window</dt>
            <dd>8:00 AM–2:00 PM IST</dd>
            <dt>Attendance percentage</dt>
            <dd>Present ÷ (Present + Absent + Leave)</dd>
            <dt>Low attendance</dt>
            <dd>Strictly below 75%</dd>
            <dt>Absence alert</dt>
            <dd>4 consecutive recorded school-day absences</dd>
          </dl>
        </section>
        <section className="panel settings-card">
          <h2>Demo boundaries</h2>
          <Banner>
            Authentication, authorization and time checks run in the browser.
            They demonstrate workflows; they do not secure production data.
          </Banner>
          <p>
            Data is saved only in this browser and origin. Tabs share records;
            separate devices do not. No email, SMS or WhatsApp services are
            connected.
          </p>
          <p>
            Teacher demo passwords use a browser-local digest. Production
            requires a reviewed server authentication system, secure sessions
            and a private database.
          </p>
        </section>
        <section className="panel settings-card">
          <h2>Start the story again</h2>
          <p>
            Restore 24 fictional students, the unfinished draft, a missed
            register, a pending correction, and attendance alerts.
          </p>
          <p>
            This permanently removes changes made to this demo. The uploaded
            approved logo is retained.
          </p>
          <button className="secondary" onClick={() => setReset(true)}>
            <RotateCcw size={16} />
            Reset synthetic demo
          </button>
        </section>
      </div>
      {reset && (
        <Confirm
          title="Reset all demonstration records?"
          description="All local demo edits will be replaced with the original synthetic scenarios. This cannot be undone. The school logo is retained."
          confirm="Reset demonstration"
          onClose={() => setReset(false)}
          onConfirm={async () => {
            if (
              await mutate((d) => {
                const originalLogo = d.logo;
                Object.assign(d, seed());
                d.logo = originalLogo;
                audit(
                  d,
                  actor,
                  "Demo reset",
                  "Original synthetic scenarios restored",
                );
              }, "Demo reset to its original fictional records.")
            )
              setReset(false);
          }}
        />
      )}
    </>
  );
}
