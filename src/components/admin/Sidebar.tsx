"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ListVideo, PlusCircle, Radio, BarChart3, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/quizzes", label: "My Quizzes", icon: ListVideo },
  { href: "/admin/quizzes/new", label: "Create Quiz", icon: PlusCircle },
  { href: "/admin/sessions", label: "Live Sessions", icon: Radio },
  { href: "/admin/results", label: "Results", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-ink/10 bg-white px-4 py-6">
      <Link href="/admin/dashboard" className="mb-8 flex items-center gap-2 px-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-signal font-display font-bold text-white">
          B
        </span>
        <span className="font-display text-lg font-semibold">Buzzr</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-panel px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-signal/10 text-signal-dark" : "text-ink600 hover:bg-paper-dim"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-panel px-3 py-2.5 text-sm font-medium text-ink600 transition hover:bg-paper-dim"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </aside>
  );
}
