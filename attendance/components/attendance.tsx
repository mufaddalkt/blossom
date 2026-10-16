"use client";
import { useState } from "react";
import {
  Check,
  X,
  Clock3,
  CheckCheck,
  LockKeyhole,
  Save,
  ArrowRight,
  CalendarDays,
  RotateCcw,
} from "lucide-react";
import {
  getRegister,
  roster,
  enrollment,
  totals,
  STATUSES,
  Status,
  saveDraft,
  submit,
  submissionAccess,
  reopen,
  dateLabel,
  keyOf,
} from "@/lib/domain";
import {
  useApp,
  Avatar,
  Badge,
  StatusBadge,
  Banner,
  SearchBox,
  Modal,
  Field,
  Empty,
} from "./ui";
export function Attendance() {
  const { db, actor, now, date, setDate, mutate, saveState } = useApp();
  const [q, setQ] = useState(""),
    [review, setReview] = useState(false),
    [extension, setExtension] = useState(false),
    [expiry, setExpiry] = useState("2026-10-15T17:00"),
    [yearId, setYearId] = useState(db.activeYear);
  const cl = actor.className ?? "UKG";
  const r = getRegister(db, date, cl, yearId),
    students = r.submittedAt
      ? r.roster
          .map((id) => db.students.find((s) => s.id === id)!)
          .filter(Boolean)
      : roster(db, yearId, cl);
  const marked = students.filter((s) => r.marks[s.id]).length,
    t = totals(r.marks);
  let blocked = "";
  try {
    submissionAccess(db, actor, r, now);
  } catch (e) {
    blocked = (e as Error).message;
  }
  const filtered = students.filter((s) =>
    `${s.name} ${s.admission} ${enrollment(s, yearId)?.roll}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  async function mark(id: string, status: Status) {
    await mutate((d) => saveDraft(d, actor, date, { [id]: status }, now, cl));
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE DAILY ROLL CALL</div>
          <h1>Attendance register</h1>
          <p>A little check-in for every little learner.</p>
        </div>
        <div className="heading-actions">
          <Badge tone="purple">{cl} classroom</Badge>
          <span className="save-indicator" role="status">
            <Save size={14} />
            {saveState}
          </span>
        </div>
      </div>
      <section className="panel register-panel">
        <div className="register-toolbar">
          <div className="toolbar-group">
            <Field label="Attendance date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Academic year">
              <select
                value={yearId}
                onChange={(e) => setYearId(e.target.value)}
              >
                {db.years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="toolbar-group">
            <StatusBadge
              value={
                r.submittedAt
                  ? "Submitted"
                  : Object.keys(r.marks).length
                    ? "Draft saved"
                    : "Not Submitted"
              }
            />
            {r.extension && !r.submittedAt && (
              <Badge
                tone={
                  new Date(r.extension.expires) > now ? "approved" : "neutral"
                }
              >
                Reopened until{" "}
                {new Date(r.extension.expires).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}{" "}
                IST
              </Badge>
            )}
          </div>
        </div>
        {r.submittedAt ? (
          <Banner>
            <strong>Submitted register · read-only.</strong> Submitted by{" "}
            {r.submittedBy}. Use Correction Requests to propose a change.
          </Banner>
        ) : blocked ? (
          <Banner tone="warning">
            <strong>Not Submitted.</strong> {blocked} Drafts are preserved and
            do not count as absences.
            {actor.role === "admin" && yearId === db.activeYear && (
              <button
                className="text-button"
                onClick={() => setExtension(true)}
              >
                Reopen for teacher <RotateCcw size={14} />
              </button>
            )}
          </Banner>
        ) : (
          <Banner>
            <strong>
              {actor.role === "admin"
                ? "Administrator can complete this register."
                : "Attendance is open."}
            </strong>{" "}
            Mark every student and review before submitting. Normal hours: 8:00
            AM–2:00 PM IST.
          </Banner>
        )}
        <div className="register-summary">
          <div>
            <strong>
              {marked}
              <span> / {students.length}</span>
            </strong>
            <p>students marked</p>
          </div>
          <div className="progress-track">
            <i
              style={{
                width: `${(marked / Math.max(1, students.length)) * 100}%`,
              }}
            />
          </div>
          <div className="register-counts">
            {STATUSES.map((s) => (
              <span key={s}>
                <i className={`status-dot ${s.toLowerCase()}`} />
                {s}
                <strong>{t[s]}</strong>
              </span>
            ))}
          </div>
        </div>
        <div className="table-tools">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Search name, admission or roll number…"
          />
          <div className="toolbar-group">
            {actor.role === "admin" &&
              !r.submittedAt &&
              yearId === db.activeYear && (
                <button
                  className="secondary"
                  onClick={() => setExtension(true)}
                >
                  <RotateCcw size={15} />
                  Reopen for teacher
                </button>
              )}
            <button
              className="secondary"
              disabled={!!blocked || !students.length}
              onClick={() =>
                mutate(
                  (d) =>
                    saveDraft(
                      d,
                      actor,
                      date,
                      Object.fromEntries(
                        students.map((s) => [s.id, "Present"]),
                      ),
                      now,
                      cl,
                    ),
                  "All active students marked present in draft.",
                )
              }
            >
              <CheckCheck size={17} />
              Mark all present
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Roll no.</th>
                <th>Student</th>
                <th>Status</th>
                <th className="align-right">Mark attendance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="roll">
                    {String(enrollment(s, yearId)?.roll ?? "—").padStart(
                      2,
                      "0",
                    )}
                  </td>
                  <td>
                    <div className="student-cell">
                      <Avatar student={s} />
                      <div>
                        <strong>{s.name}</strong>
                        <small>
                          {s.admission || "Provisional admission"}{" "}
                          <span>·</span>{" "}
                          {s.photo ? "Demo photo" : "Photo Pending"}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {r.marks[s.id] ? (
                      <StatusBadge value={r.marks[s.id]} />
                    ) : (
                      <span className="unmarked">Not marked</span>
                    )}
                  </td>
                  <td>
                    <div
                      className="mark-controls"
                      role="group"
                      aria-label={`Attendance for ${s.name}`}
                    >
                      {STATUSES.map((status, i) => (
                        <button
                          key={status}
                          disabled={!!blocked}
                          className={`${status.toLowerCase()} ${r.marks[s.id] === status ? "selected" : ""}`}
                          aria-pressed={r.marks[s.id] === status}
                          aria-label={`${s.name}: ${status}`}
                          onClick={() => mark(s.id, status)}
                        >
                          {i === 0 ? (
                            <Check size={15} />
                          ) : i === 1 ? (
                            <X size={15} />
                          ) : (
                            <Clock3 size={15} />
                          )}
                          <span>{status}</span>
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty
            title="No students found"
            detail="Try another search, or check the selected academic year."
          />
        )}
        <div className="register-footer">
          <div>
            <strong>
              {r.submittedAt
                ? "Official register is locked"
                : `${students.length - marked} students remaining`}
            </strong>
            <span>
              {r.submittedAt
                ? "Changes require administrator approval."
                : "Your draft is saved automatically on this device."}
            </span>
          </div>
          <button
            className="primary"
            disabled={
              !!blocked || marked !== students.length || !students.length
            }
            onClick={() => setReview(true)}
          >
            {r.submittedAt ? (
              <LockKeyhole size={16} />
            ) : (
              <CheckCheck size={16} />
            )}
            Review & submit
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
      <section className="panel history-panel">
        <div className="panel-heading">
          <div>
            <h2>Register history</h2>
            <p>Saved drafts and submitted school days.</p>
          </div>
          <CalendarDays size={20} />
        </div>
        <div className="history-chips">
          {Object.values(db.registers)
            .filter((x) => x.yearId === yearId && x.className === cl)
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 18)
            .map((x) => (
              <button
                key={x.date}
                className={date === x.date ? "selected" : ""}
                onClick={() => setDate(x.date)}
              >
                <strong>{dateLabel(x.date)}</strong>
                <StatusBadge
                  value={x.submittedAt ? "Submitted" : "Not Submitted"}
                />
              </button>
            ))}
        </div>
      </section>
      {review && (
        <Modal
          title="Review the class register"
          description={`${cl} · ${dateLabel(date)} · ${students.length} students`}
          onClose={() => setReview(false)}
        >
          <div className="review-totals">
            {STATUSES.map((s) => (
              <div key={s}>
                <StatusBadge value={s} />
                <strong>{t[s]}</strong>
              </div>
            ))}
          </div>
          <Banner tone="warning">
            Submitting makes this the official demo register. Teacher edits will
            be locked. Later changes require an approved correction request.
          </Banner>
          <p className="confirmation-copy">
            All {students.length} students have a status. Confirm that the
            register is accurate.
          </p>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setReview(false)}>
              Back to register
            </button>
            <button
              className="primary"
              onClick={async () => {
                if (
                  await mutate(
                    (d) => submit(d, actor, date, now, r.version, cl),
                    "Attendance submitted. The official register is now locked.",
                  )
                )
                  setReview(false);
              }}
            >
              Confirm final submission
            </button>
          </div>
        </Modal>
      )}
      {extension && (
        <Modal
          title="Reopen this register"
          description={`Extension applies only to ${cl} on ${dateLabel(date)}.`}
          onClose={() => setExtension(false)}
        >
          <Banner>
            Demo clock:{" "}
            {now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST. The
            assigned teacher can submit until the chosen expiry.
          </Banner>
          <Field label="Extension expiry · IST">
            <input
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </Field>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setExtension(false)}>
              Cancel
            </button>
            <button
              className="primary"
              onClick={async () => {
                if (
                  await mutate(
                    (d) =>
                      reopen(d, actor, date, expiry + ":00+05:30", now, cl),
                    "This register has been reopened for its assigned teacher.",
                  )
                )
                  setExtension(false);
              }}
            >
              Authorize extension
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
