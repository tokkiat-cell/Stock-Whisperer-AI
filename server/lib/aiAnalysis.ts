import OpenAI from "openai";

// Initialize OpenAI client using Replit AI Integration env vars
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function analyzeStockWithAI(symbol: string, price: number) {
  try {
    const prompt = `
      Analyze the stock ${symbol} which is currently trading at $${price}.
      Provide a trading recommendation based on technical analysis principles (trend, support/resistance, simplified).
      
      Return a valid JSON object with the following fields:
      - recommendation: "BUY", "SELL", or "HOLD"
      - entryPrice: a number (suggested entry)
      - takeProfit: a number (suggested target)
      - stopLoss: a number (suggested stop)
      - rationale: a short explanation (max 2 sentences)
      - confidence: a number between 0 and 100
      
      Do not include markdown formatting, just the raw JSON.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        { role: "system", content: "You are a professional stock trading assistant. Provide conservative, risk-managed trade setups." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No analysis generated");

    return JSON.parse(content);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw new Error("Failed to generate AI analysis");
  }
}
