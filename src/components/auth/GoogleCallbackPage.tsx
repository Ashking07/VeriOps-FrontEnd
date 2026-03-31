import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthApiError, beginGoogleLogin, completeGoogleCallback } from "../../lib/auth";

type GoogleCallbackPageProps = {
  theme: "dark" | "light";
};

export const GoogleCallbackPage: React.FC<GoogleCallbackPageProps> = ({ theme }) => {
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await completeGoogleCallback(window.location.search);
        if (!cancelled) {
          navigate("/overview", { replace: true });
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof AuthApiError) {
          setError(err.message);
        } else {
          setError("Google login failed. Please try again.");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="w-full max-w-md">
      <div
        className={`border rounded-2xl p-6 space-y-4 ${
          isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
        }`}
      >
        <div>
          <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            Completing Google sign-in
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            We are finalizing your session.
          </p>
        </div>

        {error ? (
          <div className="space-y-3">
            <p className="text-xs text-rose-500">{error}</p>
            <button
              type="button"
              onClick={() => beginGoogleLogin()}
              className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${
                isDark
                  ? "bg-white text-zinc-950 hover:bg-zinc-200"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              Try Google sign-in again
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Please wait...</p>
        )}
      </div>
    </div>
  );
};
