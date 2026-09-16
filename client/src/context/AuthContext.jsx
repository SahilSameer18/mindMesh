import { useState, useEffect, useCallback } from "react";
import authApi from "../api/auth.api.js";
import { AuthContext } from "./authContextInstance.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authError, setAuthError] = useState(null);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authApi.getMe();
      if (res?.success && res?.data) {
        setUser(res.data);
      } else if (res?.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const res = await authApi.getMe();
        if (isMounted) {
          if (res?.success && res?.data) {
            setUser(res.data);
          } else if (res?.data) {
            setUser(res.data);
          } else {
            setUser(null);
          }
        }
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    checkSession();

    const handleSessionExpired = () => {
      setUser(null);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("mindmesh:session-expired", handleSessionExpired);
    }

    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("mindmesh:session-expired", handleSessionExpired);
      }
    };
  }, []);

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

export default AuthProvider;