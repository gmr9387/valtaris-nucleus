import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  component: LoginPage,
});

const credentials = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(72),
  fullName: z.string().min(1).max(120).optional(),
});

function LoginPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credentials.safeParse({
      email,
      password,
      fullName: mode === "signup" ? fullName : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your inbox to verify.");
        await logAudit({ module: "auth", entity_type: "user", action: "sign_up" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await logAudit({ module: "auth", entity_type: "user", action: "sign_in" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="relative z-10 w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="h-6 w-6 rounded-sm bg-primary" />
          <span className="font-semibold tracking-tight">ValtariOS Core</span>
        </Link>

        <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-2xl">
          <div className="mb-1 text-mono-xs text-muted-foreground">
            {mode === "signup" ? "CREATE_ACCOUNT" : "SIGN_IN"}
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Spin up an organization in seconds."
              : "Continue to the platform console."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <Field label="Full name">
                <input
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={120}
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
              />
            </Field>
            <Field label="Password">
              <input
                className="input"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={72}
              />
            </Field>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "..." : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
            <button
              className="text-foreground underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%; height: 38px; padding: 0 12px;
          background: var(--color-surface-2); color: var(--color-foreground);
          border: 1px solid var(--color-border); border-radius: 6px;
          font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s;
        }
        .input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-ring); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
