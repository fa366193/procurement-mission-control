# Procurement Mission Control

**One exception. Six points of view.**

Procurement Mission Control is a transparent multi-agent research prototype for inventory exception review. It extends a shipped deterministic Procurement Heat Map Engine with specialized analytical roles, explicit disagreement, counterfactual simulation, and human-accountable disposition.

[Launch the live prototype](https://fa366193.github.io/procurement-mission-control/) · [Read the lab notebook](https://decisionsystemslab.org/systems/procurement-heat-map)

## Why it exists

Procurement teams rarely lack data. They lack a reliable way to focus attention, reconcile competing constraints, and preserve the reasoning behind a decision.

The original production engine joined SAP exports, automated preparation with PowerShell, preserved trusted Excel rules, and delivered ranked exceptions in Power BI. Procurement Mission Control explores the next research question:

> Can specialized agents improve an exception review without weakening the deterministic, auditable backbone that users already trust?

## The agent team

- **Demand Sentinel** — consumption, volatility, forecast bias, stockout horizon
- **Supplier Scout** — lead time, on-time delivery, PO exposure, concentration
- **Inventory Strategist** — reorder point, safety stock, inspection and excess stock
- **Finance Guardian** — working capital, expedite premium, carrying cost
- **Risk Challenger** — missing evidence, counterarguments, failure modes
- **Decision Orchestrator** — rules, evidence, disagreement, and human review

These are bounded reasoning roles in a deterministic browser simulation. The prototype does not call external AI services, connect to SAP, retrain from overrides, or place purchase orders.

## What the prototype does

- Ranks a synthetic portfolio of procurement exceptions
- Lets users edit operational planning inputs
- Runs a visible six-stage agent investigation
- Shows evidence, rules fired, disagreement, unknowns, and confidence bands
- Supports approve, override, and request-more-evidence dispositions
- Recomputes counterfactual demand, lead-time, reliability, and cost scenarios
- Exports a real JSON decision memo with the complete synthetic record

## Deterministic backbone

Core calculations are centralized in typed client-side functions:

```text
usable_stock  = on_hand + 0.55 × inspection_inventory
reorder_point = weekly_demand × lead_time + safety_stock
reorder_gap   = max(0, reorder_point − usable_stock − open_PO)
```

Classification order:

```text
obsolete                         → OBSOLETE
high volatility + supplier risk → RESEARCH
gap > 0 + no open PO             → CREATE PO
gap > 0 + open PO                → PULL IN
material excess                  → PUSH OUT
otherwise                        → MONITOR
```

## Research boundaries

All records are synthetic but operationally plausible. A production implementation would require authenticated ERP access, role-based authorization, segregation of duties, guarded write-back, source and model versioning, prompt/data-injection defenses, and durable audit logging.

The proposed evaluation compares the hybrid system against a rules-only baseline on time-to-decision, consistency, evidence coverage, confidence calibration, override quality, stockout avoidance, working-capital outcomes, and user comprehension.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

## License

MIT © 2026 Fatima Aguilar
