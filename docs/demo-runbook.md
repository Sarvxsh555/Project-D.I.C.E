# DealFlow360 — MVP demo runbook

A 10-minute walkthrough. Every number below is real and reproducible from a seeded database.

**Setup (once, before you present):**

```bash
cd /home/sanjeev/dice
./start-all.sh      # all 18 services + 3 UIs
./demo-seed.sh      # realistic catalogue, tiered customers, discount policy
```

`demo-seed.sh` is additive and idempotent — safe to re-run between rehearsals. It never deletes quotes or orders.

| Surface | URL |
|---|---|
| Main app | http://localhost:5173 |
| OEEG (Odoo event emulator) | http://localhost:5174 |
| Monitor dashboard | http://localhost:5175 |

**Logins** — all `Password123!`: `dfsales` (rep), `dfmanager`, `dffinance`, `dfadmin`, `dfcustomer`.

**Open in tabs before you start:** main app on the Approvals queue (logged in as `dfmanager`), a second browser profile / incognito as `dfsales`, and a terminal.

---

## The narrative

> "Sales reps discount to close deals. Finance finds out weeks later. DealFlow360 puts a policy engine in the middle that decides — in real time — what can go straight through and what a human has to look at."

---

## Act 1 — The engine decides (3 min)

Log in as **`dfsales`** → Quotations → New.

**1a. The clean deal — goes straight through.**
Customer *Globex Gold Inc*, product *Laptop Pro*, qty 2, discount **5%**.

> "Gold tier, 5% is inside their 15% ceiling, margin's healthy. Risk 6. It auto-approves — no human touches it."

Submit it. It lands on **APPROVED** without stopping.

**1b. The bad deal — gets caught.**
Customer *Northwind Bronze Ltd*, *Laptop Pro*, qty 2, discount **20%**.

> "Bronze tier only gets 5%. Watch what the engine says."

Risk **54**, routed **Sales Manager → Finance**, and it explains itself in plain language:
- `CATEGORY_BLEND: Electronics blended discount 20.0% exceeds Bronze ceiling 5.0%`
- `BLENDED_FINANCE: combined overage 15.0 pts requires Finance as well as Manager`

> "That 5% ceiling isn't hardcoded — it's a policy row an admin owns. I'll come back to that."

**1c. The subtle one — stacked overages.**
Customer *Globex Gold Inc*, *Support Plan 12mo*, qty 5, discount **12%**.

> "Services carry the thinnest margin, so they get a stricter ceiling — 8%, not 15%."

Risk 22, **Sales Manager only** (Finance deliberately skipped), with `SERVICE_LINE_STRICT` and `BLENDED_OVERAGE`:

> "This is the one a spreadsheet misses. Each category looks 'almost fine' on its own; the engine adds the overages up so the pattern can't slip through."

---

## Act 2 — The reviewer's queue (2 min)

Switch to **`dfmanager`** → **Approvals**.

Three quotes, **sorted riskiest-first**, each with colour-coded chips saying *why* it's waiting — red for margin/authority breaches, amber for ceilings.

> "A reviewer doesn't open three quotes to find the expensive one. The queue tells them: this is here because margin is below floor; that one because it broke a tier ceiling. Risk score, required chain, and the triggering rule — before you click anything."

Open the Bronze quote → approve as Manager → it stays pending for **Finance** → log in as **`dffinance`** → approve → **APPROVED**.

> "Two-step chain, each step stamped against a version hash of the quote. Re-price it and prior approvals stop being valid."

---

## Act 3 — Policy is data, not a deploy (2 min) ⭐

This is the strongest moment. Terminal:

```bash
# The knobs the engine actually reads
docker exec cd1797beff1f_login-postgres psql -U loginuser -d dealflow \
  -c "select threshold_key, threshold_value from governance_threshold order by 1;"
```

Pick the Gold 14% quote (created by the seed walkthrough, risk **16.8**, currently `AUTO`):

```bash
# Widen the post-hoc audit band: 10 -> 25
docker exec cd1797beff1f_login-postgres psql -U loginuser -d dealflow \
  -c "update governance_threshold set threshold_value=25 where threshold_key='audit_band_width';"
```

Wait ~5 seconds, re-check the same quote. Same risk score, but the band flips **`AUTO` → `AUTO_WITH_AUDIT`**.

> "Nothing redeployed, nothing restarted. Risk didn't change — our tolerance did. And note it's three bands, not a yes/no: clean deals auto-approve, borderline ones auto-approve *but get flagged for post-hoc review*, risky ones gate. That middle band is how you shrink a review queue without going blind."

Set it back to `10` afterwards.

---

## Act 4 — Negotiation that doesn't create busywork (2 min)

Log in as **`dfcustomer`** → open an approved quote → counter-offer.

**Small concession** (+1 point, margin still clears the floor) → stays **APPROVED**, event logged as `AUTO_ACCEPTED`:

> "Concession of 1.00 pts is within the 2 pt band and margin 32.3% still clears the 20% floor"

**Large concession** (e.g. 30%) → prior approval invalidated, re-scored at risk **96.5**, straight back to **Finance**.

> "Before, *any* counter-offer tore down the approval and re-queued it. A customer nudging half a point created the same work as one asking for thirty. Now the engine distinguishes them — and the margin guard reads the same threshold table Finance controls, so the rep can't widen their own band."

---

## Act 5 — It learns from its own data (1 min)

Quote builder, add *Laptop Pro* → look at the recommendations:

| Product | Score | Source |
|---|---|---|
| Docking Station | 0.60 | configured |
| Support Plan 12mo | 0.45 | configured |
| mobile | 0.333 | **discovered** — *"On 2 of 6 quotes containing Laptop Pro"* |

> "The top two are seeded rules. The third one nobody configured — it came out of our own quote history. That's a plain frequency ratio, no ML, and it gets sharper as the quote book grows."

---

## Act 6 — The ERP seam (1 min)

Open the **OEEG dashboard** (http://localhost:5174), fire `stock.replenished` against a quote.

> "OEEG emulates Odoo so we can demo ERP reactions without a live ERP. It has *no* intelligence — it emits events; D.I.C.E. decides what they mean. It also runs unattended on a timer when you arm it, so this isn't a button someone has to press."

```bash
curl -s -X POST http://localhost:8092/api/oeeg/poller \
  -H 'Content-Type: application/json' -d '{"enabled":true}'
```

Then show the audit trail — every event recorded against the quote with the decision it produced.

---

## Act 7 — Close: reporting (1 min)

Log in as **`dfadmin`** → **Reports** → *Download PDF*. Repeat as `dfmanager` / `dffinance`.

> "Same system, three different reports — Admin gets the platform overview, Sales Manager gets pipeline and rep performance, Finance gets revenue, MRR and margin-at-risk. Each exports to PDF."

---

## Closing line

> "One engine decides. Every decision is explainable in plain English, auditable, and tunable by the people accountable for it — without a deploy. That's the difference between a rules engine and a black box."

---

## If something breaks on stage

| Symptom | Fix |
|---|---|
| A page won't load | `tail -f logs/<service>.log`; re-run `./start-all.sh` (safe, idempotent) |
| Login fails | Passwords are bcrypt-seeded; re-run the reset in the run notes |
| Quote won't leave PENDING | It genuinely needs approval — that's the product working |
| Empty recommendations | Needs 2+ quotes containing the same product; `./demo-seed.sh` handles it |
| Wrong DB in a GUI | DICE is port **5433**, not 5432 (5432 is a different project) |

**Questions you should expect**

- *"Is this AI?"* — No, and deliberately. It's a deterministic rules engine: every decision is reproducible and explains itself. For approving discounts, auditability beats a model you can't interrogate. The thresholds are tuned from our own approval history.
- *"What stops a rep gaming it?"* — Ceilings are per tier *and* category, blended by line value so a big clean line can't mask a thin one, and stacked overages escalate. The rep can't edit the thresholds — that's a separate role.
- *"What if the engine is wrong?"* — Three bands, not a binary. Borderline deals go through but get flagged for post-hoc audit, so mistakes surface without blocking the pipeline.
