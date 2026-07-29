import duckdb, os
con = duckdb.connect('apex.duckdb')
os.makedirs('out', exist_ok=True)

# ---- Derived-field logic, applied once, centrally ----
con.execute("""
CREATE OR REPLACE VIEW dim_hotel_clean AS
SELECT
  InnCode, HID,
  "IHG Flag"                AS ihg_flag,
  Category                  AS ihg_category,
  "Contract Status"         AS contract_status,
  Region                    AS region,
  "Sub-Region"              AS sub_region,
  Division                  AS division,
  "Hotel Country"           AS country,
  "Market Categorisation"   AS market_categorisation,
  "Priority Market"         AS priority_market,
  "Chain Scale"             AS chain_scale,
  "Archetype Segment"       AS archetype_segment,
  "Archetype Size Band"     AS archetype_size_band,
  "Archetype Region"        AS archetype_region,
  "Management Description"  AS management_type,
  "Management Company"      AS management_company,
  Brand                     AS brand,
  "Brand Name"              AS brand_name,
  Chain                     AS chain,
  GPO                       AS gpo,
  "Hotel Name"              AS hotel_name,
  "Hotel City"              AS city,
  "Hotel State"             AS state,
  "Open Date"               AS open_date,
  RMS                       AS rooms,
  "Has Spend Data"          AS has_spend_data,
  -- derived: reporting region incl. EUR/IMEA/EAPAC split used on slide 14
  CASE
    WHEN Region='AMER' THEN 'AMER'
    WHEN Region='GR CHINA' THEN 'GC'
    WHEN "Sub-Region" IN ('Southern Europe','Northern Europe','UK&I') THEN 'EUR'
    WHEN "Sub-Region"='IMEA' THEN 'IMEA'
    WHEN "Sub-Region" IN ('SEAK','Australasia & Pacific','Japan & Micronesia') THEN 'EAPAC'
    ELSE Region END        AS reporting_region,
  -- derived: segment groupings
  CASE WHEN "Archetype Segment" IN ('Premium','Lifestyle / Luxury') THEN 'Premium + L&L'
       WHEN "Archetype Segment" IN ('Essentials','Suites') THEN 'E&S'
       ELSE 'Unknown' END  AS segment_group,
  CASE WHEN RMS < 100 THEN '<100 Rooms' ELSE '>100 Rooms' END AS size_band_100,
  CASE WHEN RMS < 150 THEN '<150 Rooms' ELSE '>150 Rooms' END AS size_band_150
FROM dim_hotel
""")

# Dim_Hotel extract (all hotels, with an is_open flag so Tableau can filter)
con.execute("""COPY (
  SELECT *, (contract_status='Open - Accepting Guests') AS is_open FROM dim_hotel_clean
) TO 'out/Dim_Hotel.csv' (HEADER, DELIMITER ',')""")

# Fact_Spend at hotel × L0 × L1 × L2 grain (drops L3 -> smaller, still fully sliceable)
con.execute("""COPY (
  SELECT InnCode, L0 AS addressability, L1 AS lifecycle_stage, L2 AS category,
         SUM(Spend) AS spend
  FROM fact_spend GROUP BY 1,2,3,4
) TO 'out/Fact_Spend.csv' (HEADER, DELIMITER ',')""")

# Fact_Spend fully aggregated by dimension combo (fast dashboard source)
con.execute("""COPY (
  SELECT h.ihg_flag, h.region, h.reporting_region, h.sub_region, h.country,
         h.chain_scale, h.archetype_segment, h.segment_group, h.archetype_size_band,
         h.size_band_100, h.management_type, h.market_categorisation, h.priority_market,
         h.brand, f.L0 AS addressability, f.L1 AS lifecycle_stage, f.L2 AS category,
         COUNT(DISTINCT h.InnCode) AS hotels, SUM(h.rooms) AS rooms_sum, SUM(f.Spend) AS spend
  FROM fact_spend f JOIN dim_hotel_clean h USING (InnCode)
  WHERE h.contract_status='Open - Accepting Guests'
  GROUP BY ALL
) TO 'out/Fact_Spend_Agg.csv' (HEADER, DELIMITER ',')""")

for f in ['Dim_Hotel.csv','Fact_Spend.csv','Fact_Spend_Agg.csv']:
    p='out/'+f
    n=sum(1 for _ in open(p, encoding='utf-8', errors='ignore'))-1
    print(f"  {f:26s} {os.path.getsize(p)/1024/1024:>7.1f} MB   {n:>9,} rows")
con.close()
