"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export function StartSocial({ provider }: { provider: "google" | "apple" }) {
  useEffect(() => {
    void authClient.signIn.social({ provider, callbackURL: "/auth/app/done", errorCallbackURL: "/auth/app/done?error=1" });
  }, [provider]);
  return null;
}
