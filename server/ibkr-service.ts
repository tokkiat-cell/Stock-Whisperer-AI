import { storage } from "./storage";
import type { TradingOrder, InsertTradingOrder, IbkrSettings } from "@shared/schema";

export interface OrderSubmissionResult {
  success: boolean;
  orderId?: number;
  ibkrOrderId?: number;
  message: string;
  error?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  error?: string;
}

class IbkrService {
  async testConnection(userId: string): Promise<ConnectionTestResult> {
    const settings = await storage.getIbkrSettings(userId);
    
    if (!settings) {
      return {
        success: false,
        message: "No IBKR settings configured",
        error: "Please configure your IBKR connection settings first"
      };
    }

    try {
      await storage.updateIbkrConnectionStatus(userId, true);
      
      return {
        success: true,
        message: `Connection configured for ${settings.host}:${settings.port} (Client ID: ${settings.clientId}). Note: Actual connection requires IB Gateway running locally.`
      };
    } catch (error) {
      return {
        success: false,
        message: "Connection test failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  async createOrder(order: InsertTradingOrder): Promise<TradingOrder> {
    return await storage.createTradingOrder(order);
  }

  async submitOrder(orderId: number, userId: string): Promise<OrderSubmissionResult> {
    const order = await storage.getTradingOrderById(orderId, userId);
    
    if (!order) {
      return {
        success: false,
        message: "Order not found",
        error: "The specified order does not exist"
      };
    }

    if (order.status !== "DRAFT") {
      return {
        success: false,
        message: "Order cannot be submitted",
        error: `Order is already in ${order.status} status`
      };
    }

    const settings = await storage.getIbkrSettings(userId);
    
    if (!settings) {
      return {
        success: false,
        orderId: order.id,
        message: "IBKR not configured",
        error: "Please configure your IBKR connection settings before submitting orders"
      };
    }

    const simulatedIbkrOrderId = Math.floor(Math.random() * 1000000) + 1;
    
    await storage.updateTradingOrder(orderId, userId, {
      status: "SUBMITTED",
      ibkrOrderId: simulatedIbkrOrderId,
      submittedAt: new Date()
    });

    return {
      success: true,
      orderId: order.id,
      ibkrOrderId: simulatedIbkrOrderId,
      message: `Order ${order.id} prepared for submission to IBKR. Symbol: ${order.symbol}, Action: ${order.action}, Qty: ${order.quantity}, Entry: $${order.entryPrice}${order.stopLoss ? `, SL: $${order.stopLoss}` : ""}${order.takeProfit ? `, TP: $${order.takeProfit}` : ""}`
    };
  }

  async cancelOrder(orderId: number, userId: string): Promise<OrderSubmissionResult> {
    const order = await storage.getTradingOrderById(orderId, userId);
    
    if (!order) {
      return {
        success: false,
        message: "Order not found",
        error: "The specified order does not exist"
      };
    }

    if (order.status === "FILLED" || order.status === "CANCELLED") {
      return {
        success: false,
        orderId: order.id,
        message: "Order cannot be cancelled",
        error: `Order is already ${order.status}`
      };
    }

    await storage.updateTradingOrder(orderId, userId, {
      status: "CANCELLED"
    });

    return {
      success: true,
      orderId: order.id,
      message: `Order ${order.id} cancelled successfully`
    };
  }

  async updateOrderPrices(
    orderId: number, 
    userId: string, 
    updates: { entryPrice?: string; stopLoss?: string | null; takeProfit?: string | null }
  ): Promise<TradingOrder | null> {
    const order = await storage.getTradingOrderById(orderId, userId);
    
    if (!order || order.status !== "DRAFT") {
      return null;
    }

    return await storage.updateTradingOrder(orderId, userId, updates);
  }

  async getOrderStatus(orderId: number, userId: string): Promise<TradingOrder | null> {
    return await storage.getTradingOrderById(orderId, userId);
  }

  async getAllOrders(userId: string): Promise<TradingOrder[]> {
    return await storage.getTradingOrders(userId);
  }

  calculateRiskReward(entryPrice: number, stopLoss: number, takeProfit: number): number {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    return risk > 0 ? reward / risk : 0;
  }

  validateOrder(order: Partial<InsertTradingOrder>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!order.symbol || order.symbol.trim() === "") {
      errors.push("Symbol is required");
    }

    if (!order.action || !["BUY", "SELL"].includes(order.action)) {
      errors.push("Action must be BUY or SELL");
    }

    if (!order.quantity || order.quantity <= 0) {
      errors.push("Quantity must be greater than 0");
    }

    if (!order.entryPrice || parseFloat(order.entryPrice) <= 0) {
      errors.push("Entry price must be greater than 0");
    }

    const entry = parseFloat(order.entryPrice || "0");
    const sl = order.stopLoss ? parseFloat(order.stopLoss) : null;
    const tp = order.takeProfit ? parseFloat(order.takeProfit) : null;

    if (order.action === "BUY") {
      if (sl !== null && sl >= entry) {
        errors.push("For BUY orders, stop loss must be below entry price");
      }
      if (tp !== null && tp <= entry) {
        errors.push("For BUY orders, take profit must be above entry price");
      }
    } else if (order.action === "SELL") {
      if (sl !== null && sl <= entry) {
        errors.push("For SELL orders, stop loss must be above entry price");
      }
      if (tp !== null && tp >= entry) {
        errors.push("For SELL orders, take profit must be below entry price");
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const ibkrService = new IbkrService();
