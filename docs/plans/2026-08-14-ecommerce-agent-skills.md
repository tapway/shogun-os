# E-commerce Admin & Operations AI Agent — Implementation Plan (Granular)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build 27 granular Hermes Agent skills — each doing ONE specific function — that together give Shogun OS an autonomous end-to-end admin & e-commerce workflow.

**Architecture:** Shogun OS replaces SiteGiant as the central hub. Each platform connects directly via its own connector skill. AutoCount is the product/inventory master data source. A master orchestrator sequences the full workflow with human approval gates. All operations are logged.

**Tech Stack:** Python 3.8+ (stdlib only for connectors), Hermes Agent skills framework, existing retail skills.

**Core Principle: One skill = one specific function. No mixing.**

---

## What Already Exists (DO NOT rebuild)

| Skill | Category | What it does |
|-------|----------|-------------|
| `autocount-connector` | retail | AutoCount AOTG: stock balance, sales invoices, debtor aging, POs |
| `shopee-connector` | retail | Shopee Open Platform v2: orders, products, listings |
| `lazada-connector` | retail | Lazada Open Platform: orders, products, finance |
| `ecommerce-listing` | retail | Listing sync, image compliance, SEO (Shopee/Lazada) |
| `marketplace-analytics` | retail | Sales by platform, ad ROI, competitor pricing |
| `dead-slow-stock-detector` | procurement | Dead/slow stock detection + flush recommendations |
| `product-price-monitor` | productivity | Watches external prices (read-only) |
| `comfyui` / `claude-design` | creative | Image/HTML generation building blocks |

---

## Phase 1 — Platform Connectors (4 new skills)

> One connector per platform. Each only connects to ONE platform API. No mixing.

### Skill 1: `tiktok-shop-connector`
**Function:** Connect to TikTok Shop Open API. Read/write products, orders, logistics.
**Files:** `retail/tiktok-shop-connector/SKILL.md` + `scripts/tiktok_shop_connector.py`
**Pattern:** `retail/shopee-connector` (HMAC-SHA256 signing, stdlib only)
**Env vars:** `TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET`, `TIKTOK_ACCESS_TOKEN`, `TIKTOK_SHOP_ID`, `TIKTOK_API_REGION`
**Methods:** `connect()`, `read_orders()`, `read_products()`, `update_listing()`, `read_packages()`, `read_shop_info()`

### Skill 2: `woocommerce-connector`
**Function:** Connect to WooCommerce REST API. Read/write products, orders, inventory.
**Files:** `retail/woocommerce-connector/SKILL.md` + `scripts/woocommerce_connector.py`
**Pattern:** OAuth 1.0a (consumer key/secret), REST JSON
**Env vars:** `WC_STORE_URL`, `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`
**Methods:** `connect()`, `read_products()`, `read_orders()`, `update_listing()`, `update_price()`, `read_inventory()`
**API:** `https://<store-url>/wp-json/wc/v3/`

### Skill 3: `shopify-connector`
**Function:** Connect to Shopify Admin API. Read/write products, orders, inventory.
**Files:** `retail/shopify-connector/SKILL.md` + `scripts/shopify_connector.py`
**Pattern:** REST Admin API with access token
**Env vars:** `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_API_VERSION`
**Methods:** `connect()`, `read_products()`, `read_orders()`, `update_listing()`, `update_price()`, `read_inventory()`
**API:** `https://<store-domain>/admin/api/<version>/`

### Skill 4: `sitegiant-webstore-connector`
**Function:** Connect to SiteGiant Open API (webstore only — NOT as central hub). Read/write products, orders, inventory.
**Files:** `retail/sitegiant-webstore-connector/SKILL.md` + `scripts/sitegiant_webstore_connector.py`
**Pattern:** Access-Token header, REST JSON
**Env vars:** `SITEGIANT_API_TOKEN`, `SITEGIANT_STORE_ID`
**Methods:** `connect()`, `read_products()`, `read_orders()`, `update_listing()`, `update_price()`, `read_inventory()`
**API:** `https://opensgapi.sitegiant.co/api/v1`
**Key endpoints:** Get Product List, Get Product by ID, Update Product, Update Product Price, Upload Product Image, Get Item List, Update Item, Add Item, Get Order List, Update Order, Get Stock Adjustment List, Get Warehouse List, Get Vendor List, Get Purchase Order List, Get Customer List, Check Voucher Validity, Add Voucher Usage
**Webhooks:** Inventory Update, Order Update, Package Update, PO Update, Customer Update (HMAC verified)
**Rate limiting:** `X-RateLimit-Remaining` / `X-RateLimit-Limit` response headers

---

## Phase 2 — Listing Data Formatters (4 skills)

> One formatter per target platform. Each transforms AutoCount product data into ONE platform's schema only.

### Skill 5: `shopee-listing-formatter`
**Function:** Transform AutoCount product data → Shopee listing schema.
**Files:** `retail/shopee-listing-formatter/SKILL.md` + `scripts/shopee_formatter.py`
**Input:** AutoCount product data (SKU, barcode, brand, category, UOM, description, selling_price, cost_price, stock, images)
**Output:** Shopee schema: `item_name`, `description`, `price`, `stock`, `variation`, `image`, `category_id`, `brand`, `item_status`
**Rules:** Title max 120 chars, max 9 images, min 500x500px images, description max 3000 chars
**Methods:** `format(product_data)`, `validate(formatted_data)`

### Skill 6: `lazada-listing-formatter`
**Function:** Transform AutoCount product data → Lazada listing schema.
**Files:** `retail/lazada-listing-formatter/SKILL.md` + `scripts/lazada_formatter.py`
**Output:** Lazada schema: `seller_sku`, `name`, `description`, `price`, `quantity`, `image_urls`, `category_id`, `brand`
**Rules:** Title max 255 chars, max 8 images, min 500x500px images, description max 3000 chars
**Methods:** `format(product_data)`, `validate(formatted_data)`

### Skill 7: `tiktok-listing-formatter`
**Function:** Transform AutoCount product data → TikTok Shop listing schema.
**Files:** `retail/tiktok-listing-formatter/SKILL.md` + `scripts/tiktok_formatter.py`
**Output:** TikTok schema: `product_id`, `title`, `description`, `price`, `stock`, `image_url`, `category_id`, `brand`
**Rules:** Title max 255 chars, max 9 images, description max 500 chars, min 800x800px images
**Methods:** `format(product_data)`, `validate(formatted_data)`

### Skill 8: `website-listing-formatter`
**Function:** Transform AutoCount product data → Website (generic) listing schema.
**Files:** `retail/website-listing-formatter/SKILL.md` + `scripts/website_formatter.py`
**Output:** Generic schema: `sku`, `name`, `description`, `price`, `stock`, `images`, `category`, `brand`, `barcode`, `uom`
**Rules:** Adapts based on target platform (WooCommerce/Shopify/SiteGiant) — field name mapping only
**Methods:** `format(product_data, target="woocommerce")`, `validate(formatted_data, target)`

---

## Phase 3 — Listing Operations (3 skills)

> One skill per listing action. Create, update, and sync are different functions.

### Skill 9: `listing-create-orchestrator`
**Function:** Create NEW product listings across selected platforms.
**Files:** `retail/listing-create-orchestrator/SKILL.md` + `scripts/listing_create.py`
**Calls:** Per-platform formatter → per-platform connector `create_listing()`
**Per-platform error isolation** — one failure doesn't block others
**Methods:** `create(product_data, platforms=["shopee","lazada","tiktok","website"])`
**Returns:** Per-platform create result (success/fail, listing ID, error)

### Skill 10: `listing-update-orchestrator`
**Function:** Update EXISTING listings (price, stock, description, images) across selected platforms.
**Files:** `retail/listing-update-orchestrator/SKILL.md` + `scripts/listing_update.py`
**Calls:** Per-platform connector `update_listing()`
**Per-platform error isolation**
**Methods:** `update(sku, changes, platforms)`
**Returns:** Per-platform update result

### Skill 11: `listing-sync-orchestrator`
**Function:** Reconcile listing state across all platforms — detect drift, sync changes.
**Files:** `retail/listing-sync-orchestrator/SKILL.md` + `scripts/listing_sync.py`
**Calls:** All platform connectors `read_products()` → compare with AutoCount master → push diffs
**Modes:** `full` (all products), `incremental` (changed since last sync), `single` (one SKU)
**State:** `~/.hermes/ecommerce/sync-state.json`
**Methods:** `sync(mode="incremental", platforms)`, `get_sync_status()`, `get_drift_report()`

---

## Phase 4 — Pricing (2 skills)

> Formula calculation and price sync are separate functions. Price change logging is handled by the operations-logger (Skill 27).

### Skill 12: `pricing-formula-engine`
**Function:** Calculate selling prices from configurable pricing formulas.
**Files:** `retail/pricing-formula-engine/SKILL.md` + `scripts/pricing_formulas.py`
**Formula types:**
- Cost-plus margin: `selling_price = cost_price * (1 + margin_pct)`
- Rounding rules: round to nearest RM 0.90, RM 0.50, etc.
- Platform adjustments: Shopee +5% for commission, etc.
- Min/max price guardrails
- Promotional price overrides (temporary)
**Config:** `pricing-config.yaml` (formulas, margins, rounding rules per category/brand)
**Methods:** `calculate(cost_price, formula)`, `apply_batch(products, formula)`, `get_formula_config()`

### Skill 13: `price-sync-orchestrator`
**Function:** Sync calculated prices to all connected platforms.
**Files:** `retail/price-sync-orchestrator/SKILL.md` + `scripts/price_sync.py`
**Calls:** Per-platform connector `update_price()` / `update_listing(price=)`
**Per-platform error isolation** — flags products that fail to update
**Methods:** `sync(price_map, platforms)`, `get_failed_updates()`
**Returns:** Per-platform sync result (success count, failed SKUs, errors)

---

## Phase 5 — Performance Analysis (2 skills)

> Data aggregation and classification are separate functions.

### Skill 14: `sales-data-aggregator`
**Function:** Pull sales data from all platforms and merge by SKU into unified dataset.
**Files:** `retail/sales-data-aggregator/SKILL.md` + `scripts/sales_aggregator.py`
**Calls:** `shopee-connector.read_orders()`, `lazada-connector.read_orders()`, `tiktok-shop-connector.read_orders()`, `website-store-connector.read_orders()`, `autocount-connector.read_stock_balance()` (for cost/stock)
**Output:** Unified sales dataset: `[{sku, platform, units_sold, revenue, cost, margin, date}, ...]`
**Methods:** `aggregate(period_days=180)`, `get_by_sku(sku)`, `get_by_platform(platform)`
**Handles:** SKU matching across platforms (SKU mapping table), currency normalization (all MYR)

### Skill 15: `product-performance-classifier`
**Function:** Classify products into performance categories based on aggregated sales data.
**Files:** `retail/product-performance-classifier/SKILL.md` + `scripts/performance_classifier.py`
**Input:** Sales dataset from `sales-data-aggregator`
**Classifications:**

| Category | Criteria (configurable) |
|----------|----------------------|
| Dead stock | Zero sales in 180 days |
| Slow-moving | < 2 units/month velocity |
| Fast-moving | > 20 units/month velocity |
| Low-margin | Margin % < 15% |
| High-margin | Margin % > 40% |
| Zero-sales | No sales in 30 days |

**Methods:** `classify(sales_data)`, `get_classification(sku)`, `get_by_category(category)`
**Extends:** `dead-slow-stock-detector` (which reads from procurement gbrain only — this reads from all platforms)

---

## Phase 6 — Marketing Recommendations (4 skills)

> Each recommendation type is a separate function: selection, campaigns, pricing, bundles.

### Skill 16: `promo-candidate-selector`
**Function:** Identify which products should be promoted based on performance classification.
**Files:** `retail/promo-candidate-selector/SKILL.md` + `scripts/promo_selector.py`
**Input:** Performance classification from Skill 15
**Selection logic:** Dead stock (clearance), slow-moving (stimulus), high-margin-low-velocity (push), zero-sales (revival)
**Output:** Ranked list of promo candidates with: SKU, reason, urgency score (1-10)
**Methods:** `select(classification_report)`, `get_candidates()`

### Skill 17: `campaign-recommendation-generator`
**Function:** Generate campaign types and promotional angles for selected products.
**Files:** `retail/campaign-recommendation-generator/SKILL.md` + `scripts/campaign_generator.py`
**Campaign types:** "Clearance Sale", "New Arrival", "Best Seller Highlight", "Bundle Deal", "Flash Sale", "Seasonal Campaign"
**Angle logic:** Based on product category, season, stock urgency, margin headroom
**Output:** Per product: campaign type, promotional angle, target audience, campaign duration suggestion
**Methods:** `generate(promo_candidates)`, `get_campaign(sku)`

### Skill 18: `promo-pricing-calculator`
**Function:** Calculate suggested promotional prices and margin impact.
**Files:** `retail/promo-pricing-calculator/SKILL.md` + `scripts/promo_pricing.py`
**Input:** Promo candidates + campaign types
**Calculation:** Discount % based on margin headroom + days-since-last-sale + capital-tied-up + campaign type
**Guardrail:** Never sell below cost (margin ≥ 0%)
**Output:** Per product: suggested promo price, discount %, margin impact %, break-even units
**Methods:** `calculate(promo_candidates, campaign_types)`, `get_promo_price(sku)`

### Skill 19: `bundle-recommendation-generator`
**Function:** Generate cross-sell and bundle recommendations.
**Files:** `retail/bundle-recommendation-generator/SKILL.md` + `scripts/bundle_generator.py`
**Bundle logic:** Complementary categories (phone + case), high-margin + fast-moving combo, dead stock + best seller bundle
**Output:** Per bundle: SKUs, bundle price, individual price sum, savings %, expected margin
**Methods:** `generate(classification_report)`, `get_bundles(sku)`, `get_bundle_pricing(bundle_id)`

---

## Phase 7 — Content Generation (4 skills)

> Each content type group is a separate function. No single skill generates everything.

### Skill 20: `video-content-generator`
**Function:** Generate video concepts and scripts for products.
**Files:** `retail/video-content-generator/SKILL.md` + `scripts/video_generator.py`
**Output:** Video concept (1-paragraph + visual direction), video script (30-60s TikTok/Reels format with scene descriptions)
**Tailored to:** Product category, promo type, platform (TikTok vs Reels vs YouTube Shorts)
**Methods:** `generate_concept(sku)`, `generate_script(sku, duration=30, platform="tiktok")`

### Skill 21: `product-description-generator`
**Function:** Generate product captions and platform-specific descriptions.
**Files:** `retail/product-description-generator/SKILL.md` + `scripts/description_generator.py`
**Output:** 3-5 caption variants (short, punchy), platform descriptions (Shopee max 3000, Lazada max 3000, TikTok max 500, Website unlimited)
**Methods:** `generate_captions(sku, count=3)`, `generate_description(sku, platform)`

### Skill 22: `marketing-copy-generator`
**Function:** Generate banner copy, promotional headlines, and call-to-action text.
**Files:** `retail/marketing-copy-generator/SKILL.md` + `scripts/marketing_copy.py`
**Output:**
- Banner copy: headline + subheadline (space-constrained)
- Promo headlines: 3-5 campaign title variants
- CTAs: platform-appropriate ("Buy Now", "Grab Yours", "Limited Stock", "Shop Now")
**Methods:** `generate_banner_copy(sku, promo_type)`, `generate_headlines(sku, promo_type, count=3)`, `generate_cta(platform, promo_type)`

### Skill 23: `keyword-hashtag-generator`
**Function:** Generate SEO keywords and platform hashtags for products.
**Files:** `retail/keyword-hashtag-generator/SKILL.md` + `scripts/keywords_hashtags.py`
**Output:** 10-15 SEO keywords + platform hashtags (#fyp, #shopee, #foryou, etc.)
**Tailored to:** Product category, platform, trending tags
**Methods:** `generate_keywords(sku)`, `generate_hashtags(sku, platform)`

---

## Phase 8 — Banner Generation (1 skill)

> Banner generation only. Banner approval uses the general approval gate (Skill 26).

### Skill 24: `banner-generator`
**Function:** Generate promotional banner images from brand template.
**Files:** `retail/banner-generator/SKILL.md` + `scripts/banner_generator.py` + `templates/banner_template.html`
**Banner elements:** Product image, promotion text (from Skill 22), selling price, campaign theme (from Skill 17), brand identity (logo, colors, fonts)
**Banner sizes per platform:**

| Platform | Dimensions |
|----------|-----------|
| Shopee | 1024x1024 (product), 1920x600 (cover) |
| Lazada | 800x800 (product), 1920x600 (cover) |
| TikTok Shop | 1080x1080 (product), 1080x1920 (story) |
| Website | 1200x628 (OG), 1920x600 (hero) |

**Output:** Banner PNG saved to `~/.hermes/ecommerce/banners/pending/` (awaiting approval)
**Brand config:** `templates/brand-config.yaml` (logo path, colors, fonts)
**Methods:** `generate(sku, promo_type, platform, size)`, `get_brand_config()`
**Uses:** HTML/CSS template → screenshot to PNG; `comfyui` for AI-generated product backgrounds if needed

---

## Phase 9 — Orchestration & Control (3 skills)

### Skill 25: `ecommerce-workflow-orchestrator`
**Function:** Execute the master 10-step end-to-end workflow sequence.
**Files:** `retail/ecommerce-workflow-orchestrator/SKILL.md` + `scripts/workflow_orchestrator.py`
**Workflow steps:**

| Step | Action | Skill Called |
|------|--------|-------------|
| 1 | Retrieve product data from AutoCount | `autocount-connector.read_stock_balance()` |
| 2 | Aggregate sales data | `sales-data-aggregator.aggregate()` |
| 3 | Classify product performance | `product-performance-classifier.classify()` |
| 4 | Select promo candidates | `promo-candidate-selector.select()` — **GATED** |
| 5 | Generate campaign recommendations | `campaign-recommendation-generator.generate()` |
| 6 | Calculate promo pricing | `promo-pricing-calculator.calculate()` — **GATED** |
| 7 | Generate bundle recommendations | `bundle-recommendation-generator.generate()` |
| 8 | Generate marketing content | `video-content-generator` + `product-description-generator` + `marketing-copy-generator` + `keyword-hashtag-generator` |
| 9 | Generate banners | `banner-generator.generate()` — **GATED** |
| 10 | Update prices | `price-sync-orchestrator.sync()` — **GATED** |
| 11 | Update listings | `listing-update-orchestrator.update()` — **GATED** |
| 12 | Sync to all platforms | `listing-sync-orchestrator.sync()` |
| 13 | Log all actions | `ecommerce-operations-logger.log_workflow()` |

**Modes:** `full` (all steps), `partial` (selected steps), `single` (one step)
**Methods:** `run_full()`, `run_step(step_number)`, `get_status()`, `resume_from(step_number)`
**Cron-schedulable** for periodic autonomous runs
**Approval gates** via Skill 26 — workflow pauses and waits for human approval at gated steps

### Skill 26: `approval-workflow-gate`
**Function:** Gate critical actions requiring human approval before execution.
**Files:** `retail/approval-workflow-gate/SKILL.md` + `scripts/approval_gate.py`
**Gate types:**

| Gate Type | What it gates | Default |
|-----------|--------------|---------|
| `price_change` | Price updates before sync | Optional |
| `banner_publishing` | Banner publishing | Required |
| `product_publishing` | New listing publishing | Required |
| `campaign_launch` | Marketing campaign launch | Required |
| `promo_pricing` | Promo price going live | Required |

**State machine:** `pending` → `approved` / `rejected` / `expired`
**Storage:** `~/.hermes/ecommerce/approvals/` (JSON files per request)
**Methods:** `request(gate_type, payload)`, `check(request_id)`, `approve(request_id, decided_by)`, `reject(request_id, decided_by, reason)`, `get_pending()`, `expire_stale(timeout=24h)`
**Delivery:** Pending approvals deliverable to Slack/Telegram for human review
**Config:** `approval-config.yaml` (which gates required vs optional, expiry, delivery channel)

### Skill 27: `ecommerce-operations-logger`
**Function:** Structured logging of all e-commerce operations.
**Files:** `retail/ecommerce-operations-logger/SKILL.md` + `scripts/operations_logger.py`
**Log categories:**

| Category | Fields |
|----------|--------|
| `listing_created` | sku, platform, listing_id, timestamp |
| `listing_updated` | sku, platform, fields_changed, timestamp |
| `price_change` | sku, old_price, new_price, platform, formula, timestamp |
| `sync_status` | platform, mode, success_count, fail_count, failed_skus, timestamp |
| `error` | error_type, message, context (sku, platform, operation), timestamp |
| `ai_recommendation` | type, sku, action, confidence, accepted/rejected, timestamp |
| `workflow_completed` | workflow_id, steps_executed, duration, gates_triggered, timestamp |

**Storage:** `~/.hermes/ecommerce/logs/` (JSONL files, one per category per day)
**Retention:** 90 days default, configurable
**Methods:** `log(category, **fields)`, `query(category, filters)`, `get_summary(period_days=7)`, `check_errors(since)`, `export(category, since, until, format="csv")`

---

## Build Order & Dependencies

| Phase | # | Skill | Depends On |
|-------|---|-------|------------|
| 1 | 1 | `tiktok-shop-connector` | — |
| 1 | 2 | `woocommerce-connector` | — |
| 1 | 3 | `shopify-connector` | — |
| 1 | 4 | `sitegiant-webstore-connector` | — |
| 2 | 5 | `shopee-listing-formatter` | `autocount-connector` (existing) |
| 2 | 6 | `lazada-listing-formatter` | `autocount-connector` (existing) |
| 2 | 7 | `tiktok-listing-formatter` | `autocount-connector` (existing) |
| 2 | 8 | `website-listing-formatter` | `autocount-connector` (existing) |
| 3 | 9 | `listing-create-orchestrator` | Skills 1-4 + 5-8 + existing connectors |
| 3 | 10 | `listing-update-orchestrator` | Skills 1-4 + existing connectors |
| 3 | 11 | `listing-sync-orchestrator` | Skills 1-4 + existing connectors |
| 4 | 12 | `pricing-formula-engine` | `autocount-connector` (existing) |
| 4 | 13 | `price-sync-orchestrator` | Skills 1-4 + 12 |
| 5 | 14 | `sales-data-aggregator` | All connectors (existing + Skills 1-4) |
| 5 | 15 | `product-performance-classifier` | Skill 14 |
| 6 | 16 | `promo-candidate-selector` | Skill 15 |
| 6 | 17 | `campaign-recommendation-generator` | Skill 16 |
| 6 | 18 | `promo-pricing-calculator` | Skill 16 + 17 |
| 6 | 19 | `bundle-recommendation-generator` | Skill 15 |
| 7 | 20 | `video-content-generator` | Product data (existing) |
| 7 | 21 | `product-description-generator` | Product data (existing) |
| 7 | 22 | `marketing-copy-generator` | Product data (existing) |
| 7 | 23 | `keyword-hashtag-generator` | Product data (existing) |
| 8 | 24 | `banner-generator` | Skills 17, 22 + `comfyui` (existing) |
| 9 | 25 | `ecommerce-workflow-orchestrator` | Skills 9-19, 24, 26, 27 |
| 9 | 26 | `approval-workflow-gate` | — (standalone) |
| 9 | 27 | `ecommerce-operations-logger` | — (standalone, called by all) |

**Total: 27 skills, ~40 files, 9 phases.**

---

## Skill Conventions (All Skills Must Follow)

1. **SKILL.md frontmatter:** `name`, `description` (≤60 chars), `version`, `tags`, `triggers`
2. **Description:** One sentence, trigger-first, ends with period. Detail in body only.
3. **One function per skill** — no mixing multiple functions
4. **Zero external dependencies** for connectors (stdlib only)
5. **Category:** `retail` for all 27 skills
6. **File layout:** `retail/<skill-name>/SKILL.md` + `retail/<skill-name>/scripts/<script>.py`
7. **Standardized return dict:** `{"success": bool, "data": any, "error": str|None}`
8. **No secrets in skill files** — env vars only
9. **Exception hierarchy:** `XError` → `XAuthError`, `XAPIError`
10. **CLI entry point:** `if __name__ == "__main__"` with commands

---

## Future Expansion (Architecture Notes Only — Not in Scope)

| Future Capability | Approach |
|-------------------|----------|
| Purchase reorder proposals | New skill: `reorder-proposal-generator` |
| Inventory optimisation | New skill: `inventory-optimiser` |
| Dead stock clearance planning | New skill: `clearance-plan-generator` |
| Affiliate campaign generation | New skill: `affiliate-campaign-generator` |
| Customer service automation | New skill: `customer-service-bot` |
| Supplier communication | New skill: `supplier-comms` |
| Sales reporting | New skill: `sales-report-generator` |
| Dashboard and KPI monitoring | Extend Shogun web portal |
| Automatic campaign scheduling | New skill: `campaign-scheduler` |
