"use client";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  GraduationCap,
  MessageSquareText,
  Bell,
  ChartNoAxesCombined,
  CalendarRange,
  CalendarDays,
  History,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  CheckCheck,
  X,
  Flower2,
} from "lucide-react";
import {
  Actor,
  DB,
  STORE,
  Mode,
  clock,
  istDate,
  refreshAlerts,
  actorValid,
} from "@/lib/domain";
import { seed } from "@/lib/seed";
import { Context, Mutation, Banner } from "./ui";
import { Dashboard } from "./dashboard";
import { Attendance } from "./attendance";
import { Students } from "./students";
import {
  Corrections,
  Teachers,
  Alerts,
  Years,
  Holidays,
  AuditHistory,
  SettingsPage,
} from "./management";
import { Reports } from "./reports";
const nav = [
  ["Dashboard", LayoutDashboard],
  ["Attendance", ClipboardCheck],
  ["Students", Users],
  ["Teachers", GraduationCap],
  ["Correction Requests", MessageSquareText],
  ["Alerts", Bell],
  ["Reports", ChartNoAxesCombined],
  ["Academic Years", CalendarRange],
  ["Holidays", CalendarDays],
  ["Audit History", History],
  ["Settings", Settings],
] as const;
const teacherPages = [
  "Dashboard",
  "Attendance",
  "Students",
  "Correction Requests",
];
export async function hashPassword(password: string) {
  const data = new TextEncoder().encode("blossom-demo|" + password);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data)))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
function loadDB() {
  const text = localStorage.getItem(STORE);
  if (!text) return seed();
  const d = JSON.parse(text) as DB;
  if (d.schema !== 1 || !Array.isArray(d.students) || !d.registers)
    throw Error(
      "Saved demo data could not be read. Use reset to restore the synthetic sample.",
    );
  if (!d.logo) d.logo = "/blossom-approved.png";
  return d;
}
export default function BlossomApp() {
  const [db, setDB] = useState<DB | null>(null),
    [actor, setActor] = useState<Actor | null>(null),
    [page, setPage] = useState("Dashboard"),
    [mode, setMode] = useState<Mode>("normal"),
    [date, setDate] = useState("2026-10-15"),
    [toast, setToast] = useState<{ text: string; error: boolean } | null>(null),
    [saveState, setSaveState] = useState("Saved locally"),
    [mobile, setMobile] = useState(false),
    [fatal, setFatal] = useState(""),
    [ready, setReady] = useState(false),
    [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notice = (text: string, error = false) => {
    setToast({ text, error });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 6000);
  };
  useEffect(() => {
    try {
      const initial = loadDB();
      localStorage.setItem(STORE, JSON.stringify(initial));
      setDB(initial);
      const saved = sessionStorage.getItem("blossom-actor");
      if (saved) {
        const a = JSON.parse(saved);
        actorValid(initial, a);
        setActor(a);
      }
    } catch (e) {
      setFatal((e as Error).message);
    }
    setReady(true);
    const sync = (e: StorageEvent) => {
      if (e.key === STORE) {
        try {
          setDB(loadDB());
        } catch (err) {
          setFatal((err as Error).message);
        }
      }
    };
    window.addEventListener("storage", sync);
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => {
      window.removeEventListener("storage", sync);
      clearInterval(interval);
    };
  }, []);
  const now = clock(mode);
  void tick;
  async function mutate(fn: Mutation, message?: string) {
    setSaveState("Saving…");
    let ok = false;
    const run = async () => {
      try {
        const fresh = loadDB();
        if (actor) actorValid(fresh, actor);
        const draft = structuredClone(fresh);
        fn(draft);
        refreshAlerts(draft, clock(mode));
        draft.revision++;
        localStorage.setItem(STORE, JSON.stringify(draft));
        setDB(draft);
        setSaveState("Saved locally");
        if (message) notice(message);
        ok = true;
      } catch (e) {
        setSaveState("Save error");
        notice((e as Error).message, true);
      }
    };
    if (navigator.locks) await navigator.locks.request(STORE, run);
    else await run();
    return ok;
  }
  useEffect(() => {
    if (!db || !actor) return;
    try {
      actorValid(db, actor);
    } catch {
      setActor(null);
      sessionStorage.removeItem("blossom-actor");
      notice(
        "This teacher account was disabled. Sign in with an active account.",
        true,
      );
    }
  }, [db, actor]);
  const go = (p: string) => {
    if (actor?.role === "teacher" && !teacherPages.includes(p)) {
      notice("Administrator access required.", true);
      return;
    }
    setPage(p);
    setMobile(false);
    window.scrollTo(0, 0);
  };
  function login(a: Actor) {
    setActor(a);
    sessionStorage.setItem("blossom-actor", JSON.stringify(a));
    setPage("Dashboard");
  }
  if (!ready)
    return (
      <div className="loading-screen">
        <div className="skeleton" />
        <p>Preparing your school workspace…</p>
      </div>
    );
  if (fatal || !db)
    return (
      <main className="fatal">
        <h1>Demo storage needs attention</h1>
        <p>{fatal}</p>
        <p>Only fictional demo records will be reset.</p>
        <button
          className="primary"
          onClick={() => {
            try {
              const d = seed();
              localStorage.setItem(STORE, JSON.stringify(d));
              setDB(d);
              setFatal("");
            } catch {
              setFatal(
                "Browser storage is unavailable. Enable local storage to use the demo.",
              );
            }
          }}
        >
          Reset synthetic data
        </button>
      </main>
    );
  if (!actor)
    return (
      <>
        <Login db={db} onLogin={login} />
        {toast && (
          <div role="alert" className="toast error">
            {toast.text}
          </div>
        )}
      </>
    );
  const allowed =
    actor.role === "admin"
      ? nav
      : nav.filter(([p]) => teacherPages.includes(p));
  const pending = db.corrections.filter(
    (c) =>
      c.status === "Pending" &&
      (actor.role === "admin" || c.actor === actor.id),
  ).length;
  const year = db.years.find((y) => y.id === db.activeYear)!;
  return (
    <Context.Provider
      value={{
        db,
        actor,
        mode,
        now,
        date,
        setDate,
        mutate,
        notice,
        go,
        saveState,
      }}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="app-shell">
        <aside className={`sidebar ${mobile ? "open" : ""}`}>
          <div className="brand">
            <Logo db={db} />
            <div>
              <strong>Blossom</strong>
              <span>Kindergarten School</span>
            </div>
          </div>
          <div className="workspace-label">
            SCHOOL WORKSPACE <span>DEMO</span>
          </div>
          <nav aria-label="Main navigation">
            {allowed.map(([p, Icon]) => (
              <button
                key={p}
                aria-label={p}
                onClick={() => go(p)}
                className={page === p ? "active" : ""}
                aria-current={page === p ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{p}</span>
                {p === "Correction Requests" && pending > 0 && <b>{pending}</b>}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="year-label">
              <CalendarRange size={17} />
              <div>
                <strong>{year.name.replace(" · Fictional", "")}</strong>
                <span>Fictional academic year</span>
              </div>
            </div>
            <button
              className="user-block"
              onClick={() => {
                setActor(null);
                sessionStorage.removeItem("blossom-actor");
              }}
            >
              <div className="user-avatar">
                {actor.role === "admin" ? "AD" : "LW"}
              </div>
              <div>
                <strong>{actor.name}</strong>
                <span>
                  {actor.role === "admin"
                    ? "Administrator"
                    : `${actor.className} teacher`}
                </span>
              </div>
              <LogOut size={17} />
            </button>
          </div>
        </aside>
        {mobile && (
          <button
            className="scrim"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          />
        )}
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-toggle"
                aria-label="Open navigation"
                onClick={() => setMobile(true)}
              >
                <Menu />
              </button>
              <span>Workspace</span>
              <span className="slash">/</span>
              <strong>{page}</strong>
            </div>
            <div className="topbar-right">
              <span className="school-status">
                <i />
                School workspace
              </span>
              {actor.role === "admin" && (
                <button
                  className="icon-button notification"
                  aria-label="View alerts"
                  onClick={() => go("Alerts")}
                >
                  <Bell size={20} />
                  <i />
                </button>
              )}
              <span className="top-avatar">
                {actor.role === "admin" ? "AD" : "LW"}
              </span>
            </div>
          </header>
          <div className="demo-strip">
            <span>
              <i /> DEMO ENVIRONMENT{" "}
              <em>Fictional records only · simulated authentication</em>
            </span>
            <label>
              Demo Time Simulation{" "}
              <select
                aria-label="Demo Time Simulation"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as Mode);
                  setDate(istDate(clock(e.target.value as Mode)));
                }}
              >
                <option value="normal">15 Oct · 10:00 AM · Open</option>
                <option value="closed">15 Oct · 3:00 PM · Closed</option>
                <option value="actual">Actual device time · IST</option>
              </select>
            </label>
          </div>
          <main id="main" tabIndex={-1}>
            {page === "Dashboard" ? (
              <Dashboard />
            ) : page === "Attendance" ? (
              <Attendance />
            ) : page === "Students" ? (
              <Students />
            ) : page === "Correction Requests" ? (
              <Corrections />
            ) : actor.role === "admin" ? (
              page === "Teachers" ? (
                <Teachers />
              ) : page === "Alerts" ? (
                <Alerts />
              ) : page === "Reports" ? (
                <Reports />
              ) : page === "Academic Years" ? (
                <Years />
              ) : page === "Holidays" ? (
                <Holidays />
              ) : page === "Audit History" ? (
                <AuditHistory />
              ) : (
                <SettingsPage />
              )
            ) : null}
          </main>
          <footer className="app-footer">
            <span>
              Blossom Kindergarten School <span>·</span> Attendance workspace
            </span>
            <span>
              Local demo <i /> All records are fictional
            </span>
          </footer>
        </div>
      </div>
      {toast && (
        <div
          role={toast.error ? "alert" : "status"}
          className={`toast ${toast.error ? "error" : ""}`}
        >
          <CheckCheck size={18} />
          {toast.text}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function Logo({ db }: { db: DB }) {
  return db.logo ? (
    <img
      className="school-logo"
      src={db.logo}
      alt="Approved Blossom school logo"
    />
  ) : (
    <div
      className="logo-pending"
      title="Exact approved logo asset has not been supplied"
    >
      LOGO<span>PENDING</span>
    </div>
  );
}
function Login({ db, onLogin }: { db: DB; onLogin: (a: Actor) => void }) {
  const [username, setUsername] = useState("admin"),
    [password, setPassword] = useState("demo123"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const attempts = JSON.parse(
        sessionStorage.getItem("blossom-attempts") || '{"count":0,"until":0}',
      );
      if (attempts.until > Date.now())
        throw Error("Too many demo attempts. Try again in one minute.");
      const hash = await hashPassword(password);
      if (username === "admin" && password === "demo123") {
        onLogin({ id: "admin", role: "admin", name: "School Administrator" });
        return;
      }
      const teacher = db.teachers.find(
        (t) =>
          t.enabled &&
          t.username === username &&
          (t.passwordHash === "SEED"
            ? password === "demo123"
            : t.passwordHash === hash),
      );
      if (!teacher) {
        attempts.count++;
        if (attempts.count >= 5) {
          attempts.until = Date.now() + 60000;
          attempts.count = 0;
        }
        sessionStorage.setItem("blossom-attempts", JSON.stringify(attempts));
        throw Error(
          "The demo username or password is incorrect, or the account is disabled.",
        );
      }
      sessionStorage.removeItem("blossom-attempts");
      onLogin({
        id: teacher.id,
        role: "teacher",
        name: teacher.name,
        className: teacher.className,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <Logo db={db} />
          <div>
            <strong>Blossom</strong>
            <span>Kindergarten School</span>
          </div>
        </div>
        <div className="login-intro">
          <span className="eyebrow">A LITTLE CARE. EVERY DAY.</span>
          <h1>
            Every little presence.
            <br />
            <span>A brighter tomorrow.</span>
          </h1>
          <p>
            A thoughtful space for your school day.
            <br />
            Attendance, clarity, and care — all together.
          </p>
          <div className="login-preview">
            <div className="preview-heading">
              <span>
                <span className="tiny-dot" /> UKG classroom
              </span>
              <span>Thursday, 15 October</span>
            </div>
            <div className="preview-stat">
              <strong>24</strong>
              <span>
                little learners.
                <br />
                Every one matters.
              </span>
              <div className="preview-orbit">
                <BookOpen size={32} />
              </div>
            </div>
            <div className="preview-bars">
              {[72, 91, 83, 95, 87, 92, 85, 96, 90, 94, 86, 93].map((n, i) => (
                <i key={i} style={{ height: n + "%" }} />
              ))}
            </div>
            <div className="preview-foot">
              <span>Built around your classroom</span>
              <ShieldCheck size={17} />
            </div>
          </div>
        </div>
        <div className="login-bottom">
          Small beginnings. Meaningful connections.
        </div>
      </section>
      <section className="login-form-side">
        <div className="demo-pill">SYNTHETIC DEMONSTRATION</div>
        <div className="login-form">
          <span className="eyebrow">YOUR SCHOOL DAY STARTS HERE</span>
          <h2>Welcome back.</h2>
          <p>Sign in to your Blossom workspace.</p>
          <div className="role-picker">
            <button
              className={username === "admin" ? "selected" : ""}
              onClick={() => {
                setUsername("admin");
                setPassword("demo123");
              }}
            >
              <ShieldCheck size={20} />
              <strong>Administrator</strong>
              <span>School overview</span>
            </button>
            <button
              className={username === "ukg_teacher" ? "selected" : ""}
              onClick={() => {
                setUsername("ukg_teacher");
                setPassword("demo123");
              }}
            >
              <GraduationCap size={21} />
              <strong>UKG teacher</strong>
              <span>Your classroom</span>
            </button>
          </div>
          <form onSubmit={signIn}>
            <label className="field">
              <span>Username</span>
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="primary login-submit" disabled={busy}>
              {busy ? "Signing in…" : "Enter workspace"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="credential-note">
            <ShieldCheck size={18} />
            <p>
              <strong>A safe space to explore.</strong> Demo password:{" "}
              <code>demo123</code>. Accounts and access controls are simulated
              in this browser. Never enter real student data or real passwords.
            </p>
          </div>
          <p className="login-asset-note">
            Featuring the school’s original approved logo.
          </p>
        </div>
        <p className="login-footer">
          Blossom Kindergarten School · Attendance Management
        </p>
      </section>
    </div>
  );
}
