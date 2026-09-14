import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Cpu,
  Building2,
  FileStack,
  FolderKanban,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  PlugZap,
  ScrollText,
  Server,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  phase?: string;
};

const groups: { label: string; items: Item[] }[] = [
  {
    label: "PLATFORM",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { to: "/organizations", label: "Organizations", icon: Building2 },
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/environments", label: "Environments", icon: Server },
      { to: "/users", label: "Users & Roles", icon: Users },
      { to: "/audit", label: "Audit", icon: ScrollText },
    ],
  },
  {
    label: "OBSERVABILITY",
    items: [{ to: "/telemetry", label: "Telemetry", icon: Activity, phase: "P1" }],
  },
  {
    label: "INFRASTRUCTURE",
    items: [
      { to: "/secrets", label: "Secrets", icon: KeyRound, phase: "P2" },
      { to: "/connectors", label: "Connectors", icon: PlugZap, phase: "P2" },
      { to: "/workflows", label: "Workflows", icon: Workflow, phase: "P3" },
      { to: "/core", label: "Core", icon: Cpu, phase: "P1" },
    ],
  },
  {
    label: "KNOWLEDGE",
    items: [
      { to: "/evidence", label: "Evidence", icon: FileStack, phase: "P4" },
      { to: "/decisions", label: "Decisions", icon: GitBranch, phase: "P5" },
    ],
  },
  {
    label: "GOVERN",
    items: [{ to: "/governance", label: "Governance", icon: ShieldCheck, phase: "P6" }],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-[11px] font-black text-primary-foreground">
          V
        </div>

        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">ValtariOS Core</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Modular Monolith
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-2 pb-1.5 text-[10px] font-medium tracking-widest text-muted-foreground">
              {group.label}
            </div>

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.to ||
                  pathname.startsWith(`${item.to}/`) ||
                  pathname === `/_app${item.to}` ||
                  pathname.startsWith(`/_app${item.to}/`);

                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={
                        "group flex h-8 items-center justify-between rounded-md px-2 text-[13px] transition-colors " +
                        (active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")
                      }
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <item.icon className={`h-3.5 w-3.5 ${active ? "text-primary" : ""}`} />
                        <span className="truncate">{item.label}</span>
                      </span>

                      {item.phase && (
                        <span className="rounded border border-sidebar-border bg-sidebar/40 px-1.5 py-0.5 text-[9px] tracking-widest text-muted-foreground/80 group-hover:text-muted-foreground">
                          {item.phase}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-md border border-sidebar-border bg-sidebar/40 p-2">
          <div className="text-mono-xs text-muted-foreground">CORE STATUS</div>
          <div className="mt-1 text-xs text-sidebar-foreground">Phase 1 foundation active</div>
          <div className="mt-2 h-1.5 rounded-full bg-sidebar-accent">
            <div className="h-full w-[40%] rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </aside>
  );
}
