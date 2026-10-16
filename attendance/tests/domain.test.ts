import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { seed } from "../lib/seed";
import {
  Actor,
  DB,
  keyOf,
  clock,
  pct,
  stats,
  streak,
  totals,
  saveDraft,
  submit,
  getRegister,
  reopen,
  requestCorrection,
  decideCorrection,
  schoolDay,
  addHoliday,
  removeHoliday,
  saveStudent,
  withdraw,
  promote,
  saveYear,
  setYear,
  saveTeacher,
  refreshAlerts,
  actorValid,
  classAccess,
  roster,
} from "../lib/domain";
import {
  reportRows,
  makePDF,
  makeWorkbook,
  ReportOptions,
} from "../lib/reports";
const admin: Actor = {
  id: "admin",
  name: "School Administrator",
  role: "admin",
};
const teacher: Actor = {
  id: "teacher-ukg",
  name: "Ms. Leela Woods",
  role: "teacher",
  className: "UKG",
};
const today = "2026-10-15",
  open = clock("normal"),
  closed = clock("closed");
function fill(db: DB) {
  saveDraft(
    db,
    teacher,
    today,
    Object.fromEntries(roster(db).map((s) => [s.id, "Present"])),
    open,
  );
}
test("24 fictional students with explicitly synthetic guardians; no inferred gender", () => {
  const d = seed();
  assert.equal(d.students.length, 24);
  assert.ok(
    d.students.every(
      (s) => s.phone.startsWith("DEMO-") && s.gender === "Not specified",
    ),
  );
});
test("percentage includes leave and returns null with no data", () => {
  assert.equal(pct(3, 0, 1), 75);
  assert.equal(pct(0, 0, 0), null);
});
test("drafts and missing registers do not affect statistics", () => {
  const d = seed(),
    before = stats(d);
  fill(d);
  assert.deepEqual(stats(d), before);
  assert.equal(
    stats(d, undefined, d.activeYear, "2026-10-07", "2026-10-07").percentage,
    null,
  );
});
test("save draft and serialize round trip preserve all three statuses", () => {
  const d = seed();
  saveDraft(
    d,
    teacher,
    today,
    { "student-1": "Present", "student-2": "Absent", "student-3": "Leave" },
    open,
  );
  const round = JSON.parse(JSON.stringify(d));
  assert.deepEqual(
    totals(getRegister(round, today).marks),
    totals(getRegister(d, today).marks),
  );
  assert.equal(getRegister(round, today).marks["student-3"], "Leave");
});
test("partial register cannot submit", () => {
  const d = seed();
  assert.throws(
    () => submit(d, teacher, today, open, 1),
    /every active student/,
  );
});
test("submission locks official register; duplicate is refused", () => {
  const d = seed();
  fill(d);
  submit(d, teacher, today, open, getRegister(d, today).version);
  assert.ok(getRegister(d, today).submittedAt);
  assert.throws(
    () => saveDraft(d, teacher, today, { "student-1": "Absent" }, open),
    /already been submitted/,
  );
  assert.throws(
    () => submit(d, admin, today, open, getRegister(d, today).version),
    /already been submitted/,
  );
});
test("optimistic version check prevents conflicting submissions", () => {
  const d = seed();
  fill(d);
  assert.throws(() => submit(d, teacher, today, open, 0), /another tab/);
});
test("outside window blocks teacher, preserves draft, allows administrator recovery", () => {
  const d = seed();
  assert.throws(
    () => saveDraft(d, teacher, today, { "student-20": "Present" }, closed),
    /window closed/,
  );
  assert.equal(Object.keys(getRegister(d, today).marks).length, 18);
  saveDraft(
    d,
    admin,
    today,
    Object.fromEntries(roster(d).map((s) => [s.id, "Present"])),
    closed,
  );
  submit(d, admin, today, closed, getRegister(d, today).version);
  assert.ok(getRegister(d, today).submittedAt);
});
test("window boundary is inclusive 08:00 and exclusive 14:00 IST", () => {
  const d = seed();
  assert.throws(
    () =>
      saveDraft(
        d,
        teacher,
        today,
        { "student-1": "Present" },
        new Date("2026-10-15T07:59:00+05:30"),
      ),
    /closed/,
  );
  saveDraft(
    d,
    teacher,
    today,
    { "student-1": "Present" },
    new Date("2026-10-15T08:00:00+05:30"),
  );
  assert.throws(
    () =>
      saveDraft(
        d,
        teacher,
        today,
        { "student-1": "Present" },
        new Date("2026-10-15T14:00:00+05:30"),
      ),
    /closed/,
  );
});
test("extension applies only to class/date and expires", () => {
  const d = seed();
  reopen(d, admin, "2026-10-07", "2026-10-15T16:00:00+05:30", closed);
  saveDraft(d, teacher, "2026-10-07", { "student-3": "Leave" }, closed);
  assert.throws(
    () => saveDraft(d, teacher, today, { "student-3": "Leave" }, closed),
    /closed/,
  );
  assert.throws(
    () =>
      saveDraft(
        d,
        teacher,
        "2026-10-07",
        { "student-4": "Leave" },
        new Date("2026-10-15T16:00:00+05:30"),
      ),
    /closed/,
  );
  assert.ok(d.audit.some((a) => a.action === "Register reopened"));
});
test("extension expiry must be in the future", () => {
  assert.throws(
    () =>
      reopen(seed(), admin, "2026-10-07", "2026-10-14T16:00:00+05:30", open),
    /expiry/,
  );
});
test("teacher has no other-class or administrator management access", () => {
  const d = seed();
  assert.throws(() => classAccess(d, teacher, "Class 1"), /outside/);
  assert.throws(
    () => reopen(d, teacher, "2026-10-07", "2026-10-16T10:00:00Z", open),
    /Administrator/,
  );
  assert.throws(
    () => saveYear(d, teacher, "Test", "2027-07-01", "2028-06-30"),
    /Administrator/,
  );
  assert.throws(
    () => saveStudent(d, teacher, d.students[0], 1, "UKG"),
    /Administrator/,
  );
});
test("correction approval updates official value, stats, streak and audit", () => {
  const d = seed();
  assert.equal(streak(d, "student-2", "2026-10-14"), 4);
  const p = stats(d, "student-2");
  decideCorrection(
    d,
    admin,
    "correction-seed",
    true,
    "Checked synthetic leave note.",
  );
  assert.equal(
    d.registers[keyOf(d.activeYear, "2026-10-14")].marks["student-2"],
    "Leave",
  );
  assert.equal(streak(d, "student-2", "2026-10-14"), 0);
  assert.equal(stats(d, "student-2").Leave, p.Leave + 1);
  assert.ok(d.audit[0].before?.includes("Absent"));
});
test("rejection requires a reason and preserves official value", () => {
  const d = seed();
  assert.throws(
    () => decideCorrection(d, admin, "correction-seed", false, ""),
    /reason/,
  );
  decideCorrection(d, admin, "correction-seed", false, "No supporting detail");
  assert.equal(d.corrections[0].status, "Rejected");
  assert.equal(d.corrections[0].decision, "No supporting detail");
  assert.equal(getRegister(d, "2026-10-14").marks["student-2"], "Absent");
});
test("duplicate pending correction refused, same-value request refused", () => {
  const d = seed();
  assert.throws(
    () =>
      requestCorrection(
        d,
        teacher,
        "2026-10-14",
        "student-2",
        "Present",
        "Synthetic reason",
      ),
    /pending request/,
  );
  assert.throws(
    () =>
      requestCorrection(
        d,
        teacher,
        "2026-10-14",
        "student-2",
        "Absent",
        "Synthetic reason",
      ),
    /different/,
  );
});
test("correction for unsubmitted record refused and teacher cannot approve", () => {
  const d = seed();
  assert.throws(
    () =>
      requestCorrection(
        d,
        teacher,
        today,
        "student-2",
        "Present",
        "Synthetic reason",
      ),
    /submitted/,
  );
  assert.throws(
    () => decideCorrection(d, teacher, "correction-seed", true, ""),
    /Administrator/,
  );
});
test("missing record breaks absence streak; leave and present reset it", () => {
  const d = seed();
  assert.equal(streak(d, "student-2", "2026-10-14"), 4);
  delete d.registers[keyOf(d.activeYear, "2026-10-13")];
  assert.equal(streak(d, "student-2", "2026-10-14"), 1);
  getRegister(d, "2026-10-14").marks["student-2"] = "Present";
  assert.equal(streak(d, "student-2", "2026-10-14"), 0);
});
test("Sunday and holiday cannot receive submissions", () => {
  const d = seed();
  assert.equal(schoolDay(d, "2026-10-11"), false);
  assert.equal(schoolDay(d, "2026-10-02"), false);
  assert.throws(() => saveDraft(d, admin, "2026-10-11", {}, open), /Sundays/);
  assert.throws(() => saveDraft(d, admin, "2026-10-02", {}, open), /holidays/);
});
test("holiday conflict requires decision; preserves submitted register", () => {
  const d = seed();
  assert.throws(
    () => addHoliday(d, admin, "Test break", "2026-10-14", "2026-10-14", false),
    /submitted attendance/,
  );
  const p = stats(d);
  addHoliday(d, admin, "Test break", "2026-10-14", "2026-10-14", true);
  assert.ok(getRegister(d, "2026-10-14").submittedAt);
  assert.notDeepEqual(stats(d), p);
  removeHoliday(d, admin, d.holidays.at(-1)!.id);
  assert.deepEqual(stats(d), p);
});
test("student add/edit/provisional/withdraw preserves submitted roster", () => {
  const d = seed(),
    s = {
      ...structuredClone(d.students[0]),
      id: "new",
      name: "Test Fictional",
      admission: "",
      enrollments: [],
    };
  saveStudent(d, admin, s, 25, "UKG");
  assert.equal(roster(d).length, 25);
  s.name = "Edited Fictional";
  saveStudent(d, admin, s, 25, "UKG");
  assert.equal(d.students.at(-1)!.name, "Edited Fictional");
  const count = getRegister(d, "2026-10-14").roster.length;
  withdraw(d, admin, "student-1");
  assert.equal(getRegister(d, "2026-10-14").roster.length, count);
  assert.equal(roster(d).length, 24);
});
test("duplicate roll, admission and non-synthetic phone rejected", () => {
  const d = seed(),
    s = { ...structuredClone(d.students[0]), id: "new", admission: "DEMO-NEW" };
  assert.throws(() => saveStudent(d, admin, s, 1, "UKG"), /roll number/);
  s.admission = d.students[1].admission;
  assert.throws(() => saveStudent(d, admin, s, 25, "UKG"), /Admission/);
  s.admission = "NEW";
  s.phone = "9876543210";
  assert.throws(() => saveStudent(d, admin, s, 25, "UKG"), /fictional/);
});
test("promotion is per student and preserves identity/history; duplicate target roll rejected", () => {
  const d = seed();
  saveYear(d, admin, "Next fictional", "2027-07-01", "2028-06-30");
  const target = d.years[1].id;
  promote(d, admin, "student-1", target, "Class 1", 1);
  assert.equal(d.students[0].enrollments.length, 2);
  assert.equal(d.students[1].enrollments.length, 1);
  assert.throws(
    () => promote(d, admin, "student-2", target, "Class 1", 1),
    /Duplicate/,
  );
});
test("academic years reject overlap and active-year archive", () => {
  const d = seed();
  assert.throws(
    () => saveYear(d, admin, "Overlap", "2026-10-01", "2027-05-01"),
    /overlap/,
  );
  assert.throws(
    () => setYear(d, admin, d.activeYear, true),
    /Activate another/,
  );
});
test("year switching preserves prior records and resets statistics", () => {
  const d = seed();
  decideCorrection(d, admin, "correction-seed", false, "Reviewed for test");
  saveYear(d, admin, "Next", "2027-07-01", "2028-06-30");
  const previous = d.activeYear;
  setYear(d, admin, d.years[1].id);
  assert.equal(stats(d).percentage, null);
  assert.ok(stats(d, undefined, previous).Present > 0);
  assert.throws(() => saveDraft(d, admin, today, {}, open), /outside/);
});
test("disabled teacher cannot act; replacement cannot conflict with active assignment", () => {
  const d = seed(),
    t = { ...d.teachers[0], id: "replacement", username: "new_teacher" };
  assert.throws(() => saveTeacher(d, admin, t), /Disable/);
  saveTeacher(d, admin, { ...d.teachers[0], enabled: false });
  assert.throws(() => actorValid(d, teacher), /disabled/);
  saveTeacher(d, admin, t);
  assert.equal(d.teachers.length, 2);
});
test("existing teachers cannot be reassigned", () => {
  const d = seed();
  assert.throws(
    () => saveTeacher(d, admin, { ...d.teachers[0], className: "Class 1" }),
    /reassigned/,
  );
});
test("alerts deduplicate and retain history after correction", () => {
  const d = seed(),
    count = d.alerts.length;
  refreshAlerts(d, open);
  assert.equal(d.alerts.length, count);
  const a = d.alerts.find((a) => a.type === "Consecutive absence")!;
  assert.ok(a.active);
  decideCorrection(d, admin, "correction-seed", true, "");
  refreshAlerts(d, open);
  assert.equal(d.alerts.find((x) => x.id === a.id)!.active, false);
});
test("75 percent is not low-attendance; strictly below is", () => {
  const d = seed();
  d.registers = {};
  ["2026-10-10", "2026-10-12", "2026-10-13", "2026-10-14"].forEach(
    (date, i) =>
      (d.registers[keyOf(d.activeYear, date)] = {
        yearId: d.activeYear,
        className: "UKG",
        date,
        marks: { "student-1": i === 0 ? "Leave" : "Present" },
        roster: ["student-1"],
        submittedAt: date,
        version: 1,
      }),
  );
  refreshAlerts(d, open);
  assert.equal(
    d.alerts.find((a) => a.id === "low|year-demo|student-1")?.active,
    false,
  );
  d.registers[keyOf(d.activeYear, "2026-10-14")].marks["student-1"] = "Absent";
  refreshAlerts(d, open);
  assert.equal(
    d.alerts.find((a) => a.id === "low|year-demo|student-1")?.active,
    true,
  );
});
const options: ReportOptions = {
  kind: "Monthly attendance",
  yearId: "year-demo",
  start: "2026-10-01",
  end: "2026-10-31",
  className: "UKG",
};
test("report access denied for teacher and correct N/A for unsubmitted day", () => {
  const d = seed();
  assert.throws(() => reportRows(d, teacher, options), /Administrator/);
  assert.ok(
    reportRows(d, admin, { ...options, start: today, end: today }).every(
      (r) => r.percentage === null,
    ),
  );
});
test("PDF export creates real A4 PDF without guardian contacts", async () => {
  const d = seed();
  d.logo =
    "data:image/png;base64," +
    readFileSync("public/blossom-approved.png").toString("base64");
  const pdf = await makePDF(d, admin, options);
  const bytes = pdf.output();
  assert.ok(bytes.startsWith("%PDF-"));
  assert.ok(bytes.includes("Blossom Kindergarten School"));
  assert.ok(!bytes.includes("DEMO-0001"));
  assert.equal(Math.round(pdf.internal.pageSize.getWidth()), 210);
  assert.ok(pdf.getNumberOfPages() >= 1);
});
test("Excel export round trips as XLSX with correct statistics and no contacts", async () => {
  const d = seed(),
    wb = await makeWorkbook(d, admin, options),
    bytes = await wb.xlsx.writeBuffer();
  const { default: ExcelJS } = await import("exceljs");
  const round = new ExcelJS.Workbook();
  await round.xlsx.load(bytes);
  assert.equal(round.worksheets[0].getCell("B6").value, "Aarav Meadow");
  assert.equal(
    round.worksheets[0].getCell("C6").value,
    stats(d, "student-1", d.activeYear, options.start, options.end).Present,
  );
  assert.ok(
    !JSON.stringify(round.worksheets[0].getSheetValues()).includes("DEMO-0001"),
  );
});
test("invalid calendar dates cannot be used for attendance or holidays", () => {
  const d=seed();
  assert.throws(()=>saveDraft(d,admin,"2026-02-30",{},open),/valid attendance date/);
  assert.throws(()=>addHoliday(d,admin,"Invalid","2026-11-31","2026-11-31",false),/range/);
});
test("an ongoing absence episode does not create duplicate alerts each day", () => {
  const d=seed();
  const original=d.alerts.find(a=>a.type==="Consecutive absence")!.id;
  fill(d);saveDraft(d,teacher,today,{"student-2":"Absent"},open);
  submit(d,teacher,today,open,getRegister(d,today).version);
  refreshAlerts(d,closed);
  assert.equal(d.alerts.filter(a=>a.type==="Consecutive absence").length,1);
  assert.equal(d.alerts.find(a=>a.id===original)!.active,true);
});
test("withdrawn students are excluded from a draft, while official rosters remain",()=>{
  const d=seed();withdraw(d,admin,"student-1");
  assert.equal(getRegister(d,today).marks["student-1"],undefined);
  assert.ok(getRegister(d,"2026-10-14").roster.includes("student-1"));
});
test("alert PDF and workbook include all notification categories",async()=>{
  const d=seed();d.logo="data:image/png;base64,"+readFileSync("public/blossom-approved.png").toString("base64");
  const o={...options,kind:"Attendance alerts"};
  const pdf=await makePDF(d,admin,o);
  assert.ok(pdf.output().includes("Consecutive absence"));
  assert.ok(pdf.output().includes("Missing register"));
  const wb=await makeWorkbook(d,admin,o);
  assert.equal(wb.getWorksheet("Alert history")!.rowCount,5);
});
