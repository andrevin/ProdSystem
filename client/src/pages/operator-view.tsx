import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Check, AlertCircle, PlayCircle, StopCircle, PackageCheck, Lock } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-user";
import { useWebSocket } from "@/lib/websocket";
import type { Machine, Product, StoppageCause, ProductionBatch } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const MACHINE_CONFIG_KEY = "operator_machine_config";
const MACHINE_PASSCODE = "1234";

export default function OperatorView() {
  const { data: user } = useUser();
  const { isConnected, sendMessage, subscribe } = useWebSocket(user || null);
  const [configuredMachine, setConfiguredMachine] = useState<number | null>(null);

  // Join machine room when machine is configured
  useEffect(() => {
    if (isConnected && configuredMachine && sendMessage) {
      console.log(`[Operator] Joining machine room ${configuredMachine}`);
      sendMessage({
        type: "join_machine",
        machineId: configuredMachine
      });

      // Leave room when component unmounts or machine changes
      return () => {
        sendMessage({
          type: "leave_machine",
          machineId: configuredMachine
        });
      };
    }
  }, [isConnected, configuredMachine, sendMessage]);

  // Subscribe to machine status changes for the configured machine
  useEffect(() => {
    if (!subscribe || !configuredMachine) return;

    const unsubscribe = subscribe("machine_status_changed", (message) => {
      if (message.machineId === configuredMachine) {
        console.log(`[Operator] Machine ${configuredMachine} status changed:`, message.data);
        // Query invalidation already handled by handleWebSocketMessage
        // This subscription is for UI-specific reactions (optional)
      }
    });

    return unsubscribe;
  }, [subscribe, configuredMachine]);

  // Subscribe to ticket closed events (for automatic unlock)
  useEffect(() => {
    if (!subscribe || !configuredMachine) return;

    const unsubscribe = subscribe("ticket_closed", (message) => {
      if (message.machineId === configuredMachine) {
        console.log(`[Operator] Ticket closed for machine ${configuredMachine}, machine is resumable`);
        setIsResumable(true);
      }
    });

    return unsubscribe;
  }, [subscribe, configuredMachine]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);
  
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [plannedQuantity, setPlannedQuantity] = useState<number>(0);
  const [productSearch, setProductSearch] = useState("");
  
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [actualQuantity, setActualQuantity] = useState<number>(0);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isResumable, setIsResumable] = useState(false);
  const prevStatusRef = useRef<string | undefined>();

  useEffect(() => {
    const saved = localStorage.getItem(MACHINE_CONFIG_KEY);
    if (saved) {
      setConfiguredMachine(parseInt(saved));
    }
  }, []);

  const { data: machines } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Filter products by name OR SKU
  const filteredProducts = products?.filter((product) => {
    if (!productSearch) return true;
    const search = productSearch.toLowerCase();
    return (
      product.name.toLowerCase().includes(search) ||
      product.sku.toLowerCase().includes(search)
    );
  });

  const { data: causes } = useQuery<StoppageCause[]>({
    queryKey: ["/api/stoppage-causes"],
  });

  const { data: activeBatch, isLoading: isLoadingBatch } = useQuery<ProductionBatch | null>({
    queryKey: ["/api/machines", configuredMachine, "active-batch"],
    queryFn: async () => {
      const res = await fetch(`/api/machines/${configuredMachine}/active-batch`, {
        credentials: "include",
      });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch active batch");
      }
      return res.json();
    },
    enabled: !!configuredMachine,
    retry: false,
  });

  const currentMachine = machines?.find(m => m.id === configuredMachine);
  const currentProduct = products?.find(p => p.id === activeBatch?.productId);

  useEffect(() => {
    const currentStatus = currentMachine?.operationalStatus;
    if (
      currentStatus === "Bloqueada" &&
      prevStatusRef.current !== "Bloqueada"
    ) {
      setIsResumable(false);
    }
    prevStatusRef.current = currentStatus;
  }, [currentMachine?.operationalStatus]);

  const startBatchMutation = useMutation({
    mutationFn: async (data: { machineId: number; productId: number; plannedQuantity: number; operatorId?: number }) => {
      return await apiRequest("POST", "/api/batches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machines", configuredMachine, "active-batch"] });
      setShowBatchDialog(false);
      setSelectedProduct(null);
      setPlannedQuantity(0);
      setSuccessMessage("¡Lote iniciado!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    },
  });

  const finishBatchMutation = useMutation({
    mutationFn: async ({ batchId, actualQuantity }: { batchId: number; actualQuantity: number }) => {
      return await apiRequest("POST", `/api/batches/${batchId}/finish`, { actualQuantity });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/machines", configuredMachine, "active-batch"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/machines", configuredMachine, "active-batch"] });
      setShowFinishDialog(false);
      setActualQuantity(0);
      setSuccessMessage("¡Lote finalizado!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    },
  });

  const recordDowntimeMutation = useMutation({
    mutationFn: async (data: { machineId: number; causeId: number; batchId?: number }) => {
      return await apiRequest("POST", "/api/downtime-records", data);
    },
    onSuccess: (_, variables) => {
      const cause = causes?.find(c => c.id === variables.causeId);
      setSuccessMessage(`¡Parada registrada: ${cause?.name}!`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    },
  });

  const resumeProductionMutation = useMutation({
    mutationFn: async (machineId: number) => {
      return await apiRequest("POST", `/api/machines/${machineId}/resume`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      setIsResumable(false);
      setSuccessMessage("¡Producción reanudada!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    },
  });

  const handleOpenConfig = () => {
    setPasscode("");
    setPasscodeError(false);
    setShowConfigDialog(true);
  };

  const handleVerifyPasscode = () => {
    if (passcode === MACHINE_PASSCODE) {
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  const handleSaveMachine = (machineId: number) => {
    localStorage.setItem(MACHINE_CONFIG_KEY, machineId.toString());
    setConfiguredMachine(machineId);
    setShowConfigDialog(false);
    setPasscode("");
  };

  const handleStartBatch = () => {
    if (!configuredMachine || !selectedProduct || !plannedQuantity) return;
    startBatchMutation.mutate({
      machineId: configuredMachine,
      productId: selectedProduct,
      plannedQuantity,
      operatorId: user?.id,
    });
  };

  const handleFinishBatch = () => {
    if (!activeBatch || actualQuantity < 0) return;
    finishBatchMutation.mutate({
      batchId: activeBatch.id,
      actualQuantity,
    });
  };

  const handleCauseClick = (cause: StoppageCause) => {
    if (!configuredMachine) return;
    recordDowntimeMutation.mutate({
      machineId: configuredMachine,
      causeId: cause.id,
      batchId: activeBatch?.id,
    });
  };

  if (!configuredMachine || !currentMachine) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-6">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold mb-2">Configuración Requerida</h1>
              <p className="text-muted-foreground">
                Esta estación necesita ser configurada. Por favor, contacte a un supervisor.
              </p>
            </div>
            <Button
              onClick={handleOpenConfig}
              size="lg"
              className="w-full"
              data-testid="button-configure-machine"
            >
              Configurar Máquina
            </Button>
          </div>
        </Card>

        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent data-testid="dialog-machine-config">
            <DialogHeader>
              <DialogTitle>Configurar Estación</DialogTitle>
              <DialogDescription>
                Ingrese el código de supervisor y seleccione la máquina para esta estación
              </DialogDescription>
            </DialogHeader>
            
            {passcode !== MACHINE_PASSCODE && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="passcode">Código de Supervisor</Label>
                  <Input
                    id="passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Ingrese código"
                    data-testid="input-passcode"
                  />
                  {passcodeError && (
                    <p className="text-sm text-destructive">Código incorrecto</p>
                  )}
                </div>
                <Button 
                  onClick={handleVerifyPasscode} 
                  className="w-full"
                  data-testid="button-verify-passcode"
                >
                  Verificar
                </Button>
              </div>
            )}

            {passcode === MACHINE_PASSCODE && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Seleccione Máquina</Label>
                  <div className="grid gap-2">
                    {machines?.map((machine) => (
                      <Button
                        key={machine.id}
                        onClick={() => handleSaveMachine(machine.id)}
                        variant="outline"
                        className="justify-start h-auto py-4"
                        data-testid={`button-select-machine-${machine.id}`}
                      >
                        <div className="text-left">
                          <div className="font-medium">{machine.name}</div>
                          {machine.description && (
                            <div className="text-sm text-muted-foreground">
                              {machine.description}
                            </div>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isLoadingBatch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {showSuccess && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-12 shadow-2xl">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                <Check className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold">¡Registrado!</h2>
              <p className="text-xl text-muted-foreground">{successMessage}</p>
            </div>
          </Card>
        </div>
      )}

      <div className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Máquina</div>
                <div className="text-xl font-bold" data-testid="text-current-machine">
                  {currentMachine.name}
                </div>
              </div>
              {currentMachine.operationalStatus === "Bloqueada" && (
                <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 text-destructive rounded-md">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">Bloqueada</span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenConfig}
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {!activeBatch ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Card className="w-full max-w-md p-8">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                  <PackageCheck className="w-12 h-12 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Sin Lote Activo</h2>
                  <p className="text-muted-foreground">
                    Inicie un nuevo lote de producción para comenzar
                  </p>
                </div>
                <Button
                  onClick={() => setShowBatchDialog(true)}
                  size="lg"
                  className="w-full"
                  data-testid="button-start-batch"
                  disabled={currentMachine.operationalStatus === "Bloqueada"}
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  INICIAR LOTE
                </Button>
                {currentMachine.operationalStatus === "Bloqueada" && (
                  <p className="text-sm text-destructive">
                    No se puede iniciar un lote mientras la máquina está bloqueada
                  </p>
                )}
              </div>
            </Card>
          </div>
        ) : (
          <>
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-1">Lote Activo</div>
                  <h2 className="text-2xl font-bold mb-4" data-testid="text-batch-product">
                    {currentProduct?.name || "Producto desconocido"}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Cantidad Planificada</div>
                      <div className="text-lg font-semibold" data-testid="text-planned-quantity">
                        {activeBatch.plannedQuantity}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Estado</div>
                      <div className="text-lg font-semibold" data-testid="text-batch-status">
                        {activeBatch.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Tiempo Transcurrido</div>
                      <div className="text-lg font-semibold">
                        {formatDistanceToNow(new Date(activeBatch.timestampStart), { 
                          locale: es,
                          addSuffix: false 
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Lote ID</div>
                      <div className="text-lg font-semibold">#{activeBatch.id}</div>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setActualQuantity(activeBatch.plannedQuantity);
                    setShowFinishDialog(true);
                  }}
                  variant="default"
                  size="lg"
                  data-testid="button-finish-batch"
                >
                  <StopCircle className="w-5 h-5 mr-2" />
                  FINALIZAR LOTE
                </Button>
              </div>
            </Card>

            {currentMachine.operationalStatus === "Bloqueada" && (
              <Card className="p-8 bg-destructive/10 border-destructive">
                <div className="text-center space-y-4">
                  <Lock className="w-16 h-16 mx-auto text-destructive" />
                  <div>
                    <h3 className="text-xl font-bold text-destructive mb-2">
                      MÁQUINA BLOQUEADA POR MANTENIMIENTO
                    </h3>
                    <p className="text-muted-foreground">
                      No se puede reanudar la producción hasta que el mantenimiento sea completado
                    </p>
                  </div>
                  <Button
                    onClick={() => resumeProductionMutation.mutate(currentMachine.id)}
                    disabled={!isResumable || resumeProductionMutation.isPending}
                    size="lg"
                    className="mt-4"
                    data-testid="button-resume-production"
                  >
                    {resumeProductionMutation.isPending ? "Reanudando..." : "Reanudar"}
                  </Button>
                </div>
              </Card>
            )}

            {currentMachine.operationalStatus === "Parada" && (
              <Card className="p-8 bg-yellow-500/10 border-yellow-500">
                <div className="text-center space-y-4">
                  <AlertCircle className="w-16 h-16 mx-auto text-yellow-500" />
                  <div>
                    <h3 className="text-xl font-bold text-yellow-500 mb-2">
                      MÁQUINA PARADA
                    </h3>
                    <p className="text-muted-foreground">
                      La producción está actualmente parada.
                    </p>
                  </div>
                  <Button
                    onClick={() => resumeProductionMutation.mutate(currentMachine.id)}
                    disabled={resumeProductionMutation.isPending}
                    size="lg"
                    className="mt-4"
                    data-testid="button-resume-production"
                  >
                    {resumeProductionMutation.isPending ? "Reanudando..." : "Reanudar"}
                  </Button>
                </div>
              </Card>
            )}

            {currentMachine.operationalStatus === "Operativa" && (
              <div>
                <h2 className="text-lg font-medium mb-4">Causas de Parada</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {causes?.map((cause) => (
                    <Button
                      key={cause.id}
                      onClick={() => handleCauseClick(cause)}
                      disabled={
                        recordDowntimeMutation.isPending ||
                        (cause.requiresMaintenance && currentMachine.operationalStatus === "Bloqueada")
                      }
                      className="h-36 flex flex-col items-center justify-center gap-3 text-lg font-medium hover-elevate active-elevate-2"
                      style={{
                        backgroundColor: cause.color,
                        color: "#ffffff",
                      }}
                      data-testid={`button-cause-${cause.id}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        {cause.requiresMaintenance ? (
                          <Lock className="w-6 h-6" />
                        ) : (
                          <AlertCircle className="w-6 h-6" />
                        )}
                      </div>
                      <span className="text-center leading-tight">{cause.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent data-testid="dialog-start-batch">
          <DialogHeader>
            <DialogTitle>Iniciar Nuevo Lote</DialogTitle>
            <DialogDescription>
              Seleccione el producto y la cantidad planificada para este lote
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar Producto (Nombre o SKU)</Label>
              <Input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                data-testid="input-product-search"
              />
            </div>
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select
                value={selectedProduct?.toString()}
                onValueChange={(value) => setSelectedProduct(parseInt(value))}
              >
                <SelectTrigger data-testid="select-batch-product">
                  <SelectValue placeholder="Seleccione producto" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts?.map((product) => (
                    <SelectItem 
                      key={product.id} 
                      value={product.id.toString()}
                      data-testid={`option-product-${product.id}`}
                    >
                      {product.name} - SKU: {product.sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="planned-quantity">Cantidad Planificada</Label>
              <Input
                id="planned-quantity"
                type="number"
                min="1"
                value={plannedQuantity || ""}
                onChange={(e) => setPlannedQuantity(parseInt(e.target.value) || 0)}
                placeholder="0"
                data-testid="input-planned-quantity"
              />
            </div>
            <Button
              onClick={handleStartBatch}
              disabled={!selectedProduct || !plannedQuantity || startBatchMutation.isPending}
              className="w-full"
              data-testid="button-confirm-start-batch"
            >
              {startBatchMutation.isPending ? "Iniciando..." : "Iniciar Lote"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent data-testid="dialog-finish-batch">
          <DialogHeader>
            <DialogTitle>Finalizar Lote</DialogTitle>
            <DialogDescription>
              Ingrese la cantidad real producida en este lote
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-md">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Cantidad Planificada</div>
                  <div className="text-lg font-semibold">{activeBatch?.plannedQuantity}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Producto</div>
                  <div className="text-lg font-semibold">{currentProduct?.name}</div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actual-quantity">Cantidad Real Producida</Label>
              <Input
                id="actual-quantity"
                type="number"
                min="0"
                value={actualQuantity || ""}
                onChange={(e) => setActualQuantity(parseInt(e.target.value) || 0)}
                placeholder="0"
                data-testid="input-actual-quantity"
              />
            </div>
            <Button
              onClick={handleFinishBatch}
              disabled={actualQuantity < 0 || finishBatchMutation.isPending}
              className="w-full"
              data-testid="button-confirm-finish-batch"
            >
              {finishBatchMutation.isPending ? "Finalizando..." : "Finalizar Lote"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent data-testid="dialog-machine-config">
          <DialogHeader>
            <DialogTitle>Cambiar Máquina</DialogTitle>
            <DialogDescription>
              Ingrese el código de supervisor para cambiar la configuración
            </DialogDescription>
          </DialogHeader>
          
          {passcode !== MACHINE_PASSCODE && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passcode-change">Código de Supervisor</Label>
                <Input
                  id="passcode-change"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Ingrese código"
                  data-testid="input-passcode"
                />
                {passcodeError && (
                  <p className="text-sm text-destructive">Código incorrecto</p>
                )}
              </div>
              <Button 
                onClick={handleVerifyPasscode} 
                className="w-full"
                data-testid="button-verify-passcode"
              >
                Verificar
              </Button>
            </div>
          )}

          {passcode === MACHINE_PASSCODE && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Seleccione Nueva Máquina</Label>
                <div className="grid gap-2">
                  {machines?.map((machine) => (
                    <Button
                      key={machine.id}
                      onClick={() => handleSaveMachine(machine.id)}
                      variant={machine.id === configuredMachine ? "default" : "outline"}
                      className="justify-start h-auto py-4"
                      data-testid={`button-select-machine-${machine.id}`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{machine.name}</div>
                        {machine.description && (
                          <div className="text-sm text-muted-foreground">
                            {machine.description}
                          </div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
