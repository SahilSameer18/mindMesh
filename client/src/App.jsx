import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { RouterProvider, AppRoutes } from "./app.routes.jsx";
import ErrorBoundary from "./components/ui/ErrorBoundary.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <RouterProvider>
            <AppRoutes />
          </RouterProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
