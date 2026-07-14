"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarClock,
  CalendarPlus,
  FileBarChart,
  Settings,
  HeartPulse,
  LogOut,
  Stethoscope,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/session";

const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/followups", label: "Follow-ups", icon: CalendarClock },
  { href: "/appointments", label: "Appointments", icon: CalendarPlus },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function PortalShell({
  role,
  clinicName,
  children,
}: {
  role: Role;
  clinicName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white md:flex no-print">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft">
            <HeartPulse className="h-5 w-5 text-accent" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-800">{clinicName}</div>
            <div className="text-xs text-slate-400">Clinic Portal</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => {
            const active = isActive(n.href, n.exact);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-teal-800"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 flex items-center gap-2 px-2 text-sm text-slate-600">
            {role === "doctor" ? (
              <Stethoscope className="h-4 w-4 text-accent" />
            ) : (
              <ClipboardList className="h-4 w-4 text-accent" />
            )}
            <span className="capitalize">{role}</span>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile / tablet bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white md:hidden no-print">
        {NAV.map((n) => {
          const active = isActive(n.href, n.exact);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
                active ? "text-accent" : "text-slate-500"
              )}
            >
              <Icon className="h-5 w-5" />
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <div className="md:pl-60">
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 md:pb-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
