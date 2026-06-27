"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type State = "idle" | "sending" | "sent" | "error" | "exchanging";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  // Implicit-flow fallback. If Supabase returns tokens via URL fragment
  // instead of a ?code query (happens for `type=signup` and some other
  // legacy email templates), the server callback redirects here with
  // ?error=missing_code while the browser still has the tokens in the hash.
  // We parse them, set the session client-side, and push to the next page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.hash) return;

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
          // Clear the hash so refreshing doesn't retry forever
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }
        const next = sp.get("next") ?? "/dashboard";
        // Clean the URL before navigating
        window.history.replaceState(null, "", window.location.pathname);
        router.replace(next);
      });
  }, [router, sp]);

  const handleSend = async () => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter the email you want to organize from.");
      return;
    }

    setState("sending");
    const supabase = createBrowserSupabase();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (err) {
      console.error(err);
      setError(err.message);
      setState("error");
      return;
    }

    setState("sent");
  };

  // Show the "exchanging" state while we process implicit-flow tokens
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

  return (
    <PageShell maxWidth="sm">
      {/* Decorative seal removed — login isn't a verification moment. The
          TopNav already carries the brand. The eyebrow + headline does the
          welcoming work without burning a stamp impression. */}
      <div className="text-center mb-10">
        <Eyebrow align="center">Organizer login</Eyebrow>
        <h1 className="font-display text-display-md text-stamp-white mt-2">
          Welcome back.
        </h1>
        <p className="text-stamp-muted-2 text-sm mt-3">
          Sign in with the email you registered your events under.
        </p>
      </div>

      {state === "sent" ? (
        <Card accent elevated className="text-center space-y-3">
          <h2 className="font-display text-display-sm text-stamp-green">
            Check your inbox.
          </h2>
          <p className="text-stamp-muted-2 text-sm">
            We sent a magic link to{" "}
            <span className="text-stamp-white">{email}</span>. Click it to sign in.
          </p>
          <p className="text-xs text-stamp-muted-2 pt-4 border-t border-stamp-border">
            No email after a minute? Check spam, or{" "}
            <button
              type="button"
              onClick={() => setState("idle")}
              className="text-stamp-orange hover:underline"
            >
              try a different address
            </button>
            .
          </p>
        </Card>
      ) : (
        <Card className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            error={state === "error" ? error ?? undefined : undefined}
          />
          {/* glow on the one primary action; spinner carries the loading signal
              alone (label stays semantic). */}
          <Button
            fullWidth
            size="lg"
            glow
            onClick={handleSend}
            loading={state === "sending"}
          >
            Send magic link
          </Button>
          <p className="text-xs text-stamp-muted-2 text-center pt-2">
            First time?{" "}
            <a href="https://wa.me/2348012345678" className="text-stamp-orange hover:underline">
              Message us
            </a>{" "}
            to get set up — takes 10 minutes.
          </p>
        </Card>
      )}

      <p className="text-center text-xs text-stamp-muted-2 mt-8">
        <Link href="/" className="hover:text-stamp-white">
          ← Back to home
        </Link>
      </p>
    </PageShell>
  );
}
