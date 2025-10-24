import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Monitor, Wrench, Settings } from "lucide-react";
import OperatorView from "@/pages/operator-view";
import MaintenanceView from "@/pages/maintenance-view";
import AdminView from "@/pages/admin-view";

function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">Gestión de Paradas de Producción</h1>
          <div className="flex gap-2">
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
          </div>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={OperatorView} />
      <Route path="/maintenance" component={MaintenanceView} />
      <Route path="/admin" component={AdminView} />
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
