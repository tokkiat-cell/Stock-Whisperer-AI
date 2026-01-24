import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings, ShoppingCart, Trash2, Edit2, Check, X, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface MoomooSettings {
  id?: number;
  userId?: string;
  host: string;
  port: number;
  tradeAccount: string | null;
  isConnected: boolean;
}

interface MoomooOrder {
  id: number;
  userId: string;
  symbol: string;
  action: string;
  orderType: string;
  quantity: number;
  entryPrice: string;
  stopLoss: string | null;
  takeProfit: string | null;
  status: string;
  moomooOrderId: string | null;
  notes: string | null;
  createdAt: string | null;
}

export default function MoomooTrading() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ entryPrice: string; stopLoss: string; takeProfit: string; quantity: number }>({
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    quantity: 1,
  });

  const { data: settings, isLoading: loadingSettings } = useQuery<MoomooSettings | null>({
    queryKey: ['/api/moomoo/settings'],
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<MoomooOrder[]>({
    queryKey: ['/api/moomoo-orders'],
  });

  const settingsForm = useForm({
    defaultValues: {
      host: '127.0.0.1',
      port: 11111,
      tradeAccount: '',
    },
  });

  useEffect(() => {
    if (settings) {
      settingsForm.reset({
        host: settings.host || '127.0.0.1',
        port: settings.port || 11111,
        tradeAccount: settings.tradeAccount || '',
      });
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { host?: string; port?: number; tradeAccount?: string }) => {
      return apiRequest('POST', '/api/moomoo/settings', data);
    },
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Moomoo connection settings updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/moomoo/settings'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest('PATCH', `/api/moomoo-orders/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Order updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/moomoo-orders'] });
      setEditingOrderId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update order", description: error.message, variant: "destructive" });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/moomoo-orders/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Order deleted" });
      queryClient.invalidateQueries({ queryKey: ['/api/moomoo-orders'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete order", description: error.message, variant: "destructive" });
    },
  });

  const startEdit = (order: MoomooOrder) => {
    setEditingOrderId(order.id);
    setEditValues({
      entryPrice: order.entryPrice,
      stopLoss: order.stopLoss || '',
      takeProfit: order.takeProfit || '',
      quantity: order.quantity,
    });
  };

  const saveEdit = () => {
    if (editingOrderId) {
      updateOrderMutation.mutate({
        id: editingOrderId,
        data: editValues,
      });
    }
  };

  const onSubmitSettings = (data: any) => {
    updateSettingsMutation.mutate({
      host: data.host,
      port: parseInt(data.port),
      tradeAccount: data.tradeAccount || null,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500/10 text-gray-500';
      case 'SUBMITTED': return 'bg-blue-500/10 text-blue-500';
      case 'FILLED': return 'bg-green-500/10 text-green-500';
      case 'CANCELLED': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-moomoo-trading">
          <ShoppingCart className="w-6 h-6 text-primary" />
          Moomoo Trading
        </h1>
        <p className="text-muted-foreground" data-testid="text-moomoo-description">
          Manage Moomoo OpenD connection and trading orders
        </p>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList>
          <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Draft Orders</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/moomoo-orders'] })}
              data-testid="button-refresh-orders"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {loadingOrders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order.id} className="p-4" data-testid={`card-order-${order.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{order.symbol}</span>
                          <Badge className={order.action === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}>
                            {order.action}
                          </Badge>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.orderType} - Qty: {order.quantity}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status === 'DRAFT' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(order)}
                            data-testid={`button-edit-${order.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteOrderMutation.mutate(order.id)}
                            disabled={deleteOrderMutation.isPending}
                            data-testid={`button-delete-${order.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingOrderId === order.id ? (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Entry Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.entryPrice}
                            onChange={(e) => setEditValues({ ...editValues, entryPrice: e.target.value })}
                            data-testid="input-edit-entry"
                          />
                        </div>
                        <div>
                          <Label>Stop Loss</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.stopLoss}
                            onChange={(e) => setEditValues({ ...editValues, stopLoss: e.target.value })}
                            data-testid="input-edit-sl"
                          />
                        </div>
                        <div>
                          <Label>Take Profit</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues.takeProfit}
                            onChange={(e) => setEditValues({ ...editValues, takeProfit: e.target.value })}
                            data-testid="input-edit-tp"
                          />
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={editValues.quantity}
                            onChange={(e) => setEditValues({ ...editValues, quantity: parseInt(e.target.value) || 1 })}
                            data-testid="input-edit-qty"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} disabled={updateOrderMutation.isPending} data-testid="button-save-edit">
                          <Check className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingOrderId(null)} data-testid="button-cancel-edit">
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Entry:</span>
                          <span className="ml-2 font-mono">${order.entryPrice}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SL:</span>
                          <span className="ml-2 font-mono text-red-500">${order.stopLoss || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">TP:</span>
                          <span className="ml-2 font-mono text-green-500">${order.takeProfit || '-'}</span>
                        </div>
                      </div>
                      {order.notes && (
                        <p className="text-xs text-muted-foreground mt-2">{order.notes}</p>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center" data-testid="card-no-orders">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders</h3>
              <p className="text-muted-foreground">
                Create orders from the Month Trading Scanner to see them here.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Moomoo OpenD Settings</h2>
            </div>

            {loadingSettings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSubmitSettings)} className="space-y-4">
                  <FormField
                    control={settingsForm.control}
                    name="host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Host</FormLabel>
                        <FormControl>
                          <Input placeholder="127.0.0.1" {...field} data-testid="input-host" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="11111" {...field} data-testid="input-port" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="tradeAccount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trade Account (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Moomoo trade account ID" {...field} data-testid="input-account" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={updateSettingsMutation.isPending} data-testid="button-save-settings">
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">Connection Status</h3>
              <p className="text-sm text-muted-foreground">
                {settings?.isConnected ? (
                  <span className="text-green-500">Connected to Moomoo OpenD</span>
                ) : (
                  <span>Not connected - Configure your Moomoo OpenD settings above</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Make sure Moomoo OpenD is running on your local machine before connecting.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
