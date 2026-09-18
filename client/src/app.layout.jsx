import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { useTheme } from "./hooks/useTheme.js";

export default function AppLayout({ children }) {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen w-full bg-app text-text-main">
      {children || <Outlet />}
      <Toaster richColors theme={theme} position="top-right" closeButton />
    </div>
  );
}
