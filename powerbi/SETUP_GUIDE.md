# APEX → Power BI Setup Guide

## Quick Start (5 minutes)

### Step 1: Open Power BI Desktop
Launch Power BI Desktop on your work laptop (search "Power BI" in the Start menu).

### Step 2: Connect to APEX data

1. Click **Get Data** → **Web**
2. Enter the URL for your APEX Codespace:

For ALL data:
```
https://YOUR-CODESPACE-URL/api/programmes/ihg-pe/tableau
```

Or per domain:
```
https://YOUR-CODESPACE-URL/api/programmes/ihg-pe/tableau/hotel
https://YOUR-CODESPACE-URL/api/programmes/ihg-pe/tableau/corporate
https://YOUR-CODESPACE-URL/api/programmes/ihg-pe/tableau/function
```

3. Power BI will show a JSON preview → click **Into Table** → expand the `data` column
4. Click **Load**

### Step 3: Repeat for each domain
Add three data sources (hotel, corporate, function) so they're separate tables in the model.

### Step 4: Build your report pages

**Create 3 pages** (tabs at the bottom):
- Page 1: **Hotel Procurement**
- Page 2: **Corporate Procurement**
- Page 3: **Function Management**

### Step 5: Add filters and visuals

For each page:
1. Drag `_panel` to the **Page filter** area (so you can filter by External Context / Value / Enablement / Performance)
2. Add a **Slicer** visual for region (AMER / EMEAA / GC)
3. Add a **Slicer** for time period (month/quarter)
4. Add a **Matrix** visual (Power BI's pivot table) — rows = categories, columns = months, values = your metric
5. Add a **Line/Bar chart** next to each matrix

### Useful columns in the data

| Column | Purpose | Use as |
|--------|---------|--------|
| `_domain` | hotel / corporate / function | Page filter |
| `_panel` | external / value / enablement / performance | Page filter |
| `_metric` | The KPI name | Legend / group by |
| `_source_table` | Which data table it came from | Filter |
| `_target` | KPI target value | Reference line |
| `_direction` | higher / lower is better | Context |
| `_unit` | %, $M, count, etc. | Axis labels |
| `month` / `period` | Time dimension | X-axis |
| `region` / `AMER` / `EMEAA` / `GC` | Geographic splits | Slicer / legend |

---

## Alternative: CSV Import (if Web connection is blocked)

If your corporate firewall blocks the Codespace URL from Power BI:

1. In your browser, go to: `https://YOUR-CODESPACE-URL/api/programmes/ihg-pe/tableau/hotel?format=csv`
2. Save the file
3. In Power BI: **Get Data** → **Text/CSV** → select the file
4. Repeat for corporate and function

You can automate this later with Power Automate if needed.

---

## Refreshing Data

- **Manual:** Click **Refresh** in Power BI Desktop
- **Scheduled:** Publish to Power BI Service (app.powerbi.com) → set a daily refresh schedule
- **Live:** If using the Web connector and the Codespace is running, it pulls fresh data each time

---

## Recommended Visuals by Panel

### External Context
- **Card** visuals for key indices (CPI, category prices)
- **Line chart** for trends over time
- **KPI visual** with trend indicator

### Value Proposition
- **Matrix** (pivot table) — rows: metric, columns: month, values: score
- **Gauge** visual for CSAT / NPS against target
- **Clustered bar chart** for savings by category

### Enablement
- **Stacked bar chart** — platform rollout by region over time
- **Donut chart** — capacity split (filled vs open)
- **Card** visuals for headcount totals

### Performance
- **Combo chart** (bars + line) — spend throughput with target line
- **Matrix** — cross-cut by supplier/segment
- **Waterfall chart** — in-plan savings build-up

---

## Publishing for Your Team

1. Click **Publish** in Power BI Desktop
2. Select your workspace on Power BI Service
3. Share the link with colleagues
4. Set up scheduled refresh under Dataset Settings

This means your team sees the same dashboard, always up to date, through their normal Power BI access. No Codespaces needed for viewers.
