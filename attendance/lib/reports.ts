import {
  DB,
  Actor,
  adminOnly,
  enrollment,
  stats,
  schoolDay,
  dateLabel,
  istDate,
} from "./domain";
export interface ReportOptions {
  kind: string;
  yearId: string;
  start: string;
  end: string;
  studentId?: string;
  className: string;
}
export interface ReportRow {
  studentId: string;
  roll: number;
  name: string;
  present: number;
  absent: number;
  leave: number;
  percentage: number | null;
}
export function reportAlerts(db: DB, o: ReportOptions) {
  return db.alerts.filter((a) => {
    const seen = istDate(new Date(a.firstSeen));
    const inYear = a.id.includes(`|${o.yearId}|`) ||
      (a.type === "Correction request" && db.corrections.some(c =>
        `correction|${c.id}` === a.id && db.registers[c.registerKey]?.yearId === o.yearId));
    return inYear && o.className === "UKG" && seen >= o.start && seen <= o.end;
  });
}
export function reportRows(
  db: DB,
  actor: Actor,
  o: ReportOptions,
): ReportRow[] {
  adminOnly(db, actor);
  if (
    !db.years.some((y) => y.id === o.yearId) ||
    !o.start ||
    !o.end ||
    o.start > o.end
  )
    throw Error("Select a valid reporting period.");
  return db.students
    .filter((s) => {
      const e = enrollment(s, o.yearId);
      return (
        e?.className === o.className && (!o.studentId || s.id === o.studentId)
      );
    })
    .map((s) => {
      const e = enrollment(s, o.yearId)!,
        t = stats(db, s.id, o.yearId, o.start, o.end, o.className);
      return {
        studentId: s.id,
        roll: e.roll,
        name: s.name,
        present: t.Present,
        absent: t.Absent,
        leave: t.Leave,
        percentage: t.percentage,
      };
    })
    .filter(
      (r) =>
        o.kind !== "Attendance alerts" ||
        (r.percentage !== null && r.percentage < 75),
    )
    .sort((a, b) => a.roll - b.roll);
}
export async function makePDF(db: DB, actor: Actor, o: ReportOptions) {
  const rows = reportRows(db, actor, o);
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let logo = db.logo;
  if (logo && !logo.startsWith("data:")) {
    const response = await fetch(logo);
    if (!response.ok) throw Error("The approved logo could not be loaded.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    logo = "data:image/png;base64," + btoa(binary);
  }
  const year = db.years.find((y) => y.id === o.yearId)!;
  const generated = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
  const submitted = Object.values(db.registers).filter(
    (r) =>
      r.submittedAt &&
      r.yearId === o.yearId &&
      r.className === o.className &&
      r.date >= o.start &&
      r.date <= o.end &&
      schoolDay(db, r.date),
  ).length;
  pdf.setFillColor(48, 33, 109);
  pdf.rect(0, 0, 210, 3, "F");
  if (logo) {
    const props = pdf.getImageProperties(logo);
    const h = Math.min(19, (26 * props.height) / props.width),
      w = (h * props.width) / props.height;
    pdf.addImage(logo, 16, 12, w, h);
  } else {
    pdf.setFontSize(7);
    pdf.setTextColor(110);
    pdf.text("Approved logo pending", 16, 21);
  }
  pdf.setTextColor(48, 33, 109);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text("Blossom Kindergarten School", 52, 20);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(110);
  pdf.text("DEMONSTRATION ONLY - FICTIONAL RECORDS", 52, 27);
  pdf.setTextColor(35);
  pdf.setFontSize(16);
  pdf.text(`${o.kind} report`, 16, 44);
  pdf.setFontSize(9);
  pdf.text(
    `Class: ${o.className}    |    Academic year: ${year.name.replace("–", "-")}`,
    16,
    53,
  );
  pdf.text(`Period: ${dateLabel(o.start)} - ${dateLabel(o.end)}`, 16, 59);
  pdf.text(
    `${submitted} submitted school-day registers. Drafts and missing registers excluded.`,
    16,
    65,
  );
  autoTable(pdf, {
    startY: 72,
    head: [
      ["Roll", "Student name", "Present", "Absent", "Leave", "Attendance"],
    ],
    body: rows.map((r) => [
      r.roll,
      r.name,
      r.present,
      r.absent,
      r.leave,
      r.percentage === null ? "N/A" : `${r.percentage.toFixed(1)}%`,
    ]),
    theme: "grid",
    margin: { top: 40, left: 16, right: 16, bottom: 38 },
    styles: {
      fontSize: 9,
      cellPadding: 1.7,
      lineColor: [232, 229, 239],
      lineWidth: 0.15,
      textColor: [48, 45, 59],
    },
    headStyles: { fillColor: [48, 33, 109], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 248, 252] },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 64 },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "right" },
    },
  });
  if (o.kind === "Attendance alerts") {
    pdf.addPage();
    pdf.setTextColor(48, 33, 109);
    pdf.setFontSize(14);
    pdf.text("Attendance alert history", 16, 43);
    autoTable(pdf, {
      startY: 50,
      margin: { top: 40, left: 16, right: 16, bottom: 38 },
      head: [["Type", "Student / register", "Detail", "State"]],
      body: reportAlerts(db, o).map(a => [a.type, a.title, a.detail.replaceAll("→", "to").replaceAll("·", "-"), a.acknowledged ? "Acknowledged" : a.active ? "Open" : "Resolved"]),
      styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [48, 33, 109] },
      alternateRowStyles: { fillColor: [249, 248, 252] },
    });
  }
  const count = pdf.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    pdf.setPage(i);
    if (i > 1) {
      if (logo) {
        const props = pdf.getImageProperties(logo);
        pdf.addImage(logo, 16, 12, 18 * props.width / props.height, 18);
      }
      pdf.setTextColor(48, 33, 109);
      pdf.setFontSize(14);
      pdf.text("Blossom Kindergarten School", 46, 20);
      pdf.setFontSize(8);
      pdf.text(`${o.kind} - DEMO - continued`, 46, 27);
    }
    pdf.setFontSize(7.5);
    pdf.setTextColor(100);
    pdf.text("Present / (Present + Absent + Leave) x 100. Leave reduces attendance.",16,267);
    pdf.text(`Generated: ${generated} IST`,16,273);
    pdf.setFontSize(8);
    pdf.setTextColor(90);
    pdf.line(135, 279, 194, 279);
    pdf.text("Administrator / Principal signature", 135, 284);
    pdf.text(`Page ${i} of ${count}`, 16, 284);
  }
  return pdf;
}
export async function makeWorkbook(db: DB, actor: Actor, o: ReportOptions) {
  const rows = reportRows(db, actor, o);
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Blossom Kindergarten School · DEMO";
  wb.created = new Date();
  const sheet = wb.addWorksheet("Attendance", {
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    headerFooter: { oddFooter: "DEMO · Fictional records | Page &P of &N" },
  });
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "Blossom Kindergarten School";
  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value = `DEMO · ${o.kind} report · ${o.className}`;
  sheet.mergeCells("A3:F3");
  sheet.getCell("A3").value =
    `${db.years.find((y) => y.id === o.yearId)?.name} · ${o.start} to ${o.end}`;
  sheet.addRow([]);
  sheet.addRow([
    "Roll",
    "Student name",
    "Present",
    "Absent",
    "Leave",
    "Attendance %",
  ]);
  rows.forEach((r) =>
    sheet.addRow([
      r.roll,
      r.name,
      r.present,
      r.absent,
      r.leave,
      r.percentage === null ? "N/A" : r.percentage / 100,
    ]),
  );
  sheet.columns = [
    { width: 9 },
    { width: 29 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 17 },
  ];
  sheet.getColumn(6).numFmt = "0.0%";
  [1, 5].forEach((n) => {
    sheet.getRow(n).font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: n === 1 ? 16 : 11,
    };
    sheet.getRow(n).height = n === 1 ? 32 : 26;
    sheet.getRow(n).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF30216D" },
    };
  });
  sheet.eachRow((row, n) => {
    if (n > 5) {
      row.height = 23;
      if (n % 2 === 0)
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F3FA" },
        };
      row.alignment = { vertical: "middle" };
    }
  });
  sheet.autoFilter = { from: "A5", to: `F${5 + rows.length}` };
  sheet.views = [{ state: "frozen", ySplit: 5 }];
  sheet.addRow([]);
  sheet.addRow([
    "Formula: Present / (Present + Absent + Leave). N/A means no submitted attendance.",
  ]);
  sheet.addRow([
    `Generated ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
  ]);
  if (o.kind === "Attendance alerts") {
    const alerts = wb.addWorksheet("Alert history");
    alerts.addRow(["Type", "Title", "Detail", "Active", "Acknowledged"]);
    reportAlerts(db, o).forEach((a) =>
      alerts.addRow([
        a.type,
        a.title,
        a.detail,
        a.active ? "Yes" : "No",
        a.acknowledged ?? "No",
      ]),
    );
    alerts.columns = [
      { width: 24 },
      { width: 34 },
      { width: 60 },
      { width: 12 },
      { width: 28 },
    ];
  }
  return wb;
}
