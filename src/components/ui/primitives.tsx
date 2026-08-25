"use client";

import type { ReactNode } from "react";

type ButtonVariant = "primary" | "soft" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-strong shadow-soft disabled:bg-ink-3 disabled:shadow-none",
  soft: "bg-primary-soft text-primary-strong hover:bg-indigo-100",
  ghost: "bg-transparent text-ink-2 hover:bg-overlay hover:text-ink",
  danger: "bg-error-soft text-error hover:bg-red-100",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-btn font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  label,
  active = false,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-btn transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        active
          ? "bg-primary-soft text-primary-strong"
          : "text-ink-2 hover:bg-overlay hover:text-ink"
      } disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function DarkIconButton({
  children,
  label,
  active = false,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 ${
        active
          ? "bg-primary/20 text-indigo-300"
          : "text-slate-400 hover:bg-white/10 hover:text-slate-100"
      } disabled:cursor-not-allowed disabled:opacity-35 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SectionCard({
  title,
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-card p-4 shadow-soft">
      {title ? (
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-3">
            {title}
          </h3>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onBegin,
  onLiveChange,
  onEnd,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onBegin?: () => void;
  onLiveChange: (value: number) => void;
  onEnd?: () => void;
}) {
  return (
    <label className="block py-1.5">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-ink-2">
        <span>{label}</span>
        <span className="font-mono text-[11px] text-ink">
          {format ? format(value) : value}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={() => onBegin?.()}
        onChange={(e) => onLiveChange(Number(e.target.value))}
        onPointerUp={() => onEnd?.()}
        onKeyUp={() => onEnd?.()}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-overlay accent-primary [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
      />
    </label>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        checked ? "bg-primary" : "bg-line-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block py-1.5">
      <span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-btn border border-line bg-card px-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ModalShell({
  open,
  onClose,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm anim-fade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`anim-pop w-full ${maxWidth} rounded-modal border border-line bg-card p-6 shadow-pop`}
      >
        {children}
      </div>
    </div>
  );
}
