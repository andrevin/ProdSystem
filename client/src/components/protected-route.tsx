import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { data: user, isLoading, isFetching } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Wait for both loading and fetching to complete to avoid redirect race conditions
    if (!isLoading && !isFetching && !user) {
      setLocation("/login");
    } else if (!isLoading && !isFetching && user && allowedRoles && !allowedRoles.includes(user.role)) {
      // User is authenticated but doesn't have required role
      setLocation("/");
    }
  }, [user, isLoading, isFetching, allowedRoles, setLocation]);

  if (isLoading || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a esta página
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
