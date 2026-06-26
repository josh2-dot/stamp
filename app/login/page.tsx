"use client";

import { useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type State = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

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
