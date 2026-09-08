import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const RouterContext = createContext(null);

function parseRouteFromLocation() {
  if (typeof window === "undefined") {
    return { route: "home", roomId: "" };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const roomQuery = searchParams.get("room")?.trim();
  if (roomQuery) {
    return { route: "room", roomId: roomQuery };
  }

  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (pathParts[0] === "room" && pathParts[1]) {
    return { route: "room", roomId: decodeURIComponent(pathParts[1]) };
  }

  return { route: "home", roomId: "" };
}

export function RouterProvider({ children }) {
  const [routeState, setRouteState] = useState(parseRouteFromLocation);

  useEffect(() => {
    const handlePopState = () => {
      setRouteState(parseRouteFromLocation());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToRoom = useCallback((roomId, { replace = false } = {}) => {
    if (!roomId) return;
    const cleanId = roomId.trim();
    const url = `/?room=${encodeURIComponent(cleanId)}`;

    if (replace) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
    }
    setRouteState({ route: "room", roomId: cleanId });
  }, []);

  const navigateToHome = useCallback(({ replace = false } = {}) => {
    const url = "/";
    if (replace) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
    }
    setRouteState({ route: "home", roomId: "" });
  }, []);

  const value = useMemo(
    () => ({
      currentRoute: routeState.route,
      roomId: routeState.roomId,
      navigateToRoom,
      navigateToHome,
    }),
    [routeState.route, routeState.roomId, navigateToRoom, navigateToHome]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return context;
}



