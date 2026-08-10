import Link from "next/link";
import {
  BarChart3,
  FileBarChart,
  Globe,
  LayoutDashboard,
  LogOut,
  Settings,
  Zap,
} from "lucide-react";
import { signOut } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "概览", icon: LayoutDashboard },
  { href: "/dashboard/websites", label: "网站", icon: Globe },
  { href: "/dashboard/events", label: "事件", icon: Zap },
  { href: "/dashboard/reports", label: "报告", icon: FileBarChart },
  { href: "/dashboard/settings", label: "设置", icon: Settings },
];

export function DashboardShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-[#101613] text-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <BarChart3 className="h-5 w-5 text-emerald-300" />
          <div>
            <p className="text-sm font-semibold">无尽分析</p>
            <p className="text-[10px] text-white/50">Infvar Analytics</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-semibold">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-full w-full object-cover" />
              ) : (
                (user.name ?? "U").slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user.name ?? "用户"}</p>
              <p className="truncate text-[10px] text-white/50">{user.email ?? ""}</p>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                title="退出登录"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">无尽分析</span>
          </div>
          <nav className="hidden gap-1 text-sm text-muted-foreground lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-9 w-9 items-center justify-center rounded-md border bg-card hover:bg-muted"
                title={item.label}
              >
                <item.icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
          <div className="hidden items-center gap-3 text-sm lg:flex">
            <span className="max-w-44 truncate text-muted-foreground">{user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs hover:bg-muted"
              >
                <LogOut className="h-3.5 w-3.5" />
                退出
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
