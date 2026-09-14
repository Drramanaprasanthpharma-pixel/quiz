"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin/dashboard";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(next);
      router.refresh();
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name || email } },
      });
      setLoading(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setInfo("Account created. Check your email to confirm, then log in.");
      setMode("login");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-dim px-6">
      <div className="w-full max-w-sm rounded-panel border border-ink/10 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-signal font-display font-bold text-white">
            B
          </span>
          <span className="font-display text-lg font-semibold">Buzzr</span>
        </div>

        <h1 className="font-display text-xl font-semibold text-ink">
          {mode === "login" ? "Host sign in" : "Create your host account"}
        </h1>
        <p className="mt-1 text-sm text-ink600">
          {mode === "login" ? "Manage quizzes and run live sessions." : "Takes about a minute."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === "signup" && (
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Jordan Lee"
              />
            </Field>
          )}
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@school.edu"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="At least 8 characters"
            />
          </Field>

          {error && <p className="text-sm text-coral">{error}</p>}
          {info && <p className="text-sm text-mint-dark">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-signal px-6 py-3 font-semibold text-white transition hover:bg-signal-light disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setInfo(null);
          }}
          className="mt-5 w-full text-center text-sm text-signal-dark hover:underline"
        >
          {mode === "login" ? "New host? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>

      <style jsx global>{`
        .input {
          border-radius: 0.75rem;
          border: 1px solid rgba(20, 20, 43, 0.12);
          padding: 0.65rem 0.9rem;
          font-size: 0.95rem;
          background: #faf9ff;
        }
        .input:focus {
          background: white;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink600">
      {label}
      {children}
    </label>
  );
}
