import { useAuthContext } from "../context/AuthContext.jsx";
import { authApi } from "../api/auth.api.js";
import { useRouter } from "../app.routes.jsx";
import { extractError } from "../utils/extractError.js";

/**
 * Custom hook to execute authentication actions and access state.
 */
export function useAuth() {
  const ctx = useAuthContext();
  let router = null;
  try {
    router = useRouter ? useRouter() : null;
  } catch {
    // Router context not mounted (e.g. in standalone tests)
  }

  const login = async ({ email, password }) => {
    ctx.setAuthError(null);
    try {
      const res = await authApi.login({ email, password });
      const userData = res?.data || res;
      ctx.setUser(userData);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mindmesh:auth-changed", { detail: { action: "login", user: userData } })
        );
      }
      if (router?.navigateToDashboard) {
        router.navigateToDashboard();
      }
      return userData;
    } catch (err) {
      const msg = extractError(err, "Login failed");
      ctx.setAuthError(msg);
      throw err;
    }
  };

  const signup = async ({ name, email, password }) => {
    ctx.setAuthError(null);
    try {
      const res = await authApi.signup({ name, email, password });
      const userData = res?.data || res;
      ctx.setUser(userData);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mindmesh:auth-changed", { detail: { action: "signup", user: userData } })
        );
      }
      if (router?.navigateToDashboard) {
        router.navigateToDashboard();
      }
      return userData;
    } catch (err) {
      const msg = extractError(err, "Registration failed");
      ctx.setAuthError(msg);
      throw err;
    }
  };

  const logout = async () => {
    ctx.setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.warn("[Auth] Error logging out:", err.message);
    } finally {
      ctx.setUser(null);
      ctx.setIsLoggingOut(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mindmesh:auth-changed", { detail: { action: "logout" } })
        );
      }
      if (router?.navigateToHome) {
        router.navigateToHome();
      }
    }
  };

  const logoutAll = async () => {
    ctx.setIsLoggingOut(true);
    try {
      await authApi.logoutAll();
    } catch (err) {
      console.warn("[Auth] Error logging out all sessions:", err.message);
    } finally {
      ctx.setUser(null);
      ctx.setIsLoggingOut(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mindmesh:auth-changed", { detail: { action: "logout" } })
        );
      }
      if (router?.navigateToHome) {
        router.navigateToHome();
      }
    }
  };

  const updateProfile = async ({ name }) => {
    try {
      const res = await authApi.updateProfile({ name });
      const updated = res?.data || res;
      ctx.setUser((prev) => (prev ? { ...prev, ...updated } : updated));
      return updated;
    } catch (err) {
      const msg = extractError(err, "Failed to update profile");
      ctx.setAuthError(msg);
      throw err;
    }
  };

  return {
    user: ctx.user,
    setUser: ctx.setUser,
    isLoading: ctx.isLoading,
    isLoggingOut: ctx.isLoggingOut,
    authError: ctx.authError,
    setAuthError: ctx.setAuthError,
    isAuthenticated: Boolean(ctx.user && !ctx.user.isDemo),
    login,
    signup,
    logout,
    logoutAll,
    updateProfile,
    refreshSession: ctx.refreshSession,
  };
}

export default useAuth;