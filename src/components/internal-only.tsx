import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

/** Redirects external users away from the wrapped page (to Read & Sign). */
export function InternalOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isExternal = user?.role === "external" || user?.userType === "external";
  if (isExternal) return <Navigate to="/read-sign" replace />;
  return <>{children}</>;
}
