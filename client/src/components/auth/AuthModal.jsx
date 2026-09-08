import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { X, Mail, Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import BrandLogo from "../ui/BrandLogo.jsx";

export default function AuthModal({ isOpen, onClose, initialTab = "login" }) {
  const { login, signup, authError, setAuthError } = useAuth();
  const [tab, setTab] = useState(initialTab); // "login" | "signup"
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (authError) setAuthError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (tab === "signup") {
        await signup({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        });
      } else {
        await login({
          email: formData.email.trim(),
          password: formData.password,
        });
      }
      onClose();
    } catch {
      // Error is set in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl p-6 sm:p-8 text-slate-100 overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <BrandLogo size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white font-display">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-xs text-slate-400">
              {tab === "login"
                ? "Sign in to save workspaces and preserve action lineage"
                : "Join mindMesh to build visual intelligence with your team"}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-950/60 p-1 mb-6 border border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              if (authError) setAuthError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === "login"
                ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              if (authError) setAuthError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === "signup"
                ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}

        {/* Loading Skeleton States (Rule: prefer skeleton loaders over raw spinners) */}
        {isSubmitting ? (
          <div className="space-y-4 py-2" aria-label="Processing authentication">
            {tab === "signup" && (
              <div className="space-y-1.5">
                <div className="w-16 h-3 bg-slate-800 rounded animate-pulse" />
                <div className="w-full h-10 bg-slate-800/80 rounded-xl animate-pulse" />
              </div>
            )}
            <div className="space-y-1.5">
              <div className="w-16 h-3 bg-slate-800 rounded animate-pulse" />
              <div className="w-full h-10 bg-slate-800/80 rounded-xl animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <div className="w-20 h-3 bg-slate-800 rounded animate-pulse" />
              <div className="w-full h-10 bg-slate-800/80 rounded-xl animate-pulse" />
            </div>
            <div className="w-full h-10 bg-indigo-600/40 rounded-xl animate-pulse mt-4" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "signup" && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Dr. Gordon Freeman"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="gordon@blackmesa.gov"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {tab === "signup" && (
                <p className="text-[11px] text-slate-500 mt-1">Must be at least 6 characters.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-[0.99] shadow-md shadow-indigo-500/20 transition-all"
            >
              {tab === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        )}

        {/* Frictionless Guest Bypass */}
        <div className="mt-6 pt-4 border-t border-slate-800/70 flex items-center justify-between">
          <span className="text-xs text-slate-500">Just exploring?</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-sky-400 hover:text-sky-300 hover:underline transition-colors"
          >
            Continue as Guest Demo →
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
