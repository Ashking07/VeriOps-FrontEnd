import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthApiError, bootstrapFirstAdmin, useAuthSession } from "../../lib/auth";

type BootstrapAdminPageProps = {
  theme: "dark" | "light";
};

export const BootstrapAdminPage: React.FC<BootstrapAdminPageProps> = ({ theme }) => {
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBootstrapDone, setIsBootstrapDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/overview" replace />;
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await bootstrapFirstAdmin({
        email,
        password,
        username: username.trim() || undefined,
      });
      navigate("/overview", { replace: true });
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 409) {
        setIsBootstrapDone(true);
      } else if (err instanceof AuthApiError) {
        setError(err.message);
      } else {
        setError("Bootstrap failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div
        className={`border rounded-2xl p-6 space-y-4 ${
          isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
        }`}
      >
        <div>
          <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            Create first admin
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Run once for initial workspace setup.</p>
        </div>

        {isBootstrapDone ? (
          <div className="space-y-2">
            <div
              className={`border rounded-lg p-3 text-sm ${
                isDark
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <p className="font-semibold">Bootstrap already completed.</p>
              <p className="mt-1">
                No account was created from this attempt. Sign in with the existing admin account,
                or reset backend auth data if you need to bootstrap again.
              </p>
            </div>
            <Link to="/login" className="text-sm text-blue-500 hover:underline">
              Go to login
            </Link>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={onSubmit}>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username (optional)"
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                  : "bg-white border-zinc-200 text-zinc-900"
              }`}
            />
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
            {error && <p className="text-xs text-rose-500">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-60 ${
                isDark
                  ? "bg-white text-zinc-950 hover:bg-zinc-200"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              {isSubmitting ? "Creating..." : "Create admin"}
            </button>
          </form>
        )}

        <p className="text-xs text-zinc-500">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-500 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
