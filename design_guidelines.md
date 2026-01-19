# Stock Trading AI Assistant Dashboard - Design Guidelines

## Design Approach
**Reference-Based + System Hybrid:** Drawing from Bloomberg Terminal's professional density, TradingView's data clarity, and Linear's refined dark UI. Dark-first design with high information density and immediate data accessibility.

## Layout Architecture

**Dashboard Grid System:**
- Two-column primary layout: Left sidebar (280px) + Main content area (flexible)
- Sidebar: Fixed navigation, AI chat toggle, watchlists
- Main area: 12-column grid for flexible component placement
- No hero image - this is a data-first dashboard

**Spacing System:**
Tailwind units: 2, 3, 4, 6, 8 for consistent rhythm. Tight spacing (p-3, p-4) for data density, generous gaps (gap-6, gap-8) between major sections.

## Typography Hierarchy

**Font Stack:**
- Primary: Inter (400, 500, 600, 700) - exceptional legibility for data
- Monospace: JetBrains Mono (for stock tickers, prices, percentages)

**Hierarchy:**
- Dashboard title: text-2xl font-semibold
- Section headers: text-lg font-semibold
- Stock symbols: text-sm font-mono font-semibold uppercase
- Stock prices: text-xl font-mono font-bold
- Price changes: text-sm font-mono
- Chat messages: text-sm font-normal
- Data labels: text-xs font-medium uppercase tracking-wide

## Core Components

**1. AI Chat Interface:**
- Collapsible right panel (400px) or modal overlay
- Chat bubbles: User (right-aligned) vs AI (left-aligned)
- Input field with send button at bottom
- Message timestamps (text-xs)
- Loading states with typing indicators
- Quick prompt suggestions as pills above input

**2. Premarket Movers Display:**
- Horizontal scrollable cards or vertical list
- Each card: Stock symbol, company name, current price, percentage change, mini sparkline chart
- Layout: 3-column grid on desktop (grid-cols-3), single column mobile
- Sort controls: Gainers/Losers toggle

**3. Recommended Stocks Section:**
- Card-based layout with 2-column grid (md:grid-cols-2)
- Each card: Symbol, price, AI recommendation snippet, confidence indicator (progress bar)
- "View Details" button per card

**4. Data Visualization Elements:**
- Mini sparklines (24px height) inline with stock rows
- Trend indicators: Arrows (↑↓) with rotation based on direction
- Percentage badges: Rounded pills with + or - prefix
- Real-time status indicators: Pulsing dot for live data

**5. Navigation Sidebar:**
- Logo/brand at top (h-16)
- Nav items with icons (24px): Dashboard, Watchlist, Portfolio, Analytics, Settings
- Active state: Subtle left border accent
- Bottom: User profile section with avatar

**6. Top Bar:**
- Search input (max-w-md) with stock symbol autocomplete
- Real-time market status indicator
- Notification bell icon
- User avatar dropdown (right-aligned)

## Component Specifications

**Stock Card Structure:**
```
Container: Rounded (rounded-lg), padding (p-4)
Header row: Symbol (left) + Price (right)
Subheader: Company name (text-sm opacity-70)
Middle: Mini chart or key metrics grid
Footer: Change percentage + AI insight preview
```

**Chat Message Bubbles:**
- Max width: max-w-2xl
- Padding: p-3
- Rounded: rounded-2xl (user), rounded-lg (AI)
- Code blocks in responses: Monospace, slightly different background

**Data Tables:**
- Striped rows (alternate row backgrounds)
- Sticky headers on scroll
- Column headers: text-xs uppercase font-semibold
- Cell padding: px-4 py-3
- Hover state on rows

**Buttons:**
- Primary CTA: px-4 py-2 rounded-lg font-medium
- Secondary: Border variant with same sizing
- Icon buttons: p-2 rounded-md (for compact areas)
- Buttons on images: Backdrop blur with semi-transparent background

## Images

**No hero images required** - this is a dashboard application focused on data density and immediate functionality. All visual interest comes from live data, charts, and the refined dark interface aesthetic.

## Animations

**Minimal, purposeful motion:**
- Live price updates: Subtle flash animation on change
- Chart line drawing: Smooth path animation on load
- Loading states: Skeleton screens for data cards
- NO scroll-triggered or decorative animations

## Accessibility

- All interactive elements: Minimum 44px touch targets
- Form inputs: Visible focus rings with high contrast
- Screen reader labels for all data visualizations
- Keyboard navigation throughout dashboard
- ARIA labels for stock tickers and percentage changes