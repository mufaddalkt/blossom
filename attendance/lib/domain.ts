export type Status = "Present" | "Absent" | "Leave";
export type Role = "admin" | "teacher";
export type Mode = "normal" | "closed" | "actual";
export interface Actor {
  id: string;
  role: Role;
  name: string;
  className?: string;
}
export interface Enrollment {
  yearId: string;
  className: string;
  roll: number;
  status: "Active" | "Withdrawn";
}
export interface Student {
  id: string;
  name: string;
  admission: string;
  guardian: string;
  phone: string;
  dob: string;
  gender: string;
  photo?: string;
  enrollments: Enrollment[];
}
export interface Teacher {
  id: string;
  name: string;
  username: string;
  className: string;
  enabled: boolean;
  passwordHash: string;
}
export interface Year {
  id: string;
  name: string;
  start: string;
  end: string;
  archived: boolean;
}
export interface Register {
  yearId: string;
  className: string;
  date: string;
  marks: Record<string, Status>;
  roster: string[];
  submittedAt?: string;
  submittedBy?: string;
  extension?: { expires: string; actor: string; authorizedAt: string };
  version: number;
}
export interface Correction {
  id: string;
  registerKey: string;
  studentId: string;
  original: Status;
  requested: Status;
  reason: string;
  actor: string;
  status: "Pending" | "Approved" | "Rejected";
  decision?: string;
  decidedBy?: string;
  created: string;
}
export interface Holiday {
  id: string;
  name: string;
  start: string;
  end: string;
}
export interface Audit {
  id: string;
  actor: string;
  action: string;
  detail: string;
  at: string;
  before?: string;
  after?: string;
}
export interface AlertRecord {
  id: string;
  type: string;
  title: string;
  detail: string;
  firstSeen: string;
  active: boolean;
  acknowledged?: string;
}
export interface DB {
  schema: 1;
  revision: number;
  activeYear: string;
  students: Student[];
  teachers: Teacher[];
  years: Year[];
  holidays: Holiday[];
  registers: Record<string, Register>;
  corrections: Correction[];
  audit: Audit[];
  alerts: AlertRecord[];
  logo?: string;
}
export const DEMO_TODAY = "2026-10-15";
export const STORE = "blossom-demo-v1";
export const CLASSES = [
  "UKG",
  ...Array.from({ length: 11 }, (_, i) => `Class ${i + 1}`),
];
export const STATUSES: Status[] = ["Present", "Absent", "Leave"];
export const keyOf = (year: string, date: string, cl = "UKG") =>
  `${year}|${cl}|${date}`;
export const uid = () => globalThis.crypto.randomUUID();
export const dateLabel = (date: string) =>
  new Date(date + "T12:00:00Z").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(+new Date(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function dates(start: string, end: string) {
  if (!validDate(start) || !validDate(end))
    throw Error("Enter valid calendar dates.");
  const result: string[] = [];
  for (
    let d = new Date(start + "T00:00:00Z");
    d <= new Date(end + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    result.push(d.toISOString().slice(0, 10));
    if (result.length > 800) throw Error("Date range is too long.");
  }
  return result;
}
export function schoolDay(db: DB, date: string) {
  return (
    new Date(date + "T12:00:00Z").getUTCDay() !== 0 &&
    !db.holidays.some((h) => date >= h.start && date <= h.end)
  );
}
export function enrollment(student: Student, year: string) {
  return student.enrollments.find((e) => e.yearId === year);
}
export function roster(db: DB, year = db.activeYear, cl = "UKG") {
  return db.students
    .filter((s) => {
      const e = enrollment(s, year);
      return e?.status === "Active" && e.className === cl;
    })
    .sort((a, b) => enrollment(a, year)!.roll - enrollment(b, year)!.roll);
}
export function clock(mode: Mode) {
  return mode === "actual"
    ? new Date()
    : new Date(`${DEMO_TODAY}T${mode === "normal" ? "10" : "15"}:00:00+05:30`);
}
export function istDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function pct(p: number, a: number, l: number) {
  return p + a + l ? (100 * p) / (p + a + l) : null;
}
export function totals(marks: Record<string, Status>) {
  const r = { Present: 0, Absent: 0, Leave: 0 };
  Object.values(marks).forEach((s) => r[s]++);
  return r;
}
export function stats(
  db: DB,
  studentId?: string,
  year = db.activeYear,
  start = "",
  end = "9999",
  cl = "UKG",
) {
  const t = { Present: 0, Absent: 0, Leave: 0 };
  Object.values(db.registers)
    .filter(
      (r) =>
        r.submittedAt &&
        r.yearId === year &&
        r.className === cl &&
        r.date >= start &&
        r.date <= end &&
        schoolDay(db, r.date),
    )
    .forEach((r) =>
      Object.entries(r.marks).forEach(([id, s]) => {
        if (!studentId || id === studentId) t[s]++;
      }),
    );
  return { ...t, percentage: pct(t.Present, t.Absent, t.Leave) };
}
export function streak(
  db: DB,
  studentId: string,
  asOf: string,
  year = db.activeYear,
  cl = "UKG",
) {
  const y = db.years.find((y) => y.id === year)!;
  let n = 0;
  for (const d of dates(y.start, asOf < y.end ? asOf : y.end).reverse()) {
    if (!schoolDay(db, d)) continue;
    const r = db.registers[keyOf(year, d, cl)];
    if (!r?.submittedAt || r.marks[studentId] !== "Absent") break;
    n++;
  }
  return n;
}
export function actorValid(db: DB, actor: Actor) {
  if (actor.role === "admin" && actor.id === "admin") return;
  const t = db.teachers.find((t) => t.id === actor.id && t.enabled);
  if (!t || t.className !== actor.className)
    throw Error("This teacher account is disabled or unavailable.");
}
export function adminOnly(db: DB, actor: Actor) {
  actorValid(db, actor);
  if (actor.role !== "admin") throw Error("Administrator access required.");
}
export function classAccess(db: DB, actor: Actor, cl: string) {
  actorValid(db, actor);
  if (actor.role === "teacher" && actor.className !== cl)
    throw Error("This class is outside your assignment.");
}
export function editableYear(db: DB, year: string) {
  const y = db.years.find((y) => y.id === year);
  if (!y || y.archived || year !== db.activeYear)
    throw Error("Historical academic years are read-only.");
  return y;
}
export function submissionAccess(db: DB, actor: Actor, r: Register, now: Date) {
  classAccess(db, actor, r.className);
  const y = editableYear(db, r.yearId);
  if (!validDate(r.date)) throw Error("Enter a valid attendance date.");
  if (r.date < y.start || r.date > y.end)
    throw Error("Date is outside the active academic year.");
  if (!schoolDay(db, r.date))
    throw Error("Attendance is unavailable on Sundays and holidays.");
  const today = istDate(now);
  if (r.date > today) throw Error("Future attendance cannot be submitted.");
  if (r.submittedAt) throw Error("This register has already been submitted.");
  if (actor.role === "admin") return;
  if (r.extension && new Date(r.extension.expires) > now) return;
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  if (today !== r.date || hour < 8 || hour >= 14)
    throw Error(
      "Submission window closed. Ask the administrator to reopen this register.",
    );
}
export function audit(
  db: DB,
  actor: Actor,
  action: string,
  detail: string,
  before?: unknown,
  after?: unknown,
) {
  db.audit.unshift({
    id: uid(),
    actor: actor.name,
    action,
    detail,
    at: new Date().toISOString(),
    before: before === undefined ? undefined : JSON.stringify(before),
    after: after === undefined ? undefined : JSON.stringify(after),
  });
}
export function getRegister(
  db: DB,
  date: string,
  cl = "UKG",
  year = db.activeYear,
): Register {
  const r = db.registers[keyOf(year, date, cl)];
  const ids = roster(db, year, cl).map((s) => s.id);
  if (r?.submittedAt) return r;
  if (r)
    return {
      ...r,
      roster: ids,
      marks: Object.fromEntries(
        Object.entries(r.marks).filter(([id]) => ids.includes(id)),
      ),
    };
  return {
    yearId: year,
    className: cl,
    date,
    marks: {},
    roster: ids,
    version: 0,
  };
}
export function saveDraft(
  db: DB,
  actor: Actor,
  date: string,
  marks: Record<string, Status>,
  now: Date,
  cl = "UKG",
) {
  const r = getRegister(db, date, cl);
  submissionAccess(db, actor, r, now);
  const ids = roster(db, r.yearId, cl).map((s) => s.id);
  for (const [id, s] of Object.entries(marks)) {
    if (!ids.includes(id) || !STATUSES.includes(s))
      throw Error("Invalid attendance mark.");
  }
  r.roster = ids;
  r.marks = Object.fromEntries(
    Object.entries({ ...r.marks, ...marks }).filter(([id]) => ids.includes(id)),
  );
  r.version++;
  db.registers[keyOf(r.yearId, date, cl)] = r;
}
export function submit(
  db: DB,
  actor: Actor,
  date: string,
  now: Date,
  expected: number,
  cl = "UKG",
) {
  const r = getRegister(db, date, cl);
  submissionAccess(db, actor, r, now);
  if (r.version !== expected)
    throw Error("Register changed in another tab. Review the latest values.");
  const ids = roster(db, r.yearId, cl).map((s) => s.id);
  if (!ids.length || ids.some((id) => !STATUSES.includes(r.marks[id])))
    throw Error("Mark every active student before submitting.");
  r.roster = ids;
  r.marks = Object.fromEntries(ids.map((id) => [id, r.marks[id]]));
  r.submittedAt = new Date().toISOString();
  r.submittedBy = actor.name;
  r.version++;
  db.registers[keyOf(r.yearId, date, cl)] = r;
  audit(
    db,
    actor,
    "Attendance submitted",
    `${cl} · ${date}`,
    undefined,
    totals(r.marks),
  );
}
export function reopen(
  db: DB,
  actor: Actor,
  date: string,
  expires: string,
  now: Date,
  cl = "UKG",
) {
  adminOnly(db, actor);
  const r = getRegister(db, date, cl);
  submissionAccess(db, actor, r, now);
  const expiry = new Date(expires);
  if (!Number.isFinite(+expiry) || expiry <= now)
    throw Error("Choose an expiry after the current demo time.");
  r.extension = {
    expires: expiry.toISOString(),
    actor: actor.name,
    authorizedAt: new Date().toISOString(),
  };
  r.version++;
  db.registers[keyOf(r.yearId, date, cl)] = r;
  audit(
    db,
    actor,
    "Register reopened",
    `${cl} · ${date}`,
    undefined,
    r.extension,
  );
}
export function requestCorrection(
  db: DB,
  actor: Actor,
  date: string,
  studentId: string,
  requested: Status,
  reason: string,
  cl = "UKG",
) {
  classAccess(db, actor, cl);
  editableYear(db, db.activeYear);
  const k = keyOf(db.activeYear, date, cl),
    r = db.registers[k];
  if (!r?.submittedAt || !r.marks[studentId])
    throw Error("Select a submitted student record.");
  if (!STATUSES.includes(requested) || r.marks[studentId] === requested)
    throw Error("Choose a different attendance status.");
  if (reason.trim().length < 8)
    throw Error("Provide a reason of at least 8 characters.");
  if (
    db.corrections.some(
      (c) =>
        c.registerKey === k &&
        c.studentId === studentId &&
        c.status === "Pending",
    )
  )
    throw Error("A pending request already exists for this student and date.");
  db.corrections.unshift({
    id: uid(),
    registerKey: k,
    studentId,
    original: r.marks[studentId],
    requested,
    reason: reason.trim().slice(0, 500),
    actor: actor.id,
    status: "Pending",
    created: new Date().toISOString(),
  });
  audit(
    db,
    actor,
    "Correction requested",
    `${studentId} · ${date}`,
    r.marks[studentId],
    requested,
  );
}
export function decideCorrection(
  db: DB,
  actor: Actor,
  id: string,
  approve: boolean,
  reason: string,
) {
  adminOnly(db, actor);
  const c = db.corrections.find((c) => c.id === id);
  if (!c || c.status !== "Pending")
    throw Error("This request has already been resolved.");
  const r = db.registers[c.registerKey];
  editableYear(db, r.yearId);
  if (!approve && reason.trim().length < 3)
    throw Error("A rejection reason is required.");
  if (approve && r.marks[c.studentId] !== c.original)
    throw Error(
      "The official value has changed. Reject and request a fresh correction.",
    );
  if (approve) {
    r.marks[c.studentId] = c.requested;
    r.version++;
  }
  c.status = approve ? "Approved" : "Rejected";
  c.decision = reason.trim() || (approve ? "Reviewed and approved." : "");
  c.decidedBy = actor.name;
  audit(
    db,
    actor,
    `Correction ${c.status.toLowerCase()}`,
    `${c.studentId} · ${r.date}`,
    c.original,
    approve ? c.requested : c.original,
  );
}
export function saveStudent(
  db: DB,
  actor: Actor,
  input: Student,
  roll: number,
  cl: string,
) {
  adminOnly(db, actor);
  editableYear(db, db.activeYear);
  if (input.name.trim().length < 3) throw Error("Enter the full student name.");
  if (!Number.isInteger(roll) || roll < 1)
    throw Error("Roll number must be a positive whole number.");
  if (!CLASSES.includes(cl)) throw Error("Invalid class.");
  if (input.phone && !/^DEMO-\d{4}$/.test(input.phone))
    throw Error("Use a fictional guardian phone such as DEMO-0025.");
  if (
    input.admission &&
    db.students.some(
      (s) => s.id !== input.id && s.admission === input.admission,
    )
  )
    throw Error("Admission number already exists.");
  if (
    db.students.some(
      (s) =>
        s.id !== input.id &&
        s.enrollments.some(
          (e) =>
            e.yearId === db.activeYear &&
            e.className === cl &&
            e.roll === roll &&
            e.status === "Active",
        ),
    )
  )
    throw Error("This roll number is already assigned.");
  if (input.dob && (!validDate(input.dob) || input.dob > DEMO_TODAY))
    throw Error("Enter a valid date of birth.");
  const old = db.students.find((s) => s.id === input.id);
  const e = old ? enrollment(old, db.activeYear) : undefined;
  if (e && e.className !== cl)
    throw Error(
      "Use promotion or repeat enrollment to change class in another academic year.",
    );
  input.enrollments = [
    ...(old?.enrollments.filter((e) => e.yearId !== db.activeYear) ?? []),
    {
      yearId: db.activeYear,
      className: cl,
      roll,
      status: e?.status ?? "Active",
    },
  ];
  if (old) db.students[db.students.indexOf(old)] = input;
  else db.students.push(input);
  audit(
    db,
    actor,
    old ? "Student profile updated" : "Student added",
    input.id,
    old ? { name: old.name, admission: old.admission } : undefined,
    { name: input.name, admission: input.admission },
  );
}
export function withdraw(db: DB, actor: Actor, id: string) {
  adminOnly(db, actor);
  editableYear(db, db.activeYear);
  const s = db.students.find((s) => s.id === id),
    e = s && enrollment(s, db.activeYear);
  if (!e || e.status === "Withdrawn")
    throw Error("Student is not actively enrolled.");
  e.status = "Withdrawn";
  audit(db, actor, "Student withdrawn", id, "Active", "Withdrawn");
}
export function promote(
  db: DB,
  actor: Actor,
  id: string,
  targetYear: string,
  cl: string,
  roll: number,
) {
  adminOnly(db, actor);
  const y = db.years.find((y) => y.id === targetYear);
  if (!y || y.archived || targetYear === db.activeYear)
    throw Error("Choose a different, unarchived academic year.");
  const s = db.students.find((s) => s.id === id);
  if (!s) throw Error("Student not found.");
  if (enrollment(s, targetYear))
    throw Error("This student already has an enrollment in that year.");
  if (!Number.isInteger(roll) || roll < 1 || !CLASSES.includes(cl))
    throw Error("Choose a valid class and roll number.");
  if (
    db.students.some((s) =>
      s.enrollments.some(
        (e) =>
          e.yearId === targetYear &&
          e.className === cl &&
          e.roll === roll &&
          e.status === "Active",
      ),
    )
  )
    throw Error("Duplicate target roll number.");
  s.enrollments.push({
    yearId: targetYear,
    className: cl,
    roll,
    status: "Active",
  });
  audit(db, actor, "Student enrollment created", id, undefined, {
    targetYear,
    cl,
    roll,
  });
}
export function saveYear(
  db: DB,
  actor: Actor,
  name: string,
  start: string,
  end: string,
) {
  adminOnly(db, actor);
  if (
    !name.trim() ||
    !start ||
    !end ||
    start >= end ||
    dates(start, end).length > 550
  )
    throw Error(
      "Enter a name and a valid academic-year range of at most 550 days.",
    );
  if (db.years.some((y) => start <= y.end && end >= y.start))
    throw Error("Academic years must not overlap.");
  db.years.push({ id: uid(), name: name.trim(), start, end, archived: false });
  audit(db, actor, "Academic year created", name, undefined, { start, end });
}
export function setYear(db: DB, actor: Actor, id: string, archive = false) {
  adminOnly(db, actor);
  const y = db.years.find((y) => y.id === id);
  if (!y) throw Error("Year not found.");
  if (archive) {
    if (id === db.activeYear)
      throw Error("Activate another year before archiving this one.");
    if (
      db.corrections.some(
        (c) =>
          c.status === "Pending" && db.registers[c.registerKey].yearId === id,
      )
    )
      throw Error("Resolve pending corrections before archiving.");
    y.archived = true;
  } else {
    if (y.archived) throw Error("Archived years cannot be activated.");
    if (db.corrections.some((c) => c.status === "Pending"))
      throw Error(
        "Resolve pending corrections before switching academic years.",
      );
    db.activeYear = id;
  }
  audit(
    db,
    actor,
    archive ? "Academic year archived" : "Active academic year changed",
    y.name,
  );
}
export function addHoliday(
  db: DB,
  actor: Actor,
  name: string,
  start: string,
  end: string,
  confirmConflict: boolean,
) {
  adminOnly(db, actor);
  const y = editableYear(db, db.activeYear);
  if (
    !name.trim() ||
    !validDate(start) ||
    !validDate(end) ||
    start > end ||
    start < y.start ||
    end > y.end
  )
    throw Error("Choose a holiday range within the active academic year.");
  const conflict = Object.values(db.registers).some(
    (r) => r.submittedAt && r.date >= start && r.date <= end,
  );
  if (conflict && !confirmConflict)
    throw Error(
      "This range has submitted attendance. Confirm exclusion from calculations while preserving the registers.",
    );
  db.holidays.push({ id: uid(), name: name.trim(), start, end });
  audit(db, actor, "Holiday added", name, undefined, {
    start,
    end,
    excludedSubmittedAttendance: conflict,
  });
}
export function removeHoliday(db: DB, actor: Actor, id: string) {
  adminOnly(db, actor);
  const h = db.holidays.find((h) => h.id === id);
  if (!h) throw Error("Holiday no longer exists.");
  const y = editableYear(db, db.activeYear);
  if (h.start < y.start || h.end > y.end)
    throw Error("Historical holidays are read-only.");
  db.holidays = db.holidays.filter((h) => h.id !== id);
  audit(db, actor, "Holiday removed", h.name, h, undefined);
}
export function saveTeacher(db: DB, actor: Actor, t: Teacher) {
  adminOnly(db, actor);
  const old = db.teachers.find((x) => x.id === t.id);
  if (
    !/^[a-z][a-z0-9_]{2,30}$/.test(t.username) ||
    t.name.trim().length < 3 ||
    !t.passwordHash
  )
    throw Error(
      "Enter a name, password and valid username (lowercase letters, numbers, underscores).",
    );
  if (!CLASSES.includes(t.className)) throw Error("Invalid class.");
  if (old && (old.className !== t.className || old.username !== t.username))
    throw Error("Existing accounts cannot be reassigned or renamed.");
  if (
    db.teachers.some((x) => x.id !== t.id && x.username === t.username) ||
    t.username === "admin"
  )
    throw Error("Username already exists.");
  if (
    t.enabled &&
    db.teachers.some(
      (x) => x.id !== t.id && x.enabled && x.className === t.className,
    )
  )
    throw Error("Disable the existing teacher before assigning a replacement.");
  if (old) db.teachers[db.teachers.indexOf(old)] = t;
  else db.teachers.push(t);
  audit(
    db,
    actor,
    old ? "Teacher account updated" : "Teacher account created",
    t.username,
    old ? { enabled: old.enabled, className: old.className } : undefined,
    { enabled: t.enabled, className: t.className },
  );
}
export function refreshAlerts(db: DB, now: Date) {
  const today = istDate(now),
    y = db.years.find((y) => y.id === db.activeYear)!;
  const active: Omit<AlertRecord, "firstSeen" | "active">[] = [];
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  const until =
    hour >= 14
      ? today
      : new Date(new Date(today + "T12:00:00Z").getTime() - 86400000)
          .toISOString()
          .slice(0, 10);
  const last = dates(y.start, until < y.end ? until : y.end)
    .filter((d) => schoolDay(db, d))
    .at(-1);
  for (const s of roster(db)) {
    const t = stats(db, s.id, db.activeYear, "", today);
    if (t.percentage !== null && t.percentage < 75)
      active.push({
        id: `low|${db.activeYear}|${s.id}`,
        type: "Low attendance",
        title: s.name,
        detail: `${t.percentage.toFixed(1)}% attendance · below 75%`,
      });
    if (last) {
      const run = streak(db, s.id, last);
      if (run >= 4) {
        const beginning = dates(y.start, last)
          .filter((d) => schoolDay(db, d))
          .at(-run)!;
        active.push({
          id: `streak|${db.activeYear}|${s.id}|${beginning}`,
          type: "Consecutive absence",
          title: s.name,
          detail: `${run} consecutive recorded school-day absences`,
        });
      }
    }
  }
  for (const d of dates(y.start, until < y.end ? until : y.end)) {
    if (!schoolDay(db, d) || db.registers[keyOf(db.activeYear, d)]?.submittedAt)
      continue;
    active.push({
      id: `missing|${db.activeYear}|${d}`,
      type: "Missing register",
      title: `UKG · ${dateLabel(d)}`,
      detail: "Not Submitted · no students counted absent",
    });
  }
  for (const c of db.corrections.filter((c) => c.status === "Pending"))
    active.push({
      id: `correction|${c.id}`,
      type: "Correction request",
      title: db.students.find((s) => s.id === c.studentId)?.name ?? "Student",
      detail: `${c.original} → ${c.requested}`,
    });
  db.alerts.forEach((a) => (a.active = false));
  for (const a of active) {
    const old = db.alerts.find((x) => x.id === a.id);
    if (old) {
      old.active = true;
      old.detail = a.detail;
    } else
      db.alerts.unshift({
        ...a,
        active: true,
        firstSeen: new Date().toISOString(),
      });
  }
}
