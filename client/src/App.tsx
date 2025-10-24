import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Monitor, Wrench, Settings, LogOut, User } from "lucide-react";
import { useUser, useLogout } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/protected-route";
import OperatorView from "@/pages/operator-view";
import MaintenanceView from "@/pages/maintenance-view";
import AdminView from "@/pages/admin-view";
import LoginPage from "@/pages/login";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABELS: Record<string, string> = {
  operator: "Operador",
  technician: "Técnico",
  maintenance_chief: "Jefe de Mantenimiento",
  supervisor: "Supervisor",
  admin: "Administrador",
};

function Navigation() {
  const [location, setLocation] = useLocation();
  const { data: user } = useUser();
  const logout = useLogout();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
      setLocation("/login");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cerrar la sesión",
      });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">Gestión de Paradas de Producción</h1>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button
                variant={location === "/" ? "default" : "ghost"}
                data-testid="nav-operator"
              >
                <Monitor className="w-4 h-4 mr-2" />
                Operador
              </Button>
            </Link>
            <Link href="/maintenance">
              <Button
                variant={location === "/maintenance" ? "default" : "ghost"}
                data-testid="nav-maintenance"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Mantenimiento
              </Button>
            </Link>
            <Link href="/admin">
              <Button
                variant={location === "/admin" ? "default" : "ghost"}
                data-testid="nav-admin"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-user-menu">
                  <User className="w-4 h-4 mr-2" />
                  {user.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rol: {ROLE_LABELS[user.role] || user.role}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <ProtectedRoute>
          <OperatorView />
        </ProtectedRoute>
      </Route>
      <Route path="/maintenance">
        <ProtectedRoute allowedRoles={["technician", "maintenance_chief", "supervisor", "admin"]}>
          <MaintenanceView />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminView />
        </ProtectedRoute>
      </Route>
      <Route component={() => <div className="p-8 text-center">404 - Página no encontrada</div>} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
