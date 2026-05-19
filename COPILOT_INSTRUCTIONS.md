# APEX — Copilot / AI Assistant Instructions

This file provides context for GitHub Copilot (or any AI coding assistant) when working on this project. Keep this file open in your editor for best results.

---

## Project Summary

APEX is a programme intelligence dashboard built with React 19 + Vite 8 (frontend) and Express 5 + SQLite (backend). It tracks programme metrics, risks, audits, and documents with AI-assisted analysis. The UI is a dark-themed data-dense dashboard targeting programme managers.

---

## Code Conventions

### Styling
- **All styling is inline** via React `style={{}}` — there are no component CSS files
- Use CSS custom properties from the theme (e.g. `var(--bg2)`, `var(--accent)`)
- Never use CSS modules, styled-components, Tailwind, or external CSS frameworks

### Fonts (always use CSS variables)
- **Headings, labels, buttons:** `fontFamily: "var(--font-d)"` (Outfit)
- **Data, badges, monospace:** `fontFamily: "var(--font-m)"` (JetBrains Mono)
- **Body text, descriptions:** `fontFamily: "var(--font-b)"` (Inter)

### Color Palette
```
Backgrounds:   --bg0 (#0B2A3C) → --bg4 (#17506E), darkest to lightest
Borders:       --border (#1A5572), --border2 (#1E6080)
Primary:       --accent (#2ABFBF) — teal, used for buttons, links, highlights
Warning:       --orange (#E8734A)
Caution:       --yellow (#F5C544)
Success:       --green (#5DC484)
Info:          --blue (#4A9EFF)
Supplementary: --violet (#A78BFA)
Text:          --text (#FFF), --text2 (#E0ECF4), --text3 (#B0CBE0)
```

### Region Colors (must be consistent across all charts)
```
AMER:  #F5C544 (yellow)
EMEAA: #4A9EFF (blue)
GC:    #5DC484 (green)
Total: #2ABFBF (teal)
```

### Chart Conventions (Recharts)
- Always wrap in `<ResponsiveContainer width="100%" height="100%">`
- Tooltip style: `{ background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" }`
- X-axis tick: `{ fontSize: 12, fill: "#E0ECF4" }`
- Y-axis tick: `{ fontSize: 11, fill: "#B0CBE0" }`
- Grid: `<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />`
- Area charts use semi-transparent fills: `rgba(color, 0.35)` with solid stroke
- Available chart types: BarChart, LineChart, AreaChart, ComposedChart
- Use `ChartToggle` component to let users switch between chart types

### Component Patterns
- Functional components only (no class components)
- `useState` / `useEffect` / `useMemo` for state management
- No external state library — use `useStore()` from `data/store.js`
- Export default for page/section components, named exports for small UI primitives
- UI primitives live in `components/ui.jsx`: Spinner, Pip, Card, TabBar, EmptyState, PageHeader, RagDual, MetricStatusPill

### File Organization
```
src/apex/
  components/   → Shared layout (Shell, AIChat) and UI primitives
  data/         → Store and seed data definitions
  lib/          → Theme injection, utility functions, AI client
  metrics/      → Everything related to metrics rendering and data exploration
  pages/        → Top-level page components (one per route)
  panels/       → Sub-panels within ProgrammeView
  settings/     → Settings modal panels (engines, sources)
```

### Backend Patterns
- Single `server/index.js` with all routes — no sub-routers
- Each route opens a DB connection, runs query, closes connection
- Programme data stored as JSON blob in `programmes.data` column
- Audit log: every mutation writes a before/after record
- AI calls routed through `callEngine()` which dispatches to the configured provider

---

## Adding a New Metric

1. **Define the metric** in `src/apex/data/ihgMetrics.js` — add a tab entry under the appropriate domain → panel
2. **Add seed data** in `server/seed.js` if you have static data
3. **Create a renderer** in `src/apex/metrics/MetricRenderer.jsx`:
   - Add a key match: `if (key === "domain/panel/tab-id") return <MyRenderer data={tab.data} />;`
   - Create the renderer function with Headline, chart(s), and optional MoMBadge/EstateTable
4. **For dynamic data**, create a KPI definition via the UI or API, link it to a data table

---

## Adding a New Chart Type to a Renderer

Pattern from existing code:

```jsx
const [view, setView] = useState("bar");

<ChartToggle
  options={[
    { id: "bar", label: "Bar" },
    { id: "area", label: "Area" },
    { id: "trend", label: "Trend Lines" }
  ]}
  active={view}
  onChange={setView}
/>

{view === "area" ? (
  <AreaChart data={data}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#E0ECF4" }} />
    <YAxis tick={{ fontSize: 11, fill: "#B0CBE0" }} />
    <Tooltip contentStyle={{ background: "#0F3A52", border: "1px solid #1E6080", color: "#fff" }} />
    <Legend />
    <Area type="monotone" dataKey="AMER" stackId="a" stroke="#F5C544" fill="rgba(245,197,68,0.35)" name="AMER" />
    <Area type="monotone" dataKey="EMEAA" stackId="a" stroke="#4A9EFF" fill="rgba(74,158,255,0.35)" name="EMEAA" />
    <Area type="monotone" dataKey="GC" stackId="a" stroke="#5DC484" fill="rgba(93,196,132,0.35)" name="GC" />
  </AreaChart>
) : (
  <BarChart ...>
    ...
  </BarChart>
)}
```

---

## Adding a New AI Provider

1. Write an async function `callMyProvider(engine, system, messages)` in `server/ai/providers.js`
2. Return `{ text: "response string", raw: apiResponse }`
3. Add to the `PROVIDERS` object: `myProvider: { label: "My Provider", call: callMyProvider, fields: ["api_key", "endpoint_url"] }`
4. The UI will automatically show it in the Engines settings dropdown

---

## API Shape Reference

**Programme object** (what `GET /api/programmes/:id` returns):
```json
{
  "id": "ihg-pe",
  "name": "Programme Name",
  "function": "Department",
  "description": "...",
  "risks": [...],
  "updates": [...],
  "executiveSummary": {...},
  "metricDomains": {
    "domainId": {
      "id": "domainId",
      "label": "Domain Name",
      "panels": {
        "panelId": {
          "label": "Panel Name",
          "tabs": [
            { "id": "tab-id", "label": "Tab Name", "status": "tracked|partial|gap", "data": {...} }
          ]
        }
      }
    }
  },
  "metricDomainOrder": ["domainId1", "domainId2"]
}
```

**Metric statuses:** `tracked` (has data + renderer), `partial` (some data), `gap` (not tracked)

---

## Common Tasks for Copilot

- "Add a new metric panel for [X]" → Follow the Adding a New Metric section above
- "Add a chart type" → Follow the chart pattern in MetricRenderer.jsx
- "Connect a new data source" → Add a fetcher in `server/sources/fetchers.js`
- "Change the color scheme" → Modify CSS variables in `src/apex/lib/theme.js`
- "Add a new page" → Create in `src/apex/pages/`, add route in `src/apex/App.jsx`
- "Add an API endpoint" → Add route in `server/index.js`, follow existing patterns
