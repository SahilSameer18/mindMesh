import { createContext, useContext, useState, useEffect, useCallback } from "react";
import authApi from "../api/auth.api.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
      } else if (res?.data) {
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

    const handleSessionExpired = () => {
      setUser(null);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("mindmesh:session-expired", handleSessionExpired);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("mindmesh:session-expired", handleSessionExpired);
      }
    };
  }, [refreshSession]);

  const value = {
    user,
    setUser,
    isLoading,
    setIsLoading,
    isLoggingOut,
    setIsLoggingOut,
    authError,
    setAuthError,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

// Backwards-compatibility re-export:
// All existing import sites (`import { useAuth } from "../context/AuthContext.jsx"`) continue to work
export { useAuth } from "../hooks/useAuth.js";
export default AuthContext;
