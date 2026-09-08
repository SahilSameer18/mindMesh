import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { RouterProvider, useRouter } from "./app.routes.jsx";
import { Toaster } from "sonner";
import LandingPage from "./pages/LandingPage.jsx";
import RoomPage from "./pages/RoomPage.jsx";

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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouterProvider>
          <Routes>
            <Route path="/" element={<LegacyQueryRoomWrapper />} />
            <Route path="/room/:roomId" element={<RoomRouteWrapper />} />
            <Route path="*" element={<LegacyQueryRoomWrapper />} />
          </Routes>
          <Toaster richColors theme="dark" position="top-right" closeButton />
        </RouterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
