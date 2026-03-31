import { useEffect } from "react";
import {
  initializeAuth,
  refreshIfExpiringSoon,
  useAuthSession,
} from "../../lib/auth";

export const AuthSessionManager = () => {
  const { accessToken, accessTokenExpiresAtMs } = useAuthSession();

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (!accessToken || !accessTokenExpiresAtMs) {
      return;
    }

    const refreshAtMs = Math.max(0, accessTokenExpiresAtMs - Date.now() - 60_000);
    const timer = window.setTimeout(() => {
      void refreshIfExpiringSoon();
    }, refreshAtMs);

    return () => window.clearTimeout(timer);
  }, [accessToken, accessTokenExpiresAtMs]);

  return null;
};
