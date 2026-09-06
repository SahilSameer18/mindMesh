import { createContext, useContext, useState, useEffect, useCallback } from "react";

const API_BASE_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== "undefined" && window.location.port === "5173"
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : "");

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
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json?.data) {
        setUser(json.data);
      } else {
        // Not authenticated or session expired -> guest mode
        setUser(null);
      }
    } catch {
      // Offline or network error -> default to guest mode without blocking UI
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
      const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg = json?.errors?.[0] || json?.message || "Registration failed";
        setAuthError(errorMsg);
        throw new Error(errorMsg);
      }

      setUser(json.data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mindmesh:auth-changed", { detail: { action: "signup", user: json.data } }));
      }
      return json.data;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  }, []);

  /**
   * Log into an existing account
   */
  const login = useCallback(async ({ email, password }) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg = json?.errors?.[0] || json?.message || "Login failed";
        setAuthError(errorMsg);
        throw new Error(errorMsg);
      }

      setUser(json.data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mindmesh:auth-changed", { detail: { action: "login", user: json.data } }));
      }
      return json.data;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  }, []);

  /**
   * Log out and clear session cookie
   */
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
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
