import React, { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AuthApiError, beginGoogleLogin, login, useAuthSession } from "../../lib/auth";

type LoginPageProps = {
  theme: "dark" | "light";
};

export const LoginPage: React.FC<LoginPageProps> = ({ theme }) => {
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/overview" replace />;
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate("/overview", { replace: true });
    } catch (err) {
      if (err instanceof AuthApiError) {
        setError(err.message);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGoogleLogin = () => {
    setIsGoogleRedirecting(true);
    beginGoogleLogin();
  };

  const formatCallbackError = (value: string) => {
    try {
      return decodeURIComponent(value).replace(/_/g, " ");
    } catch {
      return value.replace(/_/g, " ");
    }
  };

  const callbackError = searchParams.get("auth_error");
  const displayError =
    error ??
    (callbackError
      ? `Google sign-in failed: ${formatCallbackError(callbackError)}`
      : null);

  return (
    <div className="w-full max-w-md">
      <div
        className={`border rounded-2xl p-6 space-y-4 ${
          isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
        }`}
      >
        <div>
          <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Sign in</h1>
          <p className="text-xs text-zinc-500 mt-1">Use your VeriOps account to continue.</p>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            className={`w-full border rounded-lg px-3 py-2 text-sm ${
              isDark
                ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                : "bg-white border-zinc-200 text-zinc-900"
            }`}
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
            className={`w-full border rounded-lg px-3 py-2 text-sm ${
              isDark
                ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                : "bg-white border-zinc-200 text-zinc-900"
            }`}
          />
          {displayError && <p className="text-xs text-rose-500">{displayError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-60 ${
              isDark
                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-zinc-500">
          <div className="flex-1 h-px bg-zinc-300/40 dark:bg-zinc-700/40" />
          <span>or</span>
          <div className="flex-1 h-px bg-zinc-300/40 dark:bg-zinc-700/40" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={isGoogleRedirecting}
            onClick={onGoogleLogin}
            className={`w-full py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-60 ${
              isDark
                ? "bg-zinc-100 text-zinc-950 hover:bg-white"
                : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
            }`}
          >
            {isGoogleRedirecting ? "Redirecting..." : "Continue with Google"}
          </button>
          <p className="text-xs text-zinc-500">
            You will be redirected to Google and then returned to complete sign-in.
          </p>
        </div>

        <p className="text-xs text-zinc-500">
          Need initial setup?{" "}
          <Link to="/bootstrap-first-admin" className="text-blue-500 hover:underline">
            Create first admin
          </Link>
        </p>
      </div>
    </div>
  );
};
