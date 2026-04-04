"use client";

import { useEffect, useState } from "react";

type ActionToastProps = {
  message: string;
  tone?: "success" | "error";
};

export function ActionToast({ message, tone = "success" }: ActionToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!visible) {
    return null;
  }

  const palette =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : "border-rose-300 bg-rose-50 text-rose-800";

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
      <div className={`rounded-md border px-4 py-3 text-sm shadow-lg ${palette}`}>{message}</div>
    </div>
  );
}
