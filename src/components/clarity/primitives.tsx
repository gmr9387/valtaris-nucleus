import type { ReactNode } from "react";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 py-3 border-b shrink-0">
      <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="text-[11.5px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string;
  body?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-8">
      {icon && <div className="text-muted-foreground mb-1">{icon}</div>}
      <p className="text-[13px] font-medium">{title}</p>
      {body && <p className="text-[11.5px] text-muted-foreground max-w-sm">{body}</p>}
    </div>
  );
}
