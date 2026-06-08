"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Network,
  Tags,
  Upload,
  Settings,
  Brain,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/cards", label: "知识卡片", icon: BookOpen },
  { href: "/graph", label: "知识图谱", icon: Network },
  { href: "/tags", label: "标签审核", icon: Tags },
  { href: "/import", label: "文档导入", icon: Upload },
  { href: "/settings", label: "设置", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-zinc-950 border-r border-zinc-800 flex flex-col z-50">
      {/* Logo */}
      <div className="p-5 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2.5">
          <Brain className="w-7 h-7 text-indigo-400" />
          <span className="text-lg font-bold text-zinc-100">知识库</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${active
                  ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-600">Phase 2 · v0.2.0</div>
      </div>
    </aside>
  );
}
