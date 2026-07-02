import Link from "next/link";
import {
  Banknote,
  BarChart3,
  CalendarDays,
  Home,
  LogOut,
  Menu,
  Plus,
  Receipt,
  Scissors,
  Search,
  Settings,
  Users
} from "lucide-react";
import { signOutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import type { CurrentWorkspace } from "@/types/domain";

const navItems = [
  { href: "/dashboard", label: "Главная", icon: Home },
  { href: "/summary", label: "Сводка", icon: BarChart3 },
  { href: "/orders", label: "Заказы", icon: Scissors },
  { href: "/clients", label: "Клиенты", icon: Users },
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/finance", label: "Финансы", icon: Banknote },
  { href: "/expenses", label: "Расходы", icon: Receipt },
  { href: "/settings", label: "Настройки", icon: Settings }
];

export function AppShell({ children, workspace }: { children: React.ReactNode; workspace: CurrentWorkspace }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-graphite/10 bg-white/55 px-4 py-5 lg:block">
        <Link href="/dashboard" className="mb-8 block px-2 text-xl font-semibold tracking-[0.16em] text-ink">
          SPIRIT.CLO
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-graphite hover:bg-graphite/5"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 border-b border-graphite/10 bg-milk/92 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 lg:px-7">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Открыть меню">
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/dashboard" className="text-sm font-semibold tracking-[0.18em] text-ink lg:hidden">
              SPIRIT.CLO
            </Link>
            <form action="/search" className="ml-auto hidden w-full max-w-xl items-center rounded-lg border border-graphite/10 bg-white/70 px-3 lg:flex">
              <Search className="h-4 w-4 text-graphite/55" />
              <input
                name="q"
                placeholder="Найти клиента, заказ, телефон или статус"
                className="h-10 w-full bg-transparent px-3 text-sm outline-none placeholder:text-graphite/45"
              />
            </form>
            <Link href="/orders/new" className="hidden md:block">
              <Button>
                <Plus className="h-4 w-4" />
                Новый заказ
              </Button>
            </Link>
            <div className="hidden min-w-0 text-right text-xs text-graphite/65 sm:block">
              <p className="truncate font-medium text-graphite">{workspace.organizationName}</p>
              <p>{workspace.role}</p>
            </div>
            <form action={signOutAction}>
              <Button variant="ghost" size="icon" type="submit" aria-label="Выйти">
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-7">{children}</main>
        <nav className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-graphite/10 bg-milk/95 px-2 py-2 backdrop-blur lg:hidden">
          {navItems.slice(0, 5).map((item) => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] text-graphite">
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
