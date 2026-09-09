import { createContext, useContext, useState, useEffect, useCallback } from "react";
import authApi from "../api/auth.api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Check for active session cookie on mount
   */
  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const res = await authApi.getMe();
      if (res?.success && res?.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      // Offline or unauthenticated -> default to guest mode without blocking UI
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  /**
   * Register a new account
   */
  const signup = useCallback(async ({ email, password, name }) => {
    setAuthError(null);
    try {
      const res = await authApi.signup({ email, password, name });
      if (!res?.success) {
        const errorMsg = res?.errors?.[0] || res?.message || "Registration failed";
        setAuthError(errorMsg);
        throw new Error(errorMsg);
      }

      setUser(res.data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mindmesh:auth-changed", { detail: { action: "signup", user: res.data } })
        );
      }
      return res.data;
    } catch (err) {
      const msg = err.errors?.[0] || err.message || "Registration failed";
      setAuthError(msg);
      throw err;
    }
  }, []);

  /**
   * Log into an existing account
   */
  const login = useCallback(async ({ email, password }) => {
    setAuthError(null);
    try {
      const res = await authApi.login({ email, password });
      if (!res?.success) {
        const errorMsg = res?.errors?.[0] || res?.message || "Login failed";
        setAuthError(errorMsg);
        throw new Error(errorMsg);
      }

      setUser(res.data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mindmesh:auth-changed", { detail: { action: "login", user: res.data } })
        );
      }
      return res.data;
    } catch (err) {
      const msg = err.errors?.[0] || err.message || "Login failed";
      setAuthError(msg);
      throw err;
    }
  }, []);

  /**
   * Log out and clear session cookie
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn("[Auth] Error logging out:", err.message);
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mindmesh:auth-changed", { detail: { action: "logout" } }));
      }
    }
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user && !user.isDemo),
    isLoading,
    authError,
    setAuthError,
    signup,
    login,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;


