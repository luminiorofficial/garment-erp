"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandMark } from "@/components/layout/brand";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/form-field";
import { errorMessage } from "@/lib/api";
import { login } from "@/features/auth/api";
import { useAuth } from "@/providers/auth-provider";

function LoginForm() {
  const { refreshUser } = useAuth();
  const expired = useSearchParams().get("reason") === "expired";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      // GuestGate redirects once /me reports the new session.
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err, "Sign in failed"));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {expired && !error && (
        <Alert>
          <AlertDescription>Your session has expired. Please sign in again.</AlertDescription>
        </Alert>
      )}

      <FormField label="Email" required>
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </FormField>

      <FormField label="Password" required>
        {(control) => (
          <Input
            {...control}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </FormField>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting || !email || !password}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(38rem_28rem_at_15%_10%,oklch(0.5_0.22_277/0.35),transparent_65%),radial-gradient(30rem_24rem_at_100%_100%,oklch(0.45_0.15_250/0.25),transparent_60%)]"
        />
        <div className="relative flex items-center gap-3">
          <BrandMark />
          <span className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight text-white">Garment ERP</span>
            <span className="text-xs text-sidebar-muted">Factory Control</span>
          </span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-white">
            One controlled record for every style, size and partner.
          </h2>
          <p className="mt-4 text-[0.95rem] text-sidebar-foreground/70">
            Master data, styles and their version history, and job-work partners — kept in one
            place your whole team works from.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-muted">Authorised users only.</p>
      </aside>

      <main className="canvas-glow flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <span className="font-semibold tracking-tight">Garment ERP</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Sign in to continue to your workspace.
          </p>
          <Card className="shadow-raised">
            <CardContent>
              <Suspense>
                <LoginForm />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
