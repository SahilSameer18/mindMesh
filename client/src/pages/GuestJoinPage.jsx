import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Users, ArrowRight, Sparkles, AlertCircle, ArrowLeft } from "lucide-react";
import apiClient from "../api/apiClient.js";
import { useRouter } from "../app.routes.jsx";
import BrandLogo from "../components/ui/BrandLogo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function GuestJoinPage() {
  const { token } = useParams();
  const { navigateToRoom, navigateToHome, navigateToLogin } = useRouter();
  const { user: authUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Resolve invite link metadata on mount
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setErrorMessage("");

    apiClient
      .get(`/api/invites/${token}`)
      .then((res) => {
        if (!mounted) return;
        const data = res?.data || res;
        if (data?.roomId) {
          setInviteData(data);
        } else {
          setErrorMessage("This invite link is invalid or has expired.");
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setErrorMessage(
          err?.response?.data?.message || err?.message || "This invite link is invalid or has expired."
        );
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  // Auto-populate display name if user is already authenticated
  useEffect(() => {
    if (authUser?.name && !name) {
      setName(authUser.name);
    }
  }, [authUser]);

  const handleJoin = async (e) => {
    e.preventDefault();
    const effectiveName = name.trim() || authUser?.name || "";
    if (!effectiveName && !authUser) {
      setErrorMessage("Please enter your name to join.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const res = await apiClient.post(`/api/invites/${token}/join`, {
        name: effectiveName,
      });

      const data = res?.data || res;

      // Scoped ephemeral storage: save in sessionStorage so it never pollutes localStorage
      if (!authUser && effectiveName && typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("mindmesh_guest_name", effectiveName);
      }

      navigateToRoom(data.roomId || inviteData.roomId);
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to join room. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-app p-4 text-text-main relative overflow-hidden font-sans selection:bg-indigo-500/15 selection:text-indigo-900">
      {/* Ambient background glows matching landing page */}
      <div className="absolute top-1/4 -left-20 w-[500px] h-[400px] bg-gradient-to-tr from-indigo-200/40 via-violet-100/30 to-sky-100/40 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[500px] h-[400px] bg-purple-100/35 blur-[140px] rounded-full pointer-events-none" />

      {/* Center Card */}
      <div className="max-w-md w-full relative z-10 p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-surface border border-border-subtle shadow-card">
        {/* Brand header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigateToHome()}
            className="flex items-center gap-2.5 text-text-main hover:opacity-90 transition-opacity cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25">
              <BrandLogo size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-text-main">
              mindMesh
            </span>
          </button>

          <span
            className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border font-mono ${
              authUser
                ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                : "text-emerald-700 bg-emerald-50 border-emerald-200"
            }`}
          >
            {authUser ? "Workspace Invite" : "Guest Invite"}
          </span>
        </div>

        {/* Loading state skeleton */}
        {isLoading ? (
          <div className="space-y-4 py-4 animate-pulse">
            <div className="h-6 w-3/4 bg-surface-subtle rounded-lg" />
            <div className="h-4 w-full bg-surface-subtle/70 rounded-md" />
            <div className="h-10 w-full bg-surface-subtle rounded-xl mt-6" />
            <div className="h-11 w-full bg-surface-subtle rounded-xl" />
          </div>
        ) : errorMessage && !inviteData ? (
          /* Error card if invite expired or invalid */
          <div className="py-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-display font-bold text-text-main mb-2">Invite Link Unavailable</h2>
            <p className="text-sm text-text-muted mb-6">{errorMessage}</p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => navigateToHome()}
                className="w-full h-11 rounded-xl bg-surface-subtle hover:bg-surface-hover text-text-main font-semibold text-sm flex items-center justify-center gap-2 border border-border-subtle transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to MindMesh Home</span>
              </button>
              <button
                onClick={() => navigateToLogin()}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 py-1 cursor-pointer transition-colors"
              >
                Sign in with existing account
              </button>
            </div>
          </div>
        ) : (
          /* Join Form */
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Collaborative Room Invitation</span>
              </div>
              <h1 className="text-2xl font-display font-bold text-text-main">
                Join &ldquo;{inviteData?.roomName || "Workspace Room"}&rdquo;
              </h1>
              <p className="mt-1.5 text-xs text-text-muted">
                {authUser
                  ? "You were invited to collaborate in this workspace with your account."
                  : "You were invited to collaborate in this live session. Choose a display name to enter."}
              </p>
            </div>

            {authUser && (
              <div className="mb-4 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {authUser.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-semibold text-text-main leading-tight">{authUser.name}</p>
                    <p className="text-[11px] text-text-muted">{authUser.email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-indigo-700 bg-white/90 px-2 py-0.5 rounded-md border border-indigo-200/60 font-mono">
                  Member
                </span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-main uppercase tracking-wider mb-1.5">
                  Your Display Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-faint">
                    <Users className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    autoFocus
                    required
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border-subtle text-text-main placeholder:text-text-faint focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                {isSubmitting ? (
                  /* Skeleton loader state — satisfies rule: prefer skeleton loaders over raw loading spinners */
                  <div className="w-full h-11 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/15 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                    <div className="flex items-center gap-2 text-indigo-600 text-sm font-semibold">
                      <div className="w-4 h-4 rounded-full bg-indigo-500/30 animate-pulse" />
                      <span>Entering room...</span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-600 hover:via-indigo-600 hover:to-purple-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/25 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>Enter Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-border-subtle text-center">
              <span className="text-xs text-text-faint">
                {authUser
                  ? "Authenticated session \u2022 Permanent workspace membership"
                  : "Temporary 8-hour session \u2022 Scoped to this room"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
