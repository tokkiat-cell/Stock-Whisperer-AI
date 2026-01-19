import { storage } from "./storage";
import type { PriceAlert } from "@shared/schema";

interface NotificationResult {
  channel: string;
  success: boolean;
  error?: string;
}

export async function sendAlertNotifications(
  alert: PriceAlert,
  message: string
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];
  const channels = alert.notifyChannels || [];

  if (channels.length === 0) {
    return results;
  }

  const userSettings = await storage.getUserNotificationSettings(alert.userId);

  for (const channel of channels) {
    switch (channel) {
      case "TELEGRAM":
        if (userSettings?.telegramEnabled && userSettings.telegramChatId) {
          const result = await sendTelegramMessage(userSettings.telegramChatId, message);
          results.push(result);
        } else {
          results.push({ channel: "TELEGRAM", success: false, error: "Telegram not configured" });
        }
        break;

      case "WHATSAPP":
        if (userSettings?.whatsappEnabled && userSettings.whatsappNumber) {
          const result = await sendWhatsAppMessage(userSettings.whatsappNumber, message);
          results.push(result);
        } else {
          results.push({ channel: "WHATSAPP", success: false, error: "WhatsApp not configured" });
        }
        break;

      case "APP":
        results.push({ channel: "APP", success: true });
        break;
    }
  }

  return results;
}

async function sendTelegramMessage(chatId: string, message: string): Promise<NotificationResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return { channel: "TELEGRAM", success: false, error: "Telegram bot token not configured" };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { channel: "TELEGRAM", success: false, error };
    }

    return { channel: "TELEGRAM", success: true };
  } catch (error) {
    return { channel: "TELEGRAM", success: false, error: String(error) };
  }
}

async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<NotificationResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    return { channel: "WHATSAPP", success: false, error: "Twilio WhatsApp not configured" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        From: `whatsapp:${fromNumber}`,
        To: `whatsapp:${phoneNumber}`,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { channel: "WHATSAPP", success: false, error };
    }

    return { channel: "WHATSAPP", success: true };
  } catch (error) {
    return { channel: "WHATSAPP", success: false, error: String(error) };
  }
}

export function formatAlertMessage(alert: PriceAlert): string {
  const direction = alert.direction === "ABOVE" ? "rose above" : "fell below";
  const price = parseFloat(alert.triggeredPrice || alert.targetPrice).toFixed(2);
  
  let message = `🔔 <b>Price Alert Triggered</b>\n\n`;
  message += `<b>${alert.symbol}</b> ${direction} $${price}\n`;
  message += `Target: $${parseFloat(alert.targetPrice).toFixed(2)} (${alert.direction})\n`;
  
  if (alert.alertType === "AI_MODEL" && alert.aiAnalysis) {
    message += `\n📊 <b>AI Analysis:</b>\n${alert.aiAnalysis.substring(0, 500)}`;
    if (alert.aiAnalysis.length > 500) message += "...";
  }
  
  return message;
}
