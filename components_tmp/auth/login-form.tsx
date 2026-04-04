"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginFormProps = {
  callbackUrl: string;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"login" | "register" | null>(null);

  async function readFormValues(form: HTMLFormElement) {
    const formData = new FormData(form);

    return {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPendingAction("login");

    const form = event.currentTarget;
    const { email, password } = await readFormValues(form);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setPendingAction(null);
      return;
    }

    window.location.href = result?.url ?? callbackUrl;
  }

  async function handleRegister(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setError(null);
    setPendingAction("register");

    const form = event.currentTarget.form;
    if (!form) {
      setError("Registration form is unavailable.");
      setPendingAction(null);
      return;
    }

    const { name, email, password } = await readFormValues(form);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.ok) {
      setError(json?.error ?? "Failed to create account.");
      setPendingAction(null);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (signInResult?.error) {
      setError("Account created, but sign in failed.");
      setPendingAction(null);
      return;
    }

    window.location.href = signInResult?.url ?? callbackUrl;
  }

  return (
    <form className="space-y-4" onSubmit={handleLogin}>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Optional" autoComplete="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
        />
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pendingAction !== null}>
          {pendingAction === "login" ? "Signing In..." : "Sign In"}
        </Button>
        <Button type="button" variant="outline" onClick={handleRegister} disabled={pendingAction !== null}>
          {pendingAction === "register" ? "Creating Account..." : "Create Account"}
        </Button>
      </div>
    </form>
  );
}
