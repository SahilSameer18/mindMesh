import { AuthProvider } from "./context/AuthContext.jsx";
import { RouterProvider, useRouter } from "./app.routes.jsx";
import { Toaster } from "sonner";
import LandingPage from "./pages/LandingPage.jsx";
import RoomPage from "./pages/RoomPage.jsx";

function AppContent() {
  const { currentRoute, roomId, navigateToHome } = useRouter();

  if (currentRoute === "room" && roomId) {
    return <RoomPage roomId={roomId} onLeaveRoom={navigateToHome} />;
  }

  return <LandingPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppContent />
        <Toaster richColors theme="dark" position="top-right" closeButton />
      </RouterProvider>
    </AuthProvider>
  );
}
