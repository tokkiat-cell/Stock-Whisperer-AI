# SG Bank Stock Dashboard — Spec

Covers the three Singapore banks: **DBS (D05.SI)**, **OCBC (O39.SI)**, **UOB (U11.SI)**.
Sections appear in this order, top to bottom.

## 1. Quick-glance summary (top)

Point form, one line per bank:

- Current price
- Day's % change
- One-word signal: `watch` / `buy` / `hold`

## 2. Price alerts

Flag any bank that has:

- Moved beyond a configurable daily threshold (default **±2%**), or
- Crossed a key support or resistance level

## 3. Recommendations

Per bank, a short verdict — `buy` / `hold` / `trim` — with one line of reasoning.

## Below the fold — detail

### 4. News & analyst actions

- News headlines relevant to each bank from the **last 24 hours**
- Any analyst rating changes

### 5. Fuller numbers

For anyone who wants to dig in: dividend yield, price-to-book, and similar
fundamentals.

## Open questions

- Where support/resistance levels come from (existing Alpha Vantage S/R
  calc, or manually set levels per bank)
- How the quick-glance signal relates to the recommendation verdict
  (signal uses watch/buy/hold; verdict uses buy/hold/trim)
- Delivery: in-app page only, or also a scheduled push/email
- Exact list of "fuller numbers" beyond dividend yield and P/B
