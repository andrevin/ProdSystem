import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Settings, Package, Wrench, Users, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Machine, Product, StoppageCause, Technician, InsertMachine, InsertProduct, InsertStoppageCause, InsertTechnician, User } from "@shared/schema";

type UserWithoutPassword = Omit<User, "passwordHash">;

export default function AdminView() {
  const [machineDialog, setMachineDialog] = useState<{ open: boolean; machine?: Machine }>({ open: false });
  const [productDialog, setProductDialog] = useState<{ open: boolean; product?: Product }>({ open: false });
  const [causeDialog, setCauseDialog] = useState<{ open: boolean; cause?: StoppageCause }>({ open: false });
  const [technicianDialog, setTechnicianDialog] = useState<{ open: boolean; technician?: Technician }>({ open: false });
  const [userDialog, setUserDialog] = useState<{ open: boolean; user?: UserWithoutPassword }>({ open: false });

  const { data: machines } = useQuery<Machine[]>({ queryKey: ["/api/machines"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: causes } = useQuery<StoppageCause[]>({ queryKey: ["/api/stoppage-causes"] });
  const { data: technicians } = useQuery<Technician[]>({ queryKey: ["/api/technicians"] });
  const { data: users } = useQuery<UserWithoutPassword[]>({ queryKey: ["/api/users"] });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
          </div>
          <p className="text-muted-foreground">
            Gestión de máquinas, productos, causas de parada y técnicos
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="machines" className="space-y-6">
          <TabsList>
            <TabsTrigger value="machines" data-testid="tab-machines">
              <Package className="w-4 h-4 mr-2" />
              Máquinas
            </TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">
              <Package className="w-4 h-4 mr-2" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="causes" data-testid="tab-causes">
              <Wrench className="w-4 h-4 mr-2" />
              Causas
            </TabsTrigger>
            <TabsTrigger value="technicians" data-testid="tab-technicians">
              <Users className="w-4 h-4 mr-2" />
              Técnicos
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <UserCog className="w-4 h-4 mr-2" />
              Usuarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="machines">
            <MachinesSection 
              machines={machines} 
              onEdit={(machine) => setMachineDialog({ open: true, machine })}
              onAdd={() => setMachineDialog({ open: true })}
            />
          </TabsContent>

          <TabsContent value="products">
            <ProductsSection 
              products={products}
              onEdit={(product) => setProductDialog({ open: true, product })}
              onAdd={() => setProductDialog({ open: true })}
            />
          </TabsContent>

          <TabsContent value="causes">
            <CausesSection 
              causes={causes}
              onEdit={(cause) => setCauseDialog({ open: true, cause })}
              onAdd={() => setCauseDialog({ open: true })}
            />
          </TabsContent>

          <TabsContent value="technicians">
            <TechniciansSection 
              technicians={technicians}
              onEdit={(technician) => setTechnicianDialog({ open: true, technician })}
              onAdd={() => setTechnicianDialog({ open: true })}
            />
          </TabsContent>

          <TabsContent value="users">
            <UsersSection 
              users={users}
              onEdit={(user) => setUserDialog({ open: true, user })}
              onAdd={() => setUserDialog({ open: true })}
            />
          </TabsContent>
        </Tabs>
      </div>

      <MachineDialog {...machineDialog} onClose={() => setMachineDialog({ open: false })} />
      <ProductDialog {...productDialog} onClose={() => setProductDialog({ open: false })} />
      <CauseDialog {...causeDialog} onClose={() => setCauseDialog({ open: false })} />
      <TechnicianDialog {...technicianDialog} onClose={() => setTechnicianDialog({ open: false })} />
      <UserDialog {...userDialog} onClose={() => setUserDialog({ open: false })} />
    </div>
  );
}

function MachinesSection({ machines, onEdit, onAdd }: { 
  machines?: Machine[]; 
  onEdit: (machine: Machine) => void;
  onAdd: () => void;
}) {
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/machines/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Máquinas</h2>
        <Button onClick={onAdd} data-testid="button-add-machine">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Máquina
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {machines?.map((machine) => (
          <Card key={machine.id} data-testid={`card-machine-${machine.id}`}>
            <CardHeader>
              <CardTitle className="text-lg">{machine.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {machine.description && (
                <p className="text-sm text-muted-foreground">{machine.description}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(machine)}
                  className="flex-1"
                  data-testid={`button-edit-machine-${machine.id}`}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(machine.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-machine-${machine.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProductsSection({ products, onEdit, onAdd }: { 
  products?: Product[]; 
  onEdit: (product: Product) => void;
  onAdd: () => void;
}) {
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/products/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Productos</h2>
        <Button onClick={onAdd} data-testid="button-add-product">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Producto
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products?.map((product) => (
          <Card key={product.id} data-testid={`card-product-${product.id}`}>
            <CardHeader>
              <CardTitle className="text-lg">{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.description && (
                <p className="text-sm text-muted-foreground">{product.description}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(product)}
                  className="flex-1"
                  data-testid={`button-edit-product-${product.id}`}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(product.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-product-${product.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CausesSection({ causes, onEdit, onAdd }: { 
  causes?: StoppageCause[]; 
  onEdit: (cause: StoppageCause) => void;
  onAdd: () => void;
}) {
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/stoppage-causes/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stoppage-causes"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Causas de Parada</h2>
        <Button onClick={onAdd} data-testid="button-add-cause">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Causa
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {causes?.map((cause) => (
          <Card key={cause.id} data-testid={`card-cause-${cause.id}`}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-md"
                  style={{ backgroundColor: cause.color }}
                />
                <CardTitle className="text-lg">{cause.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Requiere mantenimiento:</span>
                <span className="text-sm font-medium">
                  {cause.requiresMaintenance ? "Sí" : "No"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(cause)}
                  className="flex-1"
                  data-testid={`button-edit-cause-${cause.id}`}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(cause.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-cause-${cause.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TechniciansSection({ technicians, onEdit, onAdd }: { 
  technicians?: Technician[]; 
  onEdit: (technician: Technician) => void;
  onAdd: () => void;
}) {
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/technicians/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Técnicos de Mantenimiento</h2>
        <Button onClick={onAdd} data-testid="button-add-technician">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Técnico
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {technicians?.map((technician) => (
          <Card key={technician.id} data-testid={`card-technician-${technician.id}`}>
            <CardHeader>
              <CardTitle className="text-lg">{technician.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{technician.email}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(technician)}
                  className="flex-1"
                  data-testid={`button-edit-technician-${technician.id}`}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(technician.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-technician-${technician.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MachineDialog({ open, machine, onClose }: { 
  open: boolean; 
  machine?: Machine; 
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<InsertMachine>({ name: "", description: "" });

  // Populate form when machine changes
  useEffect(() => {
    if (machine) {
      setFormData({ name: machine.name, description: machine.description || "" });
    } else {
      setFormData({ name: "", description: "" });
    }
  }, [machine, open]);

  const mutation = useMutation({
    mutationFn: async (data: InsertMachine) => {
      if (machine) {
        return await apiRequest("PATCH", `/api/machines/${machine.id}`, data);
      } else {
        return await apiRequest("POST", "/api/machines", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-machine">
        <DialogHeader>
          <DialogTitle>{machine ? "Editar Máquina" : "Agregar Máquina"}</DialogTitle>
          <DialogDescription>
            Complete los datos de la máquina
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="machine-name">Nombre *</Label>
            <Input
              id="machine-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Prensa 3"
              required
              data-testid="input-machine-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="machine-description">Descripción</Label>
            <Input
              id="machine-description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción opcional"
              data-testid="input-machine-description"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-machine">
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductDialog({ open, product, onClose }: { 
  open: boolean; 
  product?: Product; 
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<InsertProduct>({ name: "", description: "" });

  // Populate form when product changes
  useEffect(() => {
    if (product) {
      setFormData({ name: product.name, description: product.description || "" });
    } else {
      setFormData({ name: "", description: "" });
    }
  }, [product, open]);

  const mutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      if (product) {
        return await apiRequest("PATCH", `/api/products/${product.id}`, data);
      } else {
        return await apiRequest("POST", "/api/products", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-product">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Producto" : "Agregar Producto"}</DialogTitle>
          <DialogDescription>
            Complete los datos del producto
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Nombre *</Label>
            <Input
              id="product-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Widget A100"
              required
              data-testid="input-product-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-description">Descripción</Label>
            <Input
              id="product-description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción opcional"
              data-testid="input-product-description"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-product">
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CauseDialog({ open, cause, onClose }: { 
  open: boolean; 
  cause?: StoppageCause; 
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<InsertStoppageCause>({ 
    name: "", 
    color: "#3b82f6",
    requiresMaintenance: false 
  });

  // Populate form when cause changes
  useEffect(() => {
    if (cause) {
      setFormData({ 
        name: cause.name, 
        color: cause.color,
        requiresMaintenance: cause.requiresMaintenance 
      });
    } else {
      setFormData({ name: "", color: "#3b82f6", requiresMaintenance: false });
    }
  }, [cause, open]);

  const mutation = useMutation({
    mutationFn: async (data: InsertStoppageCause) => {
      if (cause) {
        return await apiRequest("PATCH", `/api/stoppage-causes/${cause.id}`, data);
      } else {
        return await apiRequest("POST", "/api/stoppage-causes", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stoppage-causes"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-cause">
        <DialogHeader>
          <DialogTitle>{cause ? "Editar Causa" : "Agregar Causa de Parada"}</DialogTitle>
          <DialogDescription>
            Configure la causa de parada y su comportamiento
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cause-name">Nombre *</Label>
            <Input
              id="cause-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Falla Mecánica"
              required
              data-testid="input-cause-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cause-color">Color del Botón</Label>
            <div className="flex gap-2">
              <Input
                id="cause-color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10"
                data-testid="input-cause-color"
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="requires-maintenance"
              checked={formData.requiresMaintenance}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, requiresMaintenance: checked })
              }
              data-testid="switch-requires-maintenance"
            />
            <Label htmlFor="requires-maintenance" className="font-medium cursor-pointer">
              Requiere intervención de mantenimiento
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-cause">
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TechnicianDialog({ open, technician, onClose }: { 
  open: boolean; 
  technician?: Technician; 
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<InsertTechnician>({ 
    name: "", 
    email: "" 
  });

  // Populate form when technician changes
  useEffect(() => {
    if (technician) {
      setFormData({ name: technician.name, email: technician.email });
    } else {
      setFormData({ name: "", email: "" });
    }
  }, [technician, open]);

  const mutation = useMutation({
    mutationFn: async (data: InsertTechnician) => {
      if (technician) {
        return await apiRequest("PATCH", `/api/technicians/${technician.id}`, data);
      } else {
        return await apiRequest("POST", "/api/technicians", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-technician">
        <DialogHeader>
          <DialogTitle>{technician ? "Editar Técnico" : "Agregar Técnico"}</DialogTitle>
          <DialogDescription>
            Complete los datos del técnico de mantenimiento
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="technician-name">Nombre *</Label>
            <Input
              id="technician-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Juan Pérez"
              required
              data-testid="input-technician-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="technician-email">Email *</Label>
            <Input
              id="technician-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="juan.perez@empresa.com"
              required
              data-testid="input-technician-email"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-technician">
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const ROLE_LABELS: Record<string, string> = {
  operator: "Operador",
  technician: "Técnico",
  maintenance_chief: "Jefe de Mantenimiento",
  supervisor: "Supervisor",
  admin: "Administrador",
};

const ROLE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  admin: "destructive",
  supervisor: "default",
  maintenance_chief: "default",
  technician: "secondary",
  operator: "outline",
};

function UsersSection({ users, onEdit, onAdd }: { 
  users?: UserWithoutPassword[]; 
  onEdit: (user: UserWithoutPassword) => void;
  onAdd: () => void;
}) {
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/users/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Usuarios del Sistema</h2>
        <Button onClick={onAdd} data-testid="button-add-user">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Usuario
        </Button>
      </div>

      <div className="grid gap-4">
        {users?.map((user) => (
          <Card key={user.id} data-testid={`card-user-${user.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{user.name}</h3>
                    <Badge variant={ROLE_COLORS[user.role]} data-testid={`badge-role-${user.id}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.phone && (
                    <p className="text-sm text-muted-foreground">Tel: {user.phone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(user)}
                    data-testid={`button-edit-user-${user.id}`}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(user.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-user-${user.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface UserFormData {
  name: string;
  email: string;
  role: string;
  phone?: string;
  password?: string;
}

function UserDialog({ open, user, onClose }: { 
  open: boolean; 
  user?: UserWithoutPassword; 
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<UserFormData>({ 
    name: "", 
    email: "", 
    role: "operator",
    phone: "",
    password: "",
  });

  // Populate form when user changes
  useEffect(() => {
    if (user) {
      setFormData({ 
        name: user.name, 
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        password: "", // Don't populate password when editing
      });
    } else {
      setFormData({ 
        name: "", 
        email: "", 
        role: "operator",
        phone: "",
        password: "",
      });
    }
  }, [user, open]);

  const mutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (user) {
        // When editing, only send changed fields
        const updateData: any = {
          name: data.name,
          email: data.email,
          role: data.role,
          phone: data.phone || null,
        };
        // Only include password if it was changed
        if (data.password) {
          updateData.password = data.password;
        }
        return await apiRequest("PATCH", `/api/users/${user.id}`, updateData);
      } else {
        // When creating, password is required
        return await apiRequest("POST", "/api/users", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-user" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Editar Usuario" : "Agregar Usuario"}</DialogTitle>
          <DialogDescription>
            {user 
              ? "Modifica los datos del usuario. Deja la contraseña en blanco para mantener la actual."
              : "Complete los datos del nuevo usuario del sistema"
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Nombre *</Label>
            <Input
              id="user-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Juan Pérez"
              required
              data-testid="input-user-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email *</Label>
            <Input
              id="user-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="juan.perez@empresa.com"
              required
              data-testid="input-user-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">Rol *</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger id="user-role" data-testid="select-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Operador</SelectItem>
                <SelectItem value="technician">Técnico</SelectItem>
                <SelectItem value="maintenance_chief">Jefe de Mantenimiento</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-phone">Teléfono</Label>
            <Input
              id="user-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+54 11 1234-5678"
              data-testid="input-user-phone"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">
              Contraseña {user ? "" : "*"}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={user ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"}
              required={!user}
              data-testid="input-user-password"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-user">
              {mutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
