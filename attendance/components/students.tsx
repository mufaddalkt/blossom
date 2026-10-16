"use client";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Upload,
  Camera,
  ArrowRight,
  Pencil,
  UserRound,
  FileSpreadsheet,
  X,
} from "lucide-react";
import {
  Student,
  enrollment,
  roster,
  saveStudent,
  withdraw,
  promote,
  uid,
  stats,
  CLASSES,
  audit,
} from "@/lib/domain";
import {
  useApp,
  Avatar,
  StatusBadge,
  Badge,
  SearchBox,
  Modal,
  Field,
  Banner,
  Confirm,
  Empty,
  fmt,
} from "./ui";
export async function readImage(file: File): Promise<string> {
  if (file.size > 1024 * 1024)
    throw Error("Choose a PNG, JPEG or WebP image under 1 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png =
      bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71,
    jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    webp =
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!png && !jpg && !webp)
    throw Error("The file must be a genuine PNG, JPEG or WebP image.");
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(Error("Could not read image."));
    r.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      image.width * image.height > 16000000
        ? reject(Error("Image dimensions exceed 16 megapixels."))
        : resolve();
    image.onerror = () => reject(Error("Image could not be decoded."));
    image.src = data;
  });
  return data;
}
export function Students() {
  const { db, actor, mutate } = useApp();
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("Active"),
    [sort, setSort] = useState("roll"),
    [edit, setEdit] = useState<Student | null>(null),
    [view, setView] = useState<Student | null>(null),
    [withdrawal, setWithdrawal] = useState<Student | null>(null),
    [promotion, setPromotion] = useState<Student | null>(null),
    [importing, setImporting] = useState(false),
    [page, setPage] = useState(1);
  const list = db.students
    .filter((s) => {
      const e = enrollment(s, db.activeYear);
      return (
        e &&
        (actor.role === "admin" || e.className === actor.className) &&
        (filter === "All" ||
          (filter === "Incomplete"
            ? !s.admission || !s.photo
            : filter === e.status)) &&
        `${s.name} ${s.admission} ${s.guardian}`
          .toLowerCase()
          .includes(q.toLowerCase())
      );
    })
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : enrollment(a, db.activeYear)!.roll -
          enrollment(b, db.activeYear)!.roll,
    );
  const visible = list.slice((page - 1) * 12, page * 12);
  useEffect(() => setPage(1), [q, filter, sort]);
  function add() {
    setEdit({
      id: uid(),
      name: "",
      admission: "",
      guardian: "Fictional guardian",
      phone: "DEMO-0025",
      dob: "2021-01-01",
      gender: "Not specified",
      enrollments: [],
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EVERY CHILD, KNOWN BY NAME</div>
          <h1>Student directory</h1>
          <p>
            {roster(db).length} active little learners · All profiles are
            fictional.
          </p>
        </div>
        {actor.role === "admin" && (
          <div className="heading-actions">
            <button className="secondary" onClick={() => setImporting(true)}>
              <Upload size={16} />
              Sample import
            </button>
            <button className="primary" onClick={add}>
              <Plus size={18} />
              Add student
            </button>
          </div>
        )}
      </div>
      <section className="panel">
        <div className="table-tools">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Search students or admission numbers…"
          />
          <div className="toolbar-group">
            <select
              aria-label="Filter students"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["Active", "Withdrawn", "Incomplete", "All"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select
              aria-label="Sort students"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="roll">Roll number</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Roll no.</th>
                <th>Student</th>
                <th>Class</th>
                <th>Guardian contact</th>
                <th>Enrollment</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => {
                const e = enrollment(s, db.activeYear)!;
                return (
                  <tr key={s.id}>
                    <td className="roll">{String(e.roll).padStart(2, "0")}</td>
                    <td>
                      <div className="student-cell">
                        <Avatar student={s} />
                        <div>
                          <button
                            className="name-button"
                            onClick={() => setView(s)}
                          >
                            {s.name}
                          </button>
                          <small>
                            {s.admission || "Provisional admission"} ·{" "}
                            {s.photo ? "Demo photo" : "Photo Pending"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="class-tag">{e.className}</span>
                    </td>
                    <td>
                      <strong className="small-strong">
                        {s.guardian || "Not provided"}
                      </strong>
                      <small className="cell-sub">
                        {s.phone || "Not provided"}
                      </small>
                    </td>
                    <td>
                      <StatusBadge value={e.status} />
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`View ${s.name}`}
                        onClick={() => setView(s)}
                      >
                        <ArrowRight size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <Empty
            title="No matching students"
            detail="Change the search or enrollment filter."
          />
        )}
        <div className="pagination">
          <span>
            Showing {list.length ? (page - 1) * 12 + 1 : 0}–
            {Math.min(page * 12, list.length)} of {list.length} students
          </span>
          <div>
            <button
              className="secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil(list.length / 12))}
            </span>
            <button
              className="secondary"
              disabled={page * 12 >= list.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
      {view && (
        <Modal title="Student profile" onClose={() => setView(null)}>
          <div className="profile-heading">
            <Avatar student={view} large />
            <div>
              <h2>{view.name}</h2>
              <p>
                {view.admission || "Provisional admission"} ·{" "}
                {enrollment(view, db.activeYear)?.className}
              </p>
              <Badge>{view.photo ? "Synthetic photo" : "Photo Pending"}</Badge>
            </div>
          </div>
          <div className="profile-details">
            {[
              ["Guardian", view.guardian],
              ["Fictional phone", view.phone],
              ["Date of birth", view.dob],
              ["Gender", view.gender],
              ["Attendance", fmt(stats(db, view.id).percentage)],
              ["Enrollment", enrollment(view, db.activeYear)?.status ?? "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v || "Not provided"}</strong>
              </div>
            ))}
          </div>
          <h3 className="section-label">Enrollment history</h3>
          {view.enrollments.map((e) => (
            <p className="history-line" key={e.yearId}>
              {db.years.find((y) => y.id === e.yearId)?.name} · {e.className} ·
              Roll {e.roll} · {e.status}
            </p>
          ))}
          {actor.role === "admin" && (
            <div className="dialog-actions wrap">
              <button
                className="danger-quiet"
                disabled={
                  enrollment(view, db.activeYear)?.status === "Withdrawn"
                }
                onClick={() => {
                  setWithdrawal(view);
                  setView(null);
                }}
              >
                Withdraw
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setPromotion(view);
                  setView(null);
                }}
              >
                Promote / repeat
              </button>
              <button
                className="primary"
                onClick={() => {
                  setEdit(structuredClone(view));
                  setView(null);
                }}
              >
                <Pencil size={15} />
                Edit profile
              </button>
            </div>
          )}
        </Modal>
      )}
      {edit && <StudentEditor student={edit} onClose={() => setEdit(null)} />}
      {withdrawal && (
        <Confirm
          title={`Withdraw ${withdrawal.name}?`}
          description="The student will leave the active roster. Submitted attendance and historical enrollments remain unchanged."
          confirm="Confirm withdrawal"
          onClose={() => setWithdrawal(null)}
          onConfirm={async () => {
            if (
              await mutate(
                (d) => withdraw(d, actor, withdrawal.id),
                "Student withdrawn. Historical records preserved.",
              )
            )
              setWithdrawal(null);
          }}
        />
      )}
      {promotion && (
        <Promotion student={promotion} onClose={() => setPromotion(null)} />
      )}
      {importing && <SampleImport onClose={() => setImporting(false)} />}
    </>
  );
}
function StudentEditor({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const { db, actor, mutate, notice } = useApp();
  const [s, setS] = useState(student),
    [roll, setRoll] = useState(
      enrollment(student, db.activeYear)?.roll ??
        Math.max(
          0,
          ...roster(db).map((s) => enrollment(s, db.activeYear)!.roll),
        ) + 1,
    ),
    [cl, setCl] = useState(
      enrollment(student, db.activeYear)?.className ?? "UKG",
    ),
    [camera, setCamera] = useState(false);
  const update = (key: keyof Student, value: string) =>
    setS({ ...s, [key]: value });
  async function photo(file?: File) {
    if (!file) return;
    try {
      update("photo", await readImage(file));
    } catch (e) {
      notice((e as Error).message, true);
    }
  }
  return (
    <Modal
      title={
        student.enrollments.length
          ? "Edit student profile"
          : "Add a fictional student"
      }
      description="Use fictional details only. Missing photos and admission numbers are allowed."
      onClose={onClose}
      wide
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await mutate(
              (d) => saveStudent(d, actor, s, roll, cl),
              "Student profile saved.",
            )
          )
            onClose();
        }}
      >
        <div className="photo-editor">
          <Avatar student={s} large />
          <div>
            <strong>
              {s.photo ? "Fictional photograph added" : "Photo Pending"}
            </strong>
            <p>PNG, JPEG or WebP · Maximum 1 MB</p>
            <div className="toolbar-group">
              <label className="secondary file-button">
                <Upload size={15} />
                Upload photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => photo(e.target.files?.[0])}
                />
              </label>
              <button
                type="button"
                className="secondary"
                onClick={() => setCamera(true)}
              >
                <Camera size={15} />
                Camera
              </button>
              {s.photo && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => update("photo", "")}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Full name">
            <input
              required
              maxLength={80}
              value={s.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>
          <Field
            label="Admission number"
            hint="Optional — leave blank for a provisional record."
          >
            <input
              value={s.admission}
              maxLength={40}
              onChange={(e) => update("admission", e.target.value)}
            />
          </Field>
          <Field label="Roll number">
            <input
              required
              type="number"
              min="1"
              value={roll}
              onChange={(e) => setRoll(Number(e.target.value))}
            />
          </Field>
          <Field label="Class">
            <select value={cl} onChange={(e) => setCl(e.target.value)}>
              {CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Fictional guardian name">
            <input
              value={s.guardian}
              maxLength={80}
              onChange={(e) => update("guardian", e.target.value)}
            />
          </Field>
          <Field
            label="Fictional guardian phone"
            hint="Use DEMO- followed by four digits."
          >
            <input
              pattern="DEMO-[0-9]{4}"
              value={s.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>
          <Field label="Date of birth">
            <input
              type="date"
              value={s.dob}
              onChange={(e) => update("dob", e.target.value)}
            />
          </Field>
          <Field label="Gender">
            <select
              value={s.gender}
              onChange={(e) => update("gender", e.target.value)}
            >
              {["Not specified", "Female", "Male", "Other"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary">Save student</button>
        </div>
      </form>
      {camera && (
        <CameraCapture
          onClose={() => setCamera(false)}
          onCapture={(data) => {
            update("photo", data);
            setCamera(false);
          }}
        />
      )}
    </Modal>
  );
}
function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (s: string) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null);
  const [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      .then((s) => {
        if (!alive) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() =>
        setError(
          "Camera access is unavailable or was denied. Use photo upload instead.",
        ),
      );
    if (!navigator.mediaDevices)
      setError(
        "Camera is unavailable in this browser. Use photo upload instead.",
      );
    return () => {
      alive = false;
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  return (
    <div className="camera-box">
      <h3>Camera preview</h3>
      <p>Capture only a fictional image or neutral demonstration object.</p>
      {error ? (
        <Banner tone="warning">{error}</Banner>
      ) : (
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          onLoadedData={() => setReady(true)}
        />
      )}
      <div className="dialog-actions">
        <button className="secondary" onClick={onClose}>
          Close camera
        </button>
        <button
          className="primary"
          disabled={!ready}
          onClick={() => {
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 480;
            canvas.getContext("2d")!.drawImage(video.current!, 0, 0, 640, 480);
            onCapture(canvas.toDataURL("image/jpeg", 0.75));
          }}
        >
          Capture photo
        </button>
      </div>
    </div>
  );
}
function Promotion({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const { db, actor, mutate } = useApp();
  const [year, setYear] = useState(
      db.years.find((y) => y.id !== db.activeYear && !y.archived)?.id ?? "",
    ),
    [cl, setCl] = useState("Class 1"),
    [roll, setRoll] = useState(1),
    [review, setReview] = useState(false);
  return (
    <Modal
      title="Plan the next school year"
      description={`Manual enrollment for ${student.name}. Identity and history are preserved.`}
      onClose={onClose}
    >
      <Field label="Target academic year">
        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            setReview(false);
          }}
        >
          <option value="">Choose a configured year</option>
          {db.years
            .filter((y) => y.id !== db.activeYear && !y.archived)
            .map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Promote or repeat class">
        <select
          value={cl}
          onChange={(e) => {
            setCl(e.target.value);
            setReview(false);
          }}
        >
          {CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="New roll number">
        <input
          type="number"
          min="1"
          value={roll}
          onChange={(e) => {
            setRoll(+e.target.value);
            setReview(false);
          }}
        />
      </Field>
      {!year && (
        <Banner>
          Configure the next academic year in Academic Years first.
        </Banner>
      )}
      {review && (
        <Banner>
          Preview: {student.name} → {cl}, roll {roll} in{" "}
          {db.years.find((y) => y.id === year)?.name}. This creates one
          enrollment; no other students are changed.
        </Banner>
      )}
      <div className="dialog-actions">
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={!year}
          onClick={async () => {
            if (!review) {
              setReview(true);
              return;
            }
            if (
              await mutate(
                (d) => promote(d, actor, student.id, year, cl, roll),
                "New enrollment saved. Historical identity preserved.",
              )
            )
              onClose();
          }}
        >
          {review ? "Confirm enrollment" : "Preview change"}
        </button>
      </div>
    </Modal>
  );
}
const sample = [
  {
    name: "Elio Sunbeam",
    admission: "DEMO-SAMPLE-025",
    roll: 25,
    guardian: "Fictional sample guardian 25",
    phone: "DEMO-0025",
  },
  {
    name: "Luna Orchard",
    admission: "DEMO-SAMPLE-026",
    roll: 26,
    guardian: "Fictional sample guardian 26",
    phone: "DEMO-0026",
  },
];
function SampleImport({ onClose }: { onClose: () => void }) {
  const { db, actor, mutate } = useApp();
  const [step, setStep] = useState(0),
    [nameColumn, setNameColumn] = useState("name"),
    [admissionColumn, setAdmissionColumn] = useState("admission"),
    [done, setDone] = useState(false);
  const duplicate = sample.filter((x) =>
    db.students.some(
      (s) =>
        s.admission === x.admission ||
        s.enrollments.some(
          (e) =>
            e.yearId === db.activeYear &&
            e.className === "UKG" &&
            e.roll === x.roll &&
            e.status === "Active",
        ),
    ),
  ).length;
  return (
    <Modal
      title="Synthetic sample import"
      description="Real file uploads are disabled. Only the bundled fictional sample can be imported."
      onClose={onClose}
      wide
    >
      <div className="steps">
        {["Select sample", "Map columns", "Preview & confirm"].map((x, i) => (
          <span className={i === step ? "active" : ""} key={x}>
            {i + 1}. {x}
          </span>
        ))}
      </div>
      {done ? (
        <Empty
          title="Import complete"
          detail="2 synthetic student profiles added. Both have Photo Pending."
        />
      ) : step === 0 ? (
        <div className="sample-picker">
          <FileSpreadsheet size={36} />
          <h3>blossom-synthetic-sample.csv</h3>
          <p>
            2 fictional students · fixed bundled dataset · no external file
            access
          </p>
          <Badge tone="purple">Safe demonstration sample</Badge>
          <p>
            <a href="/blossom-synthetic-sample.csv" download>
              Download the bundled sample CSV
            </a>
          </p>
        </div>
      ) : step === 1 ? (
        <div className="form-grid">
          <Field label="Full name column">
            <select
              value={nameColumn}
              onChange={(e) => setNameColumn(e.target.value)}
            >
              <option>name</option>
              <option>admission</option>
            </select>
          </Field>
          <Field label="Admission number column">
            <select
              value={admissionColumn}
              onChange={(e) => setAdmissionColumn(e.target.value)}
            >
              <option>admission</option>
              <option>name</option>
            </select>
          </Field>
          <p>
            Roll, guardian and fictional phone columns use their matching
            fields. All rows are assigned to UKG.
          </p>
        </div>
      ) : (
        <>
          <Banner tone={duplicate ? "warning" : "info"}>
            {duplicate
              ? `${duplicate} duplicate admission or roll numbers detected. Import is blocked.`
              : "Validation passed: 2 names, 2 unique admissions, 2 unique roll numbers. Warning: both photographs are missing."}
          </Banner>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Admission</th>
                  <th>Roll</th>
                </tr>
              </thead>
              <tbody>
                {sample.map((x) => (
                  <tr key={x.admission}>
                    <td>{x.name}</td>
                    <td>{x.admission}</td>
                    <td>{x.roll}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="dialog-actions">
        <button className="secondary" onClick={onClose}>
          {done ? "Close" : "Cancel"}
        </button>
        {!done && step > 0 && (
          <button className="secondary" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        )}
        {!done && (
          <button
            className="primary"
            disabled={
              (step === 1 &&
                (nameColumn !== "name" || admissionColumn !== "admission")) ||
              (step === 2 && duplicate > 0)
            }
            onClick={async () => {
              if (step < 2) {
                setStep((s) => s + 1);
                return;
              }
              if (
                await mutate((d) => {
                  sample.forEach((x) =>
                    saveStudent(
                      d,
                      actor,
                      {
                        id: uid(),
                        name: x.name,
                        admission: x.admission,
                        guardian: x.guardian,
                        phone: x.phone,
                        dob: "2021-05-10",
                        gender: "Not specified",
                        enrollments: [],
                      },
                      x.roll,
                      "UKG",
                    ),
                  );
                  audit(
                    d,
                    actor,
                    "Synthetic sample imported",
                    "2 bundled fictional records",
                  );
                }, "2 fictional records imported.")
              )
                setDone(true);
            }}
          >
            {step === 2 ? "Confirm import of 2 sample records" : "Continue"}
          </button>
        )}
      </div>
    </Modal>
  );
}
