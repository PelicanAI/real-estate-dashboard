"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Handshake,
  Search,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/deals", label: "Deal Pipeline", icon: Handshake },
  { href: "/searches", label: "Saved Searches", icon: Search },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-3">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/elevate-logo-circle.png"
              alt="Elevate Global"
              width={32}
              height={32}
              className="shrink-0"
            />
            <span className="text-heading text-xs tracking-[0.2em] text-sidebar-foreground">
              Elevate Global
            </span>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto">
            <Image
              src="/elevate-logo-circle.png"
              alt="Elevate Global"
              width={32}
              height={32}
            />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-xs font-light uppercase tracking-[0.15em] transition-colors",
                isActive
                  ? "border-l-2 border-taupe bg-white/[0.03] text-white"
                  : "border-l-2 border-transparent text-sidebar-foreground hover:bg-white/[0.03] hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-xs uppercase tracking-wider text-sidebar-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
        <form action="/api/auth/signout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start gap-3 text-xs uppercase tracking-wider text-sidebar-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </form>
      </div>
    </aside>
  );
}
