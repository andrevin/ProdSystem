import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, PlayCircle, Search, Wrench } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { DowntimeRecordWithRelations, Technician } from "@shared/schema";

export default function MaintenanceView() {
  const [selectedTicket, setSelectedTicket] = useState<DowntimeRecordWithRelations | null>(null);
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);

  const { data: activeTickets, isLoading: loadingActive } = useQuery<DowntimeRecordWithRelations[]>({
    queryKey: ["/api/maintenance-tickets/active"],
  });

  const { data: historicalTickets, isLoading: loadingHistory } = useQuery<DowntimeRecordWithRelations[]>({
    queryKey: ["/api/maintenance-tickets/history"],
  });

  const { data: technicians } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  const acceptTicketMutation = useMutation({
    mutationFn: async ({ ticketId, technicianId }: { ticketId: number; technicianId: number }) => {
      return await apiRequest("PATCH", `/api/maintenance-tickets/${ticketId}/accept`, { technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets/history"] });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async ({ ticketId, notes }: { ticketId: number; notes: string }) => {
      return await apiRequest("PATCH", `/api/maintenance-tickets/${ticketId}/close`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-tickets/history"] });
      setSelectedTicket(null);
      setNotes("");
      setSelectedTechnicianId(null);
    },
  });

  const handleAcceptTicket = (ticket: DowntimeRecordWithRelations) => {
    setSelectedTicket(ticket);
    setSelectedTechnicianId(null);
  };

  const handleConfirmAccept = () => {
    if (selectedTicket && selectedTechnicianId) {
      acceptTicketMutation.mutate({
        ticketId: selectedTicket.id,
        technicianId: selectedTechnicianId,
      });
      setSelectedTicket(null);
      setSelectedTechnicianId(null);
    }
  };

  const handleCloseTicket = (ticket: DowntimeRecordWithRelations) => {
    setSelectedTicket(ticket);
    setNotes("");
  };

  const handleConfirmClose = () => {
    if (selectedTicket) {
      closeTicketMutation.mutate({
        ticketId: selectedTicket.id,
        notes: notes,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      "Abierta": { variant: "destructive", label: "Abierta" },
      "En Progreso": { variant: "default", label: "En Progreso" },
      "Cerrada": { variant: "secondary", label: "Cerrada" },
    };
    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredHistory = historicalTickets?.filter((ticket) => {
    const matchesSearch = searchTerm === "" || 
      ticket.machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.cause.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || ticket.maintenanceStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const TicketCard = ({ ticket, isHistory = false }: { ticket: DowntimeRecordWithRelations; isHistory?: boolean }) => (
    <Card className="hover-elevate" data-testid={`card-ticket-${ticket.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-bold" data-testid={`text-machine-${ticket.id}`}>
                {ticket.machine.name}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{ticket.cause.name}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span data-testid={`text-timestamp-${ticket.id}`}>
                {formatDistanceToNow(new Date(ticket.timestampStart), { 
                  addSuffix: true, 
                  locale: es 
                })}
              </span>
            </div>
          </div>
          <div data-testid={`badge-status-${ticket.id}`}>
            {getStatusBadge(ticket.maintenanceStatus)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ticket.product && (
          <div>
            <span className="text-sm text-muted-foreground">Producto: </span>
            <span className="text-sm font-medium">{ticket.product.name}</span>
          </div>
        )}
        {ticket.technician && (
          <div>
            <span className="text-sm text-muted-foreground">Técnico: </span>
            <span className="text-sm font-medium">{ticket.technician.name}</span>
          </div>
        )}
        {ticket.timestampAccepted && (
          <div>
            <span className="text-sm text-muted-foreground">Aceptado: </span>
            <span className="text-sm">
              {formatDistanceToNow(new Date(ticket.timestampAccepted), { 
                addSuffix: true, 
                locale: es 
              })}
            </span>
          </div>
        )}
        {ticket.timestampClosed && (
          <div>
            <span className="text-sm text-muted-foreground">Cerrado: </span>
            <span className="text-sm">
              {formatDistanceToNow(new Date(ticket.timestampClosed), { 
                addSuffix: true, 
                locale: es 
              })}
            </span>
          </div>
        )}
        {ticket.maintenanceNotes && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-1">Notas:</p>
            <p className="text-sm">{ticket.maintenanceNotes}</p>
          </div>
        )}
        
        {!isHistory && (
          <div className="flex gap-2 pt-2">
            {ticket.maintenanceStatus === "Abierta" && (
              <Button
                onClick={() => handleAcceptTicket(ticket)}
                className="flex-1"
                data-testid={`button-accept-${ticket.id}`}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Aceptar
              </Button>
            )}
            {ticket.maintenanceStatus === "En Progreso" && (
              <Button
                onClick={() => handleCloseTicket(ticket)}
                variant="default"
                className="flex-1"
                data-testid={`button-close-${ticket.id}`}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Cerrar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold mb-2">Dashboard de Mantenimiento</h1>
          <p className="text-muted-foreground">Gestión de tickets de averías y mantenimiento</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active" data-testid="tab-active">
              Tickets Activos
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {loadingActive ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Cargando tickets...</p>
              </div>
            ) : activeTickets && activeTickets.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-3">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-muted-foreground" />
                  <h3 className="text-xl font-medium">No hay tickets activos</h3>
                  <p className="text-muted-foreground">
                    Todos los tickets están cerrados
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por máquina o causa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Abierta">Abierta</SelectItem>
                  <SelectItem value="En Progreso">En Progreso</SelectItem>
                  <SelectItem value="Cerrada">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadingHistory ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Cargando historial...</p>
              </div>
            ) : filteredHistory && filteredHistory.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredHistory.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} isHistory />
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-3">
                  <Search className="w-16 h-16 mx-auto text-muted-foreground" />
                  <h3 className="text-xl font-medium">No se encontraron tickets</h3>
                  <p className="text-muted-foreground">
                    Intenta ajustar los filtros de búsqueda
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Accept Ticket Dialog */}
      <Dialog 
        open={selectedTicket?.maintenanceStatus === "Abierta"} 
        onOpenChange={() => {
          setSelectedTicket(null);
          setSelectedTechnicianId(null);
        }}
      >
        <DialogContent data-testid="dialog-accept-ticket">
          <DialogHeader>
            <DialogTitle>Aceptar Ticket</DialogTitle>
            <DialogDescription>
              Seleccione el técnico que se hará cargo de esta avería
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Técnico Asignado</Label>
              <Select
                value={selectedTechnicianId?.toString()}
                onValueChange={(value) => setSelectedTechnicianId(parseInt(value))}
              >
                <SelectTrigger data-testid="select-technician">
                  <SelectValue placeholder="Seleccione técnico" />
                </SelectTrigger>
                <SelectContent>
                  {technicians?.map((tech) => (
                    <SelectItem 
                      key={tech.id} 
                      value={tech.id.toString()}
                      data-testid={`option-technician-${tech.id}`}
                    >
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTicket(null);
                setSelectedTechnicianId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAccept}
              disabled={!selectedTechnicianId || acceptTicketMutation.isPending}
              data-testid="button-confirm-accept"
            >
              {acceptTicketMutation.isPending ? "Aceptando..." : "Aceptar Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Ticket Dialog */}
      <Dialog 
        open={selectedTicket?.maintenanceStatus === "En Progreso"} 
        onOpenChange={() => {
          setSelectedTicket(null);
          setNotes("");
        }}
      >
        <DialogContent data-testid="dialog-close-ticket">
          <DialogHeader>
            <DialogTitle>Cerrar Ticket</DialogTitle>
            <DialogDescription>
              Agregue notas sobre la resolución de la avería (opcional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notas de Cierre / Causa Raíz</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Se ajustó el sensor de presión hidráulica"
                rows={4}
                data-testid="textarea-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTicket(null);
                setNotes("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmClose}
              disabled={closeTicketMutation.isPending}
              data-testid="button-confirm-close"
            >
              {closeTicketMutation.isPending ? "Cerrando..." : "Cerrar Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
