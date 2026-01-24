# stockwhisperer.AI - AI Trading Assistant

## Overview

stockwhisperer.AI is an AI-powered stock trading assistant that provides real-time analysis, automated risk management, and institutional-grade insights. The application enables users to analyze stocks, receive AI-generated trade recommendations, manage trade setups, and track their trading history.

Key features:
- Real-time stock quotes via Yahoo Finance API
- AI-powered stock analysis using Gemini AI (gemini-2.5-flash)
- **Enhanced Multi-API Analysis System**:
  - **Finnhub Pattern Recognition**: Detects candlestick patterns (Hammer, Engulfing, Doji, etc.) with buy/sell scoring
  - **Alpha Vantage Technical Indicators**: RSI, MACD, Bollinger Bands, SMA/EMA, ATR, Support/Resistance levels
  - **Tradefeeds Risk Management**: Dynamic SL/TP calculation based on volatility and timeframe
  - **Gemini AI Synthesis**: Combines all data sources into actionable trade recommendations
  - Stop Loss/Take Profit based on support/resistance levels AND timeframe-adjusted ATR
- **Investor/Trader Profile System**: Personalized experience based on user type
  - **Investors**: Long-term focus with 5-question risk assessment
    - Risk levels: Conservative, Moderate, Aggressive
    - Investment horizons: <1 year, 1-3 years, 5+ years
    - Conservative investors get stocks sorted by lower volatility (ATR %)
    - AI prompts focus on value, stability, and risk-adjusted returns
  - **Traders**: Active trading focus with style selection
    - Trading styles: Day Trader, Swing Trader, Position Trader
    - Configurable risk per trade percentage
    - Momentum indicators displayed: Momentum Score, Volatility %, RSI, MACD Signal
    - AI prompts focus on patterns, momentum, and precise entry/exit levels
  - **Investor Target List**: Upload stocks with intrinsic values via CSV
    - Track % undervalued/overvalued vs current market price
    - Supports CSV format: Symbol, Intrinsic Value, Notes
- **Multi-Market AI Scanner**: Market-aligned scanning for US, Singapore, Hong Kong, China, and Europe
  - Profile-aware recommendations: adapts analysis based on Investor vs Trader mode
  - Scanner syncs with dashboard market preference for seamless workflow
  - Generates trade recommendations for selected market region using multi-source analysis
  - Includes options trading strategies (Bull Call Spread, Bear Put Spread, Iron Condor, etc.) for US stocks
  - Provides support and resistance levels for precise entry/exit points
  - Options strategies include strike pricing, expiry, max profit/risk
  - Confidence scores based on aggregated signals from all data sources
- Trade setup management with approval workflow
- User authentication via Replit Auth (OpenID Connect)
- Portfolio management with holdings tracking, bulk import (Excel/paste/image AI extraction), and watchlist
  - Real-time current prices with P&L (profit/loss) display
  - Shows market value, gain/loss amount, and percentage change
- **Price Alerts**: Set price alerts on watchlist stocks to monitor when they hit a target price (above/below) with optional AI model analysis
  - Multi-channel notifications: App (in-app), Telegram Bot, WhatsApp (via Twilio)
  - Notification settings configuration for Telegram chat ID and WhatsApp phone number
- **Candlestick Charts**: Click any stock symbol in holdings or watchlist to view interactive candlestick chart
  - 1 year of daily price data
  - Toggleable moving averages (20, 40, 100, 200 days)
  - Uses lightweight-charts v5 library
- **Trading Platform Integration**: Unified trading page with platform tabs
  - **IBKR (Interactive Brokers)**: Connection settings, order management, approval workflow
  - **Moomoo Trading**: Access via OpenD API with dedicated trading page
  - Create draft orders with entry price, stop loss, and take profit
  - Modify prices before submission
  - Submit orders for execution
  - "Trade" button on AI Scanner recommendations creates pre-filled draft orders
  - Order status tracking (Draft, Submitted, Filled, Cancelled)
- **Month Trading Scanner**: Weekly chart pattern detection with 4 pattern types
  - **Power Ranger**: Gap-up followed by tight consolidation (breakout setup)
  - **Cupid**: Uptrend with pullback to support (continuation setup)
  - **Tug of War**: Tight range consolidation with indecision (breakout pending)
  - **Rollercoaster**: Decline followed by reversal (mean reversion setup)
  - 12-month lookback with weekly candles
- **Market Overview Dashboard**: Real-time display of global market indices
  - US Markets: S&P 500, Dow Jones, Nasdaq, Russell 2000
  - Singapore Markets: STI, STI ETF, DBS, OCBC, UOB
  - Hong Kong Markets: Hang Seng Index, HSCE, Tencent, Alibaba HK, AIA
  - China Markets: Shanghai Composite, Shenzhen Component, CSI 300, SSE 50
  - European Markets: Euro Stoxx 50, FTSE 100, DAX, CAC 40
  - Daily performance with day-over-day comparison
  - Customizable settings to toggle market visibility for each region
  - Auto-refresh every 60 seconds
- **Premarket Changes Page**: Dedicated page showing top daily movers (/premarket)
  - Top 20 daily gainers sorted by % change
  - Top 20 daily losers sorted by % change
  - Uses Yahoo Finance with fallback to batch quotes of 100 popular stocks
  - Click any stock to analyze
  - Accessible from sidebar navigation and dashboard CTA
- **Subscription Tiers**: Three-tier access model with Stripe payments
  - Free Tier: Limited monthly usage (SGD $0/month)
  - stockwhisperer Basic (SGD $8.80/month or $88/year) - Higher limits
  - stockwhisperer Pro (SGD $28.80/month or $288/year) - Professional usage
  - Annual plans include 2 months free (10 months pricing)
  - Stripe checkout integration with webhook sync
- **Legal Pages**: Publicly accessible legal documentation
  - Terms of Service (/terms) - Service terms, investment disclaimer, liability
  - Privacy Policy (/privacy) - Data collection, AI processing, user rights
  - Refund Policy (/refund-policy) - Subscription refund terms
  - Cross-linked with "Back to Pricing" navigation
- **AI Usage Limits**: Monthly usage limits vary by tier
  - Free Tier: 10 chats, 3 images, 5 voice, 10 stock analyses per month
  - Basic Tier: 150 chats, 50 images, 80 voice, 100 stock analyses per month
  - Pro Tier: 5,000 chats, 1,000 images, 3,000 voice, 4,000 stock analyses per month
  - Limits reset on the 1st of each month
  - UpgradeModal prompts users to subscribe when limits are reached
- AI chat assistant with image analysis capability (analyze charts, extract stocks from screenshots)
- Configurable trade risk amount and timeframe selection
- Detailed technical analysis with candle patterns and moving averages (20/40/100/150/200 days)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme and CSS variables
- **Build Tool**: Vite with HMR support

The frontend follows a page-based structure with protected routes requiring authentication. The layout uses a shell pattern with sidebar navigation.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful endpoints under `/api/*`
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Schema Validation**: Zod for runtime type checking
- **Build**: esbuild for production bundling

Routes are defined in `shared/routes.ts` with typed schemas for both input and output, enabling type-safe API contracts between frontend and backend.

### Data Storage
- **Database**: PostgreSQL (provisioned via Replit)
- **ORM**: Drizzle with schema defined in `shared/schema.ts`
- **Migrations**: Drizzle Kit with `db:push` command
- **Sessions**: PostgreSQL-backed sessions via `connect-pg-simple`

Key tables:
- `users` - User accounts (Replit Auth)
- `sessions` - Session storage
- `trade_setups` - User trade configurations
- `sp500_stocks` - Cached S&P 500 stock data
- `trade_recommendations` - AI-generated recommendations
- `conversations/messages` - Chat history (for potential voice/chat features)
- `portfolio_holdings` - User portfolio holdings with shares and average cost
- `watchlist` - User watchlist items with optional notes
- `price_alerts` - User price alerts with target price, direction (ABOVE/BELOW), alert type (PRICE/AI_MODEL), and notification channels (APP/TELEGRAM/WHATSAPP)
- `user_notification_settings` - User notification preferences for Telegram and WhatsApp
- `ibkr_settings` - IBKR connection settings (host, port, clientId) per user
- `trading_orders` - Trading orders with symbol, action, entry/SL/TP, status, and IBKR order ID
- `market_preferences` - User preferences for market index visibility (US/Singapore/HK/CN/EU toggle, selected movers market)
- `user_usage` - Monthly usage tracking per user (chatCount, imageCount, voiceCount, stockAnalysisCount, usagePeriodStart)

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Management**: Express sessions with PostgreSQL store
- **Implementation**: Located in `server/replit_integrations/auth/`
- **Protected Routes**: Middleware `isAuthenticated` guards API endpoints

### AI Integration
- **Provider**: Google Gemini via Replit AI Integrations
- **Model**: gemini-2.5-flash
- **Configuration**: Uses `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL` environment variables
- **Features**: 
  - Stock analysis with JSON-structured responses
  - AI chat assistant with formatted markdown responses
  - Market scanning with technical analysis (candle patterns, moving averages)
  - Trade recommendations based on user risk profile and timeframe
  - Image analysis using Gemini vision (analyze charts, extract stock symbols from screenshots)
  - Portfolio image extraction (upload portfolio screenshots to auto-extract stock tickers)

## External Dependencies

### APIs and Services
- **Yahoo Finance** (`yahoo-finance2`): Real-time stock quotes and search
- **Google Gemini**: AI-powered stock analysis via Replit AI Integrations
- **Finnhub**: Candlestick pattern recognition and technical indicator aggregation
- **Alpha Vantage**: Technical indicators (RSI, MACD, Bollinger Bands, SMA, ATR, Support/Resistance)
- **Tradefeeds**: Dynamic risk management and SL/TP calculation
- **Replit Auth**: User authentication via OpenID Connect

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption
- `AI_INTEGRATIONS_GEMINI_API_KEY` - Gemini API key from Replit
- `AI_INTEGRATIONS_GEMINI_BASE_URL` - Gemini base URL from Replit
- `ISSUER_URL` - Replit OIDC issuer (defaults to `https://replit.com/oidc`)
- `REPL_ID` - Replit environment identifier

### Stripe Payment Integration (Required for Subscriptions)
- **Integration**: Uses Replit's Stripe connection (already configured)
- **Webhooks**: Automatically managed by stripe-replit-sync
- **Data Sync**: Stripe products, prices, and subscriptions are synced to PostgreSQL `stripe` schema

**Environment Variables (set in Replit Secrets):**
- `STRIPE_BASIC_PRICE_ID` - Stripe price ID for Basic tier ($9.90/month)
- `STRIPE_BASIC_YEARLY_PRICE_ID` - Stripe price ID for Basic tier ($99/year)
- `STRIPE_PRO_PRICE_ID` - Stripe price ID for Pro tier ($29.90/month)
- `STRIPE_PRO_YEARLY_PRICE_ID` - Stripe price ID for Pro tier ($299/year)

**Setup Steps:**
1. Stripe Sandbox connection is configured in the Integrations tab
2. Run `npx tsx server/scripts/seedStripeProducts.ts` to create products/prices in Stripe
3. Copy the price IDs to environment variables
4. Webhook is automatically registered at `/api/stripe/webhook`
5. For production, add live Stripe keys in the Publish pane

### Optional Environment Variables (for enhanced analysis)
- `FINNHUB_API_KEY` - Finnhub API key for candlestick pattern recognition (https://finnhub.io/)
- `ALPHA_VANTAGE_API_KEY` - Alpha Vantage API key for technical indicators (https://www.alphavantage.co/)
- `TRADEFEEDS_API_KEY` - Tradefeeds API key for risk management (https://tradefeeds.com/)

### Optional Environment Variables (for notifications)
- `TELEGRAM_BOT_TOKEN` - Telegram Bot API token for sending alerts via Telegram
- `TWILIO_ACCOUNT_SID` - Twilio Account SID for WhatsApp notifications
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- `TWILIO_WHATSAPP_FROM` - Twilio WhatsApp sender number (e.g., whatsapp:+14155238886)

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `express` / `express-session` - Web server and sessions
- `@tanstack/react-query` - Frontend data fetching
- `openai` - AI API client
- `passport` / `openid-client` - Authentication
- `zod` - Schema validation
- `xlsx` - Excel file parsing for portfolio import
- `lightweight-charts` - Candlestick charting library (v5)