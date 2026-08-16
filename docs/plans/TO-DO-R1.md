# TO-DO R1 — Retail E-commerce AI Agent Build

> Source plan: [retail-plan-ver1.md](retail-plan-ver1.md) — 31 skills (28 new), 10 phases, 4 departments.
> One line per skill. Check the box when the verify criterion passes. Windows: use `python` (3.11.9), not `python3`.

## Decisions (resolved before execution)

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| B1 | E-commerce persona: Sang or Denshi? | **Denshi (電子)** | `generate-profile.py` uses Denshi for `--type ecommerce`. Follow the script. `SOUL-ecommerce.md` template (Sang) is a standalone file not used by the generator — leave it as-is. |
| B2 | Profile creation approach? | **Full config write + build new profiles** | `generate-profile.py ecommerce-manager --type ecommerce` + `merchandising-manager --type merchandising`. Script uses `base-config.yaml` template + `ecommerce-soul`/`merchandising-soul` snippets. Must match existing department profiles (same model config, mcp_servers.gbrain, .env structure). |
| B3 | How to set up gbrain? | **Run `./scripts/init-gbrain.sh --yes`** | Script auto-installs PostgreSQL 16 + pgvector, Ollama + nomic-embed-text, creates all department sources. ✅ bun + gbrain v0.46.0 already installed (`~/.bun/bin/gbrain`). ✅ `ecommerce` and `merchandising` added to `init-gbrain.sh` SOURCES array (13 sources total). Run the script to create sources. |
| A1 | Category mapping YAMLs don't exist? | **Create during Phase 3 build — scaffold + populate via connector API** | Each listing-sync skill (S9-S12) creates its `config/category-mapping-<platform>.yaml` during build. **⚠️ Existing connectors (shopee-connector, lazada-connector) do NOT have `get_categories()` methods** — they must be added to the connectors first, or the listing-sync skills call the category APIs directly. TikTok and website connectors are new (built in Phase 1) and should include `get_categories()` from the start. |
| A2 | 10-step or 12-step pipeline? | **12 steps** | The orchestrator table has 12 rows. Fix the plan's description from "10-step" to "12-step" to match the table. Gated steps: 4, 9, 10, 11. |
| A3 | 26 `~/.hermes/ecommerce/` references in skill bodies? | **Fix all — use `HERMES_HOME` env var** | All skill scripts must use `os.environ.get("HERMES_HOME", os.path.expanduser("~/.hermes"))` as the base path, NOT hardcoded `~/.hermes/ecommerce/`. On Windows: `HERMES_HOME=~/AppData/Local/hermes/`. Plan's build steps must specify this pattern. |
| A4 | Cross-profile orchestration: Option A or B? | **Option A — co-install all called skills on `ecommerce-manager`** | Existing skills are pure Python scripts that import each other directly (e.g., `from shopee_connector import ShopeeAdapter`). No inter-profile RPC exists in Shogun OS. The orchestrator (S25) + all called skills (S17, S18, S19, S20, S21, S22, S23, S24, S26, S27) must be installed on `ecommerce-manager` profile. Merchandising/Marketing/Compliance profiles get their assigned skills too (for standalone use), but the orchestrator runs everything on ecommerce. **Exception:** If a client doesn't need a specific department (e.g. no Marketing), install those skills directly into `ecommerce-manager` instead of creating that department profile — the client can pick and choose. |
| A5 | ComfyUI: install or drop? | **Already installed — just install skill to new profiles** | ComfyUI skill exists at `~/AppData/Local/hermes/skills/creative/comfyui`. Run `python skills/shogunify/scripts/install-to-profiles.py --skill comfyui --profiles ecommerce-manager,merchandising-manager --force` during P3 (existing profiles like marketing-manager already have it). |
| A6 | API credentials? | **Build without creds; user inputs via web portal Connectors page** | All connector skills fail gracefully without creds (return `success: False`). When client ready, they enter creds in the Shogun web portal Connectors page → writes to `.env`. No creds needed for build or verify (graceful-failure check only). |
| A7 | Which `python`? | **`python` (system, D:\Python311\python.exe, 3.11.9)** | System `python` → 3.11.9 with `requests` + `pip`. `python3` → 3.14.3 (no pip). Do NOT use `python3` anywhere. Do NOT use the hermes-agent venv python (`C:\Users\user\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe`) — that's for the Hermes runtime, not skill scripts. |

---

## Prerequisites (gating — do first, blocks every phase)

- [ ] **P0.** Run `./scripts/init-gbrain.sh --yes` — verify: `gbrain sources list` shows `ecommerce/` and `merchandising/` sources (✅ bun + gbrain v0.46.0 installed, ✅ SOURCES array updated to 13 sources — just run the script)
- [ ] **P1.** Create `ecommerce-manager` profile: `python scripts/generate-profile.py ecommerce-manager --type ecommerce --force` — verify: `hermes profile list` shows `ecommerce-manager`; SOUL.md says Denshi (電子); config.yaml has `mcp_servers.gbrain.env.GBRAIN_SOURCE: ecommerce`
- [ ] **P1.** Create `merchandising-manager` profile: `python scripts/generate-profile.py merchandising-manager --type merchandising --force` — verify: `hermes profile list` shows `merchandising-manager`; SOUL.md says Shohin (商品); config.yaml has `GBRAIN_SOURCE: merchandising`
- [ ] **P1.** Verify new profiles match existing department structure (marketing-manager as reference): same model block, same mcp_servers.gbrain structure, .env present, skills/ dir present
- [ ] **P2.** ✅ Done — `ecommerce-manager` and `merchandising-manager` added to `SHOGUN_CORE_PROFILES` in `skills/shogunify/scripts/install-to-profiles.py`
- [ ] **P3.** Install comfyui skill to new profiles: `python skills/shogunify/scripts/install-to-profiles.py --skill comfyui --profiles ecommerce-manager,merchandising-manager --force`
- [ ] **P4.** Option A confirmed — all orchestrator-called skills co-installed on `ecommerce-manager` during Closeout. **Exception:** if client doesn't need a department (e.g. no Marketing), install that department's skills directly into `ecommerce-manager` instead of creating the profile.
- [ ] **P5.** Confirmed: Skills 21-23 are prompt templates — `python <script>.py` alone won't produce content without the agent
- [ ] **P6.** Confirmed: `python` → D:\Python311\python.exe (3.11.9, has `requests`/`pip`); `python3` → 3.14.3 (no pip) — never use `python3`
- [ ] **P7.** Verify `yaml` module available: `python -c "import yaml"` — several skills reference `.yaml` config files. If missing: `pip install pyyaml`
- [ ] **P8.** Set `HERMES_HOME_ROOT` env var: `export HERMES_HOME_ROOT="$HOME/AppData/Local/hermes"` — `install-to-profiles.py` reads this var, NOT `HERMES_HOME`. Without it, the script may resolve to wrong path.

## Phase 1 — Connectors (E-commerce)

- [ ] **S4.** `tiktok-shop-connector` — done when `connect()` fails gracefully without creds, imports are stdlib-only, `skill_view` returns content
- [ ] **S5.** `website-connector` — done when `get_adapter("woocommerce")` and `("shopify")` both resolve; base `WebsiteStoreAdapter` is abstract (raises `TypeError`)
- [ ] **S6.** `sitegiant-connector` — done when rate-limit headers are parsed/stored, `Access-Token` request works, `skill_view` returns content

## Phase 2 — Data Ingestion (E-commerce)

- [ ] **S7.** `autocount-product-sync` — done when master dir auto-creates under `$HERMES_HOME/ecommerce/master/`, `products.jsonl` written, `sync-state.json` records timestamp, incremental uses last-sync
- [ ] **S8.** `sitegiant-product-sync` — done when records tagged `source: sitegiant`; merge fills missing AutoCount fields without overwriting with empties

## Phase 3 — Listing Sync (E-commerce)

- [ ] **S9.** `shopee-listing-sync` — done when new SKU → create path, existing SKU → update path; SKU mapping updated after create; title ≤ 120 chars; `config/category-mapping-shopee.yaml` created and populated via `shopee-connector.get_categories()`
- [ ] **S10.** `lazada-listing-sync` — done when title ≤ 255 chars; max 8 images enforced; create/update auto-detected; `config/category-mapping-lazada.yaml` created and populated via `lazada-connector.get_category_tree()`
- [ ] **S11.** `tiktok-listing-sync` — done when description ≤ 500 chars; min image 800×800 enforced; `config/category-mapping-tiktok.yaml` created and populated via `tiktok-shop-connector.get_categories()`
- [ ] **S12.** `website-listing-sync` — done when formatting adapts for WooCommerce vs Shopify field names; `config/category-mapping-website.yaml` created (WooCommerce/Shopify category IDs)

## Phase 4 — Price Sync (E-commerce)

- [ ] **S13.** `shopee-price-sync` — done when `update_price` uses `item_id` from SKU mapping; log is append-only JSONL at `$HERMES_HOME/ecommerce/logs/`; failures logged with error
- [ ] **S14.** `lazada-price-sync` — done when same checks as S13 pass for Lazada (uses `seller_sku`)
- [ ] **S15.** `tiktok-price-sync` — done when same checks as S13 pass for TikTok (uses `product_id`)
- [ ] **S16.** `website-price-sync` — done when same checks as S13 pass for website (uses `get_adapter`)

## Phase 5 — Product Analysis (Merchandising)

- [ ] **S17.** `product-velocity-analyzer` — done when dead = zero sales in 180d or zero velocity; slow = cover > 8 mo; fast = velocity > 2× category avg; capital ranked desc; thresholds editable in YAML; reads from `$HERMES_HOME/ecommerce/master/`
- [ ] **S18.** `product-margin-analyzer` — done when high = margin_pct > 40%; low = < 15%; negative detected; contribution ranked desc; reads from `$HERMES_HOME/ecommerce/master/`

## Phase 6 — Marketing (Marketing)

- [ ] **S19.** `promo-recommender` — done when dead+high-margin → Clearance 30-50%; slow+high → Flash 15-25%; promo price never below cost; urgency 1-10; campaigns group by theme
- [ ] **S20.** `cross-sell-bundle-recommender` — done when co-occurrence pairs are sensible; dead+best-seller bundles built; bundle price < individual sum; each bundle has a rationale

## Phase 7 — Content Generation (Marketing — prompt templates, see P5)

- [ ] **S21.** `video-content-generator` — done when `generate_script` returns JSON with hook, scenes, voiceover, text overlay, CTA; TikTok vs Reels vs YouTube variants
- [ ] **S22.** `social-content-generator` — done when captions respect platform char limits; hashtags platform-appropriate (#fyp for TikTok); keywords SEO-relevant
- [ ] **S23.** `product-copy-generator` — done when descriptions respect platform char limits; headlines punchy; banner copy short

## Phase 8 — Creative (Marketing)

- [ ] **S24.** `banner-generator` — done when `generate()` produces a PNG in `$HERMES_HOME/ecommerce/banners/pending/`; dimensions match platform spec; brand config editable via YAML; comfyui skill installed (P3 done)

## Phase 9 — Orchestration & Governance

- [ ] **S25.** `ecommerce-workflow-orchestrator` (E-commerce) — done when `run_full` executes all 12 steps in order; pauses at gated steps 4, 9, 10, 11; `resume_from` works; state persists at `$HERMES_HOME/ecommerce/workflow-state.json`; all called skills co-installed on `ecommerce-manager` (Option A)
- [ ] **S26.** `approval-gate` (Compliance) — done when `request` creates a JSON file in `$HERMES_HOME/ecommerce/approvals/`; approve/reject update status; optional gates auto-approve; `expire_stale` works; config controls required vs optional
- [ ] **S27.** `action-audit-log` (Compliance) — done when `log` writes JSONL to `$HERMES_HOME/ecommerce/logs/action-audit.jsonl`; `query` filters return matches; `get_summary` counts correct; `export` produces CSV; `cleanup` purges old entries

## Phase 10 — Retail Operations

- [ ] **S28.** `daily-sales-dashboard` (E-commerce) — done when top 20 ranked by units desc; channel pct sums to 100%; GP% = (revenue−cost)/revenue; DoD + same-weekday-last-week; `deliver` produces a Slack message
- [ ] **S29.** `stock-reorder-supplier-analysis` (E-commerce) — done when 8+1 → cost×8/9; 10+2 → cost×10/12; flat 5% → ×0.95; stockout HIGH when days-cover < lead time; bulk savings vs stockout cost compared; urgency ranked; config editable
- [ ] **S30.** `competitive-pricing-research` (E-commerce) — done when "buy 2 free 1" → price×2/3; 10% off → ×0.9; shipping added; priced-out + advantage flags fire at thresholds; competitor config editable
- [ ] **S31.** `product-deep-dive-verifier` (Merchandising) — done when UOM 1 SET = 12 BOX = 144 CAP verified; platform UOM mismatch detected; IV/OS pct sums to 100%; expiry 6 mo → Clearance, 3 mo → Urgent, 30 days → Critical; thresholds editable

## Closeout (after all skills above are checked)

> **⚠️ `install-to-profiles.py --skill` only accepts ONE skill name per call (no comma-separated).** Run one command per skill. Use a shell loop:
> ```bash
> for skill in skill-a skill-b skill-c; do
>   python skills/shogunify/scripts/install-to-profiles.py --skill "$skill" --profiles <profile> --force
> done
> ```

- [ ] Install each skill to its **assigned department profile** (primary install) — one command per skill:
  ```
  python skills/shogunify/scripts/install-to-profiles.py --skill <name> --profiles <assigned-dept> --force
  ```
- [ ] **Option A — co-install orchestrator-called skills on `ecommerce-manager`** (so S25 can import them directly):
  ```bash
  for skill in product-velocity-analyzer product-margin-analyzer promo-recommender cross-sell-bundle-recommender video-content-generator social-content-generator product-copy-generator banner-generator approval-gate action-audit-log; do
    python skills/shogunify/scripts/install-to-profiles.py --skill "$skill" --profiles ecommerce-manager --force
  done
  ```
- [ ] **Exception (per-client):** If client doesn't need a department (e.g. no Marketing profile), install that department's skills directly into `ecommerce-manager` instead of their assigned profile. The client picks which departments they want.
- [ ] Run full verification suite: `scripts/verify-install.sh` (MCP connectivity + skill checks)
- [ ] Wire orchestrator cron for weekly autonomous run: `ecommerce-workflow-orchestrator run-full`
- [ ] Wire daily sales dashboard cron: `daily-sales-dashboard deliver yesterday slack` (6 AM daily)
