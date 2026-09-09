import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen w-full bg-app text-text-main">
      {children || <Outlet />}
      <Toaster richColors theme="light" position="top-right" closeButton />
    </div>
  );
}
