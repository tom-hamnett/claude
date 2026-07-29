import duckdb
con=duckdb.connect('apex.duckdb')
con.execute("""CREATE OR REPLACE VIEW vo AS SELECT * FROM dim_hotel WHERE "Contract Status"='Open - Accepting Guests'""")
con.execute("""CREATE OR REPLACE VIEW vrr AS
SELECT *, CASE WHEN Region='AMER' THEN 'AMER' WHEN Region='GR CHINA' THEN 'GC'
  WHEN "Sub-Region" IN ('Southern Europe','Northern Europe','UK&I') THEN 'EUR'
  WHEN "Sub-Region"='IMEA' THEN 'IMEA'
  WHEN "Sub-Region" IN ('SEAK','Australasia & Pacific','Japan & Micronesia') THEN 'EAPAC'
  ELSE Region END AS reporting_region FROM vo""")

# Share of wallet: market vs IHG addressable by region x lifecycle, both bases
con.execute("""COPY (
WITH base AS (
  SELECT h.reporting_region, h.Region AS region, f.L1 AS lifecycle_stage, h."IHG Flag" AS ihg_flag,
         SUM(f.Spend) AS addressable_spend,
         COUNT(DISTINCT h.InnCode) AS hotels, SUM(DISTINCT 0)+SUM(h.RMS) AS rooms_x
  FROM fact_spend f JOIN vrr h USING (InnCode)
  WHERE f.L0='Addressable' GROUP BY 1,2,3,4
)
SELECT reporting_region, region, lifecycle_stage, ihg_flag, addressable_spend, hotels,
       (lifecycle_stage <> 'BUILD') AS is_directly_addressable
FROM base ORDER BY 1,3,4
) TO 'out/Fact_ShareOfWallet.csv' (HEADER, DELIMITER ',')""")

# Region-level KPI summary joining addressable + programme + CRF
REGMAP = {"AMER":"AMER","ASIA":"GC","EUROPE/MIDDLE EAST":"EMEAA"}
con.execute("""CREATE OR REPLACE TABLE prog AS SELECT * FROM read_csv_auto('out/Fact_Programme_Spend.csv')""")
con.execute("""CREATE OR REPLACE TABLE crf AS SELECT * FROM read_csv_auto('out/Fact_CRF.csv')""")
rows = con.execute("""
WITH a AS (  -- IHG addressable by region (3-region basis)
  SELECT CASE WHEN Region='GR CHINA' THEN 'GC' ELSE Region END rg,
         SUM(CASE WHEN L1<>'BUILD' THEN Spend ELSE 0 END) directly_addr,
         SUM(Spend) total_addr
  FROM fact_spend f JOIN vrr h USING (InnCode)
  WHERE f.L0='Addressable' AND h."IHG Flag"='IHG' GROUP BY 1),
p AS (SELECT CASE WHEN company_region='AMER' THEN 'AMER' WHEN company_region='ASIA' THEN 'GC' ELSE 'EMEAA' END rg,
      SUM(spend) prog FROM prog WHERE measure='Programme (P2P) Spend' GROUP BY 1),
c AS (SELECT region rg, SUM(crf_usd) crf FROM crf WHERE year=2025 GROUP BY 1)
SELECT a.rg, a.total_addr, a.directly_addr, p.prog, c.crf,
       100.0*p.prog/a.directly_addr pct_capture, 100.0*c.crf/p.prog pct_crf
FROM a LEFT JOIN p USING (rg) LEFT JOIN c USING (rg) ORDER BY a.total_addr DESC""").fetchall()
print(f"{'region':7s} {'addr($bn)':>10s} {'direct($bn)':>12s} {'prog($M)':>10s} {'CRF($M)':>9s} {'capture%':>9s} {'CRF%':>6s}")
for r in rows:
    print(f"{r[0]:7s} {r[1]/1e9:>10.2f} {r[2]/1e9:>12.2f} {(r[3] or 0)/1e6:>10.1f} {(r[4] or 0)/1e6:>9.2f} {(r[5] or 0):>8.2f}% {(r[6] or 0):>5.2f}%")
con.close()
