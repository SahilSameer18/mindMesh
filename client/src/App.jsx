import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { RouterProvider, AppRoutes } from "./app.routes.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouterProvider>
          <AppRoutes />
        </RouterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
