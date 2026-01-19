# TradeMind - AI Trading Assistant

## Overview

TradeMind is an AI-powered stock trading assistant that provides real-time analysis, automated risk management, and institutional-grade insights. The application enables users to analyze stocks, receive AI-generated trade recommendations, manage trade setups, and track their trading history.

Key features:
- Real-time stock quotes via Yahoo Finance API
- AI-powered stock analysis using OpenAI (GPT models)
- S&P 500 market scanning with automated trade recommendations
- Trade setup management with approval workflow
- User authentication via Replit Auth (OpenID Connect)

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

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Management**: Express sessions with PostgreSQL store
- **Implementation**: Located in `server/replit_integrations/auth/`
- **Protected Routes**: Middleware `isAuthenticated` guards API endpoints

### AI Integration
- **Provider**: OpenAI via Replit AI Integrations
- **Models**: GPT for text analysis, supports image and audio capabilities
- **Configuration**: Uses `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables
- **Features**: Stock analysis with JSON-structured responses

## External Dependencies

### APIs and Services
- **Yahoo Finance** (`yahoo-finance2`): Real-time stock quotes and search
- **OpenAI**: AI-powered stock analysis via Replit AI Integrations
- **Replit Auth**: User authentication via OpenID Connect

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key from Replit
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL from Replit
- `ISSUER_URL` - Replit OIDC issuer (defaults to `https://replit.com/oidc`)
- `REPL_ID` - Replit environment identifier

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `express` / `express-session` - Web server and sessions
- `@tanstack/react-query` - Frontend data fetching
- `openai` - AI API client
- `passport` / `openid-client` - Authentication
- `zod` - Schema validation