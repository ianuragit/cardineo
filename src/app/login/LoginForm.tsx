"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HeartPulse, Stethoscope, ClipboardList, AlertTriangle } from "lucide-react";
import { Button, Input, Field } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function LoginForm({ clinicName }: { clinicName: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";
  const [role, setRole] = useState<"doctor" | "receptionist">("doctor");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        setLoading(false);
        return;
      }
      router.push(from.startsWith("/") ? from : "/");
      router.refresh();
    } catch {
      setError("Network error.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft">
            <HeartPulse className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{clinicName}</h1>
          <p className="text-sm text-slate-500">Clinic Portal</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-5">
          <div>
            <div className="mb-1.5 text-sm font-medium text-slate-700">I am the…</div>
            <div className="grid grid-cols-2 gap-2">
              <RoleButton
                active={role === "doctor"}
                onClick={() => setRole("doctor")}
                icon={<Stethoscope className="h-5 w-5" />}
                label="Doctor"
              />
              <RoleButton
                active={role === "receptionist"}
                onClick={() => setRole("receptionist")}
                icon={<ClipboardList className="h-5 w-5" />}
                label="Receptionist"
              />
            </div>
          </div>

          <Field label="Clinic password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Roles share one password. Receptionist has read-only clinical notes.
        </p>
      </div>
    </main>
  );
}

function RoleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
        active
          ? "border-accent bg-accent-soft text-teal-800 ring-1 ring-accent"
          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
