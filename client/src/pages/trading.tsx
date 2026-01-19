import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowDownRight,
  ArrowUpRight,
  Settings,
  Send,
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Edit3
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { TradingOrder, IbkrSettings } from "@shared/schema";

interface OrderFormData {
  symbol: string;
  action: "BUY" | "SELL";
  orderType: "LIMIT" | "MARKET" | "STOP";
  quantity: number;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  notes: string;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  error?: string;
}

interface OrderSubmitResult {
  success: boolean;
  orderId?: number;
  ibkrOrderId?: number;
  message: string;
  error?: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "bg-muted", text: "text-muted-foreground" },
  PENDING: { bg: "bg-yellow-500/20", text: "text-yellow-500" },
  SUBMITTED: { bg: "bg-blue-500/20", text: "text-blue-500" },
  FILLED: { bg: "bg-green-500/20", text: "text-green-500" },
  CANCELLED: { bg: "bg-muted", text: "text-muted-foreground" },
  REJECTED: { bg: "bg-red-500/20", text: "text-red-500" },
};

export default function TradingPage() {
  const { toast } = useToast();
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<TradingOrder | null>(null);
  
  const [settingsForm, setSettingsForm] = useState({
    host: "127.0.0.1",
    port: 4002,
    clientId: 1,
  });

  const [orderForm, setOrderForm] = useState<OrderFormData>({
    symbol: "",
    action: "BUY",
    orderType: "LIMIT",
    quantity: 1,
    entryPrice: "",
    stopLoss: "",
    takeProfit: "",
    notes: "",
  });

  const { data: ibkrSettings, isLoading: loadingSettings } = useQuery<IbkrSettings | null>({
    queryKey: ["/api/ibkr/settings"],
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<TradingOrder[]>({
    queryKey: ["/api/trading-orders"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: typeof settingsForm) => apiRequest("POST", "/api/ibkr/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ibkr/settings"] });
      setShowSettingsDialog(false);
      toast({ title: "Settings Saved", description: "IBKR connection settings updated." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ibkr/test-connection");
      return res.json() as Promise<ConnectionTestResult>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Connection Ready", description: data.message });
      } else {
        toast({ variant: "destructive", title: "Connection Issue", description: data.error || data.message });
      }
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Connection test failed." });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: Omit<OrderFormData, "notes"> & { notes?: string | null }) => 
      apiRequest("POST", "/api/trading-orders", {
        ...data,
        stopLoss: data.stopLoss || null,
        takeProfit: data.takeProfit || null,
        notes: data.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-orders"] });
      setShowNewOrderDialog(false);
      resetOrderForm();
      toast({ title: "Order Created", description: "Draft order ready for review." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to create order." });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TradingOrder> }) => 
      apiRequest("PATCH", `/api/trading-orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-orders"] });
      setEditingOrder(null);
      toast({ title: "Order Updated", description: "Changes saved." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to update order." });
    },
  });

  const submitOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/trading-orders/${orderId}/submit`);
      return res.json() as Promise<OrderSubmitResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-orders"] });
      if (data.success) {
        toast({ title: "Order Submitted", description: data.message });
      } else {
        toast({ variant: "destructive", title: "Submission Failed", description: data.error || data.message });
      }
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit order." });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/trading-orders/${orderId}/cancel`);
      return res.json() as Promise<OrderSubmitResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-orders"] });
      toast({ title: data.success ? "Order Cancelled" : "Cancellation Failed", description: data.message });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to cancel order." });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: number) => apiRequest("DELETE", `/api/trading-orders/${orderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading-orders"] });
      toast({ title: "Order Deleted", description: "Order removed." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete order." });
    },
  });

  const resetOrderForm = () => {
    setOrderForm({
      symbol: "",
      action: "BUY",
      orderType: "LIMIT",
      quantity: 1,
      entryPrice: "",
      stopLoss: "",
      takeProfit: "",
      notes: "",
    });
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settingsForm);
  };

  const handleCreateOrder = () => {
    if (!orderForm.symbol || !orderForm.entryPrice || orderForm.quantity <= 0) {
      toast({ variant: "destructive", title: "Invalid Order", description: "Please fill in all required fields." });
      return;
    }
    createOrderMutation.mutate(orderForm);
  };

  const handleUpdateOrder = () => {
    if (!editingOrder) return;
    updateOrderMutation.mutate({
      id: editingOrder.id,
      data: {
        entryPrice: editingOrder.entryPrice,
        stopLoss: editingOrder.stopLoss,
        takeProfit: editingOrder.takeProfit,
        quantity: editingOrder.quantity,
      },
    });
  };

  const calculateRiskReward = (entry: number, sl: number, tp: number): string => {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk === 0) return "N/A";
    return (reward / risk).toFixed(2);
  };

  const draftOrders = orders?.filter(o => o.status === "DRAFT") || [];
  const activeOrders = orders?.filter(o => ["PENDING", "SUBMITTED"].includes(o.status)) || [];
  const completedOrders = orders?.filter(o => ["FILLED", "CANCELLED", "REJECTED"].includes(o.status)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Server className="w-6 h-6 text-primary" />
            IBKR Trading
          </h2>
          <p className="text-muted-foreground mt-1">
            Create and submit orders to Interactive Brokers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => testConnectionMutation.mutate()}
            disabled={testConnectionMutation.isPending}
            data-testid="button-test-connection"
          >
            {testConnectionMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </Button>
          
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (ibkrSettings) {
                    setSettingsForm({
                      host: ibkrSettings.host,
                      port: ibkrSettings.port,
                      clientId: ibkrSettings.clientId,
                    });
                  }
                }}
                data-testid="button-ibkr-settings"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>IBKR Connection Settings</DialogTitle>
                <DialogDescription>
                  Configure your Interactive Brokers Gateway connection. Run IB Gateway locally to enable trade execution.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Gateway Host</Label>
                  <Input
                    value={settingsForm.host}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="127.0.0.1"
                    data-testid="input-ibkr-host"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gateway Port</Label>
                  <Input
                    type="number"
                    value={settingsForm.port}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, port: parseInt(e.target.value) || 4002 }))}
                    placeholder="4002 (paper) or 4001 (live)"
                    data-testid="input-ibkr-port"
                  />
                  <p className="text-xs text-muted-foreground">4002 = Paper Trading, 4001 = Live Trading</p>
                </div>
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input
                    type="number"
                    value={settingsForm.clientId}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, clientId: parseInt(e.target.value) || 1 }))}
                    placeholder="1"
                    data-testid="input-ibkr-client-id"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>Cancel</Button>
                <Button 
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-ibkr-settings"
                >
                  {updateSettingsMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Settings
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetOrderForm} data-testid="button-new-order">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
                <DialogDescription>
                  Create a draft order to review before submission.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Symbol *</Label>
                    <Input
                      value={orderForm.symbol}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                      placeholder="AAPL"
                      data-testid="input-order-symbol"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Action *</Label>
                    <Select value={orderForm.action} onValueChange={(v) => setOrderForm(prev => ({ ...prev, action: v as "BUY" | "SELL" }))}>
                      <SelectTrigger data-testid="select-order-action">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUY">BUY</SelectItem>
                        <SelectItem value="SELL">SELL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Order Type</Label>
                    <Select value={orderForm.orderType} onValueChange={(v) => setOrderForm(prev => ({ ...prev, orderType: v as "LIMIT" | "MARKET" | "STOP" }))}>
                      <SelectTrigger data-testid="select-order-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LIMIT">LIMIT</SelectItem>
                        <SelectItem value="MARKET">MARKET</SelectItem>
                        <SelectItem value="STOP">STOP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                      min={1}
                      data-testid="input-order-quantity"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Entry Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={orderForm.entryPrice}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, entryPrice: e.target.value }))}
                    placeholder="0.00"
                    data-testid="input-order-entry"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stop Loss</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={orderForm.stopLoss}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, stopLoss: e.target.value }))}
                      placeholder="0.00"
                      data-testid="input-order-sl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Take Profit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={orderForm.takeProfit}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, takeProfit: e.target.value }))}
                      placeholder="0.00"
                      data-testid="input-order-tp"
                    />
                  </div>
                </div>
                {orderForm.entryPrice && orderForm.stopLoss && orderForm.takeProfit && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Risk/Reward Ratio:{" "}
                      <span className="font-medium text-foreground">
                        1:{calculateRiskReward(
                          parseFloat(orderForm.entryPrice),
                          parseFloat(orderForm.stopLoss),
                          parseFloat(orderForm.takeProfit)
                        )}
                      </span>
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewOrderDialog(false)}>Cancel</Button>
                <Button 
                  onClick={handleCreateOrder}
                  disabled={createOrderMutation.isPending}
                  data-testid="button-create-order"
                >
                  {createOrderMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Create Draft
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {ibkrSettings && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  ibkrSettings.isConnected ? "bg-green-500" : "bg-yellow-500"
                )} />
                <div>
                  <p className="font-medium">
                    Gateway: {ibkrSettings.host}:{ibkrSettings.port}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Client ID: {ibkrSettings.clientId} | {ibkrSettings.port === 4002 ? "Paper Trading" : "Live Trading"}
                  </p>
                </div>
              </div>
              {ibkrSettings.lastConnectedAt && (
                <p className="text-xs text-muted-foreground">
                  Last connected: {new Date(ibkrSettings.lastConnectedAt).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="drafts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="drafts" data-testid="tab-drafts">
            Drafts ({draftOrders.length})
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            History ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drafts" className="space-y-4">
          {loadingOrders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : draftOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No draft orders</p>
                <p className="text-sm text-muted-foreground mt-1">Create a new order to get started</p>
              </CardContent>
            </Card>
          ) : (
            draftOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order}
                onEdit={() => setEditingOrder(order)}
                onSubmit={() => submitOrderMutation.mutate(order.id)}
                onDelete={() => deleteOrderMutation.mutate(order.id)}
                isSubmitting={submitOrderMutation.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No active orders</p>
              </CardContent>
            </Card>
          ) : (
            activeOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order}
                onCancel={() => cancelOrderMutation.mutate(order.id)}
                isCancelling={cancelOrderMutation.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No order history</p>
              </CardContent>
            </Card>
          ) : (
            completedOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order}
                onDelete={() => deleteOrderMutation.mutate(order.id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Order - {editingOrder?.symbol}</DialogTitle>
            <DialogDescription>
              Modify entry price, stop loss, or take profit before submission.
            </DialogDescription>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Entry Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingOrder.entryPrice}
                  onChange={(e) => setEditingOrder(prev => prev ? { ...prev, entryPrice: e.target.value } : null)}
                  data-testid="input-edit-entry"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stop Loss</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingOrder.stopLoss || ""}
                    onChange={(e) => setEditingOrder(prev => prev ? { ...prev, stopLoss: e.target.value || null } : null)}
                    data-testid="input-edit-sl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Take Profit</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingOrder.takeProfit || ""}
                    onChange={(e) => setEditingOrder(prev => prev ? { ...prev, takeProfit: e.target.value || null } : null)}
                    data-testid="input-edit-tp"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={editingOrder.quantity}
                  onChange={(e) => setEditingOrder(prev => prev ? { ...prev, quantity: parseInt(e.target.value) || 1 } : null)}
                  min={1}
                  data-testid="input-edit-quantity"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOrder(null)}>Cancel</Button>
            <Button 
              onClick={handleUpdateOrder}
              disabled={updateOrderMutation.isPending}
              data-testid="button-save-order"
            >
              {updateOrderMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderCard({ 
  order, 
  onEdit, 
  onSubmit, 
  onCancel, 
  onDelete,
  isSubmitting,
  isCancelling 
}: { 
  order: TradingOrder;
  onEdit?: () => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
  isCancelling?: boolean;
}) {
  const status = statusColors[order.status] || statusColors.DRAFT;
  
  return (
    <Card data-testid={`order-card-${order.id}`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              order.action === "BUY" ? "bg-green-500/20" : "bg-red-500/20"
            )}>
              {order.action === "BUY" ? (
                <ArrowUpRight className="w-5 h-5 text-green-500" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{order.symbol}</span>
                <Badge className={cn(status.bg, status.text, "text-xs")}>
                  {order.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {order.orderType}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {order.action} {order.quantity} shares @ ${order.entryPrice}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="grid grid-cols-2 gap-x-4 text-sm">
              {order.stopLoss && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">SL:</span>
                  <span className="text-red-500">${order.stopLoss}</span>
                </div>
              )}
              {order.takeProfit && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">TP:</span>
                  <span className="text-green-500">${order.takeProfit}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {order.status === "DRAFT" && (
                <>
                  {onEdit && (
                    <Button variant="outline" size="sm" onClick={onEdit} data-testid={`button-edit-${order.id}`}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  )}
                  {onSubmit && (
                    <Button size="sm" onClick={onSubmit} disabled={isSubmitting} data-testid={`button-submit-${order.id}`}>
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                      Submit
                    </Button>
                  )}
                </>
              )}
              {["PENDING", "SUBMITTED"].includes(order.status) && onCancel && (
                <Button variant="destructive" size="sm" onClick={onCancel} disabled={isCancelling} data-testid={`button-cancel-${order.id}`}>
                  {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel"}
                </Button>
              )}
              {onDelete && ["DRAFT", "CANCELLED", "REJECTED", "FILLED"].includes(order.status) && (
                <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-${order.id}`}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {order.ibkrOrderId && (
          <p className="text-xs text-muted-foreground mt-2">
            IBKR Order ID: {order.ibkrOrderId}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
