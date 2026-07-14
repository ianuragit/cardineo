"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Band } from "@/lib/clinical";

/* ---------------- Button ---------------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-teal-700 focus-visible:ring-accent",
  secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-slate-400",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300",
  outline:
    "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-slate-300",
  danger: "bg-danger text-white hover:bg-red-700 focus-visible:ring-danger",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

/* ---------------- Card ---------------- */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

export function CardHeader({
  title,
  icon,
  action,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3",
        className
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-slate-800">
        {icon}
        <span>{title}</span>
      </div>
      {action}
    </div>
  );
}

/* ---------------- Badge / Chip ---------------- */
const bandStyles: Record<Band, string> = {
  ok: "bg-green-50 text-green-700 border-green-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  muted: "bg-slate-50 text-slate-500 border-slate-200",
};

export function Badge({
  band = "muted",
  className,
  children,
}: {
  band?: Band;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        bandStyles[band],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Toggle chip (selectable) ---------------- */
export function ToggleChip({
  active,
  onClick,
  children,
  className,
  disabled,
}: {
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        active
          ? "border-accent bg-accent-soft text-teal-800 ring-1 ring-accent"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- Inputs ---------------- */
export const inputBase =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:bg-slate-50 disabled:text-slate-500";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputBase, className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(inputBase, "min-h-[80px]", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(inputBase, "appearance-none pr-8", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label?: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      {label && (
        <span className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </span>
      )}
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/* ---------------- Radio group (chips) ---------------- */
export function RadioChips({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <ToggleChip
          key={o.value}
          active={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </ToggleChip>
      ))}
    </div>
  );
}
