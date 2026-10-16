"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useId,
  isValidElement,
  cloneElement,
  ReactNode,
} from "react";
import { X, Check, Clock3, AlertCircle, ImageOff, Search } from "lucide-react";
import { Actor, DB, Mode, Student } from "@/lib/domain";
export type Mutation = (draft: DB) => void;
export interface AppContext {
  db: DB;
  actor: Actor;
  mode: Mode;
  now: Date;
  date: string;
  setDate: (d: string) => void;
  mutate: (fn: Mutation, message?: string) => Promise<boolean>;
  notice: (message: string, error?: boolean) => void;
  go: (page: string) => void;
  saveState: string;
}
export const Context = createContext<AppContext>(null!);
export const useApp = () => useContext(Context);
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function StatusBadge({ value }: { value: string }) {
  return (
    <Badge tone={value.toLowerCase().replaceAll(" ", "-")}>
      {value === "Present" || value === "Approved" ? (
        <Check size={12} />
      ) : value === "Pending" ? (
        <Clock3 size={12} />
      ) : null}
      {value}
    </Badge>
  );
}
export function Avatar({
  student,
  large = false,
}: {
  student: Student;
  large?: boolean;
}) {
  return (
    <div
      className={`avatar ${large ? "large" : ""}`}
      title={student.photo ? "Fictional student photograph" : "Photo Pending"}
    >
      {student.photo ? (
        <img src={student.photo} alt="Fictional student" />
      ) : large ? (
        <ImageOff size={28} />
      ) : (
        student.name
          .split(" ")
          .map((x) => x[0])
          .slice(0, 2)
          .join("")
      )}
    </div>
  );
}
export function Empty({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Check size={26} />
      </div>
      <h3>{title}</h3>
      <p>{detail}</p>
      {children}
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "wide" : ""}
      aria-labelledby="dialog-title"
      onCancel={onClose}
    >
      <div className="dialog-head">
        <div>
          <h2 id="dialog-title">{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button
          aria-label="Close dialog"
          className="icon-button"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Banner({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`banner ${tone}`}>
      <AlertCircle size={17} />
      <div>{children}</div>
    </div>
  );
}
export const fmt = (n: number | null) =>
  n === null ? "N/A" : `${n.toFixed(1)}%`;
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const input = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, {
        "aria-label": label,
        "aria-describedby": hint ? id : undefined,
      })
    : children;
  return (
    <label className="field">
      <span>{label}</span>
      {input}
      {hint && <small id={id}>{hint}</small>}
    </label>
  );
}
export function Confirm({
  title,
  description,
  onClose,
  onConfirm,
  confirm = "Confirm",
}: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  confirm?: string;
}) {
  return (
    <Modal title={title} description={description} onClose={onClose}>
      <div className="dialog-actions">
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="primary" onClick={onConfirm}>
          {confirm}
        </button>
      </div>
    </Modal>
  );
}
