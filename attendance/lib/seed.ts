import { DB, dates, keyOf, refreshAlerts, schoolDay, Status } from "./domain";
export function seed(): DB {
  const names = [
    "Aarav Meadow",
    "Anaya Wren",
    "Vihaan Brook",
    "Mira Clover",
    "Reyansh Vale",
    "Ira Maple",
    "Arjun Finch",
    "Diya Bloom",
    "Kabir Moss",
    "Tara Willow",
    "Ishaan Reed",
    "Myra Fern",
    "Dev Rowan",
    "Sia Marigold",
    "Rohan Birch",
    "Aanya Dove",
    "Neil Aspen",
    "Zoya Petal",
    "Ayaan Pine",
    "Kiara Lake",
    "Vivaan Sage",
    "Avni Rosewood",
    "Rishi Glen",
    "Nila Spring",
  ];
  const db: DB = {
    schema: 1,
    revision: 0,
    activeYear: "year-demo",
    logo: "/blossom-approved.png",
    years: [
      {
        id: "year-demo",
        name: "2026–27 · Fictional",
        start: "2026-09-01",
        end: "2027-06-30",
        archived: false,
      },
    ],
    students: names.map((name, i) => ({
      id: `student-${i + 1}`,
      name,
      admission: i === 23 ? "" : `DEMO-BKS-${String(i + 1).padStart(3, "0")}`,
      guardian: `Fictional guardian ${String(i + 1).padStart(2, "0")}`,
      phone: `DEMO-${String(i + 1).padStart(4, "0")}`,
      dob: `2021-${String((i % 9) + 1).padStart(2, "0")}-${String((i % 20) + 1).padStart(2, "0")}`,
      gender: "Not specified",
      enrollments: [
        {
          yearId: "year-demo",
          className: "UKG",
          roll: i + 1,
          status: "Active",
        },
      ],
    })),
    teachers: [
      {
        id: "teacher-ukg",
        name: "Ms. Leela Woods",
        username: "ukg_teacher",
        className: "UKG",
        enabled: true,
        passwordHash: "SEED",
      },
    ],
    holidays: [
      {
        id: "holiday-seed",
        name: "Fictional school holiday",
        start: "2026-10-02",
        end: "2026-10-02",
      },
    ],
    registers: {},
    corrections: [],
    audit: [],
    alerts: [],
  };
  dates("2026-09-01", "2026-10-14")
    .filter((d) => schoolDay(db, d))
    .forEach((date, day) => {
      if (date === "2026-10-07") return;
      const marks: Record<string, Status> = {};
      db.students.forEach((s, i) => {
        marks[s.id] =
          i === 0 && day % 3 !== 0
            ? "Absent"
            : i === 1 && date >= "2026-10-10"
              ? "Absent"
              : (i + day) % 19 === 0
                ? "Leave"
                : (i * 3 + day) % 23 === 0
                  ? "Absent"
                  : "Present";
      });
      db.registers[keyOf(db.activeYear, date)] = {
        yearId: db.activeYear,
        className: "UKG",
        date,
        marks,
        roster: db.students.map((s) => s.id),
        version: 1,
        submittedAt: `${date}T04:45:00Z`,
        submittedBy: "Ms. Leela Woods",
      };
    });
  db.registers[keyOf(db.activeYear, "2026-10-07")] = {
    yearId: db.activeYear,
    className: "UKG",
    date: "2026-10-07",
    marks: { "student-1": "Present", "student-2": "Leave" },
    roster: db.students.map((s) => s.id),
    version: 1,
  };
  db.registers[keyOf(db.activeYear, "2026-10-15")] = {
    yearId: db.activeYear,
    className: "UKG",
    date: "2026-10-15",
    marks: Object.fromEntries(
      db.students
        .slice(0, 18)
        .map((s, i) => [
          s.id,
          i === 4 ? "Leave" : i === 1 ? "Absent" : "Present",
        ]),
    ),
    roster: db.students.map((s) => s.id),
    version: 1,
  };
  const r = db.registers[keyOf(db.activeYear, "2026-10-14")];
  db.corrections = [
    {
      id: "correction-seed",
      registerKey: keyOf(db.activeYear, "2026-10-14"),
      studentId: "student-2",
      original: r.marks["student-2"],
      requested: "Leave",
      reason: "Fictional guardian confirmed an approved family leave.",
      actor: "teacher-ukg",
      status: "Pending",
      created: "2026-10-15T03:35:00Z",
    },
  ];
  db.audit = [
    {
      id: "audit-seed",
      actor: "Ms. Leela Woods",
      action: "Attendance submitted",
      detail: "UKG · 2026-10-14",
      at: "2026-10-14T04:45:00Z",
    },
    {
      id: "audit-init",
      actor: "Demo setup",
      action: "Synthetic environment created",
      detail: "24 fictional students · no imported records",
      at: "2026-10-15T03:00:00Z",
    },
  ];
  refreshAlerts(db, new Date("2026-10-15T10:00:00+05:30"));
  return db;
}
