import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Check, AlertCircle } from "lucide-react";
import type { Machine, Product, StoppageCause } from "@shared/schema";

const MACHINE_CONFIG_KEY = "operator_machine_config";
const MACHINE_PASSCODE = "1234"; // Simple passcode protection

export default function OperatorView() {
  const [configuredMachine, setConfiguredMachine] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successCause, setSuccessCause] = useState("");

  // Load machine configuration from localStorage on mount
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

  const { data: causes } = useQuery<StoppageCause[]>({
    queryKey: ["/api/stoppage-causes"],
  });

  const handleOpenConfig = () => {
    setPasscode("");
    setPasscodeError(false);
    setShowConfigDialog(true);
  };

  const handleVerifyPasscode = () => {
    if (passcode === MACHINE_PASSCODE) {
      setPasscodeError(false);
      // Continue to machine selection
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

  const handleCauseClick = async (cause: StoppageCause) => {
    if (!configuredMachine || !selectedProduct || !quantity) {
      return;
    }

    try {
      // Send minimal data - server determines maintenance requirements automatically
      const response = await fetch("/api/downtime-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: configuredMachine,
          causeId: cause.id,
          productId: selectedProduct,
          quantity: quantity,
        }),
      });

      if (response.ok) {
        setSuccessCause(cause.name);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      console.error("Error recording downtime:", error);
    }
  };

  const currentMachine = machines?.find(m => m.id === configuredMachine);

  // Show configuration screen if no machine is configured
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

  const isReadyToRecord = selectedProduct && quantity > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-12 shadow-2xl">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                <Check className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold">¡Registrado!</h2>
              <p className="text-xl text-muted-foreground">{successCause}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Header with machine info */}
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

      {/* Product and Quantity Selection */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">Producto en Producción</Label>
            <Select
              value={selectedProduct?.toString()}
              onValueChange={(value) => setSelectedProduct(parseInt(value))}
            >
              <SelectTrigger 
                className="h-16 text-lg"
                data-testid="select-product"
              >
                <SelectValue placeholder="Seleccione producto" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((product) => (
                  <SelectItem 
                    key={product.id} 
                    value={product.id.toString()}
                    data-testid={`option-product-${product.id}`}
                  >
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-base font-medium">
              Cantidad a Producir
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity || ""}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="h-16 text-lg"
              placeholder="0"
              data-testid="input-quantity"
            />
          </div>
        </div>

        {/* Cause Buttons Grid */}
        <div>
          <h2 className="text-lg font-medium mb-4">Causas de Parada</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {causes?.map((cause) => (
              <Button
                key={cause.id}
                onClick={() => handleCauseClick(cause)}
                disabled={!isReadyToRecord}
                className="h-36 flex flex-col items-center justify-center gap-3 text-lg font-medium hover-elevate active-elevate-2"
                style={{
                  backgroundColor: isReadyToRecord ? cause.color : undefined,
                  color: isReadyToRecord ? "#ffffff" : undefined,
                }}
                data-testid={`button-cause-${cause.id}`}
              >
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <span className="text-center leading-tight">{cause.name}</span>
              </Button>
            ))}
          </div>

          {!isReadyToRecord && (
            <p className="text-center text-muted-foreground mt-6">
              Seleccione producto y cantidad para habilitar registro de paradas
            </p>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
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
