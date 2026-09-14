import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-sm bg-primary" />
          <span className="font-semibold tracking-tight">ValtariOS Core</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/login"
            search={{ mode: "signup" }}
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-24 pb-32 text-center">
        <p className="text-mono-xs text-muted-foreground">PLATFORM // v0.1</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight md:text-6xl">
          The shared platform layer
          <br />
          <span className="text-muted-foreground">for every ValtariOS product.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground">
          Identity, tenancy, audit, telemetry, secrets, connectors, workflows, evidence, decisions,
          governance. One modular monolith. Built for Claim Clarity, Weaver, Glue, Guardian and what
          comes next.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            to="/login"
            search={{ mode: "signup" }}
            className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Open the console
          </Link>
          <Link
            to="/login"
            className="inline-flex h-10 items-center rounded-md border border-border bg-surface-1 px-5 text-sm font-medium hover:bg-surface-2"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
          {[
            ["Identity", "RLS · Roles · Sessions"],
            ["Tenancy", "Orgs · Projects · Envs"],
            ["Audit", "Append-only · Explainable"],
            ["Governance", "Policies · Approvals"],
          ].map(([t, s]) => (
            <div key={t} className="bg-surface-1 p-5 text-left">
              <div className="text-mono-xs text-primary">{t.toUpperCase()}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
