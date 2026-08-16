# Retail E-commerce AI Agent — Implementation Plan v1

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build 28 new Hermes Agent skills (31 total with 3 existing) — each doing ONE specific function — that together give Shogun OS an autonomous end-to-end admin & e-commerce workflow across AutoCount, Shopee, Lazada, TikTok Shop, and Website (WooCommerce/Shopify).

**Architecture:** Shogun OS replaces SiteGiant as the central hub. Each platform connects directly via its own connector skill. AutoCount is the product/inventory master data source. A master orchestrator sequences the full workflow with human approval gates. All operations are logged to a queryable audit trail.

**Tech Stack:** Python 3.8+ (stdlib only for marketplace connectors — `urllib.request`, `hmac`, `hashlib`, `json`). AutoCount connector uses `requests` library (documented exception). Hermes Agent skills framework, existing retail skills.

> **⚠️ Windows (client deployment):** Use `python` not `python3` (python3→3.14 has no pip; python→3.11.9 has `requests`). Master store paths use `$HERMES_HOME/ecommerce/master/` — on Windows `HERMES_HOME=~/AppData/Local/hermes/`, NOT `~/.hermes/`. All `~/.hermes/` references below resolve to `$HERMES_HOME/`.

**Core Principle: One skill = one specific function. No mixing.**

---

## Department Assignment — Split by Nature

Skills are NOT all under one department. Each skill belongs to the department whose nature matches its function. This maps to existing Shogun OS profiles from `PROFILE_CATALOG.md`:

### Department Profiles

| Department | Persona | Profile Slug | gbrain Source | Nature |
|-----------|---------|-------------|---------------|--------|
| E-commerce | Sang (상) ⚠️ `SOUL-ecommerce.md` already uses "Sang"; plan originally said Denshi — reconcile | `ecommerce-manager` | `ecommerce/` | Online store, marketplace ops, listings, orders, platform sync |
| Merchandising | Shohin (商品 — "Goods") | `merchandising-manager` | `merchandising/` | Buying, assortment, pricing, product performance |
| Marketing | Haiku (俳句) | `marketing-manager` | `marketing/` | Brand, campaigns, content creation, creative assets |
| Compliance | Kata (型 — "Form") | `compliance-manager` | `compliance/` | Standards, audits, policy, governance, approval gates |

### Skill → Department Mapping (31 skills across 4 departments)

#### E-commerce — Denshi (17 skills)
> Platform connectors, data ingestion, listing sync, price sync, and the workflow orchestrator. These are operational skills that talk to external systems and manage the product data pipeline.

| # | Skill | Status | Why E-commerce |
|---|-------|--------|----------------|
| 1 | `shopee-connector` | ✅ | Marketplace platform connector |
| 2 | `lazada-connector` | ✅ | Marketplace platform connector |
| 3 | `autocount-connector` | ✅ | Product/inventory data source connector |
| 4 | `tiktok-shop-connector` | 🔴 | Marketplace platform connector |
| 5 | `website-connector` | 🔴 | Website store connector (WooCommerce/Shopify) |
| 6 | `sitegiant-connector` | 🔴 | ERP/webstore connector |
| 7 | `autocount-product-sync` | 🔴 | Pulls product data into Shogun master |
| 8 | `sitegiant-product-sync` | 🔴 | Pulls product data into Shogun master |
| 9 | `shopee-listing-sync` | 🔴 | Pushes listings to Shopee |
| 10 | `lazada-listing-sync` | 🔴 | Pushes listings to Lazada |
| 11 | `tiktok-listing-sync` | 🔴 | Pushes listings to TikTok Shop |
| 12 | `website-listing-sync` | 🔴 | Pushes listings to website |
| 13 | `shopee-price-sync` | 🔴 | Pushes prices to Shopee |
| 14 | `lazada-price-sync` | 🔴 | Pushes prices to Lazada |
| 15 | `tiktok-price-sync` | 🔴 | Pushes prices to TikTok Shop |
| 16 | `website-price-sync` | 🔴 | Pushes prices to website |
| 25 | `ecommerce-workflow-orchestrator` | 🔴 | Conducts the e-commerce pipeline |

#### Merchandising — Shohin (2 skills)
> Product analysis by velocity and margin. These inform buying, assortment, and pricing decisions — the core of merchandising.

| # | Skill | Status | Why Merchandising |
|---|-------|--------|------------------|
| 17 | `product-velocity-analyzer` | 🔴 | Sales velocity informs buying/clearance decisions |
| 18 | `product-margin-analyzer` | 🔴 | Margin analysis informs pricing decisions |

#### Marketing — Haiku (6 skills)
> Promo recommendations, content generation, and banner creation. These are creative and campaign functions — the core of marketing.

| # | Skill | Status | Why Marketing |
|---|-------|--------|--------------|
| 19 | `promo-recommender` | 🔴 | Campaign theme, promo angle, promo price recommendations |
| 20 | `cross-sell-bundle-recommender` | 🔴 | Cross-sell and bundle marketing strategy |
| 21 | `video-content-generator` | 🔴 | Video concept and script creation |
| 22 | `social-content-generator` | 🔴 | Captions, hashtags, keywords, CTAs |
| 23 | `product-copy-generator` | 🔴 | Product descriptions, promo headlines, banner copy |
| 24 | `banner-generator` | 🔴 | Promotional banner image creation |

#### Compliance — Kata (2 skills)
> Approval gates and audit logging. These are governance, control, and audit functions — the core of compliance.

| # | Skill | Status | Why Compliance |
|---|-------|--------|----------------|
| 26 | `approval-gate` | 🔴 | Holds actions for human approval — governance control |
| 27 | `action-audit-log` | 🔴 | Records every action — queryable audit trail |

### Cross-Department Data Flow

```
E-commerce (Denshi)          Merchandising (Shohin)       Marketing (Haiku)           Compliance (Kata)
┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐      ┌───────────────────┐
│ Connectors (1-6)  │        │                   │        │                   │      │                   │
│ Product Sync (7-8)│        │ Velocity (17)     │        │ Promo Recs (19)   │      │ Approval Gate(26) │
│ Listing Sync(9-12)│        │ Margin (18)       │        │ Bundle Recs (20)  │      │ Audit Log (27)    │
│ Price Sync (13-16)│        │                   │        │ Video (21)        │      │                   │
│ Orchestrator (25) │        │                   │        │ Social (22)       │      │                   │
└────────┬──────────┘        └────────▲──────────┘        │ Product Copy (23) │      └────────▲──────────┘
         │                            │                   │ Banner (24)       │               │
         │   master store             │   analysis        └────────▲──────────┘               │
         │   ~/.hermes/ecommerce/     │   reports                   │                          │
         │                            │                             │   content                │   gate/audit
         └────────────┬───────────────┘                             │                          │
                      │                                             │                          │
                      └─────────────────────────────────────────────┘                          │
                                     │                                        │                 │
                                     ▼                                        ▼                 ▼
                          Workflow Orchestrator (25) calls skills across all 4 departments
```

**Key:** The orchestrator (E-commerce) reads analysis from Merchandising, requests content from Marketing, and routes approvals through Compliance — then executes the approved actions itself (listing/price sync).

**Shared data:** The Shogun master store (`~/.hermes/ecommerce/master/`) is written by E-commerce skills but read by Merchandising and Marketing skills. Since it's a filesystem path (not a gbrain source), any profile with the right skill installed can read it.

**Skill installation:** Each skill is installed to its assigned department profile via:
```bash
python3 skills/shogunify/scripts/install-to-profiles.py --skill <name> --profiles <profile-slug> --force
```

---

## Complete Skill Inventory — 31 Skills (28 New, 3 Existing)

### 🔌 CONNECTORS (6) — One per external system → E-commerce

| # | Skill | Status | Department | Single Function |
|---|-------|--------|------------|-----------------|
| 1 | `shopee-connector` | ✅ Exists | E-commerce | Talk to Shopee Open Platform API |
| 2 | `lazada-connector` | ✅ Exists | E-commerce | Talk to Lazada Seller Center API |
| 3 | `autocount-connector` | ✅ Exists | E-commerce | Talk to AutoCount AOTG API |
| 4 | `tiktok-shop-connector` | 🔴 Build | E-commerce | Talk to TikTok Shop Seller API |
| 5 | `website-connector` | 🔴 Build | E-commerce | Talk to WooCommerce/Shopify REST API |
| 6 | `sitegiant-connector` | 🔴 Build | E-commerce | Talk to SiteGiant Open API |

### 📥 DATA INGESTION (2) — Pull product data into Shogun master → E-commerce

| # | Skill | Status | Department | Single Function |
|---|-------|--------|------------|-----------------|
| 7 | `autocount-product-sync` | 🔴 Build | E-commerce | Pull all product data from AutoCount into Shogun master (SKU, name, barcode, brand, category, UOM, desc, price, cost, stock, images) |
| 8 | `sitegiant-product-sync` | 🔴 Build | E-commerce | Pull all product data from SiteGiant into Shogun master (optional secondary source) |

### 📤 LISTING SYNC (4) — One per platform → E-commerce

| # | Skill | Status | Department | Single Function |
|---|-------|--------|------------|-----------------|
| 9 | `shopee-listing-sync` | 🔴 Build | E-commerce | Create & update Shopee listings from Shogun master data |
| 10 | `lazada-listing-sync` | 🔴 Build | E-commerce | Create & update Lazada listings from Shogun master data |
| 11 | `tiktok-listing-sync` | 🔴 Build | E-commerce | Create & update TikTok Shop listings from Shogun master data |
| 12 | `website-listing-sync` | 🔴 Build | E-commerce | Create & update website listings from Shogun master data |

### 💰 PRICE SYNC (4) — One per platform → E-commerce

| # | Skill | Status | Department | Single Function |
|---|-------|--------|------------|-----------------|
| 13 | `shopee-price-sync` | 🔴 Build | E-commerce | Update prices on Shopee only |
| 14 | `lazada-price-sync` | 🔴 Build | E-commerce | Update prices on Lazada only |
| 15 | `tiktok-price-sync` | 🔴 Build | E-commerce | Update prices on TikTok Shop only |
| 16 | `website-price-sync` | 🔴 Build | E-commerce | Update prices on website only |

### 📊 PRODUCT ANALYSIS (2) — One metric domain each → Merchandising

| # | Skill | Status | Department | Single Function |
|---|-------|--------|------------|-----------------|
| 17 | `product-velocity-analyzer` | 🔴 Build | Merchandising | Classify products by sales velocity: dead, slow, fast, zero-sales |
| 18 | `product-margin-analyzer` | 🔴 Build | Merchandising | Classify products by margin: high-margin, low-margin, rank by contribution |

### 🎯 MARKETING (2) — One recommendation type each → Marketing

| # | Skill | Status | Department | Single Function |
|---|-------|--------|------------|-----------------|
| 19 | `promo-recommender` | 🔴 Build | Marketing | Output: which products to promote, campaign theme, promo angle, suggested promo price |
| 20 | `cross-sell-bundle-recommender` | 🔴 Build | Marketing | Output: cross-sell pairs, bundle suggestions with rationale |

### ✍️ CONTENT GENERATION (3) — One output format each → Marketing

| # | Skill | Status | Department | Single Function |
|---|-------|--------|------------|-----------------|
| 21 | `video-content-generator` | 🔴 Build | Marketing | Generate video concept + full script (hook, shots, voiceover, text overlay) |
| 22 | `social-content-generator` | 🔴 Build | Marketing | Generate platform-specific captions, hashtags, keywords, and CTAs |
| 23 | `product-copy-generator` | 🔴 Build | Marketing | Generate product descriptions, promo headlines, and banner copy |

### 🎨 CREATIVE (1) → Marketing

| # | Skill | Status | Department | Single Function |
|---|-------|--------|------------|-----------------|
| 24 | `banner-generator` | 🔴 Build | Marketing | Generate promotional banner image (brand template + product image + promo text + price) via ComfyUI |

### 🎻 ORCHESTRATION (1) → E-commerce

| # | Skill | Status | Department | Single Function |
|---|-------|--------|------------|-----------------|
| 25 | `ecommerce-workflow-orchestrator` | 🔴 Build | E-commerce | Run the 12-step pipeline: pull → analyze → identify → recommend → content → banners → prices → listings → sync → log |

### 🛡️ GOVERNANCE (2) → Compliance

| # | Skill | Status | Department | Single Function |
|---|-------|--------|------------|-----------------|
| 26 | `approval-gate` | 🔴 Build | Compliance | Hold actions pending human approval. Approve / reject / modify. |
| 27 | `action-audit-log` | 🔴 Build | Compliance | Record every action: timestamp, skill, SKU, platform, old_value, new_value, status, error |

---

## What Already Exists (DO NOT Rebuild)

### `shopee-connector` (✅ Existing)
- **Location:** `skills/retail/shopee-connector/`
- **What it does:** Shopee Open Platform API v2 — HMAC-SHA256 signing, stdlib only
- **Methods:** `connect()`, `read_orders(status, since)`, `read_products()`, `update_listing(product_data)`, `read_analytics(period)`, `read_returns()`
- **Env vars:** `SHOPEE_PARTNER_ID`, `SHOPEE_API_KEY`, `SHOPEE_ACCESS_TOKEN`, `SHOPEE_SHOP_ID`
- **Return format:** `{"success": bool, "data": any, "error": str|None}`

### `lazada-connector` (✅ Existing)
- **Location:** `skills/retail/lazada-connector/`
- **What it does:** Lazada Open Platform (LOP) — custom HMAC-SHA256 signing, stdlib only
- **Methods:** `connect()`, `read_orders(status, since)`, `read_products()`, `update_product(data)`, `read_finance()`, `read_seller_performance()`
- **Env vars:** `LAZADA_APP_KEY`, `LAZADA_APP_SECRET`, `LAZADA_ACCESS_TOKEN`, `LAZADA_SELLER_ID`

### `autocount-connector` (✅ Existing)
- **Location:** `skills/retail/autocount-connector/`
- **What it does:** AutoCount AOTG — RESTful JSON, Bearer auth. Uses `requests` library (NOT stdlib-only)
- **Methods:** `connect()`, `read_stock_balance(sku)`, `read_sales_invoices(since)`, `read_debtor_aging()`, `read_purchase_orders(status)`, `write_sales_invoice(data)`, `write_stock_adjustment(data)`
- **Env vars:** `AUTOCOUNT_API_URL`, `AUTOCOUNT_API_KEY`, `AUTOCOUNT_COMPANY_DB`

---

## Shogun Master Data Store

All data ingestion skills (Skills 7-8) write to a unified local data store. All listing-sync and price-sync skills (Skills 9-16) read from this store.

**Location:** `~/.hermes/ecommerce/master/`

**Structure:**
```
~/.hermes/ecommerce/master/
├── products.jsonl          # One line per product (append-only, deduplicated by SKU)
├── stock-balances.jsonl    # One line per stock snapshot (timestamped)
├── sales-invoices.jsonl    # One line per invoice line item
├── sync-state.json         # Last sync timestamps per source
└── sku-mapping.json        # SKU mapping across platforms (autocount_sku ↔ shopee_id ↔ lazada_id ↔ tiktok_id ↔ website_id)
```

**Product schema (products.jsonl):**
```json
{
  "sku": "PROD-001",
  "product_name": "Product Name",
  "barcode": "1234567890123",
  "brand": "BrandName",
  "category": "Electronics",
  "uom": "PCS",
  "description": "Full product description",
  "selling_price": 150.00,
  "cost_price": 90.00,
  "stock_balance": 240,
  "images": ["https://...", "https://..."],
  "source": "autocount",
  "last_updated": "2026-08-14T10:00:00Z"
}
```

**SKU mapping schema (sku-mapping.json):**
```json
{
  "PROD-001": {
    "shopee": {"item_id": 123456789, "variation_id": null},
    "lazada": {"seller_sku": "PROD-001", "product_id": 98765},
    "tiktok": {"product_id": "1234567890"},
    "website": {"product_id": 42, "platform": "woocommerce"}
  }
}
```

---

## Prerequisites — System Requirements Before Building

> **⚠️ Read before starting Phase 1.** The following must be resolved on the target system before any skill is built.

### P1. Create Missing Department Profiles

The plan assigns skills to 4 department profiles. Two do **not exist** on the client system yet:

| Profile | Status | Action Required |
|---------|--------|-----------------|
| `marketing-manager` | ✅ Exists | None |
| `compliance-manager` | ✅ Exists | None |
| `ecommerce-manager` | ❌ Missing | `hermes profile create ecommerce-manager` + `python scripts/generate-profile.py ecommerce-manager --type retail` |
| `merchandising-manager` | ❌ Missing | `hermes profile create merchandising-manager` + `python scripts/generate-profile.py merchandising-manager --type retail` |

### P2. Register Retail Profiles in install-to-profiles.py

The install script `skills/shogunify/scripts/install-to-profiles.py` has a `SHOGUN_CORE_PROFILES` list that does **not** include `ecommerce-manager` or `merchandising-manager`. Add them before installing skills:

```python
# In skills/shogunify/scripts/install-to-profiles.py
SHOGUN_CORE_PROFILES = [
    ...existing...
    "ecommerce-manager",      # add
    "merchandising-manager",  # add
]
```

### P3. Install or Replace `comfyui` (Skill 24 dependency)

Skill 24 (`banner-generator`) depends on `comfyui`. The `comfyui` skill is listed in the catalog but **not installed** on the client system. Either:
- Install the comfyui skill before building Skill 24, OR
- Drop the comfyui dependency and use HTML→PNG rendering only (browser screenshot)

### P4. Cross-Profile Orchestration Limitation

Hermes profiles are **physically isolated by design** (see `AGENTS.md` — Trust Boundary). Profile A cannot invoke a skill installed only on Profile B. The orchestrator (Skill 25, E-commerce) calls skills across all 4 departments. To make this work:
- **Option A:** Co-install all called skills (velocity, margin, promo, content, banner, approval, audit) on the `ecommerce-manager` profile
- **Option B:** Accept that cross-department skills are invoked by the agent reading their instructions from a shared location, not by direct Python import

The master store (`$HERMES_HOME/ecommerce/master/`) is a **filesystem path** — any profile with the right skill code can read it. But only one profile should **write** to avoid JSONL corruption (single-writer pattern).

### P5. LLM-Dependent Skills (21-23) Are Prompt Templates

Skills 21 (`video-content-generator`), 22 (`social-content-generator`), and 23 (`product-copy-generator`) rely on the Hermes agent's LLM. Their Python scripts provide **prompt structure and output parsing**, NOT standalone LLM calls. The CLI entry points produce prompts; the agent executes them. Do not expect `python video_generator.py` to produce content without the agent.

### P6. Python Command on Windows

All CLI examples in skill build steps use `python3`. On the Windows client, use `python` (not `python3`):
- `python3` → Python 3.14.3 (no pip module)
- `python` → Python 3.11.9 (has `requests`, `pip`)

---

## PHASE 1 — Connectors (3 new skills)

> Each connector talks to ONE external system only. No business logic, no data transformation — just API connectivity.

---

### Skill 4: `tiktok-shop-connector`

**Function:** Connect to TikTok Shop Seller Open API. Read/write products, orders, logistics.

**Files:**
- Create: `skills/retail/tiktok-shop-connector/SKILL.md`
- Create: `skills/retail/tiktok-shop-connector/scripts/tiktok_shop_connector.py`

**Pattern to follow:** `skills/retail/shopee-connector/scripts/shopee_connector.py` (same structure, different signing algorithm)

**Environment Variables:**

| Variable | Description | Required |
|---|---|---|
| `TIKTOK_APP_KEY` | TikTok Shop Open Platform App Key | Yes |
| `TIKTOK_APP_SECRET` | TikTok Shop Open Platform App Secret (used for signing) | Yes |
| `TIKTOK_ACCESS_TOKEN` | OAuth access token (per shop, after authorization) | Yes |
| `TIKTOK_SHOP_ID` | Authorized TikTok Shop ID | Yes |
| `TIKTOK_API_REGION` | API region: `my`, `sg`, `th`, `id`, `ph`, `vn`, `global` | No (default: `global`) |

**API Details:**
- Base URL: `https://open-api.tiktokglobalshop.com`
- API version prefix: `/api/v2/`
- Auth: HMAC-SHA256 signing — collect all params (excluding `sign`), sort alphabetically, concatenate as `key1value1key2value2...` with `app_key` prefix and `app_secret` suffix, sign with HMAC-SHA256, lowercase hex output

**Exception Hierarchy:**
```
TikTokShopError (base)
├── TikTokShopAuthError    — auth failures (invalid key, expired token)
└── TikTokShopAPIError     — API error responses (error_code + message)
```

**Class:** `TikTokShopAdapter`

**Methods:**

| Method | Description | Returns |
|---|---|---|
| `connect()` | Verify connectivity (fetch shop info) | `{"success", "data", "error"}` |
| `read_orders(status=None, since=None)` | Read orders, optionally filtered by status and date | Standardized dict |
| `read_products()` | Read all products in the shop | Standardized dict |
| `update_listing(product_data)` | Update product price/stock | Standardized dict |
| `read_packages()` | Read logistics packages for fulfillment | Standardized dict |
| `read_shop_info()` | Read shop information and settings | Standardized dict |

**Standardized Return Format:**
```python
{"success": bool, "data": any, "error": str | None}
```

**CLI Entry Point:**
```bash
python tiktok_shop_connector.py connect
python tiktok_shop_connector.py orders [status] [since]
python tiktok_shop_connector.py products
python tiktok_shop_connector.py update <json_file>
python tiktok_shop_connector.py packages
python tiktok_shop_connector.py health
```

**Build Steps:**

1. Create directory: `skills/retail/tiktok-shop-connector/` and `skills/retail/tiktok-shop-connector/scripts/`
2. Write `SKILL.md` with frontmatter:
   - `name: tiktok-shop-connector`
   - `description:` ≤60 chars, trigger-first, ends with period
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, connector, tiktok, marketplace]`
   - `triggers: ["tiktok shop", "tiktok connector", "tiktok listing", "tiktok orders"]`
3. Write `scripts/tiktok_shop_connector.py`:
   - Module docstring documenting all env vars
   - Import: `os`, `json`, `time`, `hmac`, `hashlib`, `logging`, `urllib.request`, `urllib.parse`, `datetime`, `typing.Optional`
   - Define `SHOPEE_API_BASES`-equivalent dict for TikTok regions
   - Define exception classes: `TikTokShopError`, `TikTokShopAuthError`, `TikTokShopAPIError`
   - Define `TikTokShopAdapter` class:
     - `__init__()` — read env vars or explicit params, validate region
     - `_sign(path, params, timestamp)` — HMAC-SHA256 per TikTok spec
     - `_request(method, path, body)` — build signed URL, send request, parse JSON, return standardized dict
     - `connect()` — call `/shop/get_shop_info` or equivalent
     - `read_orders(status, since)` — call order list endpoint
     - `read_products()` — call product list endpoint
     - `update_listing(product_data)` — call product update endpoint
     - `read_packages()` — call logistics package list endpoint
     - `read_shop_info()` — call shop info endpoint
   - Define `default_adapter()` convenience function
   - Define CLI `if __name__ == "__main__"` block with all commands
4. Verify:
   - [ ] `skill_view(name='tiktok-shop-connector')` returns content
   - [ ] `python tiktok_shop_connector.py` with no args prints usage
   - [ ] `python tiktok_shop_connector.py connect` without credentials fails gracefully (no crash, returns `success: False`)
   - [ ] `from tiktok_shop_connector import TikTokShopAdapter` works
   - [ ] No external dependencies — only stdlib imports

---

### Skill 5: `website-connector`

**Function:** Connect to WooCommerce OR Shopify REST API (one at a time, selected via env var). Read/write products, orders, inventory.

**Files:**
- Create: `skills/retail/website-connector/SKILL.md`
- Create: `skills/retail/website-connector/scripts/website_connector.py`
- Create: `skills/retail/website-connector/scripts/adapters/woocommerce_adapter.py`
- Create: `skills/retail/website-connector/scripts/adapters/shopify_adapter.py`

**Pattern to follow:** `skills/manufacturing/erp-connector` (multi-adapter framework with base class + pluggable adapters)

**Environment Variables:**

| Variable | Description | Required |
|---|---|---|
| `WEBSITE_PLATFORM` | Which adapter: `woocommerce` or `shopify` | Yes |

**WooCommerce adapter env vars:**

| Variable | Description |
|---|---|
| `WC_STORE_URL` | Store URL (e.g. `https://myshop.com`) |
| `WC_CONSUMER_KEY` | WooCommerce REST API consumer key |
| `WC_CONSUMER_SECRET` | WooCommerce REST API consumer secret |

**Shopify adapter env vars:**

| Variable | Description |
|---|---|
| `SHOPIFY_STORE_DOMAIN` | Store domain (e.g. `mystore.myshopify.com`) |
| `SHOPIFY_ACCESS_TOKEN` | Shopify Admin API access token |
| `SHOPIFY_API_VERSION` | API version (e.g. `2024-01`) |

**API Details:**

WooCommerce:
- Base URL: `https://<store-url>/wp-json/wc/v3/`
- Auth: OAuth 1.0a (consumer key/secret via HTTP Basic Auth)
- Key endpoints: `GET /products`, `GET /products/{id}`, `POST /products`, `PUT /products/{id}`, `GET /orders`, `GET /products/{id}/variations`

Shopify:
- Base URL: `https://<store-domain>/admin/api/<version>/`
- Auth: `X-Shopify-Access-Token` header
- Key endpoints: `GET /products.json`, `GET /products/{id}.json`, `PUT /products/{id}.json`, `GET /orders.json`, `GET /inventory_items.json`

**Exception Hierarchy:**
```
WebsiteStoreError (base)
├── WebsiteStoreAuthError    — auth failures
└── WebsiteStoreAPIError     — API error responses
```

**Architecture:**

```python
# website_connector.py — base class + adapter registry
class WebsiteStoreAdapter(ABC):
    @abstractmethod
    def connect(self) -> dict: ...
    @abstractmethod
    def read_products(self) -> dict: ...
    @abstractmethod
    def read_orders(self, status=None, since=None) -> dict: ...
    @abstractmethod
    def update_listing(self, product_data) -> dict: ...
    @abstractmethod
    def update_price(self, sku, price) -> dict: ...
    @abstractmethod
    def read_inventory(self) -> dict: ...

def get_adapter(platform: str) -> WebsiteStoreAdapter:
    # Registry pattern — returns WooCommerceAdapter or ShopifyAdapter
```

**Methods (all adapters implement):**

| Method | Description |
|---|---|
| `connect()` | Verify connectivity |
| `read_products()` | Read all products |
| `read_orders(status, since)` | Read orders filtered by status/date |
| `update_listing(product_data)` | Update product listing |
| `update_price(sku, price)` | Update product price |
| `read_inventory()` | Read inventory levels |

**CLI Entry Point:**
```bash
python website_connector.py connect --platform woocommerce
python website_connector.py products --platform shopify
python website_connector.py orders --platform woocommerce [status] [since]
python website_connector.py update --platform woocommerce <json_file>
python website_connector.py health --platform shopify
```

**Build Steps:**

1. Create directories: `skills/retail/website-connector/`, `skills/retail/website-connector/scripts/`, `skills/retail/website-connector/scripts/adapters/`
2. Write `SKILL.md`:
   - `name: website-connector`
   - `description:` ≤60 chars — "Connect to WooCommerce or Shopify REST API for product/order/inventory ops."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, connector, woocommerce, shopify, website]`
   - `triggers: ["website connector", "woocommerce", "shopify", "website store"]`
3. Write `scripts/website_connector.py` (base class + registry):
   - Abstract base class `WebsiteStoreAdapter` with all abstract methods
   - `get_adapter(platform)` factory function — imports adapter based on `WEBSITE_PLATFORM` env var or `--platform` CLI arg
   - `default_adapter()` convenience function
   - CLI entry point with `--platform` flag
4. Write `scripts/adapters/woocommerce_adapter.py`:
   - Class `WooCommerceAdapter(WebsiteStoreAdapter)`
   - Uses `urllib.request` + HTTP Basic Auth (consumer key:secret base64)
   - Implements all abstract methods against WooCommerce REST API endpoints
   - Own exception classes or raise base `WebsiteStoreError` subtypes
5. Write `scripts/adapters/shopify_adapter.py`:
   - Class `ShopifyAdapter(WebsiteStoreAdapter)`
   - Uses `urllib.request` + `X-Shopify-Access-Token` header
   - Implements all abstract methods against Shopify Admin API endpoints
6. Verify:
   - [ ] `skill_view(name='website-connector')` returns content
   - [ ] `python website_connector.py connect --platform woocommerce` without credentials fails gracefully
   - [ ] `python website_connector.py connect --platform shopify` without credentials fails gracefully
   - [ ] `from website_connector import get_adapter; adapter = get_adapter("woocommerce")` works
   - [ ] `from adapters.woocommerce_adapter import WooCommerceAdapter` works
   - [ ] `from adapters.shopify_adapter import ShopifyAdapter` works
   - [ ] Base class is abstract — `WebsiteStoreAdapter()` raises `TypeError`
   - [ ] Adding a new platform = new file in `adapters/` + register in `get_adapter()` (no changes to base)

---

### Skill 6: `sitegiant-connector`

**Function:** Connect to SiteGiant Open API. Read/write products, orders, inventory, vouchers.

**Files:**
- Create: `skills/retail/sitegiant-connector/SKILL.md`
- Create: `skills/retail/sitegiant-connector/scripts/sitegiant_connector.py`

**Pattern to follow:** `skills/retail/autocount-connector` (RESTful JSON, token-based auth). Note: AutoCount uses `requests` library, not stdlib-only like Shopee/Lazada.

**Environment Variables:**

| Variable | Description | Required |
|---|---|---|
| `SITEGIANT_API_TOKEN` | Access token for SiteGiant Open API | Yes |
| `SITEGIANT_STORE_ID` | Store ID in SiteGiant | Yes |

**API Details (from https://sgapidocument.sitegiant.co):**
- Base URL: `https://opensgapi.sitegiant.co/api/v1`
- Auth: `Access-Token` header
- Content-Type: `application/json`
- Rate limiting: `X-RateLimit-Remaining` / `X-RateLimit-Limit` response headers — implement pause-and-resume to avoid 429

**Key Endpoints:**

| Path | Method | Description |
|---|---|---|
| `/access-token` | GET | Get/verify access token |
| `/products` | GET | Get Product List |
| `/products/{id}` | GET | Get Product by ID |
| `/products/{id}` | PUT | Update Product |
| `/products/{id}/price` | PUT | Update Product Price |
| `/products/{id}/image` | POST | Upload Product Image |
| `/products` | POST | Add Product |
| `/products/images-url` | PUT | Update Product Images by URL |
| `/items` | GET | Get Item List |
| `/items/{id}` | GET | Get Item by ID |
| `/items/{id}` | PUT | Update Item |
| `/items` | POST | Add Item |
| `/items/cost-price` | PUT | Update Item Cost Price |
| `/items/{id}/image` | POST | Upload Item Image |
| `/items/parent-isbu` | POST | Bulk Set Parent iSKU |
| `/orders` | GET | Get Order List |
| `/orders/{id}` | GET | Get Order by ID |
| `/orders/{id}` | PUT | Update Order |
| `/orders/{id}/status` | PUT | Update Order Status |
| `/orders/{id}/address` | PUT | Update Order Address |
| `/orders` | POST | Add Order |
| `/orders/marketplace/{marketplace_id}` | GET | Get Orders by Marketplace Order ID |
| `/stock-adjustments` | GET | Get Stock Adjustment List |
| `/stock-adjustments` | POST | Add Stock Adjustment |
| `/stock-adjustments/{id}/void` | DELETE | Void Stock Adjustment |
| `/warehouses` | GET | Get Warehouse List |
| `/vendors` | GET | Get Vendor List |
| `/purchase-orders` | GET | Get Purchase Order List |
| `/purchase-orders` | POST | Add Purchase Order |
| `/purchase-orders/{id}` | PUT | Update Purchase Order |
| `/customers` | GET | Get Customer List |
| `/customers` | POST | Add Customer |
| `/customers/{id}` | PUT | Update Customer |
| `/customers/{id}/address` | POST | Add Customer Address |
| `/channels` | GET | Get Sales Channel List |
| `/couriers` | GET | Get Courier Company List |
| `/shipping-methods` | GET | Get Shipping Method List |
| `/countries` | GET | Get Country List |
| `/vouchers/validity` | POST | Check Voucher Validity |
| `/vouchers/usage` | POST | Add Voucher Usage |

**Webhooks (HMAC verified):**
- Inventory Update (Sellable Stock)
- Inventory Update (Stock On Hand)
- Order Update (Order Status)
- Package Update
- Purchase Order Update
- Customer Update
- Stock Transfer Update
- HMAC verification: compute HMAC digest using store secret token + request data, compare to `Authorization` header

**Exception Hierarchy:**
```
SiteGiantError (base)
├── SiteGiantAuthError    — invalid/expired token
└── SiteGiantAPIError     — API error responses (status_code + message)
```

**Class:** `SiteGiantAdapter`

**Methods:**

| Method | Description |
|---|---|
| `connect()` | Verify token validity |
| `read_products()` | Get Product List |
| `read_product(product_id)` | Get Product by ID |
| `read_items()` | Get Item List |
| `read_item(item_id)` | Get Item by ID |
| `read_orders(status, since)` | Get Order List (filtered) |
| `read_order(order_id)` | Get Order by ID |
| `read_stock_adjustments()` | Get Stock Adjustment List |
| `read_warehouses()` | Get Warehouse List |
| `read_vendors()` | Get Vendor List |
| `read_purchase_orders()` | Get Purchase Order List |
| `read_customers()` | Get Customer List |
| `read_channels()` | Get Sales Channel List |
| `update_product(product_id, data)` | Update Product |
| `update_product_price(product_id, price)` | Update Product Price |
| `update_item(item_id, data)` | Update Item |
| `add_product(data)` | Add Product |
| `add_item(data)` | Add Item |
| `upload_product_image(product_id, image_data)` | Upload Product Image |
| `check_voucher_validity(voucher_data)` | Check Voucher Validity |
| `add_voucher_usage(voucher_data)` | Add Voucher Usage |
| `read_rate_limit()` | Read `X-RateLimit-Remaining` from last response |

**CLI Entry Point:**
```bash
python sitegiant_connector.py connect
python sitegiant_connector.py products
python sitegiant_connector.py product <id>
python sitegiant_connector.py items
python sitegiant_connector.py orders [status] [since]
python sitegiant_connector.py warehouses
python sitegiant_connector.py vendors
python sitegiant_connector.py channels
python sitegiant_connector.py health
```

**Build Steps:**

1. Create directories: `skills/retail/sitegiant-connector/`, `skills/retail/sitegiant-connector/scripts/`
2. Write `SKILL.md`:
   - `name: sitegiant-connector`
   - `description:` ≤60 chars — "Connect to SiteGiant Open API for products, orders, inventory, vouchers."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, connector, sitegiant]`
   - `triggers: ["sitegiant", "sitegiant connector", "sitegiant api"]`
3. Write `scripts/sitegiant_connector.py`:
   - Module docstring documenting all env vars
   - Import: `os`, `json`, `logging`, `urllib.request`, `urllib.parse`, `typing.Optional`
   - Define exception classes: `SiteGiantError`, `SiteGiantAuthError`, `SiteGiantAPIError`
   - Define `SiteGiantAdapter` class:
     - `__init__()` — read env vars or explicit params
     - Store `self._rate_limit_remaining` and `self._rate_limit_max` from response headers
     - `_request(method, path, body)` — add `Access-Token` header, send request, parse JSON, check rate limit headers, return standardized dict
     - `_check_rate_limit()` — if remaining < 5, sleep briefly to avoid 429
     - Implement all methods listed above
   - Define `default_adapter()` convenience function
   - Define CLI entry point
4. Verify:
   - [ ] `skill_view(name='sitegiant-connector')` returns content
   - [ ] `python sitegiant_connector.py` with no args prints usage
   - [ ] `python sitegiant_connector.py connect` without token fails gracefully
   - [ ] `from sitegiant_connector import SiteGiantAdapter` works
   - [ ] Rate limit headers are parsed and stored

---

## PHASE 2 — Data Ingestion (2 new skills)

> Each ingestion skill pulls from ONE source into the Shogun master store. No transformation — just raw data pull and storage.

---

### Skill 7: `autocount-product-sync`

**Function:** Pull all product data from AutoCount into Shogun master store.

**Files:**
- Create: `skills/retail/autocount-product-sync/SKILL.md`
- Create: `skills/retail/autocount-product-sync/scripts/autocount_product_sync.py`

**Depends on:** `autocount-connector` (existing — calls `read_stock_balance()`, `read_sales_invoices()`)

**What it does:**
1. Calls `autocount-connector.read_stock_balance()` to get all products with stock levels
2. Calls `autocount-connector.read_sales_invoices()` to get pricing and sales velocity data
3. Merges data by SKU
4. Writes to Shogun master store:
   - `~/.hermes/ecommerce/master/products.jsonl` — product master records
   - `~/.hermes/ecommerce/master/stock-balances.jsonl` — stock snapshots (timestamped)
   - `~/.hermes/ecommerce/master/sales-invoices.jsonl` — invoice line items
   - `~/.hermes/ecommerce/master/sync-state.json` — last sync timestamp

**Product fields pulled per client requirements:**
- SKU
- Product name
- Barcode
- Brand
- Category
- UOM
- Product description
- Selling price
- Cost price
- Stock balance
- Product images (if available)

**Sync modes:**
- `full` — pull all products (default first run)
- `incremental` — pull only products changed since last sync (using `sync-state.json` timestamp)

**Methods:**

| Method | Description |
|---|---|
| `sync(mode="incremental")` | Pull from AutoCount → write to master store |
| `get_last_sync_time()` | Read last sync timestamp from `sync-state.json` |
| `get_product_count()` | Count products in master store |
| `get_product(sku)` | Read single product from master store |

**CLI:**
```bash
python autocount_product_sync.py sync          # incremental
python autocount_product_sync.py sync --full  # full
python autocount_product_sync.py status       # last sync time + counts
python autocount_product_sync.py product <sku>
```

**Build Steps:**

1. Create directories: `skills/retail/autocount-product-sync/`, `skills/retail/autocount-product-sync/scripts/`
2. Write `SKILL.md`:
   - `name: autocount-product-sync`
   - `description:` ≤60 chars — "Pull all product data from AutoCount into Shogun master store."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, data-ingestion, autocount, sync]`
   - `triggers: ["autocount sync", "product sync", "pull autocount data"]`
3. Write `scripts/autocount_product_sync.py`:
   - Import `AutoCountAdapter` from `autocount_connector` (existing skill — via sys.path or relative import)
   - Import `json`, `os`, `logging`, `datetime`
   - Define `MASTER_DIR = os.path.expanduser("~/.hermes/ecommerce/master")`
   - Define `AutoCountProductSync` class:
     - `__init__()` — create master dir if not exists, load sync state
     - `_load_sync_state()` / `_save_sync_state()` — read/write `sync-state.json`
     - `_append_jsonl(filepath, record)` — append one JSON line to a .jsonl file
     - `_read_jsonl(filepath)` — read all lines from a .jsonl file
     - `sync(mode="incremental")` — main sync logic:
       1. Read last sync time from state
       2. Call `adapter.read_stock_balance()` (all or filtered)
       3. Call `adapter.read_sales_invoices(since=last_sync)` for pricing
       4. Merge stock + invoice data by SKU
       5. Write each product to `products.jsonl` (upsert — deduplicate by SKU, keep latest)
       6. Write stock snapshot to `stock-balances.jsonl` (append with timestamp)
       7. Write invoice items to `sales-invoices.jsonl` (append)
       8. Update `sync-state.json` with new timestamp
       9. Return summary: `{"success", "data": {"products_synced": N, "errors": [...]}}`
     - `get_last_sync_time()` — return from state
     - `get_product_count()` — count unique SKUs in `products.jsonl`
     - `get_product(sku)` — scan `products.jsonl` for matching SKU
   - CLI entry point
4. Verify:
   - [ ] `skill_view(name='autocount-product-sync')` returns content
   - [ ] `python autocount_product_sync.py sync --full` without AutoCount credentials fails gracefully
   - [ ] Master directory `~/.hermes/ecommerce/master/` is created
   - [ ] Products are written as JSONL (one JSON object per line)
   - [ ] Sync state records timestamp after sync
   - [ ] Incremental mode uses last sync timestamp

---

### Skill 8: `sitegiant-product-sync`

**Function:** Pull all product data from SiteGiant into Shogun master store (optional secondary source).

**Files:**
- Create: `skills/retail/sitegiant-product-sync/SKILL.md`
- Create: `skills/retail/sitegiant-product-sync/scripts/sitegiant_product_sync.py`

**Depends on:** `sitegiant-connector` (Skill 6 — calls `read_products()`, `read_items()`)

**What it does:**
1. Calls `sitegiant-connector.read_products()` to get product list
2. Calls `sitegiant-connector.read_items()` to get item-level data (SKUs, barcodes, stock)
3. Merges products + items by product ID
4. Writes to Shogun master store (same location as Skill 7, but tagged `source: "sitegiant"`)
5. If a product with the same SKU already exists (from AutoCount sync), merges — SiteGiant data supplements (e.g., fills missing images, descriptions)

**Sync modes:**
- `full` — pull all products
- `incremental` — changed since last sync

**Methods:**

| Method | Description |
|---|---|
| `sync(mode="incremental")` | Pull from SiteGiant → write to master store |
| `get_last_sync_time()` | Last sync timestamp |
| `get_product_count()` | Count products from SiteGiant source |

**CLI:**
```bash
python sitegiant_product_sync.py sync
python sitegiant_product_sync.py sync --full
python sitegiant_product_sync.py status
```

**Build Steps:**

1. Create directories: `skills/retail/sitegiant-product-sync/`, `skills/retail/sitegiant-product-sync/scripts/`
2. Write `SKILL.md`:
   - `name: sitegiant-product-sync`
   - `description:` ≤60 chars — "Pull product data from SiteGiant into Shogun master store."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, data-ingestion, sitegiant, sync]`
   - `triggers: ["sitegiant sync", "sitegiant product sync"]`
3. Write `scripts/sitegiant_product_sync.py`:
   - Same structure as `autocount_product_sync.py` but calls `SiteGiantAdapter`
   - `sync()` calls `adapter.read_products()` + `adapter.read_items()`, merges, writes to master
   - Tags records with `"source": "sitegiant"`
   - Upsert logic: if SKU exists in `products.jsonl` from AutoCount, merge fields (fill missing)
4. Verify:
   - [ ] `skill_view(name='sitegiant-product-sync')` returns content
   - [ ] `python sitegiant_product_sync.py sync` without SiteGiant credentials fails gracefully
   - [ ] Records tagged with `source: "sitegiant"`
   - [ ] Merge logic doesn't overwrite AutoCount data with empty SiteGiant fields

---

## PHASE 3 — Listing Sync (4 new skills)

> One per platform. Each takes Shogun master data → formats for that platform → pushes via connector. Create vs update auto-detected (SKU exists → update, SKU new → create). Formatting is internal to each skill.

---

### Skill 9: `shopee-listing-sync`

**Function:** Create & update Shopee listings from Shogun master data.

**Files:**
- Create: `skills/retail/shopee-listing-sync/SKILL.md`
- Create: `skills/retail/shopee-listing-sync/scripts/shopee_listing_sync.py`

**Depends on:** `shopee-connector` (existing), Shogun master store (Skills 7-8)

**What it does:**
1. Read product from Shogun master store (`products.jsonl`)
2. Format product data for Shopee schema:
   - `item_name` (max 120 chars)
   - `description` (max 3000 chars)
   - `price`
   - `stock`
   - `variation` (if applicable)
   - `image` (max 9 images, min 500x500px)
   - `category_id` (mapped from AutoCount category)
   - `brand`
   - `item_status`
3. Check SKU mapping (`sku-mapping.json`) — if Shopee `item_id` exists → update, else → create
4. Call `shopee-connector.update_listing()` or create new listing
5. Update SKU mapping with new `item_id`
6. Log to `action-audit-log` (Skill 27)

**Shopee schema rules (internal formatting):**
- Title: max 120 chars, auto-truncate with ellipsis
- Images: max 9, min 500x500px, JPG/PNG
- Description: max 3000 chars, supports basic HTML
- Category: mapped via `config/category-mapping-shopee.yaml`
- Variations: if AutoCount product has UOM variants, create Shopee variations

**Methods:**

| Method | Description |
|---|---|
| `sync_sku(sku)` | Sync one SKU to Shopee (auto create/update) |
| `sync_batch(skus)` | Sync multiple SKUs |
| `sync_all()` | Sync all products in master store |
| `get_listing_status(sku)` | Check if SKU is listed on Shopee |

**CLI:**
```bash
python shopee_listing_sync.py sync <sku>
python shopee_listing_sync.py batch <sku_list_file>
python shopee_listing_sync.py all
python shopee_listing_sync.py status <sku>
```

**Build Steps:**

1. Create directories: `skills/retail/shopee-listing-sync/`, `skills/retail/shopee-listing-sync/scripts/`
2. Write `SKILL.md`:
   - `name: shopee-listing-sync`
   - `description:` ≤60 chars — "Create and update Shopee listings from Shogun master product data."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, listing, sync, shopee]`
   - `triggers: ["shopee listing", "shopee sync", "sync shopee"]`
3. Write `scripts/shopee_listing_sync.py`:
   - Import `ShopeeAdapter` from `shopee_connector`
   - Import master store reader (read from `~/.hermes/ecommerce/master/products.jsonl`)
   - Import SKU mapping reader/writer (`~/.hermes/ecommerce/master/sku-mapping.json`)
   - Define `ShopeeListingSync` class:
     - `__init__()` — init Shopee adapter, load master store, load SKU mapping
     - `_format_for_shopee(product)` — internal method: transform master product → Shopee schema (apply title truncation, image validation, category mapping)
     - `_check_exists(sku)` — check SKU mapping for existing Shopee `item_id`
     - `sync_sku(sku)` — read from master → format → check exists → create/update → update mapping → return result
     - `sync_batch(skus)` — loop `sync_sku()` per SKU, collect results
     - `sync_all()` — read all SKUs from master, `sync_batch()`
     - `get_listing_status(sku)` — check mapping + call `adapter.read_products()` to verify
   - Define category mapping config: `config/category-mapping-shopee.yaml` (AutoCount category → Shopee category_id)
   - CLI entry point
4. Verify:
   - [ ] `skill_view(name='shopee-listing-sync')` returns content
   - [ ] `sync_sku()` with a new SKU calls connector create path
   - [ ] `sync_sku()` with an existing SKU calls connector update path
   - [ ] SKU mapping is updated after create
   - [ ] Title truncation respects 120 char limit

---

### Skill 10: `lazada-listing-sync`

**Function:** Create & update Lazada listings from Shogun master data.

**Files:**
- Create: `skills/retail/lazada-listing-sync/SKILL.md`
- Create: `skills/retail/lazada-listing-sync/scripts/lazada_listing_sync.py`

**Depends on:** `lazada-connector` (existing), Shogun master store

**Lazada schema rules (internal formatting):**
- Title: max 255 chars
- Images: max 8, min 500x500px, JPG/PNG
- Description: max 3000 chars
- Category: mapped via `config/category-mapping-lazada.yaml`
- Variations: if product has variants, create Lazada product variations

**Methods:** Same structure as Skill 9 (`sync_sku`, `sync_batch`, `sync_all`, `get_listing_status`)

**Build Steps:** Same structure as Skill 9, adapted for Lazada API. Uses `LazadaAdapter` from `lazada_connector`. SKU mapping stores Lazada `seller_sku` and `product_id`.

**Verify:**
- [ ] Same checks as Skill 9, adapted for Lazada
- [ ] Title respects 255 char limit
- [ ] Max 8 images enforced

---

### Skill 11: `tiktok-listing-sync`

**Function:** Create & update TikTok Shop listings from Shogun master data.

**Files:**
- Create: `skills/retail/tiktok-listing-sync/SKILL.md`
- Create: `skills/retail/tiktok-listing-sync/scripts/tiktok_listing_sync.py`

**Depends on:** `tiktok-shop-connector` (Skill 4), Shogun master store

**TikTok schema rules (internal formatting):**
- Title: max 255 chars
- Images: max 9, min 800x800px, JPG/PNG
- Description: max 500 chars (short!)
- Category: mapped via `config/category-mapping-tiktok.yaml`

**Methods:** Same structure as Skills 9-10

**Build Steps:** Same structure, adapted for TikTok Shop API. Uses `TikTokShopAdapter`. SKU mapping stores TikTok `product_id`.

**Verify:**
- [ ] Same checks as Skills 9-10
- [ ] Description respects 500 char limit (shorter than other platforms)
- [ ] Min image size 800x800px enforced

---

### Skill 12: `website-listing-sync`

**Function:** Create & update website listings from Shogun master data.

**Files:**
- Create: `skills/retail/website-listing-sync/SKILL.md`
- Create: `skills/retail/website-listing-sync/scripts/website_listing_sync.py`

**Depends on:** `website-connector` (Skill 5), Shogun master store

**Website schema rules (internal formatting):**
- Title: unlimited (but recommend max 255 chars)
- Images: unlimited, min 500x500px
- Description: unlimited (full HTML supported)
- Category: mapped via `config/category-mapping-website.yaml`
- Barcode, UOM: included (website stores support these natively)

**Methods:** Same structure as Skills 9-11

**Build Steps:** Same structure. Uses `get_adapter()` from `website_connector`. Formatting adapts based on `WEBSITE_PLATFORM` (WooCommerce vs Shopify have different field names).

**Verify:**
- [ ] Same checks as Skills 9-11
- [ ] Formatting adapts for WooCommerce vs Shopify field names

---

## PHASE 4 — Price Sync (4 new skills)

> One per platform. Each takes SKU + new price → pushes to that platform. Returns success/failure. Keeps its own change log.

---

### Skill 13: `shopee-price-sync`

**Function:** Update prices on Shopee only.

**Files:**
- Create: `skills/retail/shopee-price-sync/SKILL.md`
- Create: `skills/retail/shopee-price-sync/scripts/shopee_price_sync.py`

**Depends on:** `shopee-connector` (existing), SKU mapping

**What it does:**
1. Read SKU mapping to get Shopee `item_id`
2. Call `shopee-connector.update_listing()` with new price
3. Log price change to `~/.hermes/ecommerce/logs/price-changes-shopee.jsonl`
4. Return success/failure per SKU

**Price change log entry:**
```json
{
  "timestamp": "2026-08-14T10:00:00Z",
  "sku": "PROD-001",
  "platform": "shopee",
  "old_price": 150.00,
  "new_price": 135.00,
  "item_id": 123456789,
  "status": "success"
}
```

**Methods:**

| Method | Description |
|---|---|
| `update_price(sku, new_price)` | Update one SKU price on Shopee |
| `update_batch(price_map)` | Bulk update — `{"sku": price, ...}` |
| `get_price_log(since=None)` | Read price change log |
| `get_failed_updates()` | Return SKUs that failed last sync |

**CLI:**
```bash
python shopee_price_sync.py update <sku> <price>
python shopee_price_sync.py batch <price_map.json>
python shopee_price_sync.py log
python shopee_price_sync.py failures
```

**Build Steps:**

1. Create directories: `skills/retail/shopee-price-sync/`, `skills/retail/shopee-price-sync/scripts/`
2. Write `SKILL.md`:
   - `name: shopee-price-sync`
   - `description:` ≤60 chars — "Update product prices on Shopee. Keep change log. Flag failures."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, price, sync, shopee]`
   - `triggers: ["shopee price", "update shopee price", "shopee price sync"]`
3. Write `scripts/shopee_price_sync.py`:
   - Import `ShopeeAdapter` from `shopee_connector`
   - Import SKU mapping reader, JSONL writer
   - Define `ShopeePriceSync` class:
     - `__init__()` — init Shopee adapter, load SKU mapping, set log path
     - `_log_change(sku, old_price, new_price, item_id, status, error)` — append to `price-changes-shopee.jsonl`
     - `update_price(sku, new_price)` — read mapping → call `adapter.update_listing({"item_id": ..., "price": ...})` → log → return result
     - `update_batch(price_map)` — loop `update_price()` per SKU, collect results
     - `get_price_log(since)` — read log file, filter by date
     - `get_failed_updates()` — read log, return entries with `status: "failed"`
   - CLI entry point
4. Verify:
   - [ ] `skill_view(name='shopee-price-sync')` returns content
   - [ ] `update_price()` calls connector with correct `item_id` from mapping
   - [ ] Log file is append-only JSONL
   - [ ] Failed updates are logged with error message

---

### Skill 14: `lazada-price-sync`

**Function:** Update prices on Lazada only.

**Files:**
- Create: `skills/retail/lazada-price-sync/SKILL.md`
- Create: `skills/retail/lazada-price-sync/scripts/lazada_price_sync.py`

**Depends on:** `lazada-connector` (existing), SKU mapping

**What it does:** Same as Skill 13 but for Lazada. Calls `lazada-connector.update_product()`. Log: `price-changes-lazada.jsonl`.

**Build Steps:** Same structure as Skill 13. Uses `LazadaAdapter`. SKU mapping stores Lazada `seller_sku`.

**Verify:** Same checks as Skill 13, adapted for Lazada.

---

### Skill 15: `tiktok-price-sync`

**Function:** Update prices on TikTok Shop only.

**Files:**
- Create: `skills/retail/tiktok-price-sync/SKILL.md`
- Create: `skills/retail/tiktok-price-sync/scripts/tiktok_price_sync.py`

**Depends on:** `tiktok-shop-connector` (Skill 4), SKU mapping

**What it does:** Same as Skill 13 but for TikTok Shop. Calls `tiktok-shop-connector.update_listing()`. Log: `price-changes-tiktok.jsonl`.

**Build Steps:** Same structure as Skill 13. Uses `TikTokShopAdapter`. SKU mapping stores TikTok `product_id`.

**Verify:** Same checks as Skill 13, adapted for TikTok.

---

### Skill 16: `website-price-sync`

**Function:** Update prices on website only (WooCommerce or Shopify).

**Files:**
- Create: `skills/retail/website-price-sync/SKILL.md`
- Create: `skills/retail/website-price-sync/scripts/website_price_sync.py`

**Depends on:** `website-connector` (Skill 5), SKU mapping

**What it does:** Same as Skill 13 but for website. Calls `website-connector.update_price()`. Log: `price-changes-website.jsonl`.

**Build Steps:** Same structure as Skill 13. Uses `get_adapter()` from `website_connector`.

**Verify:** Same checks as Skill 13, adapted for website.

---

## PHASE 5 — Product Analysis (2 new skills)

> One per metric domain. Velocity (sales speed) and Margin (profitability) are separate analytical functions.

---

### Skill 17: `product-velocity-analyzer`

**Function:** Classify products by sales velocity: dead, slow, fast, zero-sales.

**Files:**
- Create: `skills/retail/product-velocity-analyzer/SKILL.md`
- Create: `skills/retail/product-velocity-analyzer/scripts/product_velocity_analyzer.py`

**Depends on:** Shogun master store (sales-invoices.jsonl + products.jsonl)

**What it does:**
1. Read sales invoice data from `~/.hermes/ecommerce/master/sales-invoices.jsonl`
2. Compute per-SKU metrics:
   - `units_sold_total` — total units sold in period
   - `avg_monthly_velocity` — average units sold per month over period
   - `days_since_last_sale` — days since last sale event
   - `months_of_cover` — `current_stock / avg_monthly_velocity` (if velocity > 0)
3. Classify each SKU:

| Classification | Criteria (configurable via `config/velocity-thresholds.yaml`) |
|---|---|
| Dead stock | `days_since_last_sale > 180` OR `avg_monthly_velocity = 0` |
| Slow-moving | `months_of_cover > 8` AND not dead |
| Fast-moving | `avg_monthly_velocity > 2 * category_avg_velocity` |
| Zero-sales | `units_sold_total = 0` in period (default 30 days) |

4. Output ranked list per category, sorted by `capital_tied_up = stock_balance * cost_price` descending

**Relationship to existing `dead-slow-stock-detector`:**
- `dead-slow-stock-detector` reads from procurement gbrain source only
- This skill reads from all sales platforms via the unified master store
- This skill EXTENDS detection to all velocity tiers (dead + slow + fast + zero-sales)
- The existing skill can be deprecated or kept for procurement-only use cases

**Config:** `config/velocity-thresholds.yaml`
```yaml
dead_stock_days: 180
slow_stock_months_cover: 8
fast_stock_multiplier: 2.0
zero_sales_days: 30
analysis_period_days: 180
```

**Methods:**

| Method | Description |
|---|---|
| `analyze(period_days=180)` | Full velocity analysis — returns classification report |
| `get_classification(sku)` | Single SKU classification |
| `get_by_category(category)` | All SKUs in a velocity category |
| `get_ranked_by_capital()` | All dead/slow SKUs ranked by capital tied up |

**Output format:**
```json
{
  "period_days": 180,
  "analyzed_at": "2026-08-14T10:00:00Z",
  "summary": {
    "total_skus": 500,
    "dead": 45,
    "slow": 78,
    "fast": 120,
    "zero_sales": 60,
    "normal": 197
  },
  "products": [
    {
      "sku": "PROD-001",
      "classification": "dead",
      "units_sold_total": 0,
      "avg_monthly_velocity": 0,
      "days_since_last_sale": 320,
      "months_of_cover": null,
      "stock_balance": 240,
      "capital_tied_up": 21600.00,
      "recommendation": "Scrap / Write-off"
    }
  ]
}
```

**Build Steps:**

1. Create directories: `skills/retail/product-velocity-analyzer/`, `skills/retail/product-velocity-analyzer/scripts/`
2. Write `SKILL.md`:
   - `name: product-velocity-analyzer`
   - `description:` ≤60 chars — "Classify products by sales velocity: dead, slow, fast, zero-sales."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, analysis, velocity, dead-stock, slow-stock]`
   - `triggers: ["product velocity", "dead stock", "slow moving", "fast moving", "zero sales"]`
3. Write `config/velocity-thresholds.yaml` with default thresholds
4. Write `scripts/product_velocity_analyzer.py`:
   - Import master store reader (read `sales-invoices.jsonl` + `products.jsonl`)
   - Import `yaml` for config (or `json` as fallback)
   - Define `ProductVelocityAnalyzer` class:
     - `__init__()` — load config, load master data
     - `_compute_velocity(sku, period_days)` — scan sales invoices for SKU, compute metrics
     - `_classify(metrics, config)` — apply classification rules
     - `analyze(period_days)` — loop all SKUs, compute + classify, build summary
     - `get_classification(sku)` — single SKU
     - `get_by_category(category)` — filter results
     - `get_ranked_by_capital()` — sort dead+slow by capital_tied_up descending
   - CLI entry point: `python product_velocity_analyzer.py analyze [period_days]`, `... classify <sku>`, `... category <dead|slow|fast|zero>`
5. Verify:
   - [ ] `skill_view(name='product-velocity-analyzer')` returns content
   - [ ] `analyze()` with mock data produces correct classifications
   - [ ] Dead stock = zero sales in 180 days or zero velocity
   - [ ] Slow = months_of_cover > 8
   - [ ] Fast = velocity > 2x average
   - [ ] Capital ranking sorts descending
   - [ ] Config thresholds are editable without code changes

---

### Skill 18: `product-margin-analyzer`

**Function:** Classify products by margin: high-margin, low-margin, rank by margin contribution.

**Files:**
- Create: `skills/retail/product-margin-analyzer/SKILL.md`
- Create: `skills/retail/product-margin-analyzer/scripts/product_margin_analyzer.py`

**Depends on:** Shogun master store (`products.jsonl` — has `selling_price` and `cost_price`)

**What it does:**
1. Read product data from `~/.hermes/ecommerce/master/products.jsonl`
2. Compute per-SKU margin metrics:
   - `margin_amount` = `selling_price - cost_price`
   - `margin_pct` = `(selling_price - cost_price) / selling_price * 100`
   - `margin_contribution` = `margin_amount * units_sold` (from sales data)
3. Classify each SKU:

| Classification | Criteria (configurable via `config/margin-thresholds.yaml`) |
|---|---|
| High-margin | `margin_pct > 2 * target_margin_pct` (default target: 20%, so high = > 40%) |
| Low-margin | `margin_pct < margin_floor_pct` (default floor: 15%) |
| Negative margin | `margin_pct < 0` (selling below cost) |
| Normal | Between floor and high |

4. Rank by margin contribution (which products contribute most to total profit)

**Config:** `config/margin-thresholds.yaml`
```yaml
target_margin_pct: 20
margin_floor_pct: 15
high_margin_multiplier: 2.0
```

**Methods:**

| Method | Description |
|---|---|
| `analyze()` | Full margin analysis — returns classification report |
| `get_classification(sku)` | Single SKU margin classification |
| `get_by_category(category)` | All SKUs in a margin category |
| `get_ranked_by_contribution()` | All SKUs ranked by margin contribution |
| `get_negative_margin_skus()` | SKUs selling below cost |

**Output format:**
```json
{
  "analyzed_at": "2026-08-14T10:00:00Z",
  "summary": {
    "total_skus": 500,
    "high_margin": 120,
    "low_margin": 85,
    "negative_margin": 5,
    "normal": 290,
    "total_margin_contribution": 145000.00
  },
  "products": [
    {
      "sku": "PROD-001",
      "classification": "high_margin",
      "selling_price": 150.00,
      "cost_price": 60.00,
      "margin_amount": 90.00,
      "margin_pct": 60.0,
      "units_sold": 240,
      "margin_contribution": 21600.00
    }
  ]
}
```

**Build Steps:**

1. Create directories: `skills/retail/product-margin-analyzer/`, `skills/retail/product-margin-analyzer/scripts/`
2. Write `SKILL.md`:
   - `name: product-margin-analyzer`
   - `description:` ≤60 chars — "Classify products by margin: high, low, negative. Rank by contribution."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, analysis, margin, profitability]`
   - `triggers: ["product margin", "margin analysis", "low margin", "high margin"]`
3. Write `config/margin-thresholds.yaml`
4. Write `scripts/product_margin_analyzer.py`:
   - Same structure as velocity analyzer
   - `_compute_margin(sku)` — read price/cost from master, compute margin metrics
   - `_classify(margin_metrics, config)` — apply classification rules
   - `analyze()`, `get_classification(sku)`, `get_by_category(category)`, `get_ranked_by_contribution()`, `get_negative_margin_skus()`
   - CLI entry point
5. Verify:
   - [ ] `skill_view(name='product-margin-analyzer')` returns content
   - [ ] `analyze()` with mock data produces correct classifications
   - [ ] High-margin = margin_pct > 40% (2x 20% target)
   - [ ] Low-margin = margin_pct < 15%
   - [ ] Negative margin detected
   - [ ] Contribution ranking sorts descending

---

## PHASE 6 — Marketing (2 new skills)

> One per recommendation type. Promo selection and bundle/cross-sell are separate functions.

---

### Skill 19: `promo-recommender`

**Function:** Given analysis results → output: which products to promote, campaign theme, promo angle, suggested promo price.

**Files:**
- Create: `skills/retail/promo-recommender/SKILL.md`
- Create: `skills/retail/promo-recommender/scripts/promo_recommender.py`

**Depends on:** `product-velocity-analyzer` (Skill 17), `product-margin-analyzer` (Skill 18)

**What it does:**
1. Read velocity classification (dead, slow, fast, zero-sales)
2. Read margin classification (high, low, negative)
3. Cross-reference to generate promo recommendations:

| Product State | Promo Action | Campaign Theme | Promo Angle |
|---|---|---|---|
| Dead stock + high margin | Clearance discount | "Clearance Sale" | "Last chance — make room for new stock" |
| Dead stock + low margin | Bundle with best-seller | "Bundle Deal" | "Buy together, save more" |
| Slow + high margin | Flash sale | "Flash Sale" | "Limited time offer — selling fast!" |
| Slow + low margin | Small discount | "Weekly Specials" | "Special price this week only" |
| Zero-sales + high margin | Featured promotion | "New Arrival" / "Rediscover" | "You've been missing out" |
| Fast + high margin | Best seller highlight | "Best Seller" | "Our customers' top pick" |

4. Calculate suggested promo price per product:
   - Base discount: determined by margin headroom + days-since-last-sale + capital-tied-up
   - Guardrail: never sell below cost (margin_pct ≥ 0% after discount)
   - Formula: `suggested_promo_price = selling_price * (1 - discount_pct)`
   - Discount % logic:
     - Dead stock: 30-50% discount (higher if more capital tied up)
     - Slow stock: 15-25% discount
     - Zero-sales: 10-20% discount
     - Fast + high margin: 0-10% (highlight, don't discount much)

5. Output per product: SKU, promo action, campaign theme, promo angle, suggested promo price, discount %, margin after discount

**Methods:**

| Method | Description |
|---|---|
| `generate(velocity_report, margin_report)` | Full recommendation report |
| `get_recommendation(sku)` | Single SKU recommendation |
| `get_promo_price(sku)` | Suggested promo price + margin impact |
| `get_campaign_summary()` | Group recommendations by campaign theme |

**Output format:**
```json
{
  "generated_at": "2026-08-14T10:00:00Z",
  "campaigns": [
    {
      "theme": "Clearance Sale",
      "product_count": 45,
      "total_potential_recovery": 125000.00
    }
  ],
  "recommendations": [
    {
      "sku": "PROD-001",
      "product_name": "Widget A",
      "velocity_class": "dead",
      "margin_class": "high_margin",
      "promo_action": "Clearance discount",
      "campaign_theme": "Clearance Sale",
      "promo_angle": "Last chance — make room for new stock",
      "selling_price": 150.00,
      "cost_price": 60.00,
      "suggested_promo_price": 90.00,
      "discount_pct": 40.0,
      "margin_after_discount_pct": 33.3,
      "capital_tied_up": 21600.00,
      "urgency_score": 9
    }
  ]
}
```

**Build Steps:**

1. Create directories: `skills/retail/promo-recommender/`, `skills/retail/promo-recommender/scripts/`
2. Write `SKILL.md`:
   - `name: promo-recommender`
   - `description:` ≤60 chars — "Recommend promo products, campaign themes, angles, and promo prices."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, marketing, promo, recommendation]`
   - `triggers: ["promo recommendation", "campaign recommendation", "promotional pricing"]`
3. Write `scripts/promo_recommender.py`:
   - Import analysis reports (velocity + margin)
   - Define `PromoRecommender` class:
     - `__init__()` — load config
     - `_determine_action(velocity_class, margin_class)` — map to promo action + theme + angle
     - `_calculate_promo_price(sku, selling_price, cost_price, velocity_class, capital_tied_up)` — compute discount % + suggested price
     - `_compute_urgency_score(days_since_last_sale, capital_tied_up, margin_class)` — 1-10 scale
     - `generate(velocity_report, margin_report)` — cross-reference, produce recommendations
     - `get_recommendation(sku)` — single SKU
     - `get_promo_price(sku)` — just the price calculation
     - `get_campaign_summary()` — group by theme
   - CLI entry point
4. Verify:
   - [ ] `skill_view(name='promo-recommender')` returns content
   - [ ] Dead + high-margin → Clearance Sale with 30-50% discount
   - [ ] Slow + high-margin → Flash Sale with 15-25% discount
   - [ ] Promo price never below cost price (margin ≥ 0%)
   - [ ] Urgency score 1-10
   - [ ] Campaign summary groups by theme

---

### Skill 20: `cross-sell-bundle-recommender`

**Function:** Given order history + product catalog → output: cross-sell pairs, bundle suggestions with rationale.

**Files:**
- Create: `skills/retail/cross-sell-bundle-recommender/SKILL.md`
- Create: `skills/retail/cross-sell-bundle-recommender/scripts/bundle_recommender.py`

**Depends on:** Shogun master store (`sales-invoices.jsonl` for order history, `products.jsonl` for catalog)

**What it does:**
1. Read order history from `sales-invoices.jsonl`
2. Analyze co-occurrence: which SKUs are frequently bought together in the same order
3. Generate recommendations:

| Recommendation Type | Logic |
|---|---|
| Cross-sell pair | Two SKUs frequently bought together (e.g., phone + case) |
| Bundle (dead stock + best seller) | Dead/slow SKU bundled with fast-moving SKU to clear inventory |
| Bundle (complementary categories) | SKUs from complementary categories (e.g., shampoo + conditioner) |
| Bundle (high-margin + fast-moving) | High-margin slow SKU + fast-moving SKU to boost profit |

4. For each bundle, calculate:
   - Bundle price (individual sum minus discount)
   - Savings %
   - Expected margin
   - Rationale (why these go together)

**Methods:**

| Method | Description |
|---|---|
| `generate(velocity_report=None, margin_report=None)` | Full bundle/cross-sell report |
| `get_cross_sell(sku)` | Cross-sell pairs for a given SKU |
| `get_bundles()` | All bundle suggestions |
| `get_bundle_pricing(bundle_id)` | Bundle price + margin calculation |

**Output format:**
```json
{
  "generated_at": "2026-08-14T10:00:00Z",
  "cross_sell_pairs": [
    {
      "primary_sku": "PROD-001",
      "paired_sku": "PROD-042",
      "co_occurrence_count": 85,
      "confidence": 0.72,
      "rationale": "Bought together in 72% of phone purchases"
    }
  ],
  "bundles": [
    {
      "bundle_id": "BUNDLE-001",
      "skus": ["PROD-001", "PROD-042"],
      "type": "dead_stock_plus_best_seller",
      "individual_price_sum": 225.00,
      "bundle_price": 199.00,
      "savings_pct": 11.6,
      "expected_margin": 89.00,
      "rationale": "Clear dead stock (Widget A) by bundling with best-seller (Case B)"
    }
  ]
}
```

**Build Steps:**

1. Create directories: `skills/retail/cross-sell-bundle-recommender/`, `skills/retail/cross-sell-bundle-recommender/scripts/`
2. Write `SKILL.md`:
   - `name: cross-sell-bundle-recommender`
   - `description:` ≤60 chars — "Generate cross-sell pairs and bundle suggestions from order history."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, marketing, cross-sell, bundle, recommendation]`
   - `triggers: ["cross sell", "bundle recommendation", "product bundle"]`
3. Write `scripts/bundle_recommender.py`:
   - Import master store reader
   - Define `BundleRecommender` class:
     - `__init__()` — load order history + product catalog
     - `_compute_co_occurrence()` — scan invoices, build SKU co-occurrence matrix
     - `_find_cross_sell_pairs(min_confidence=0.3)` — extract pairs above threshold
     - `_generate_dead_stock_bundles(velocity_report)` — dead/slow + fast-moving combos
     - `_generate_complementary_bundles()` — complementary category combos
     - `_generate_margin_bundles(margin_report)` — high-margin + fast-moving combos
     - `_calculate_bundle_price(skus, discount_pct=10)` — price + margin
     - `generate(velocity_report, margin_report)` — full report
     - `get_cross_sell(sku)` — pairs for one SKU
     - `get_bundles()` — all bundles
     - `get_bundle_pricing(bundle_id)` — price calculation
   - CLI entry point
4. Verify:
   - [ ] `skill_view(name='cross-sell-bundle-recommender')` returns content
   - [ ] Co-occurrence analysis produces sensible pairs
   - [ ] Dead stock + best seller bundles are generated
   - [ ] Bundle price < individual price sum
   - [ ] Each bundle has a rationale string

---

## PHASE 7 — Content Generation (3 new skills)

> One per output format group. Each uses the agent's LLM (the Hermes agent itself) — no external AI API needed. Content is tailored to product data from the master store.
>
> **⚠️ These are prompt-template skills, not standalone scripts.** The Python files provide prompt structure + output parsing. The agent executes the prompt. `python video_generator.py` alone will NOT produce content without the agent. See Prerequisites P5.

---

### Skill 21: `video-content-generator`

**Function:** Generate video concept + full script (hook, shots, voiceover, text overlay) for a given product + promo.

**Files:**
- Create: `skills/retail/video-content-generator/SKILL.md`
- Create: `skills/retail/video-content-generator/scripts/video_generator.py`
- Create: `skills/retail/video-content-generator/scripts/templates/video_script_template.py`

**Depends on:** Shogun master store (product data), `promo-recommender` (promo context)

**What it does:**
1. Read product data from master store (name, features, price, images, category)
2. Read promo context from `promo-recommender` (campaign theme, promo angle, promo price)
3. Generate:
   - **Video concept:** 1-paragraph concept + visual direction + target length (15s, 30s, 60s)
   - **Video script:** structured script with:
     - Hook (first 3 seconds — grab attention)
     - Scene-by-scene shots (visual description per scene)
     - Voiceover text (what the narrator says)
     - Text overlay (on-screen text per scene)
     - CTA (call to action at end)
   - Tailored to platform: TikTok (vertical, fast-paced), Reels (vertical, trending audio), YouTube Shorts (horizontal-ish, informative)

**Script format:**
```json
{
  "sku": "PROD-001",
  "product_name": "Widget A",
  "platform": "tiktok",
  "duration_seconds": 30,
  "concept": "Show Widget A solving a real customer problem in 30 seconds. Open with pain point, reveal product, demonstrate, end with promo price.",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-3s",
      "visual": "Person struggling with [problem]",
      "voiceover": "Tired of dealing with [problem]?",
      "text_overlay": "Problem: [pain point]"
    },
    {
      "scene_number": 2,
      "duration": "3-10s",
      "visual": "Product reveal — Widget A in use",
      "voiceover": "Meet Widget A — the solution you've been waiting for.",
      "text_overlay": "Meet Widget A"
    }
  ],
  "cta": {
    "visual": "Product on screen with price",
    "voiceover": "Get yours now for just RM 90.00 — link in bio!",
    "text_overlay": "RM 90.00 | Link in bio"
  }
}
```

**Methods:**

| Method | Description |
|---|---|
| `generate_concept(sku, platform="tiktok", duration=30)` | Video concept only |
| `generate_script(sku, platform="tiktok", duration=30, promo_context=None)` | Full video script |
| `generate_batch(skus, platform, duration)` | Scripts for multiple products |

**Build Steps:**

1. Create directories: `skills/retail/video-content-generator/`, `skills/retail/video-content-generator/scripts/`, `skills/retail/video-content-generator/scripts/templates/`
2. Write `SKILL.md`:
   - `name: video-content-generator`
   - `description:` ≤60 chars — "Generate video concepts and scripts for product promotions."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, content, video, script, tiktok]`
   - `triggers: ["video script", "video concept", "product video", "tiktok video"]`
3. Write `scripts/templates/video_script_template.py` — prompt templates per platform:
   - TikTok: fast-paced, trending, vertical, hook-first
   - Reels: similar to TikTok but Instagram tone
   - YouTube Shorts: informative + entertaining
4. Write `scripts/video_generator.py`:
   - Import master store reader
   - Define `VideoContentGenerator` class:
     - `__init__()` — load master store
     - `_load_product_context(sku)` — read product data + optional promo context
     - `_build_prompt(sku, platform, duration, promo_context)` — construct LLM prompt using template
     - `generate_concept(sku, platform, duration)` — LLM generates concept only
     - `generate_script(sku, platform, duration, promo_context)` — LLM generates full structured script
     - `generate_batch(skus, platform, duration)` — loop for multiple products
   - The LLM call is the Hermes agent itself — the skill's script provides the prompt structure, the agent executes it
   - CLI entry point
5. Verify:
   - [ ] `skill_view(name='video-content-generator')` returns content
   - [ ] `generate_concept()` returns a concept paragraph
   - [ ] `generate_script()` returns structured JSON with scenes
   - [ ] Script includes hook, scenes, voiceover, text overlay, CTA
   - [ ] Platform-specific (TikTok vs Reels vs YouTube)

---

### Skill 22: `social-content-generator`

**Function:** Generate platform-specific captions, hashtags, keywords, and CTAs for a given product.

**Files:**
- Create: `skills/retail/social-content-generator/SKILL.md`
- Create: `skills/retail/social-content-generator/scripts/social_generator.py`

**Depends on:** Shogun master store (product data), `promo-recommender` (promo context)

**What it does:**
1. Read product data from master store
2. Read promo context (campaign theme, promo angle, promo price)
3. Generate per platform:

| Platform | Caption | Hashtags | Keywords | CTA |
|---|---|---|---|---|
| Shopee | Max 3000 chars, keyword-rich | 10-15 tags | 10-15 SEO keywords | "Buy Now", "Add to Cart" |
| Lazada | Max 3000 chars, keyword-rich | 10-15 tags | 10-15 SEO keywords | "Add to Cart", "Buy Now" |
| TikTok | Max 500 chars, punchy | 5-10 tags (#fyp, #foryou) | 5-10 keywords | "Link in bio", "Shop now" |
| Instagram | Max 2200 chars, storytelling | 10-15 tags | 5-10 keywords | "Link in bio", "Tap to shop" |
| Facebook | Max 5000 chars, conversational | 5-10 tags | 5-10 keywords | "Shop Now", "Learn More" |

**Methods:**

| Method | Description |
|---|---|
| `generate_captions(sku, platform, count=3)` | 3 caption variants |
| `generate_hashtags(sku, platform)` | Platform hashtags |
| `generate_keywords(sku)` | SEO keywords |
| `generate_cta(platform, promo_type)` | Platform-appropriate CTA |
| `generate_all(sku, platform)` | Full content package |

**Output format:**
```json
{
  "sku": "PROD-001",
  "platform": "tiktok",
  "captions": [
    "Meet Widget A — the solution you didn't know you needed. 😍 Get yours for just RM 90! #widget #musthave",
    "Stop scrolling! 🛑 Widget A is a game-changer. Only RM 90 — link in bio! #tiktokmademebuyit",
    "POV: You just discovered Widget A and your life is changed. 🤯 RM 90 only!"
  ],
  "hashtags": ["#fyp", "#foryou", "#widget", "#musthave", "#tiktokmademebuyit", "#shopping", "#deals", "#malaysia", "#onlineshopping", "#trending"],
  "keywords": ["widget a", "best widget", "widget malaysia", "affordable widget", "quality widget", "widget deal", "widget promotion", "buy widget online", "widget review", "widget discount"],
  "cta": "Link in bio — shop now!"
}
```

**Build Steps:**

1. Create directories: `skills/retail/social-content-generator/`, `skills/retail/social-content-generator/scripts/`
2. Write `SKILL.md`:
   - `name: social-content-generator`
   - `description:` ≤60 chars — "Generate captions, hashtags, keywords, and CTAs per platform."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, content, social, captions, hashtags]`
   - `triggers: ["social content", "caption", "hashtag", "keywords", "cta"]`
3. Write `scripts/social_generator.py`:
   - Import master store reader
   - Define `SocialContentGenerator` class:
     - `__init__()` — load master store, load platform rules config
     - `_load_product_context(sku)` — read product data
     - `_get_platform_rules(platform)` — char limits, hashtag counts, CTA styles
     - `generate_captions(sku, platform, count)` — LLM generates caption variants
     - `generate_hashtags(sku, platform)` — LLM generates hashtags
     - `generate_keywords(sku)` — LLM generates SEO keywords
     - `generate_cta(platform, promo_type)` — LLM generates CTA
     - `generate_all(sku, platform)` — all of the above in one call
   - Platform rules config: `config/platform-rules.yaml` (char limits, hashtag counts)
   - CLI entry point
4. Verify:
   - [ ] `skill_view(name='social-content-generator')` returns content
   - [ ] Captions respect platform character limits
   - [ ] Hashtags are platform-appropriate (#fyp for TikTok, etc.)
   - [ ] Keywords are SEO-relevant
   - [ ] CTAs are platform-appropriate

---

### Skill 23: `product-copy-generator`

**Function:** Generate product descriptions, promo headlines, and banner copy for a given product.

**Files:**
- Create: `skills/retail/product-copy-generator/SKILL.md`
- Create: `skills/retail/product-copy-generator/scripts/product_copy_generator.py`

**Depends on:** Shogun master store (product data), `promo-recommender` (promo context)

**What it does:**
1. Read product data from master store
2. Read promo context
3. Generate:
   - **Product descriptions:** Full product description per platform (respecting char limits)
   - **Promo headlines:** 3-5 campaign title variants per promo type
   - **Banner copy:** Short headline + subheadline (space-constrained for banners)

**Output format:**
```json
{
  "sku": "PROD-001",
  "descriptions": {
    "shopee": "Full Shopee description (max 3000 chars)...",
    "lazada": "Full Lazada description (max 3000 chars)...",
    "tiktok": "Short TikTok description (max 500 chars)...",
    "website": "Full website description (unlimited)..."
  },
  "promo_headlines": [
    "Clearance Sale: Widget A — Last Chance!",
    "Don't Miss Out: Widget A at 40% Off",
    "Final Stock: Widget A Clearance Event"
  ],
  "banner_copy": {
    "headline": "Widget A Clearance",
    "subheadline": "40% OFF — While Stocks Last"
  }
}
```

**Methods:**

| Method | Description |
|---|---|
| `generate_description(sku, platform)` | Platform-specific product description |
| `generate_headlines(sku, promo_type, count=3)` | Promo headline variants |
| `generate_banner_copy(sku, promo_type)` | Headline + subheadline for banners |
| `generate_all(sku, promo_type)` | Full copy package |

**Build Steps:**

1. Create directories: `skills/retail/product-copy-generator/`, `skills/retail/product-copy-generator/scripts/`
2. Write `SKILL.md`:
   - `name: product-copy-generator`
   - `description:` ≤60 chars — "Generate product descriptions, promo headlines, and banner copy."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, content, copywriting, description, headline]`
   - `triggers: ["product description", "promo headline", "banner copy", "product copy"]`
3. Write `scripts/product_copy_generator.py`:
   - Import master store reader
   - Define `ProductCopyGenerator` class:
     - `__init__()` — load master store
     - `generate_description(sku, platform)` — LLM generates description
     - `generate_headlines(sku, promo_type, count)` — LLM generates headline variants
     - `generate_banner_copy(sku, promo_type)` — LLM generates short headline + subheadline
     - `generate_all(sku, promo_type)` — full package
   - CLI entry point
4. Verify:
   - [ ] `skill_view(name='product-copy-generator')` returns content
   - [ ] Descriptions respect platform char limits
   - [ ] Headlines are punchy and relevant
   - [ ] Banner copy is short (fits on banner)

---

## PHASE 8 — Creative (1 new skill)

> Banner image generation only. Approval handled by `approval-gate` (Skill 26).

---

### Skill 24: `banner-generator`

**Function:** Generate promotional banner image (brand template + product image + promo text + price) via ComfyUI.

**Files:**
- Create: `skills/retail/banner-generator/SKILL.md`
- Create: `skills/retail/banner-generator/scripts/banner_generator.py`
- Create: `skills/retail/banner-generator/scripts/templates/banner_template.html`
- Create: `skills/retail/banner-generator/scripts/templates/brand-config.yaml`

**Depends on:** `comfyui` (⚠️ not installed — see Prerequisites P3), `product-copy-generator` (Skill 23 — banner copy), `promo-recommender` (Skill 19 — campaign theme + promo price)

> **⚠️ If comfyui is not available:** Fall back to HTML template → browser screenshot → PNG. Remove the comfyui import and use `_html_to_png()` via headless browser only.

**What it does:**
1. Read product data from master store (product image, name)
2. Read banner copy from `product-copy-generator` (headline, subheadline)
3. Read promo price from `promo-recommender`
4. Read brand config (logo path, brand colors, fonts)
5. Generate banner using HTML/CSS template → render to PNG:
   - Template: `templates/banner_template.html` — absolute-positioned divs for product image, headline, subheadline, price, brand logo
   - Render: open HTML in browser → screenshot to PNG (using `browser_vision` or `comfyui` for AI backgrounds)
6. Save to `~/.hermes/ecommerce/banners/pending/` (awaiting approval)
7. Support per-platform banner sizes:

| Platform | Dimensions |
|----------|-----------|
| Shopee | 1024x1024 (product), 1920x600 (cover) |
| Lazada | 800x800 (product), 1920x600 (cover) |
| TikTok Shop | 1080x1080 (product), 1080x1920 (story) |
| Website | 1200x628 (OG), 1920x600 (hero) |

**Brand config (`templates/brand-config.yaml`):**
```yaml
brand_name: "MyBrand"
logo_path: "~/.hermes/ecommerce/brand/logo.png"
colors:
  primary: "#1a1a2e"
  secondary: "#16213e"
  accent: "#e94560"
  text: "#ffffff"
fonts:
  headline: "Montserrat-Bold"
  subheadline: "Montserrat-Medium"
  price: "Montserrat-Black"
```

**Methods:**

| Method | Description |
|---|---|
| `generate(sku, promo_type, platform, size="product")` | Generate banner → save to pending |
| `get_pending()` | List banners awaiting approval |
| `get_brand_config()` | Read brand config |
| `update_brand_config(config)` | Update brand config |

**Build Steps:**

1. Create directories: `skills/retail/banner-generator/`, `skills/retail/banner-generator/scripts/`, `skills/retail/banner-generator/scripts/templates/`
2. Write `SKILL.md`:
   - `name: banner-generator`
   - `description:` ≤60 chars — "Generate promotional banner images with brand template and product data."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, creative, banner, image, comfyui]`
   - `triggers: ["banner", "promotional banner", "banner generator"]`
3. Write `scripts/templates/brand-config.yaml` — default brand config
4. Write `scripts/templates/banner_template.html`:
   - HTML/CSS template with absolute positioning
   - Placeholders for: `{{PRODUCT_IMAGE}}`, `{{HEADLINE}}`, `{{SUBHEADLINE}}`, `{{PRICE}}`, `{{BRAND_LOGO}}`
   - Responsive to different dimensions (set via query params)
5. Write `scripts/banner_generator.py`:
   - Import master store reader, brand config loader
   - Define `BannerGenerator` class:
     - `__init__()` — load brand config, create banner dirs (`pending/`, `approved/`, `rejected/`)
     - `_load_template()` — read HTML template
     - `_render_template(product_image, headline, subheadline, price, logo)` — replace placeholders
     - `_html_to_png(html, width, height, output_path)` — render HTML to PNG (via browser screenshot or `comfyui`)
     - `_get_dimensions(platform, size)` — return (width, height) from size table
     - `generate(sku, promo_type, platform, size)` — main method:
       1. Read product data from master
       2. Read banner copy from `product-copy-generator` (or accept as param)
       3. Read promo price from `promo-recommender` (or accept as param)
       4. Render HTML template with data
       5. Convert to PNG at platform dimensions
       6. Save to `~/.hermes/ecommerce/banners/pending/<sku>_<platform>_<size>_<timestamp>.png`
       7. Return path + metadata
     - `get_pending()` — list files in `pending/`
     - `get_brand_config()` — read `brand-config.yaml`
     - `update_brand_config(config)` — write `brand-config.yaml`
   - CLI entry point
6. Verify:
   - [ ] `skill_view(name='banner-generator')` returns content
   - [ ] `generate()` produces a PNG file in `pending/`
   - [ ] Banner includes product image, headline, subheadline, price, brand logo
   - [ ] Dimensions match platform requirements
   - [ ] Brand config is editable via YAML

---

## PHASE 9 — Orchestration & Governance (3 new skills)

---

### Skill 25: `ecommerce-workflow-orchestrator`

**Function:** Run the 12-step pipeline: pull data → analyze → identify → recommend → content → banners → prices → listings → sync → log.

**Files:**
- Create: `skills/retail/ecommerce-workflow-orchestrator/SKILL.md`
- Create: `skills/retail/ecommerce-workflow-orchestrator/scripts/workflow_orchestrator.py`

**Depends on:** All skills (this is the conductor — calls each in sequence)

> **⚠️ Cross-profile limitation:** Hermes profiles are isolated. The orchestrator runs on `ecommerce-manager` but calls skills assigned to Merchandising, Marketing, and Compliance. See **Prerequisites P4** — either co-install all called skills on `ecommerce-manager`, or invoke via agent instructions rather than direct Python import.

**What it does:**
The orchestrator calls each skill in sequence. It contains NO business logic — only orchestration (call order, state tracking, error handling, approval gates).

**Workflow steps:**

| Step | Action | Skill Called | Gated? |
|------|--------|-------------|--------|
| 1 | Pull product data from AutoCount | `autocount-product-sync.sync()` | No |
| 2 | Analyze sales velocity | `product-velocity-analyzer.analyze()` | No |
| 3 | Analyze product margins | `product-margin-analyzer.analyze()` | No |
| 4 | Generate promo recommendations | `promo-recommender.generate()` | Yes — campaign approval |
| 5 | Generate bundle recommendations | `cross-sell-bundle-recommender.generate()` | No |
| 6 | Generate video content | `video-content-generator.generate_script()` | No |
| 7 | Generate social content | `social-content-generator.generate_all()` | No |
| 8 | Generate product copy | `product-copy-generator.generate_all()` | No |
| 9 | Generate banners | `banner-generator.generate()` | Yes — banner approval |
| 10 | Update prices | `shopee-price-sync` + `lazada-price-sync` + `tiktok-price-sync` + `website-price-sync` | Yes — price approval |
| 11 | Update listings | `shopee-listing-sync` + `lazada-listing-sync` + `tiktok-listing-sync` + `website-listing-sync` | Yes — listing approval |
| 12 | Log all actions | `action-audit-log.log_workflow()` | No |

**Modes:**
- `full` — all 12 steps
- `partial` — selected steps (e.g., `steps=[1,2,3]`)
- `single` — one step only

**State tracking:**
- Current step, completed steps, failed steps, elapsed time
- State persisted to `~/.hermes/ecommerce/workflow-state.json`
- Resume from any step after approval or failure

**Approval gate integration:**
- At gated steps, orchestrator calls `approval-gate.request()` and pauses
- When approval is received (via `approval-gate.approve()`), orchestrator resumes via `resume_from()`
- If rejected, orchestrator skips that step and continues

**Methods:**

| Method | Description |
|---|---|
| `run_full()` | Execute all 12 steps in sequence (pause at gates) |
| `run_steps(step_numbers)` | Execute selected steps only |
| `run_step(step_number)` | Execute one step |
| `get_status()` | Current progress (step, completed, failed, elapsed) |
| `resume_from(step_number)` | Resume after approval or failure |
| `pause()` | Pause at approval gate |
| `abort()` | Abort workflow |

**CLI:**
```bash
python workflow_orchestrator.py run-full
python workflow_orchestrator.py run-steps 1,2,3
python workflow_orchestrator.py run-step 4
python workflow_orchestrator.py status
python workflow_orchestrator.py resume-from 5
```

**Cron-schedulable:** Can be triggered via `cronjob(action='create', schedule='0 9 * * 1', prompt='Run ecommerce-workflow-orchestrator run-full')` for weekly autonomous runs.

**Build Steps:**

1. Create directories: `skills/retail/ecommerce-workflow-orchestrator/`, `skills/retail/ecommerce-workflow-orchestrator/scripts/`
2. Write `SKILL.md`:
   - `name: ecommerce-workflow-orchestrator`
   - `description:` ≤60 chars — "Run the 12-step e-commerce pipeline: pull to log."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, orchestration, workflow, pipeline]`
   - `triggers: ["ecommerce workflow", "run pipeline", "full workflow"]`
3. Write `scripts/workflow_orchestrator.py`:
   - Import all skill modules (or define step-to-skill mapping in config)
   - Define `WorkflowOrchestrator` class:
     - `__init__()` — init all adapters, load state
     - `_load_state()` / `_save_state()` — read/write `workflow-state.json`
     - `_call_skill(step_number)` — map step number to skill, call it, return result
     - `_check_gate(step_number)` — if step is gated, call `approval-gate.request()` and return pending status
     - `run_full()` — loop steps 1-12, pause at gates
     - `run_steps(step_numbers)` — selected steps
     - `run_step(step_number)` — single step
     - `get_status()` — read state, return progress
     - `resume_from(step_number)` — resume from specific step
     - `pause()` — save state, mark as paused
     - `abort()` — save state, mark as aborted
   - Step-to-skill mapping config: `config/workflow-steps.yaml`
   - CLI entry point
4. Verify:
   - [ ] `skill_view(name='ecommerce-workflow-orchestrator')` returns content
   - [ ] `run_full()` executes steps in correct order
   - [ ] Workflow pauses at gated steps (4, 9, 10, 11)
   - [ ] `resume_from()` continues from specified step
   - [ ] `get_status()` shows current step + progress
   - [ ] State persists across runs

---

### Skill 26: `approval-gate`

**Function:** Hold actions pending human approval. Approve / reject / modify.

**Files:**
- Create: `skills/retail/approval-gate/SKILL.md`
- Create: `skills/retail/approval-gate/scripts/approval_gate.py`
- Create: `skills/retail/approval-gate/scripts/config/approval-config.yaml`

**Depends on:** None (standalone — called by orchestrator and other skills)

**What it does:**
1. When a gated action is reached, the calling skill calls `approval-gate.request()`
2. Gate creates a pending approval request with: ID, type, payload, created_at, expires_at
3. Request is stored in `~/.hermes/ecommerce/approvals/` as JSON
4. Request can be delivered to Slack/Telegram for human review
5. Human reviews and calls `approve()` or `reject()`
6. If approved, calling skill proceeds; if rejected, skill skips
7. If not decided within timeout (default 24h), request expires

**Gate types:**

| Gate Type | What it gates | Default |
|-----------|--------------|---------|
| `price_change` | Price updates before sync | Optional |
| `banner_publishing` | Banner publishing to platforms | Required |
| `product_publishing` | New listing publishing | Required |
| `campaign_launch` | Marketing campaign launch | Required |
| `promo_pricing` | Promo price going live | Required |

**Config (`config/approval-config.yaml`):**
```yaml
gates:
  price_change:
    required: false
    expiry_hours: 24
    deliver_to: "slack:#marketing"
  banner_publishing:
    required: true
    expiry_hours: 48
    deliver_to: "slack:#marketing"
  product_publishing:
    required: true
    expiry_hours: 24
    deliver_to: "slack:#marketing"
  campaign_launch:
    required: true
    expiry_hours: 72
    deliver_to: "slack:#marketing"
  promo_pricing:
    required: true
    expiry_hours: 24
    deliver_to: "slack:#marketing"
```

**State machine:** `pending` → `approved` / `rejected` / `expired`

**Approval request file format:**
```json
{
  "id": "approval-2026-08-14-001",
  "type": "price_change",
  "payload": {
    "sku": "PROD-001",
    "old_price": 150.00,
    "new_price": 90.00,
    "platforms": ["shopee", "lazada", "tiktok", "website"]
  },
  "created_at": "2026-08-14T10:00:00Z",
  "expires_at": "2026-08-15T10:00:00Z",
  "status": "pending",
  "decided_by": null,
  "decided_at": null,
  "reason": null
}
```

**Methods:**

| Method | Description |
|---|---|
| `request(gate_type, payload)` | Create pending request, return ID |
| `check(request_id)` | Get status of a request |
| `approve(request_id, decided_by)` | Approve a request |
| `reject(request_id, decided_by, reason)` | Reject a request |
| `modify(request_id, modifications, decided_by)` | Approve with modifications |
| `get_pending()` | All pending approvals |
| `expire_stale(timeout_hours=24)` | Expire requests past timeout |
| `deliver_request(request_id, channel)` | Send to Slack/Telegram for review |

**Build Steps:**

1. Create directories: `skills/retail/approval-gate/`, `skills/retail/approval-gate/scripts/`, `skills/retail/approval-gate/scripts/config/`
2. Write `SKILL.md`:
   - `name: approval-gate`
   - `description:` ≤60 chars — "Hold actions for human approval. Approve, reject, or modify."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, governance, approval, workflow, gate]`
   - `triggers: ["approval gate", "approve action", "pending approval"]`
3. Write `scripts/config/approval-config.yaml` — default gate config
4. Write `scripts/approval_gate.py`:
   - Import `json`, `os`, `datetime`, `logging`
   - Define `ApprovalGate` class:
     - `__init__()` — load config, create approvals dir
     - `_generate_id()` — `approval-<date>-<seq>`
     - `_save_request(request)` — write JSON to `~/.hermes/ecommerce/approvals/<id>.json`
     - `_load_request(request_id)` — read JSON
     - `_update_request(request_id, updates)` — update + save
     - `request(gate_type, payload)` — check if gate is required, create request, return ID
     - `check(request_id)` — return status
     - `approve(request_id, decided_by)` — update status to approved
     - `reject(request_id, decided_by, reason)` — update status to rejected
     - `modify(request_id, modifications, decided_by)` — update payload + approve
     - `get_pending()` — scan dir, return all pending
     - `expire_stale(timeout_hours)` — scan, expire past timeout
     - `deliver_request(request_id, channel)` — format message, send via Hermes comm layer (placeholder — actual delivery depends on configured channel)
   - CLI entry point: `python approval_gate.py request <type> <payload_json>`, `... approve <id>`, `... reject <id> <reason>`, `... pending`, `... expire`
5. Verify:
   - [ ] `skill_view(name='approval-gate')` returns content
   - [ ] `request()` creates a JSON file in approvals dir
   - [ ] `approve()` updates status to approved
   - [ ] `reject()` updates status to rejected with reason
   - [ ] `get_pending()` returns only pending requests
   - [ ] `expire_stale()` expires old requests
   - [ ] Config controls which gates are required vs optional
   - [ ] Optional gates auto-approve (return approved immediately)

---

### Skill 27: `action-audit-log`

**Function:** Record every action: timestamp, skill, SKU, platform, old_value, new_value, status, error. Queryable audit trail.

**Files:**
- Create: `skills/retail/action-audit-log/SKILL.md`
- Create: `skills/retail/action-audit-log/scripts/action_audit_log.py`

**Depends on:** None (standalone — called by all other skills)

**What it does:**
1. Provides a single `log()` method that any skill can call
2. Records to `~/.hermes/ecommerce/logs/action-audit.jsonl` (one line per action)
3. Provides queryable interface to search logs

**Log entry format:**
```json
{
  "timestamp": "2026-08-14T10:00:00Z",
  "skill": "shopee-price-sync",
  "action": "price_update",
  "sku": "PROD-001",
  "platform": "shopee",
  "old_value": {"price": 150.00},
  "new_value": {"price": 135.00},
  "status": "success",
  "error": null,
  "metadata": {
    "workflow_id": "wf-2026-08-14-001",
    "step": 10,
    "approval_id": "approval-2026-08-14-001"
  }
}
```

**Log categories (for filtering):**

| Category | Logged by |
|---|---|
| `listing_created` | listing-sync skills (9-12) |
| `listing_updated` | listing-sync skills (9-12) |
| `price_change` | price-sync skills (13-16) |
| `sync_status` | listing-sync + price-sync |
| `analysis_result` | velocity + margin analyzers (17-18) |
| `recommendation` | promo-recommender + bundle-recommender (19-20) |
| `content_generated` | content generators (21-23) |
| `banner_generated` | banner-generator (24) |
| `approval_requested` | approval-gate (26) |
| `approval_decided` | approval-gate (26) |
| `workflow_step` | workflow-orchestrator (25) |
| `error` | any skill on failure |

**Methods:**

| Method | Description |
|---|---|
| `log(category, skill, action, sku=None, platform=None, old_value=None, new_value=None, status="success", error=None, metadata=None)` | Append entry to audit log |
| `query(category=None, sku=None, platform=None, skill=None, since=None, until=None, status=None)` | Query audit log with filters |
| `get_summary(period_days=7)` | Summary: counts per category, error rate, success rate |
| `check_errors(since=None)` | Return all error entries since timestamp |
| `export(format="csv", **filters)` | Export filtered log to CSV/JSON |
| `cleanup(retention_days=90)` | Purge entries older than retention period |

**Storage:** `~/.hermes/ecommerce/logs/action-audit.jsonl` (single file, append-only)

**Build Steps:**

1. Create directories: `skills/retail/action-audit-log/`, `skills/retail/action-audit-log/scripts/`
2. Write `SKILL.md`:
   - `name: action-audit-log`
   - `description:` ≤60 chars — "Record every action. Queryable audit trail with timestamps."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, governance, audit, log, logging]`
   - `triggers: ["audit log", "action log", "operations log"]`
3. Write `scripts/action_audit_log.py`:
   - Import `json`, `os`, `datetime`, `logging`, `csv`
   - Define `ActionAuditLog` class:
     - `__init__()` — create logs dir, set log path
     - `_append(entry)` — append JSON line to `action-audit.jsonl`
     - `_read_all()` — read all lines from log file
     - `log(category, skill, action, **kwargs)` — build entry dict, append
     - `query(**filters)` — read all, filter, return matches
     - `get_summary(period_days)` — aggregate counts per category
     - `check_errors(since)` — filter for `status == "error"`
     - `export(format, **filters)` — write to CSV or JSON file
     - `cleanup(retention_days)` — rewrite file without old entries
   - CLI entry point: `python action_audit_log.py log <category> <skill> <action>`, `... query <filters>`, `... summary`, `... errors`, `... export csv`
4. Verify:
   - [ ] `skill_view(name='action-audit-log')` returns content
   - [ ] `log()` writes JSONL entry to log file
   - [ ] `query()` with filters returns matching entries
   - [ ] `get_summary()` produces correct counts
   - [ ] `check_errors()` returns only error entries
   - [ ] `export()` produces CSV file
   - [ ] `cleanup()` purges old entries

---

## Build Order & Dependencies

| Phase | # | Skill | Department | Depends On | Estimated Files |
|-------|---|-------|------------|------------|----------------|
| 1 | 4 | `tiktok-shop-connector` | E-commerce | — | 2 |
| 1 | 5 | `website-connector` | E-commerce | — | 4 |
| 1 | 6 | `sitegiant-connector` | E-commerce | — | 2 |
| 2 | 7 | `autocount-product-sync` | E-commerce | `autocount-connector` (existing) | 2 |
| 2 | 8 | `sitegiant-product-sync` | E-commerce | `sitegiant-connector` (Skill 6) | 2 |
| 3 | 9 | `shopee-listing-sync` | E-commerce | `shopee-connector` (existing), Skills 7-8 | 2 + config |
| 3 | 10 | `lazada-listing-sync` | E-commerce | `lazada-connector` (existing), Skills 7-8 | 2 + config |
| 3 | 11 | `tiktok-listing-sync` | E-commerce | `tiktok-shop-connector` (Skill 4), Skills 7-8 | 2 + config |
| 3 | 12 | `website-listing-sync` | E-commerce | `website-connector` (Skill 5), Skills 7-8 | 2 + config |
| 4 | 13 | `shopee-price-sync` | E-commerce | `shopee-connector` (existing) | 2 |
| 4 | 14 | `lazada-price-sync` | E-commerce | `lazada-connector` (existing) | 2 |
| 4 | 15 | `tiktok-price-sync` | E-commerce | `tiktok-shop-connector` (Skill 4) | 2 |
| 4 | 16 | `website-price-sync` | E-commerce | `website-connector` (Skill 5) | 2 |
| 5 | 17 | `product-velocity-analyzer` | Merchandising | Skills 7-8 (master store) | 2 + config |
| 5 | 18 | `product-margin-analyzer` | Merchandising | Skills 7-8 (master store) | 2 + config |
| 6 | 19 | `promo-recommender` | Marketing | Skills 17, 18 | 2 |
| 6 | 20 | `cross-sell-bundle-recommender` | Marketing | Skills 7-8 (master store) | 2 |
| 7 | 21 | `video-content-generator` | Marketing | Skills 7-8 (master store) | 3 |
| 7 | 22 | `social-content-generator` | Marketing | Skills 7-8 (master store) | 2 + config |
| 7 | 23 | `product-copy-generator` | Marketing | Skills 7-8 (master store) | 2 |
| 8 | 24 | `banner-generator` | Marketing | Skills 19, 23 + `comfyui` (existing) | 4 |
| 9 | 25 | `ecommerce-workflow-orchestrator` | E-commerce | All skills (cross-dept) | 2 + config |
| 9 | 26 | `approval-gate` | Compliance | — | 2 + config |
| 9 | 27 | `action-audit-log` | Compliance | — | 2 |
| 10 | 28 | `daily-sales-dashboard` | E-commerce | Skills 7-8, all connectors | 2 |
| 10 | 29 | `stock-reorder-supplier-analysis` | E-commerce | `autocount-connector` (existing), Skills 7-8 | 2 + config |
| 10 | 30 | `competitive-pricing-research` | E-commerce | `shopee-connector`, `lazada-connector`, `tiktok-shop-connector`, Skills 7-8 | 2 + config |
| 10 | 31 | `product-deep-dive-verifier` | Merchandising | `autocount-connector` (existing), Skills 7-8, all connectors | 2 + config |

**Total: 28 new skills (+ 3 existing = 31 total), ~62 files, 10 phases, 4 departments.**

---

## PHASE 10 — Retail Operations (4 new skills)

> These are daily operational skills that the client needs but were missing from the original 27-skill plan. Each fills a specific gap in the daily retail workflow.

---

### Skill 28: `daily-sales-dashboard`

**Function:** Generate a daily 6 AM report with total sales, top 20 best sellers, channel breakdown, GP%, and day-over-day comparison.

**Files:**
- Create: `skills/retail/daily-sales-dashboard/SKILL.md`
- Create: `skills/retail/daily-sales-dashboard/scripts/daily_sales_dashboard.py`

**Depends on:** Shogun master store (`sales-invoices.jsonl`, `products.jsonl`), all platform connectors (read orders)

**What it does:**
1. Pulls yesterday's sales from all platforms: Shopee, Lazada, TikTok Shop, Website
2. Merges by SKU into unified daily sales dataset
3. Calculates:
   - Total sales (units + revenue) per platform
   - Channel breakdown (% contribution per platform)
   - Top 20 best sellers by units and revenue
   - GP% (Gross Profit %) = `(revenue - cost) / revenue * 100`
   - Day-over-day comparison (vs same weekday last week + vs yesterday)
4. Formats as a morning dashboard report
5. Delivers via Slack/Telegram at 6 AM (cron-schedulable)
6. Saves to `~/.hermes/ecommerce/reports/daily-sales-<YYYY-MM-DD>.json`

**Report format:**
```json
{
  "date": "2026-08-14",
  "generated_at": "2026-08-14T06:00:00Z",
  "summary": {
    "total_revenue": 15420.00,
    "total_units": 127,
    "total_orders": 45,
    "gp_pct": 42.3,
    "dod_revenue_change_pct": 12.5,
    "dod_units_change_pct": 8.2,
    "vs_same_weekday_last_week_pct": 15.0
  },
  "channel_breakdown": {
    "shopee": {"revenue": 7200.00, "units": 58, "orders": 22, "pct": 46.7},
    "lazada": {"revenue": 3800.00, "units": 31, "orders": 12, "pct": 24.6},
    "tiktok": {"revenue": 2100.00, "units": 19, "orders": 7, "pct": 13.6},
    "website": {"revenue": 2320.00, "units": 19, "orders": 4, "pct": 15.0}
  },
  "top_20_best_sellers": [
    {
      "rank": 1,
      "sku": "PROD-001",
      "product_name": "Widget A",
      "units_sold": 24,
      "revenue": 2160.00,
      "gp_pct": 60.0,
      "platforms": ["shopee", "tiktok"]
    }
  ],
  "comparison": {
    "yesterday": {"revenue": 13706.00, "units": 117},
    "same_weekday_last_week": {"revenue": 13408.00, "units": 115}
  }
}
```

**Methods:**

| Method | Description |
|---|---|
| `generate(date=None)` | Generate dashboard for a specific date (default: yesterday) |
| `get_top_sellers(date, count=20)` | Top N best sellers by units |
| `get_channel_breakdown(date)` | Sales breakdown by platform |
| `get_dod_comparison(date)` | Day-over-day + same weekday comparison |
| `deliver(date, channel="slack")` | Send formatted report to Slack/Telegram |

**CLI:**
```bash
python daily_sales_dashboard.py generate [date]
python daily_sales_dashboard.py top-sellers [date] [count]
python daily_sales_dashboard.py channels [date]
python daily_sales_dashboard.py compare [date]
python daily_sales_dashboard.py deliver [date] slack
```

**Cron-schedulable:** `cronjob(action='create', schedule='0 6 * * *', prompt='Run daily-sales-dashboard deliver yesterday slack')`

**Build Steps:**

1. Create directories: `skills/retail/daily-sales-dashboard/`, `skills/retail/daily-sales-dashboard/scripts/`
2. Write `SKILL.md`:
   - `name: daily-sales-dashboard`
   - `description:` ≤60 chars — "Generate 6am daily sales report with top sellers, channels, GP%, DoD."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, report, dashboard, sales, daily]`
   - `triggers: ["daily sales", "morning report", "sales dashboard", "best sellers"]`
3. Write `scripts/daily_sales_dashboard.py`:
   - Import master store reader (`sales-invoices.jsonl`, `products.jsonl`)
   - Import all platform connectors (read yesterday's orders)
   - Define `DailySalesDashboard` class:
     - `__init__()` — load master store
     - `_pull_yesterday_sales(date)` — call all connectors `read_orders(since=date)`
     - `_merge_by_sku(orders)` — normalize and merge across platforms
     - `_calculate_gp(units, revenue, cost)` — gross profit %
     - `_compute_dod(date)` — compare vs previous day + same weekday last week
     - `generate(date)` — full dashboard
     - `get_top_sellers(date, count)` — ranked list
     - `get_channel_breakdown(date)` — per-platform breakdown
     - `get_dod_comparison(date)` — day-over-day metrics
     - `deliver(date, channel)` — format as Slack message + send
   - Save report to `~/.hermes/ecommerce/reports/daily-sales-<date>.json`
   - CLI entry point
4. Verify:
   - [ ] `skill_view(name='daily-sales-dashboard')` returns content
   - [ ] `generate()` with mock data produces correct totals
   - [ ] Top 20 ranked by units descending
   - [ ] Channel breakdown percentages sum to 100%
   - [ ] GP% calculated as (revenue - cost) / revenue
   - [ ] Day-over-day comparison shows both yesterday and same-weekday-last-week
   - [ ] `deliver()` produces a Slack-formatted message
   - [ ] Cron-triggered run at 6 AM delivers the report

---

### Skill 29: `stock-reorder-supplier-analysis`

**Function:** Check stock levels against reorder thresholds AND analyze supplier bulk deals (8+1 free, 10+2 free) to calculate whether bulk purchase saves money vs stockout cost.

**Files:**
- Create: `skills/retail/stock-reorder-supplier-analysis/SKILL.md`
- Create: `skills/retail/stock-reorder-supplier-analysis/scripts/stock_reorder_analysis.py`

**Depends on:** `autocount-connector` (existing — `read_stock_balance()`, `read_purchase_orders()`), Shogun master store (`products.jsonl` for cost prices), existing `reorder-alert-watchdog` (for reorder thresholds)

**What it does:**
1. Read current stock levels from AutoCount
2. Read reorder thresholds from `~/.hermes/ecommerce/master/products.jsonl` (or procurement gbrain)
3. Identify items at or below reorder threshold
4. For each item needing reorder:
   - Look up preferred supplier and current supplier deals
   - Parse deal structures:
     - **8+1 free:** buy 8 units, get 1 free → effective cost = `cost * 8 / 9`
     - **10+2 free:** buy 10 units, get 2 free → effective cost = `cost * 10 / 12`
     - **Flat discount %:** e.g. 5% off for orders > 100 units
     - **Tiered pricing:** e.g. < 50 units = RM 5.00, ≥ 50 units = RM 4.50
   - Calculate effective unit cost after deal
   - Calculate days of cover at current velocity: `stock / avg_daily_velocity`
   - Calculate stockout risk: if `days_of_cover < supplier_lead_time`, high risk
   - Calculate stockout cost: `estimated_lost_sales * margin_per_unit`
   - Compare: bulk deal cost vs stockout cost
   - Recommendation: "Buy bulk (8+1) — saves RM X vs stockout risk of RM Y"
5. Output ranked list by urgency (stockout risk × capital tied up)

**Deal analysis output:**
```json
{
  "generated_at": "2026-08-14T06:00:00Z",
  "items_needing_reorder": 15,
  "items": [
    {
      "sku": "PROD-001",
      "product_name": "Widget A",
      "current_stock": 24,
      "reorder_threshold": 50,
      "avg_daily_velocity": 8.0,
      "days_of_cover": 3.0,
      "supplier_lead_time_days": 7,
      "stockout_risk": "HIGH — 3 days cover < 7 days lead time",
      "preferred_supplier": "Supplier X",
      "supplier_deals": [
        {
          "deal_type": "8+1_free",
          "description": "Buy 8, get 1 free",
          "min_qty": 8,
          "original_unit_cost": 60.00,
          "effective_unit_cost": 53.33,
          "savings_per_unit": 6.67,
          "savings_pct": 11.1,
          "bulk_qty": 9,
          "total_cost": 480.00,
          "days_cover_after": 9 / 8.0 + 3 = 4.1
        },
        {
          "deal_type": "10+2_free",
          "description": "Buy 10, get 2 free",
          "min_qty": 10,
          "original_unit_cost": 60.00,
          "effective_unit_cost": 50.00,
          "savings_per_unit": 10.00,
          "savings_pct": 16.7,
          "bulk_qty": 12,
          "total_cost": 600.00,
          "days_cover_after": 12 / 8.0 + 3 = 4.5
        }
      ],
      "stockout_cost_estimate": 5 * 90.00 * 0.6 = 270.00,
      "recommendation": "Buy 10+2 free deal — saves RM 120 vs stockout cost of RM 270. Effective cost RM 50/unit (16.7% savings). Days cover after: 4.5.",
      "urgency_score": 9
    }
  ]
}
```

**Deal types supported:**

| Deal Type | Format | Calculation |
|-----------|--------|-------------|
| `X+Y_free` | "8+1 free", "10+2 free" | `effective_cost = original_cost * X / (X + Y)` |
| `flat_discount_pct` | "5% off for >100 units" | `effective_cost = original_cost * (1 - discount_pct)` |
| `tiered_pricing` | "<50 = RM 5, ≥50 = RM 4.50" | `effective_cost = tier_cost_for_qty` |
| `flat_discount_amount` | "RM 0.50 off per unit for >200" | `effective_cost = original_cost - discount_amount` |

**Methods:**

| Method | Description |
|---|---|
| `analyze()` | Full reorder + supplier deal analysis |
| `get_items_below_reorder()` | Items at/below reorder threshold |
| `analyze_deal(sku, deal_type, deal_params)` | Calculate effective cost for one deal |
| `compare_deals(sku)` | Compare all available deals for a SKU |
| `get_stockout_risk(sku)` | Days of cover vs supplier lead time |
| `get_recommendation(sku)` | Best deal + stockout comparison |
| `get_ranked_by_urgency()` | All items ranked by stockout risk × capital |

**CLI:**
```bash
python stock_reorder_analysis.py analyze
python stock_reorder_analysis.py below-reorder
python stock_reorder_analysis.py deal <sku> <deal_type> <deal_params>
python stock_reorder_analysis.py compare-deals <sku>
python stock_reorder_analysis.py stockout-risk <sku>
python stock_reorder_analysis.py recommend <sku>
python stock_reorder_analysis.py ranked
```

**Build Steps:**

1. Create directories: `skills/retail/stock-reorder-supplier-analysis/`, `skills/retail/stock-reorder-supplier-analysis/scripts/`
2. Write `SKILL.md`:
   - `name: stock-reorder-supplier-analysis`
   - `description:` ≤60 chars — "Reorder alerts + supplier bulk deal analysis (8+1, 10+2, tiered)."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, procurement, reorder, supplier, deal]`
   - `triggers: ["reorder analysis", "supplier deal", "bulk discount", "stockout risk"]`
3. Write `config/supplier-deals.yaml` — deal configurations:
   ```yaml
   suppliers:
     SupplierX:
       deals:
         - sku_pattern: "*"
           deal_type: "8+1_free"
           min_qty: 8
           description: "Buy 8, get 1 free"
         - sku_pattern: "PROD-*"
           deal_type: "10+2_free"
           min_qty: 10
           description: "Buy 10, get 2 free"
     SupplierY:
       deals:
         - sku_pattern: "*"
           deal_type: "flat_discount_pct"
           discount_pct: 5.0
           min_qty: 100
           description: "5% off for orders > 100 units"
   ```
4. Write `scripts/stock_reorder_analysis.py`:
   - Import `AutoCountAdapter` from `autocount_connector`
   - Import master store reader (cost prices, velocity data)
   - Define `StockReorderAnalysis` class:
     - `__init__()` — load AutoCount adapter, master store, supplier deals config
     - `_load_deal_config()` — read `supplier-deals.yaml`
     - `_parse_deal(deal_type, deal_params, original_cost, qty)` — compute effective unit cost
     - `_calculate_effective_cost(deal_type, original_cost, X, Y=None, discount_pct=None)` — core math
     - `get_items_below_reorder()` — read stock + thresholds, filter
     - `analyze_deal(sku, deal_type, deal_params)` — one deal calculation
     - `compare_deals(sku)` — all deals for a SKU, rank by savings
     - `get_stockout_risk(sku)` — days_of_cover vs lead_time
     - `get_recommendation(sku)` — best deal + stockout cost comparison
     - `get_ranked_by_urgency()` — sort all items by risk × capital
     - `analyze()` — full report
   - CLI entry point
5. Verify:
   - [ ] `skill_view(name='stock-reorder-supplier-analysis')` returns content
   - [ ] 8+1 free deal: effective cost = original * 8/9
   - [ ] 10+2 free deal: effective cost = original * 10/12
   - [ ] Flat 5% discount: effective cost = original * 0.95
   - [ ] Stockout risk HIGH when days_cover < lead_time
   - [ ] Recommendation compares bulk savings vs stockout cost
   - [ ] Urgency ranking sorts by risk × capital descending
   - [ ] Deal config is editable via YAML without code changes

---

### Skill 30: `competitive-pricing-research`

**Function:** Check live Shopee/Lazada/TikTok prices vs your selling price (CSP), calculate net effective cost after promo free units, and compare side-by-side margins vs named competitors.

**Files:**
- Create: `skills/retail/competitive-pricing-research/SKILL.md`
- Create: `skills/retail/competitive-pricing-research/scripts/competitive_pricing.py`

**Depends on:** `shopee-connector`, `lazada-connector`, `tiktok-shop-connector` (read competitor product prices), Shogun master store (your selling prices and cost prices)

**What it does:**
1. For each SKU in your catalog:
   - Search Shopee, Lazada, TikTok Shop for the same product (by barcode, product name, or keyword)
   - Pull competitor listings: price, promo (free units, discounts), shipping fee, rating
   - Calculate competitor **net effective cost**:
     - If competitor offers "buy 2 free 1" → effective = `price * 2 / 3`
     - If competitor offers 10% off → effective = `price * 0.9`
     - Add shipping fee to get true landed cost for customer
   - Compare against your CSP (current selling price)
   - Calculate your margin vs competitor margin:
     - Your margin: `(your_price - your_cost) / your_price`
     - Competitor margin: `(competitor_price - estimated_competitor_cost) / competitor_price`
     - If competitor cost unknown, estimate from category average
2. Side-by-side comparison vs named competitors (configurable: Big Pharmacy, HTM Pharmacy, etc.)
3. Flag products where you're priced out (competitor cheaper by >X%)
4. Flag products where you have pricing advantage (you're cheaper by >X%)

**Config:** `config/competitors.yaml`
```yaml
competitors:
  - name: "Big Pharmacy"
    shopee_shop_id: 123456789
    lazada_seller_id: "BIGPHARM"
    tiktok_shop_id: 9876543210
  - name: "HTM Pharmacy"
    shopee_shop_id: 987654321
    lazada_seller_id: "HTMPHARM"
    tiktok_shop_id: 1234567890
  - name: "Generic Market"
    search_mode: "keyword"  # search by product name, not specific shop
    platforms: ["shopee", "lazada", "tiktok"]

settings:
  price_gap_alert_threshold: 10  # flag if competitor is 10% cheaper
  advantage_threshold: 5          # flag if you're 5% cheaper
  include_shipping: true           # add shipping to competitor price
  est_competitor_cost_method: "category_average"  # or "manual"
```

**Output format:**
```json
{
  "generated_at": "2026-08-14T10:00:00Z",
  "total_skus_analyzed": 150,
  "priced_out_count": 23,
  "advantage_count": 45,
  "competitors": ["Big Pharmacy", "HTM Pharmacy", "Generic Market"],
  "products": [
    {
      "sku": "PROD-001",
      "product_name": "Widget A",
      "your_price": 150.00,
      "your_cost": 60.00,
      "your_margin_pct": 60.0,
      "competitor_prices": [
        {
          "competitor": "Big Pharmacy",
          "platform": "shopee",
          "listing_price": 135.00,
          "promo": "buy 2 free 1",
          "effective_price": 90.00,
          "shipping_fee": 8.00,
          "landed_cost": 98.00,
          "estimated_cost": 55.00,
          "est_margin_pct": 38.9,
          "price_gap_pct": -34.7,
          "status": "PRICED_OUT — competitor 34.7% cheaper after promo"
        },
        {
          "competitor": "HTM Pharmacy",
          "platform": "lazada",
          "listing_price": 145.00,
          "promo": null,
          "effective_price": 145.00,
          "shipping_fee": 0.00,
          "landed_cost": 145.00,
          "estimated_cost": 58.00,
          "est_margin_pct": 60.0,
          "price_gap_pct": -3.3,
          "status": "COMPETITIVE — within 5% of your price"
        }
      ],
      "recommendation": "Big Pharmacy is 34.7% cheaper after promo. Consider matching RM 98 or running a bundle promo."
    }
  ]
}
```

**Methods:**

| Method | Description |
|---|---|
| `analyze(sku=None)` | Full competitive pricing analysis (all SKUs or single) |
| `search_competitor_price(sku, competitor, platform)` | Search one competitor on one platform |
| `calculate_effective_price(listing_price, promo)` | Net cost after promo free units/discounts |
| `compare_margins(your_price, your_cost, competitor_price, est_cost)` | Side-by-side margin comparison |
| `get_priced_out()` | SKUs where competitor is >threshold% cheaper |
| `get_advantage()` | SKUs where you're >threshold% cheaper |
| `get_competitor_summary()` | Summary per competitor: avg price gap, # products |

**CLI:**
```bash
python competitive_pricing.py analyze [sku]
python competitive_pricing.py search <sku> <competitor> <platform>
python competitive_pricing.py priced-out
python competitive_pricing.py advantage
python competitive_pricing.py competitor-summary
```

**Build Steps:**

1. Create directories: `skills/retail/competitive-pricing-research/`, `skills/retail/competitive-pricing-research/scripts/`
2. Write `SKILL.md`:
   - `name: competitive-pricing-research`
   - `description:` ≤60 chars — "Compare live competitor prices vs your CSP. Flag price gaps."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, pricing, competitor, research, margin]`
   - `triggers: ["competitor pricing", "price comparison", "marketplace research"]`
3. Write `config/competitors.yaml` — competitor shop IDs + settings
4. Write `scripts/competitive_pricing.py`:
   - Import `ShopeeAdapter`, `LazadaAdapter`, `TikTokShopAdapter`
   - Import master store reader (your prices + costs)
   - Define `CompetitivePricingResearch` class:
     - `__init__()` — init all platform adapters, load competitor config, load master
     - `_search_platform(sku, platform, competitor_shop_id)` — search for product on platform
     - `_parse_promo(listing)` — extract promo info (free units, discount %)
     - `calculate_effective_price(listing_price, promo)` — net cost after promo
     - `_estimate_competitor_cost(sku, method)` — estimate competitor cost (category avg or manual)
     - `compare_margins(your_price, your_cost, competitor_price, est_cost)` — margin comparison
     - `search_competitor_price(sku, competitor, platform)` — one search
     - `analyze(sku)` — full analysis (all competitors, all platforms)
     - `get_priced_out()` — filter for competitor cheaper by >threshold
     - `get_advantage()` — filter for you cheaper by >threshold
     - `get_competitor_summary()` — aggregate per competitor
   - CLI entry point
5. Verify:
   - [ ] `skill_view(name='competitive-pricing-research')` returns content
   - [ ] "buy 2 free 1" promo → effective price = listing * 2/3
   - [ ] 10% off promo → effective price = listing * 0.9
   - [ ] Shipping fee added to competitor price
   - [ ] Priced-out flag when competitor >threshold% cheaper
   - [ ] Advantage flag when you're >threshold% cheaper
   - [ ] Competitor config is editable via YAML

---

### Skill 31: `product-deep-dive-verifier`

**Function:** Deep-dive verification for a single product: UOM conversion (SET vs BOX vs CAP), IV (online) vs OS (counter) sales split, and expiry date checking against 6-month clearance rule.

**Files:**
- Create: `skills/retail/product-deep-dive-verifier/SKILL.md`
- Create: `skills/retail/product-deep-dive-verifier/scripts/product_deep_dive.py`

**Depends on:** Shogun master store (`products.jsonl`, `sales-invoices.jsonl`), `autocount-connector` (stock balance, UOM data)

**What it does:**
1. For a given SKU, pull all related data:
   - Stock levels across all UOMs (SET, BOX, CAP, etc.)
   - Sales history split by channel: IV (online — Shopee/Lazada/TikTok/Website) vs OS (offline — counter/store)
   - Product metadata: batch numbers, expiry dates, registration numbers
2. UOM conversion verification:
   - Check that UOM conversions are consistent (1 SET = 12 BOX = 144 CAP, etc.)
   - Flag mismatches between AutoCount UOM and platform listing UOM
   - Verify stock reconciliation across UOM levels (should not have negative stock at any level)
3. IV vs OS split:
   - Calculate sales units and revenue split: online (IV) vs offline (OS)
   - Show trend: is this product shifting from offline to online?
   - Flag if online sales > 80% of total (dependency risk) or < 20% (underutilized online)
4. Expiry date checking:
   - Read batch/expiry data from AutoCount (or master store if available)
   - For each batch:
     - Calculate days to expiry
     - Flag if expiry < 6 months (must clear before — 6-month clearance rule)
     - Flag if expiry < 3 months (URGENT — must clearance now)
     - Flag if expiry < 1 month (CRITICAL — write-off risk)
   - Calculate clearance price needed: must sell before expiry, discount progressively
5. Output full deep-dive report

**Output format:**
```json
{
  "sku": "PROD-001",
  "product_name": "Widget A",
  "generated_at": "2026-08-14T10:00:00Z",
  "uom_verification": {
    "uoms": [
      {"uom": "SET", "quantity": 1, "stock": 10},
      {"uom": "BOX", "quantity": 12, "stock": 120},
      {"uom": "CAP", "quantity": 144, "stock": 1440}
    ],
    "conversion_consistent": true,
    "platform_uom_mismatches": [
      {"platform": "shopee", "listing_uom": "BOX", "autocount_uom": "SET", "issue": "Shopee listing uses BOX but AutoCount primary is SET"}
    ],
    "stock_reconciliation": {
      "total_in_base_uom": 1440,
      "consistent": true
    }
  },
  "iv_os_split": {
    "online": {"units": 85, "revenue": 12750.00, "pct": 68.0},
    "offline": {"units": 40, "revenue": 6000.00, "pct": 32.0},
    "trend": "shift_to_online — online share up from 55% to 68% over 3 months",
    "alerts": []
  },
  "expiry_check": {
    "batches": [
      {
        "batch_no": "BATCH-2025-06",
        "expiry_date": "2027-06-01",
        "days_to_expiry": 660,
        "stock": 500,
        "status": "SAFE"
      },
      {
        "batch_no": "BATCH-2025-01",
        "expiry_date": "2026-12-01",
        "days_to_expiry": 109,
        "stock": 200,
        "status": "CLEARANCE_RECOMMENDED — < 6 months to expiry",
        "suggested_clearance_price": 120.00,
        "discount_pct": 20.0
      },
      {
        "batch_no": "BATCH-2024-11",
        "expiry_date": "2026-09-01",
        "days_to_expiry": 18,
        "stock": 50,
        "status": "CRITICAL — < 1 month to expiry, write-off risk",
        "suggested_clearance_price": 45.00,
        "discount_pct": 70.0
      }
    ],
    "total_at_risk_value": 24000.00,
    "action_required": "2 batches need clearance pricing — total RM 24,000 at risk"
  },
  "summary": {
    "uom_ok": true,
    "online_pct": 68.0,
    "expiry_alerts": 2,
    "critical_alerts": 1
  }
}
```

**Methods:**

| Method | Description |
|---|---|
| `deep_dive(sku)` | Full deep-dive report (UOM + IV/OS + expiry) |
| `verify_uom(sku)` | UOM conversion + stock reconciliation only |
| `get_iv_os_split(sku, period_days=90)` | Online vs offline sales split |
| `check_expiry(sku)` | Batch expiry analysis with clearance recommendations |
| `get_uom_mismatches(sku)` | Platform listing UOM vs AutoCount UOM mismatches |

**CLI:**
```bash
python product_deep_dive.py deep-dive <sku>
python product_deep_dive.py uom <sku>
python product_deep_dive.py iv-os <sku> [period_days]
python product_deep_dive.py expiry <sku>
python product_deep_dive.py mismatches <sku>
```

**Build Steps:**

1. Create directories: `skills/retail/product-deep-dive-verifier/`, `skills/retail/product-deep-dive-verifier/scripts/`
2. Write `SKILL.md`:
   - `name: product-deep-dive-verifier`
   - `description:` ≤60 chars — "Deep-dive: UOM verification, IV vs OS split, expiry clearance check."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, analysis, uom, expiry, verification]`
   - `triggers: ["product deep dive", "uom verification", "expiry check", "iv os split"]`
3. Write `config/expiry-rules.yaml`:
   ```yaml
   clearance_threshold_months: 6    # recommend clearance if < 6 months to expiry
   urgent_threshold_months: 3        # urgent clearance if < 3 months
   critical_threshold_days: 30       # critical write-off risk if < 30 days
   clearance_discount_schedule:
     - months_to_expiry: 6
       discount_pct: 20
     - months_to_expiry: 3
       discount_pct: 40
     - months_to_expiry: 1
       discount_pct: 70
   ```
4. Write `scripts/product_deep_dive.py`:
   - Import `AutoCountAdapter` from `autocount_connector`
   - Import master store reader
   - Import platform connectors (for IV sales + platform UOM check)
   - Define `ProductDeepDiveVerifier` class:
     - `__init__()` — load AutoCount, master store, config
     - `_load_uom_data(sku)` — read all UOM levels from AutoCount
     - `_verify_uom_conversion(uoms)` — check conversion math consistency
     - `_check_platform_uom(sku)` — compare AutoCount UOM vs platform listing UOM
     - `_reconcile_stock(uoms)` — verify stock is consistent across UOM levels
     - `_get_online_sales(sku, period)` — IV sales from all platform connectors
     - `_get_offline_sales(sku, period)` — OS sales from AutoCount invoices
     - `_compute_split(online, offline)` — IV vs OS % split + trend
     - `_load_expiry_data(sku)` — batch numbers + expiry dates from AutoCount
     - `_classify_batch(days_to_expiry, config)` — SAFE / CLEARANCE / URGENT / CRITICAL
     - `_suggest_clearance_price(cost, days_to_expiry, config)` — progressive discount
     - `deep_dive(sku)` — full report
     - `verify_uom(sku)` — UOM only
     - `get_iv_os_split(sku, period_days)` — IV/OS only
     - `check_expiry(sku)` — expiry only
     - `get_uom_mismatches(sku)` — platform UOM mismatches only
   - CLI entry point
5. Verify:
   - [ ] `skill_view(name='product-deep-dive-verifier')` returns content
   - [ ] UOM conversion: 1 SET = 12 BOX = 144 CAP verified correctly
   - [ ] UOM mismatch between Shopee listing and AutoCount detected
   - [ ] Stock reconciliation: total in base UOM matches across levels
   - [ ] IV/OS split: online vs offline percentages sum to 100%
   - [ ] Expiry: 6-month threshold triggers CLEARANCE_RECOMMENDED
   - [ ] Expiry: 3-month threshold triggers URGENT
   - [ ] Expiry: 30-day threshold triggers CRITICAL
   - [ ] Clearance price = cost * (1 - discount_pct) per schedule
   - [ ] Config thresholds are editable via YAML

---

## Skill Conventions (All Skills Must Follow)

1. **SKILL.md frontmatter:** `name`, `description` (≤60 chars), `version`, `tags`, `triggers`
2. **Description:** One sentence, trigger-first, ends with period. Detail in body only.
3. **One function per skill** — no mixing multiple functions
4. **Zero external dependencies** for marketplace connectors (stdlib only). AutoCount uses `requests` — documented exception
5. **Category:** `retail` for all 28 new skills (skill category groups skills in the catalog; department assignment controls which profile runs them)
6. **File layout:** `skills/retail/<skill-name>/SKILL.md` + `skills/retail/<skill-name>/scripts/<script>.py`
7. **Standardized return dict:** `{"success": bool, "data": any, "error": str|None}`
8. **No secrets in skill files** — env vars only
9. **Exception hierarchy:** `XError` → `XAuthError`, `XAPIError`
10. **CLI entry point:** `if __name__ == "__main__"` with commands
11. **Master store location:** `$HERMES_HOME/ecommerce/master/` (Windows: `~/AppData/Local/hermes/ecommerce/master/`)
12. **Logs location:** `$HERMES_HOME/ecommerce/logs/`
13. **Approvals location:** `$HERMES_HOME/ecommerce/approvals/`
14. **Banners location:** `$HERMES_HOME/ecommerce/banners/pending/` and `approved/`
15. **Workflow state:** `$HERMES_HOME/ecommerce/workflow-state.json`
16. **Department installation:** Each skill installed to its assigned department profile via `python skills/shogunify/scripts/install-to-profiles.py --skill <name> --profiles <profile-slug> --force`
    > **⚠️ Windows:** Use `python` not `python3`. Retail profiles (`ecommerce-manager`, `merchandising-manager`) must be added to `SHOGUN_CORE_PROFILES` in the install script first — see Prerequisites P2.

---

## Client Requirement Coverage Matrix

| Client Requirement | Skills That Cover It |
|---|---|
| 1. Product Listing Automation (AutoCount → Shopee/Lazada/TikTok/Website) | 7, 8, 9, 10, 11, 12 |
| 2. Price Management (formulas, bulk sync, log, flag failures) | 13, 14, 15, 16, 27 |
| 3. Product Performance Analysis (dead/slow/fast/margin) | 17, 18 |
| 4. Marketing Recommendation (promo products, campaigns, bundles) | 19, 20 |
| 5. AI Content Generation (video, captions, descriptions, CTAs, hashtags) | 21, 22, 23 |
| 6. Banner Generation (brand template + product + promo) | 24 |
| 7. Workflow Automation (12-step sequence) | 25 |
| 8. Human Approval Workflow | 26 |
| 9. Logging & Monitoring | 27 |
| 10. Future Expansion (modular architecture) | All skills are atomic — new ones can be added without modifying existing |

---

## Future Expansion (Architecture Notes Only — Not in Scope)

| Future Capability | Approach |
|---|---|
| Purchase reorder proposals | New skill: `reorder-proposal-generator` |
| Inventory optimisation | New skill: `inventory-optimiser` |
| Dead stock clearance planning | New skill: `clearance-plan-generator` |
| Affiliate campaign generation | New skill: `affiliate-campaign-generator` |
| Customer service automation | New skill: `customer-service-bot` |
| Supplier communication | New skill: `supplier-comms` |
| Sales reporting | New skill: `sales-report-generator` |
| Dashboard and KPI monitoring | Extend Shogun web portal |
| Automatic campaign scheduling | New skill: `campaign-scheduler` |
