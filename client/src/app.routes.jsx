/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, useMemo, lazy, Suspense } from "react";
import {
  useNavigate,
  useLocation,
  useSearchParams,
  Routes,
  Route,
  useParams,
} from "react-router-dom";
import AppLayout from "./app.layout.jsx";
// Landing stays eager — it's the default "/" route and should paint immediately.
// Everything else (canvas/WebRTC/speech stack especially) is route-split so a
// visitor who only ever sees the landing page never downloads it.
import LandingPage from "./pages/LandingPage.jsx";

const RoomPage = lazy(() => import("./pages/RoomPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage.jsx"));
const GuestJoinPage = lazy(() => import("./pages/GuestJoinPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));

function RouteFallback() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-app">
      <div className="w-8 h-8 rounded-full border-2 border-border-strong border-t-accent animate-spin" />
    </div>
  );
}

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
  const isDashboard = location.pathname === "/dashboard";
  const isLogin = location.pathname === "/login";
  const isRegister = location.pathname === "/register";
  const currentRoute = roomId
    ? "room"
    : isDashboard
    ? "dashboard"
    : isLogin
    ? "login"
    : isRegister
    ? "register"
    : "home";

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

  const navigateToDashboard = useCallback(
    ({ replace = false } = {}) => {
      navigate("/dashboard", { replace });
    },
    [navigate]
  );

  const navigateToLogin = useCallback(
    ({ replace = false } = {}) => {
      navigate("/login", { replace });
    },
    [navigate]
  );

  const navigateToRegister = useCallback(
    ({ replace = false } = {}) => {
      navigate("/register", { replace });
    },
    [navigate]
  );

  const value = useMemo(
    () => ({
      currentRoute,
      roomId,
      navigateToRoom,
      navigateToHome,
      navigateToDashboard,
      navigateToLogin,
      navigateToRegister,
    }),
    [
      currentRoute,
      roomId,
      navigateToRoom,
      navigateToHome,
      navigateToDashboard,
      navigateToLogin,
      navigateToRegister,
    ]
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

function RoomRouteWrapper() {
  const { roomId } = useParams();
  const { navigateToHome } = useRouter();
  return <RoomPage roomId={roomId} onLeaveRoom={navigateToHome} />;
}

function LegacyQueryRoomWrapper() {
  const { currentRoute, roomId, navigateToHome } = useRouter();
  if (currentRoute === "room" && roomId) {
    return <RoomPage roomId={roomId} onLeaveRoom={navigateToHome} />;
  }
  return <LandingPage />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/join/:token" element={<GuestJoinPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<LegacyQueryRoomWrapper />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/room/:roomId" element={<RoomRouteWrapper />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;