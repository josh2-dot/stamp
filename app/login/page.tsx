"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { cn } from "@/lib/cn";

type Mode = "signin" | "signup";
type State = "idle" | "submitting" | "email_sent" | "exchanging" | "error";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Map Supabase auth error messages to something a human can act on.
 * The raw strings are technical and inconsistent across error types.
 */
function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Wrong email or password.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "That email is already signed up. Switch to Sign in instead.";
  if (m.includes("email rate limit"))
    return "Too many emails sent in the last hour. Try password sign-in, or wait.";
  if (m.includes("password should be at least") || m.includes("password is too short"))
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (m.includes("email not confirmed"))
    return "Confirm your email first — check your inbox for the link we just sent.";
  if (m.includes("signup is disabled"))
    return "New signups are temporarily paused. Message support.";
  return message;
}

// Next.js 14 requires useSearchParams() to be wrapped in a Suspense boundary,
// otherwise it bails out of static prerendering with an error. We split the
// page so the outer default-exported component owns the boundary, and the
// inner component (which actually reads search params) renders inside it.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <PageShell maxWidth="sm">
      <div className="text-center">
        <Eyebrow align="center">Organizer access</Eyebrow>
        <h1 className="font-display text-display-md text-stamp-white mt-2">
          Loading…
        </h1>
      </div>
    </PageShell>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  // Tracks whether the email_sent state is from signup confirmation or
  // magic link, so the copy can be accurate.
  const [emailSentKind, setEmailSentKind] = useState<"magic" | "confirm">("magic");

  // Implicit-flow fallback. If Supabase returns tokens via URL fragment
  // (#access_token=…) instead of a ?code query — happens for some legacy
  // email templates and signup confirmation paths — the server callback
  // redirects here with ?error=missing_code while the browser still has
  // the tokens in the hash. We parse them, set the session client-side,
  // and push to the next page. Belt and suspenders.
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (!access_token || !refresh_token) return;

    setState("exchanging");
    const supabase = createBrowserSupabase();
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error: setErr }) => {
        if (setErr) {
          console.error("[login] implicit flow setSession failed", setErr);
          setError(setErr.message);
          setState("error");
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }
        const next = sp.get("next") ?? "/dashboard";
        window.history.replaceState(null, "", window.location.pathname);
        router.replace(next);
      });
  }, [router, sp]);

  const trimmedEmail = email.trim().toLowerCase();
  const validEmail = trimmedEmail.includes("@") && trimmedEmail.length > 3;

  const handleSignIn = async () => {
    setError(null);
    if (!validEmail) {
      setError("Enter a valid email.");
      setState("error");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      setState("error");
      return;
    }

    setState("submitting");
    const supabase = createBrowserSupabase();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (err) {
      setError(mapAuthError(err.message));
      setState("error");
      return;
    }

    const next = sp.get("next") ?? "/dashboard";
    router.replace(next);
    router.refresh();
  };

  const handleSignUp = async () => {
    setError(null);
    if (!validEmail) {
      setError("Enter a valid email.");
      setState("error");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      setState("error");
      return;
    }

    setState("submitting");
    const supabase = createBrowserSupabase();
    const { data, error: err } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (err) {
      setError(mapAuthError(err.message));
      setState("error");
      return;
    }

    // If "Confirm email" is OFF in Supabase, signUp returns a session
    // immediately and we go straight to the dashboard. The DB trigger
    // (migration 006) creates the organizer row.
    if (data.session) {
      const next = sp.get("next") ?? "/dashboard";
      router.replace(next);
      router.refresh();
      return;
    }

    // Confirm-email-on path: no session yet, user must click the link.
    setEmailSentKind("confirm");
    setState("email_sent");
  };

  const handleMagicLink = async () => {
    setError(null);
    if (!validEmail) {
      setError("Enter the email you want to use.");
      setState("error");
      return;
    }

    setState("submitting");
    const supabase = createBrowserSupabase();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (err) {
      setError(mapAuthError(err.message));
      setState("error");
      return;
    }

    setEmailSentKind("magic");
    setState("email_sent");
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setState("idle");
    setPassword("");
  };

  // Exchanging state from the implicit-flow handler
  if (state === "exchanging") {
    return (
      <PageShell maxWidth="sm">
        <div className="text-center">
          <Eyebrow align="center">Signing you in</Eyebrow>
          <h1 className="font-display text-display-md text-stamp-white mt-2">
            One moment.
          </h1>
          <p className="text-stamp-muted-2 text-sm mt-3">
            Completing your sign-in.
          </p>
        </div>
      </PageShell>
    );
  }

  // Post-send state, used for both magic link and signup confirmation
  if (state === "email_sent") {
    return (
      <PageShell maxWidth="sm">
        <div className="text-center mb-10">
          <Eyebrow align="center">Organizer access</Eyebrow>
          <h1 className="font-display text-display-md text-stamp-white mt-2">
            Check your inbox.
          </h1>
        </div>

        <Card accent elevated className="text-center space-y-3">
          <h2 className="font-display text-display-sm text-stamp-green">
            {emailSentKind === "confirm" ? "Confirm your email." : "Link sent."}
          </h2>
          <p className="text-stamp-muted-2 text-sm">
            We sent a {emailSentKind === "confirm" ? "confirmation" : "sign-in"} link to{" "}
            <span className="text-stamp-white">{email}</span>.
            {emailSentKind === "confirm"
              ? " Click it to activate your account."
              : " Click it to sign in."}
          </p>
          <p className="text-xs text-stamp-muted-2 pt-4 border-t border-stamp-border">
            No email after a minute? Check spam, or{" "}
            <button
              type="button"
              onClick={() => {
                setState("idle");
                setError(null);
              }}
              className="text-stamp-orange hover:underline"
            >
              try a different approach
            </button>
            .
          </p>
        </Card>

        <p className="text-center text-xs text-stamp-muted-2 mt-8">
          <Link href="/" className="hover:text-stamp-white">
            ← Back to home
          </Link>
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="sm">
      <div className="text-center mb-10">
        <Eyebrow align="center">Organizer access</Eyebrow>
        <h1 className="font-display text-display-md text-stamp-white mt-2">
          {mode === "signup" ? "Set up your account." : "Welcome back."}
        </h1>
        <p className="text-stamp-muted-2 text-sm mt-3">
          {mode === "signup"
            ? "Email and password. We handle the rest."
            : "Sign in with your email and password."}
        </p>
      </div>

      {/* Mode tabs — the eye picks the active state from the elevated surface */}
      <div
        role="tablist"
        aria-label="Authentication mode"
        className="flex gap-1 mb-4 p-1 bg-stamp-surface2 rounded-md border border-stamp-border"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          onClick={() => switchMode("signin")}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
            mode === "signin"
              ? "bg-stamp-surface text-stamp-white shadow-sm"
              : "text-stamp-muted-2 hover:text-stamp-white",
          )}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          onClick={() => switchMode("signup")}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
            mode === "signup"
              ? "bg-stamp-surface text-stamp-white shadow-sm"
              : "text-stamp-muted-2 hover:text-stamp-white",
          )}
        >
          Create account
        </button>
      </div>

      <Card className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? `At least ${MIN_PASSWORD_LENGTH} characters` : "Your password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              mode === "signup" ? handleSignUp() : handleSignIn();
            }
          }}
        />

        {state === "error" && error && (
          <div className="p-3 rounded-md bg-stamp-red/10 border border-stamp-red/30 text-stamp-red text-sm">
            {error}
          </div>
        )}

        {/* glow — single primary action on the page */}
        <Button
          fullWidth
          size="lg"
          glow
          onClick={mode === "signup" ? handleSignUp : handleSignIn}
          loading={state === "submitting"}
        >
          {mode === "signup" ? "Create account" : "Sign in"}
        </Button>

        {/* Tertiary affordances — magic link as fallback, "forgot password"
            routes through magic link too (no separate reset flow needed). */}
        <div className="pt-3 border-t border-stamp-border space-y-2 text-center text-xs text-stamp-muted-2">
          {mode === "signin" && (
            <p>
              Forgot your password?{" "}
              <button
                type="button"
                onClick={handleMagicLink}
                className="text-stamp-orange hover:underline"
                disabled={state === "submitting"}
              >
                Email me a sign-in link
              </button>
            </p>
          )}
          <p>
            {mode === "signup"
              ? "Prefer no password? "
              : "Or "}
            <button
              type="button"
              onClick={handleMagicLink}
              className="text-stamp-orange hover:underline"
              disabled={state === "submitting"}
            >
              {mode === "signup"
                ? "Sign up with a magic link"
                : "sign in with a magic link"}
            </button>
          </p>
        </div>
      </Card>

      <p className="text-xs text-stamp-muted-2 text-center mt-6">
        Trouble signing in?{" "}
        <a
          href="https://wa.me/2348012345678"
          className="text-stamp-orange hover:underline"
        >
          Message us
        </a>
      </p>

      <p className="text-center text-xs text-stamp-muted-2 mt-8">
        <Link href="/" className="hover:text-stamp-white">
          ← Back to home
        </Link>
      </p>
    </PageShell>
  );
}
