"use client";
import { useState } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  CalendarDays,
} from "lucide-react";
import { useApp, Badge, Banner, Field, fmt, Empty } from "./ui";
import { PageHeading } from "./management";
import {
  ReportOptions,
  makePDF,
  makeWorkbook,
  reportRows,
} from "@/lib/reports";
import { audit, CLASSES, enrollment } from "@/lib/domain";
import { Logo } from "./blossom-app";
export function Reports() {
  const { db, actor, mutate, notice } = useApp();
  const [kind, setKind] = useState("Monthly attendance"),
    [yearId, setYearId] = useState(db.activeYear),
    [start, setStart] = useState("2026-10-01"),
    [end, setEnd] = useState("2026-10-15"),
    [student, setStudent] = useState("student-1"),
    [cl, setCl] = useState("UKG"),
    [busy, setBusy] = useState("");
  const year = db.years.find((y) => y.id === yearId)!;
  const o: ReportOptions = {
    kind,
    yearId,
    start: kind === "Academic year" ? year.start : start,
    end:
      kind === "Academic year"
        ? year.end
        : kind === "Daily attendance"
          ? start
          : end,
    studentId: kind === "Individual student" ? student : undefined,
    className: cl,
  };
  let rows: ReturnType<typeof reportRows> = [],
    error = "";
  try {
    rows = reportRows(db, actor, o);
  } catch (e) {
    error = (e as Error).message;
  }
  async function download(format: "PDF" | "Excel") {
    setBusy(format);
    try {
      if (format === "PDF") {
        const pdf = await makePDF(db, actor, o);
        pdf.save(`Blossom-DEMO-${kind.replaceAll(" ", "-")}-${o.start}.pdf`);
      } else {
        const wb = await makeWorkbook(db, actor, o);
        const bytes = await wb.xlsx.writeBuffer();
        const blob = new Blob([new Uint8Array(bytes)], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = `Blossom-DEMO-${o.start}.xlsx`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
      await mutate(
        (d) =>
          audit(
            d,
            actor,
            "Report exported",
            `${format} · ${kind} · ${o.start}–${o.end}`,
          ),
        `${format} report generated.`,
      );
    } catch (e) {
      notice((e as Error).message, true);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="CLEAR RECORDS, CONFIDENT CONVERSATIONS"
        title="Reports & insights"
        detail="Professional reports from submitted attendance. Administrator access only."
      />
      <section className="panel report-filters">
        <div className="form-grid report-fields">
          <Field label="Report type">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {[
                "Daily attendance",
                "Monthly attendance",
                "Individual student",
                "Academic year",
                "Attendance alerts",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Academic year">
            <select value={yearId} onChange={(e) => setYearId(e.target.value)}>
              {db.years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Class">
            <select value={cl} onChange={(e) => setCl(e.target.value)}>
              {CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          {kind !== "Academic year" && (
            <Field
              label={kind === "Daily attendance" ? "Date" : "Period start"}
            >
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
          )}
          {kind !== "Academic year" && kind !== "Daily attendance" && (
            <Field label="Period end">
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
          )}
          {kind === "Individual student" && (
            <Field label="Student">
              <select
                value={student}
                onChange={(e) => setStudent(e.target.value)}
              >
                {db.students
                  .filter((s) => enrollment(s, yearId)?.className === cl)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
        </div>
        <div className="report-actions">
          <span>
            <ShieldNote /> Photographs and guardian phone numbers are excluded.
          </span>
          <div className="toolbar-group">
            <button
              className="secondary"
              disabled={!!busy || !!error}
              onClick={() => download("Excel")}
            >
              <FileSpreadsheet size={16} />
              {busy === "Excel" ? "Generating…" : "Export Excel"}
            </button>
            <button
              className="primary"
              disabled={!!busy || !!error}
              onClick={() => download("PDF")}
            >
              <Download size={16} />
              {busy === "PDF" ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>
      </section>
      {!db.logo && (
        <Banner tone="warning">
          Original approved logo is still required. Reports are labeled
          “Approved logo pending” until the exact asset is uploaded in Settings.
        </Banner>
      )}
      {error && <Banner tone="warning">{error}</Banner>}
      <section className="report-paper">
        <div className="report-paper-top">
          <div className="brand">
            <Logo db={db} />
            <div>
              <strong>Blossom Kindergarten School</strong>
              <span>DEMONSTRATION ONLY · FICTIONAL RECORDS</span>
            </div>
          </div>
          <Badge>A4 REPORT PREVIEW</Badge>
        </div>
        <div className="report-title">
          <h2>{kind} report</h2>
          <p>
            {cl} · {year.name} · {o.start} — {o.end}
          </p>
        </div>
        {kind === "Attendance alerts" && (
          <p className="report-explanation">
            Attendance below 75% in the selected period. Both exports also include
            the preserved alert history for this academic year and period.
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Roll</th>
                <th>Student name</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Leave</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.studentId}>
                  <td>{String(r.roll).padStart(2, "0")}</td>
                  <td>
                    <strong>{r.name}</strong>
                  </td>
                  <td>{r.present}</td>
                  <td>{r.absent}</td>
                  <td>{r.leave}</td>
                  <td>
                    <span
                      className={
                        r.percentage !== null && r.percentage < 75
                          ? "amber-text"
                          : ""
                      }
                    >
                      {fmt(r.percentage)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty
            title="No records for this selection"
            detail="Choose a class and period with enrolled students."
          />
        )}
        <div className="report-paper-bottom">
          <p>
            Present ÷ (Present + Absent + Leave) × 100
            <br />
            Drafts and missing registers excluded. N/A means no valid data.
          </p>
          <div>Administrator / Principal signature</div>
        </div>
      </section>
    </>
  );
}
function ShieldNote() {
  return <FileText size={15} />;
}
