import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useStore } from "@/lib/store";

export default function RequireAuth() {
  const { auth } = useStore();
  const loc = useLocation();
  if (!auth.isAuthed) return <Navigate to="/auth" state={{ from: loc }} replace />;
  return <Outlet />;
}
