import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { useRouter } from "../../app.routes.jsx";
import BrandLogo from "../../components/ui/BrandLogo.jsx";
import AuthShowcase from "./AuthShowcase.jsx";

export default function LoginPage() {
  const { isAuthenticated, login, authError, setAuthError } = useAuth();
  const { navigateToDashboard, navigateToRegister, navigateToHome } = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigateToDashboard({ replace: true });
    }
  }, [isAuthenticated, navigateToDashboard]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setLocalError("Please enter both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email: email.trim(), password });
    } catch {
      // Handled in useAuth / authError
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = localError || authError;

  return (
    <div className="h-screen w-full flex bg-app text-text-main font-sans selection:bg-accent/20 selection:text-accent overflow-hidden">
      {/* LEFT SIDE: Features & Product Showcase */}
      <AuthShowcase />

      {/* RIGHT SIDE: Authentication Form */}
      <div className="w-full lg:w-[50%] xl:w-[48%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 z-10 overflow-y-auto relative bg-app">
        {/* Ambient Background Glow matching Landing Page */}
        <div className="absolute top-10 right-10 w-[420px] h-[350px] bg-accent/[0.07] blur-[130px] rounded-full pointer-events-none" />

        {/* Top Header Navigation */}
        <div className="flex items-center justify-between relative z-10">
          <button
            onClick={() => navigateToHome()}
            className="flex items-center gap-2.5 text-text-main hover:opacity-90 transition-opacity cursor-pointer lg:hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-on-accent shadow-sm">
              <BrandLogo size={18} className="text-on-accent" />
            </div>
            <span className="font-serif italic font-medium text-lg tracking-tight text-text-main">
              mindMesh
            </span>
          </button>

          <div className="hidden lg:block" />

          <button
            onClick={() => navigateToHome()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-main bg-surface border border-border-subtle hover:border-border-strong hover:bg-surface-subtle transition-all py-1.5 px-3 rounded-lg cursor-pointer ml-auto shadow-subtle"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to home</span>
          </button>
        </div>

        {/* Center: Tactile Surface Card matching Landing & Dashboard cards */}
        <div className="my-auto py-8 max-w-md w-full mx-auto relative z-10">
          <div className="bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-card">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-serif italic font-medium tracking-tight text-text-main">
                Welcome back
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-text-muted leading-relaxed">
                Sign in to access your synchronized workspaces, rooms, and synthesized meeting notes.
              </p>
            </div>

            {/* Error Alert Box */}
            {activeError && (
              <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/40 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <div className="flex-1">{activeError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-semibold text-text-main uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-faint">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (localError) setLocalError("");
                      if (authError && setAuthError) setAuthError(null);
                    }}
                    placeholder="alex@company.com"
                    autoFocus
                    required
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface border border-border-subtle text-text-main placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-text-main uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-faint">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (localError) setLocalError("");
                      if (authError && setAuthError) setAuthError(null);
                    }}
                    placeholder="••••••••••••"
                    required
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-surface border border-border-subtle text-text-main placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-faint hover:text-text-main transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button with Skeleton Loading State */}
              <div className="pt-2">
                {isSubmitting ? (
                  /* Skeleton loader state — satisfies rule: prefer skeleton loaders over raw loading spinners */
                  <div className="w-full h-11 rounded-lg bg-surface-subtle border border-border-subtle flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/15 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    <div className="flex items-center gap-2 text-accent text-sm font-semibold">
                      <div className="w-4 h-4 rounded-full bg-accent/30 animate-pulse" />
                      <span>Signing in...</span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full h-11 rounded-lg bg-accent hover:bg-accent-hover text-on-accent font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Switch to Register */}
            <div className="mt-6 pt-5 border-t border-border-subtle text-center">
              <p className="text-xs sm:text-sm text-text-muted">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigateToRegister()}
                  className="font-semibold text-accent hover:text-accent-hover hover:underline cursor-pointer transition-colors"
                >
                  Create a free workspace
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="text-center sm:text-left text-xs text-text-faint pt-4 border-t border-border-subtle relative z-10">
          <span>&copy; {new Date().getFullYear()} mindMesh. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}
