import { createContext, useContext, useCallback, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";

const RouterContext = createContext(null);

export function RouterProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Extract roomId from either /room/:roomId path or ?room=:roomId query param
  const pathParts = location.pathname.split("/").filter(Boolean);
  const pathRoomId =
    pathParts[0] === "room" && pathParts[1] ? decodeURIComponent(pathParts[1]) : "";
  const queryRoomId = searchParams.get("room")?.trim() || "";
  const roomId = pathRoomId || queryRoomId;
  const currentRoute = roomId ? "room" : "home";

  const navigateToRoom = useCallback(
    (targetRoomId, { replace = false } = {}) => {
      if (!targetRoomId) return;
      const cleanId = targetRoomId.trim();
      navigate(`/room/${encodeURIComponent(cleanId)}`, { replace });
    },
    [navigate]
  );

  const navigateToHome = useCallback(
    ({ replace = false } = {}) => {
      navigate("/", { replace });
    },
    [navigate]
  );

  const value = useMemo(
    () => ({
      currentRoute,
      roomId,
      navigateToRoom,
      navigateToHome,
    }),
    [currentRoute, roomId, navigateToRoom, navigateToHome]
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