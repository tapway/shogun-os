# Shogun OS — Department & Skills Architecture Plan

## 1. Industry → Department → Skills Model

### The 3-Layer Model

```
Layer 1: Industry (what business are you in?)
  └─ Layer 2: Department (which functions do you need?)
       └─ Layer 3: Skills (auto-bundled per department)
```

### Layer 1 — Industry

Industry determines **which departments are on the menu**. Shogun OS already has 3 industry verticals in `PROFILE_CATALOG.md`:

| Industry               | Departments available                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| **General / Services** | Shared 8 + Projects + Product                                                                 |
| **Manufacturing**      | Shared 8 + Production, Quality, Maintenance, Warehouse, HSE                                   |
| **Retail**             | Shared 8 + Stores, Merchandising, E-commerce, CRM/Loyalty, Supply Chain, Visual Merchandising |

### Layer 2 — Department

Not every company needs every department in their industry. User picks from the menu.

**Example — Retail client who is pure e-commerce (no physical stores):**

- ✅ E-commerce (Denshi) — sells on Shopee/Lazada/TikTok/Website
- ✅ Merchandising (Shohin) — needs product analysis
- ✅ Marketing (Haiku) — needs campaigns/content
- ✅ Compliance (Kata) — needs approval gates
- ❌ Stores (Tenpo) — no physical stores
- ❌ Visual Merchandising (Hyoji) — no shelves to manage
- ❌ Supply Chain (Ryutsu) — dropship only, no warehouse

### Layer 3 — Skills (auto-bundled per department)

Each department comes with its skill bundle. Users don't pick skills individually — they pick departments and skills come with. But some skills cross departments (e.g. the e-commerce orchestrator needs skills from Merchandising, Marketing, and Compliance). These cross-department dependencies are resolved during onboarding (see Section 4).

### The 4 Skill Tiers

| Tier                      | Description                                         | Example                                                            | Selection                                   |
| ------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------- |
| **Shared**                | Every company gets these regardless of industry     | `department-scrum`, `brain-compliance`, `slack-formatting`         | Automatic                                   |
| **Industry-bound**        | Belong to a specific industry's department          | `production-oee` (manufacturing), `store-sales-dashboard` (retail) | Automatic when department selected          |
| **Cross-industry add-on** | Available to ANY industry as an optional department | E-commerce department + its 17 skills                              | Optional department selection               |
| **Standalone**            | Independent skills any department can use           | `approval-gate`, `action-audit-log`                                | Installed to the department that needs them |

---

## 2. Department Profiles

These are the 4 departments involved in the e-commerce workflow, mapped to existing Shogun OS profiles from `PROFILE_CATALOG.md`:

| Department    | Persona                   | Profile Slug            | gbrain Source    | Nature                                                |
| ------------- | ------------------------- | ----------------------- | ---------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| E-commerce    | Denshi (電子 — "Digital") | `ecommerce-manager`     | `ecommerce/`     | 9111+                                                 | Online store, marketplace ops, listings, orders, platform sync |
| Merchandising | Shohin (商品 — "Goods")   | `merchandising-manager` | `merchandising/` | Buying, assortment, pricing, product performance      |
| Marketing     | Haiku (俳句)              | `marketing-manager`     | `marketing/`     | Brand, campaigns, content creation, creative assets   |
| Compliance    | Kata (型 — "Form")        | `compliance-manager`    | `compliance/`    | Standards, audits, policy, governance, approval gates |

> Marketing and Compliance are **shared departments** (every company has them), but the e-commerce-specific skills within them are **add-ons** that only get installed when the E-commerce department is selected.

### Skill → Department Mapping (31 skills across 4 departments)

#### E-commerce — Denshi (21 skills)

> Platform connectors, data ingestion, listing sync, price sync, the workflow orchestrator, and daily retail operations (sales dashboard, reorder analysis, competitive pricing).

| #   | Skill                             | Status | Why E-commerce                                                      |
| --- | --------------------------------- | ------ | ------------------------------------------------------------------- |
| 1   | `shopee-connector`                | ✅     | Marketplace platform connector                                      |
| 2   | `lazada-connector`                | ✅     | Marketplace platform connector                                      |
| 3   | `autocount-connector`             | ✅     | Product/inventory data source connector                             |
| 4   | `tiktok-shop-connector`           | 🔴     | Marketplace platform connector                                      |
| 5   | `website-connector`               | 🔴     | Website store connector (WooCommerce/Shopify)                       |
| 6   | `sitegiant-connector`             | 🔴     | ERP/webstore connector                                              |
| 7   | `autocount-product-sync`          | 🔴     | Pulls product data into Shogun master                               |
| 8   | `sitegiant-product-sync`          | 🔴     | Pulls product data into Shogun master                               |
| 9   | `shopee-listing-sync`             | 🔴     | Pushes listings to Shopee                                           |
| 10  | `lazada-listing-sync`             | 🔴     | Pushes listings to Lazada                                           |
| 11  | `tiktok-listing-sync`             | 🔴     | Pushes listings to TikTok Shop                                      |
| 12  | `website-listing-sync`            | 🔴     | Pushes listings to website                                          |
| 13  | `shopee-price-sync`               | 🔴     | Pushes prices to Shopee                                             |
| 14  | `lazada-price-sync`               | 🔴     | Pushes prices to Lazada                                             |
| 15  | `tiktok-price-sync`               | 🔴     | Pushes prices to TikTok Shop                                        |
| 16  | `website-price-sync`              | 🔴     | Pushes prices to website                                            |
| 25  | `ecommerce-workflow-orchestrator` | 🔴     | Conducts the e-commerce pipeline                                    |
| 28  | `daily-sales-dashboard`           | 🔴     | Daily 6am sales report: top sellers, channels, GP%, DoD             |
| 29  | `stock-reorder-supplier-analysis` | 🔴     | Reorder alerts + supplier bulk deal analysis (8+1, 10+2 free)       |
| 30  | `competitive-pricing-research`    | 🔴     | Competitor price comparison vs CSP, net effective cost after promos |

#### Merchandising — Shohin (3 skills)

> Product analysis by velocity, margin, and deep-dive verification. Informs buying, assortment, pricing, and clearance decisions.

| #   | Skill                        | Status | Why Merchandising                                        |
| --- | ---------------------------- | ------ | -------------------------------------------------------- |
| 17  | `product-velocity-analyzer`  | 🔴     | Sales velocity informs buying/clearance decisions        |
| 18  | `product-margin-analyzer`    | 🔴     | Margin analysis informs pricing decisions                |
| 31  | `product-deep-dive-verifier` | 🔴     | UOM verification, IV vs OS split, expiry clearance check |

#### Marketing — Haiku (6 skills)

> Promo recommendations, content generation, and banner creation. These are e-commerce add-on skills installed only when E-commerce department is selected.

| #   | Skill                           | Status | Why Marketing                                            |
| --- | ------------------------------- | ------ | -------------------------------------------------------- |
| 19  | `promo-recommender`             | 🔴     | Campaign theme, promo angle, promo price recommendations |
| 20  | `cross-sell-bundle-recommender` | 🔴     | Cross-sell and bundle marketing strategy                 |
| 21  | `video-content-generator`       | 🔴     | Video concept and script creation                        |
| 22  | `social-content-generator`      | 🔴     | Captions, hashtags, keywords, CTAs                       |
| 23  | `product-copy-generator`        | 🔴     | Product descriptions, promo headlines, banner copy       |
| 24  | `banner-generator`              | 🔴     | Promotional banner image creation                        |

#### Compliance — Kata (2 skills)

> Approval gates and audit logging. These are e-commerce add-on skills installed only when E-commerce department is selected.

| #   | Skill              | Status | Why Compliance                                        |
| --- | ------------------ | ------ | ----------------------------------------------------- |
| 26  | `approval-gate`    | 🔴     | Holds actions for human approval — governance control |
| 27  | `action-audit-log` | 🔴     | Records every action — queryable audit trail          |

---

## 3. Complete Skill Inventory — 27 Skills

### 🔌 CONNECTORS (6) — One per external system → E-commerce

| #   | Skill                   | Status    | Department | Single Function                      |
| --- | ----------------------- | --------- | ---------- | ------------------------------------ |
| 1   | `shopee-connector`      | ✅ Exists | E-commerce | Talk to Shopee Open Platform API     |
| 2   | `lazada-connector`      | ✅ Exists | E-commerce | Talk to Lazada Seller Center API     |
| 3   | `autocount-connector`   | ✅ Exists | E-commerce | Talk to AutoCount AOTG API           |
| 4   | `tiktok-shop-connector` | 🔴 Build  | E-commerce | Talk to TikTok Shop Seller API       |
| 5   | `website-connector`     | 🔴 Build  | E-commerce | Talk to WooCommerce/Shopify REST API |
| 6   | `sitegiant-connector`   | 🔴 Build  | E-commerce | Talk to SiteGiant Open API           |

### 📥 DATA INGESTION (2) — Pull product data into Shogun master → E-commerce

| #   | Skill                    | Status   | Department | Single Function                                         |
| --- | ------------------------ | -------- | ---------- | ------------------------------------------------------- |
| 7   | `autocount-product-sync` | 🔴 Build | E-commerce | Pull all product data from AutoCount into Shogun master |
| 8   | `sitegiant-product-sync` | 🔴 Build | E-commerce | Pull all product data from SiteGiant into Shogun master |

### 📤 LISTING SYNC (4) — One per platform → E-commerce

| #   | Skill                  | Status   | Department | Single Function                                              |
| --- | ---------------------- | -------- | ---------- | ------------------------------------------------------------ |
| 9   | `shopee-listing-sync`  | 🔴 Build | E-commerce | Create & update Shopee listings from Shogun master data      |
| 10  | `lazada-listing-sync`  | 🔴 Build | E-commerce | Create & update Lazada listings from Shogun master data      |
| 11  | `tiktok-listing-sync`  | 🔴 Build | E-commerce | Create & update TikTok Shop listings from Shogun master data |
| 12  | `website-listing-sync` | 🔴 Build | E-commerce | Create & update website listings from Shogun master data     |

### 💰 PRICE SYNC (4) — One per platform → E-commerce

| #   | Skill                | Status   | Department | Single Function                   |
| --- | -------------------- | -------- | ---------- | --------------------------------- |
| 13  | `shopee-price-sync`  | 🔴 Build | E-commerce | Update prices on Shopee only      |
| 14  | `lazada-price-sync`  | 🔴 Build | E-commerce | Update prices on Lazada only      |
| 15  | `tiktok-price-sync`  | 🔴 Build | E-commerce | Update prices on TikTok Shop only |
| 16  | `website-price-sync` | 🔴 Build | E-commerce | Update prices on website only     |

### 📊 PRODUCT ANALYSIS (2) — One metric domain each → Merchandising

| #   | Skill                       | Status   | Department    | Single Function                                                            |
| --- | --------------------------- | -------- | ------------- | -------------------------------------------------------------------------- |
| 17  | `product-velocity-analyzer` | 🔴 Build | Merchandising | Classify products by sales velocity: dead, slow, fast, zero-sales          |
| 18  | `product-margin-analyzer`   | 🔴 Build | Merchandising | Classify products by margin: high-margin, low-margin, rank by contribution |

### 🎯 MARKETING (2) — One recommendation type each → Marketing

| #   | Skill                           | Status   | Department | Single Function                                                                       |
| --- | ------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------- |
| 19  | `promo-recommender`             | 🔴 Build | Marketing  | Output: which products to promote, campaign theme, promo angle, suggested promo price |
| 20  | `cross-sell-bundle-recommender` | 🔴 Build | Marketing  | Output: cross-sell pairs, bundle suggestions with rationale                           |

### ✍️ CONTENT GENERATION (3) — One output format each → Marketing

| #   | Skill                      | Status   | Department | Single Function                                                             |
| --- | -------------------------- | -------- | ---------- | --------------------------------------------------------------------------- |
| 21  | `video-content-generator`  | 🔴 Build | Marketing  | Generate video concept + full script (hook, shots, voiceover, text overlay) |
| 22  | `social-content-generator` | 🔴 Build | Marketing  | Generate platform-specific captions, hashtags, keywords, and CTAs           |
| 23  | `product-copy-generator`   | 🔴 Build | Marketing  | Generate product descriptions, promo headlines, and banner copy             |

### 🎨 CREATIVE (1) → Marketing

| #   | Skill              | Status   | Department | Single Function                               |
| --- | ------------------ | -------- | ---------- | --------------------------------------------- |
| 24  | `banner-generator` | 🔴 Build | Marketing  | Generate promotional banner image via ComfyUI |

### 🎻 ORCHESTRATION (1) → E-commerce

| #   | Skill                             | Status   | Department | Single Function                                                                                           |
| --- | --------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| 25  | `ecommerce-workflow-orchestrator` | 🔴 Build | E-commerce | Run the 10-step pipeline: pull → analyze → recommend → content → banners → prices → listings → sync → log |

### 🛡️ GOVERNANCE (2) → Compliance

| #   | Skill              | Status   | Department | Single Function                                                                           |
| --- | ------------------ | -------- | ---------- | ----------------------------------------------------------------------------------------- |
| 26  | `approval-gate`    | 🔴 Build | Compliance | Hold actions pending human approval. Approve / reject / modify.                           |
| 27  | `action-audit-log` | 🔴 Build | Compliance | Record every action: timestamp, skill, SKU, platform, old_value, new_value, status, error |

### 📋 RETAIL OPERATIONS (4)

| #   | Skill                             | Status   | Department    | Single Function                                                                                                                    |
| --- | --------------------------------- | -------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 28  | `daily-sales-dashboard`           | 🔴 Build | E-commerce    | Generate 6am daily sales report: total sales, top 20 best sellers, channel breakdown, GP%, day-over-day comparison                 |
| 29  | `stock-reorder-supplier-analysis` | 🔴 Build | E-commerce    | Reorder alerts + supplier bulk deal analysis (8+1 free, 10+2 free, tiered pricing) — compares bulk savings vs stockout cost        |
| 30  | `competitive-pricing-research`    | 🔴 Build | E-commerce    | Compare live competitor prices vs your CSP, calculate net effective cost after promos, flag price gaps vs named competitors        |
| 31  | `product-deep-dive-verifier`      | 🔴 Build | Merchandising | UOM conversion verification (SET/BOX/CAP), IV (online) vs OS (counter) sales split, expiry date checking vs 6-month clearance rule |

---

## 4. Cross-Department Dependency Resolution

### The Problem

User selects **E-commerce** department. The `ecommerce-workflow-orchestrator` (Skill 25) needs skills from 3 other departments to function fully.

### The 3 Options Per Dependency Block

When a selected department's skills depend on skills from a non-selected department, the onboarding wizard shows a dependency resolution screen with 3 options per missing department:

| Option                  | What happens                                                                                    | Profile impact                                                             | When to choose                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Add full department** | Creates a new Hermes profile (e.g. `merchandising-manager`) with ALL that department's skills   | New profile, new gbrain source, new gateway port, new persona in portal UI | Client has a dedicated person/team who will use this profile independently              |
| **Borrow skills**       | Copies only the needed skills into the selected department's profile (e.g. `ecommerce-manager`) | No new profile — skills live in E-commerce profile                         | Client is a small team — one person handles everything. Doesn't need a separate persona |
| **Skip**                | Selected department runs without those skills. Orchestrator marks those steps as `skipped`      | No impact — steps are optional                                             | Client doesn't need that function (e.g. small catalog, or uses external tool)           |

### Dependency Resolution Screen

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️  DEPENDENCY DETECTED                                            │
│                                                                     │
│  The E-commerce department's workflow orchestrator needs skills     │
│  from departments you haven't selected:                              │
│                                                                     │
│  ┌─── Merchandising (Shohin) ───────────────────────────────────┐   │
│  │  📊 product-velocity-analyzer                                │   │
│  │     Classify products by sales velocity: dead, slow, fast   │   │
│  │  📊 product-margin-analyzer                                  │   │
│  │     Classify products by margin: high, low, rank by contrib  │   │
│  │                                                               │   │
│  │  ◉ Add full Merchandising department                         │   │
│  │    (includes these 2 skills + future merchandising skills)   │   │
│  │  ○ Borrow these 2 skills into E-commerce only               │   │
│  │    (skills installed to ecommerce-manager profile)           │   │
│  │  ○ Skip — orchestrator will skip analysis steps             │   │
│  │    (workflow runs without product analysis)                  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─── Compliance (Kata) ───────────────────────────────────────┐    │
│  │  🛡️ approval-gate                                           │    │
│  │     Hold actions for human approval                         │    │
│  │  🛡️ action-audit-log                                        │    │
│  │     Record every action — queryable audit trail             │    │
│  │                                                              │    │
│  │  ◉ Add full Compliance department                           │    │
│  │    (includes these 2 skills + future compliance skills)    │    │
│  │  ○ Borrow these 2 skills into E-commerce only               │    │
│  │    (skills installed to ecommerce-manager profile)          │    │
│  │  ○ Skip — orchestrator will skip approval + logging steps   │    │
│  │    (workflow runs without gates or audit trail)             │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  [ Confirm ]    [ Back to departments ]                             │
└─────────────────────────────────────────────────────────────────────┘
```

### What "Borrow" Means Technically

When a skill is "borrowed" into another department, the skill file is identical — it doesn't change.

### Borrow Caveat

Borrowed skills lose their persona context. If `product-velocity-analyzer` is borrowed into E-commerce, the E-commerce agent (Denshi persona) runs it instead of the Merchandising agent (Shohin persona). This is fine for analytical skills, but for skills with strong persona alignment (like creative writing in Marketing), borrowing might produce different results. The wizard should note this for Marketing skills.

### Smart Defaults (Pre-selection Logic)

The wizard pre-suggests smart defaults based on patterns:

| If user selects...         | Wizard pre-suggests...                       | Because...                                                                      |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| E-commerce alone           | Borrow all dependencies                      | Most solo e-commerce users want everything in one profile                       |
| E-commerce + Marketing     | Borrow Merchandising + Compliance            | Marketing person handles content, e-commerce person handles ops + analysis      |
| E-commerce + Merchandising | Add full Compliance, borrow Marketing skills | Merchandising person does analysis, but marketing skills are needed for content |
| Any 3+ retail departments  | Add full departments for all                 | Larger teams benefit from separate profiles                                     |

### Three Example Clients

**Client A — Solo entrepreneur, sells on Shopee only:**

- Industry: Retail
- Departments: E-commerce only
- Dependencies resolved: Borrow all 10 skills from Merchandising/Marketing/Compliance into E-commerce
- Result: 1 profile (`ecommerce-manager`) with 27 skills, no other profiles
- Gateway ports: 1

**Client B — Small team with marketing person:**

- Industry: Retail
- Departments: E-commerce + Marketing
- Dependencies resolved:
  - Marketing selected ✅ → 6 marketing skills install to `marketing-manager`
  - Merchandising not selected → Borrow 2 analysis skills into E-commerce
  - Compliance not selected → Borrow 2 governance skills into E-commerce
- Result: 2 profiles (`ecommerce-manager` with 19 skills, `marketing-manager` with 6 skills)

**Client C — Full retail company with dedicated teams:**

- Industry: Retail
- Departments: E-commerce + Merchandising + Marketing + Compliance + Stores + Supply Chain
- Dependencies resolved: All departments selected → all skills install to their home profiles
- Result: 8+ profiles, each with their own skills

---

## 5. Onboarding Flow

Shogun OS already has a 4-step onboarding wizard (departments → company info → provider config → launch). This plan extends it to 5 steps with dependency resolution:

### Step 1: Industry Selection

```
┌─────────────────────────────────────────────────────────────────────┐
│  ONBOARDING — Step 1: What industry is your business?               │
│                                                                     │
│  ◉ Retail (Stores, E-commerce, Merchandising, Supply Chain)        │
│  ○ Manufacturing (Production, Quality, Maintenance, Warehouse)     │
│  ○ General / Services (Projects, Product, Consulting)             │
│                                                                     │
│  [ Next → ]                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 2: Department Selection

```
┌─────────────────────────────────────────────────────────────────────┐
│  ONBOARDING — Step 2: Select Departments                            │
│                                                                     │
│  --- Shared Departments (always available) ---                     │
│  ☑ HR (Jinzai)                                                      │
│  ☑ Finance (Koku)                                                   │
│  ☑ Procurement (Kura)                                               │
│  ☐ CRM (Kizuna)                                                     │
│  ☑ Marketing (Haiku)                                                │
│  ☐ Compliance (Kata)                                                │
│  ☐ Customer Support (Boei)                                          │
│  ☐ Coding (Takumi)                                                  │
│                                                                     │
│  --- Retail Industry Departments ---                                │
│  ☐ Stores (Tenpo)                                                   │
│  ☐ Merchandising (Shohin)                                           │
│  ☐ CRM/Loyalty (Kokyaku)                                            │
│  ☐ Supply Chain (Ryutsu)                                           │
│  ☐ Visual Merchandising (Hyoji)                                     │
│                                                                     │
│  --- Cross-Industry Add-ons ---                                     │
│  ☑ E-commerce (Denshi)                                              │
│                                                                     │
│  [ Next → ]                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 3: Dependency Resolution

(See Section 4 — dependency resolution screen with add/borrow/skip per missing department)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️  DEPENDENCY DETECTED                                            │
│                                                                     │
│  The E-commerce department's workflow orchestrator needs skills     │
│  from departments you haven't selected:                              │
│                                                                     │
│  ┌─── Merchandising (Shohin) ───────────────────────────────────┐   │
│  │  📊 product-velocity-analyzer                                │   │
│  │  📊 product-margin-analyzer                                  │   │
│  │  ◉ Add full Merchandising department                         │   │
│  │  ○ Borrow these 2 skills into E-commerce only               │   │
│  │  ○ Skip — orchestrator will skip analysis steps             │   │
│  └───────────────────────────────────────────────────────────────┘   │
│  ...                                                                │
│  [ Confirm ]    [ Back to departments ]                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 4: Provider Configuration

```
┌─────────────────────────────────────────────────────────────────────┐
│  ONBOARDING — Step 4: Configure Providers                           │
│                                                                     │
│  --- Finance ---                                                    │
│  Provider: [Bukku ▼]  API Key: [___________]                       │
│                                                                     │
│  --- E-commerce ---                                                 │
│  Shopee:     Partner ID: [____]  API Key: [____]  Shop ID: [____]  │
│  Lazada:     App Key: [____]  App Secret: [____]  Seller ID: [___]  │
│  TikTok:     App Key: [____]  App Secret: [____]  Shop ID: [____]   │
│  Website:    Platform: [WooCommerce ▼]                              │
│             Store URL: [____]  Consumer Key: [____]  Secret: [___]  │
│  AutoCount: API URL: [____]  API Key: [____]  Company DB: [____]   │
│  SiteGiant:  API Token: [____]  Store ID: [____]                   │
│                                                                     │
│  [ Next → ]                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 5: Confirm & Launch

```
┌─────────────────────────────────────────────────────────────────────┐
│  ONBOARDING SUMMARY                                                 │
│                                                                     │
│  Industry: Retail                                                   │
│                                                                     │
│  Departments:                                                        │
│  ✅ HR (hr-manager)                  Port 9101                      │
│  ✅ Finance (finance-manager)        Port 9102                      │
│  ✅ Procurement (procurement-manager) Port 9103                    │
│  ✅ Marketing (marketing-manager)   Port 9105                      │
│  ✅ E-commerce (ecommerce-manager)   Port 9111                      │
│                                                                     │
│  Borrowed Skills (installed to E-commerce profile):                 │
│  📦 product-velocity-analyzer   ← borrowed from Merchandising       │
│  📦 product-margin-analyzer     ← borrowed from Merchandising       │
│  📦 approval-gate               ← borrowed from Compliance          │
│  📦 action-audit-log            ← borrowed from Compliance          │
│                                                                     │
│  Skipped Skills (orchestrator will skip):                           │
│  ⏭️  banner-generator           ← from Marketing (step 9)           │
│     Reason: "Workflow will skip banner generation"                  │
│                                                                     │
│  Skills to install: 23 of 27                                        │
│  Profiles to create: 5                                              │
│  gbrain sources: 5                                                  │
│                                                                     │
│  [ Launch → ]    [ Back ]                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Skill Specifications — Full Build Details

### PHASE 1 — Connectors (3 new skills)

#### Skill 4: `tiktok-shop-connector`

**Function:** Connect to TikTok Shop Seller Open API. Read/write products, orders, logistics.

**Files:**

- Create: `retail/tiktok-shop-connector/SKILL.md`
- Create: `retail/tiktok-shop-connector/scripts/tiktok_shop_connector.py`

**Pattern to follow:** `retail/shopee-connector/scripts/shopee_connector.py`

**Environment Variables:**

| Variable              | Description                                              | Required               |
| --------------------- | -------------------------------------------------------- | ---------------------- |
| `TIKTOK_APP_KEY`      | TikTok Shop Open Platform App Key                        | Yes                    |
| `TIKTOK_APP_SECRET`   | TikTok Shop Open Platform App Secret (used for signing)  | Yes                    |
| `TIKTOK_ACCESS_TOKEN` | OAuth access token (per shop, after authorization)       | Yes                    |
| `TIKTOK_SHOP_ID`      | Authorized TikTok Shop ID                                | Yes                    |
| `TIKTOK_API_REGION`   | API region: `my`, `sg`, `th`, `id`, `ph`, `vn`, `global` | No (default: `global`) |

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

| Method                                 | Description                                         | Returns                        |
| -------------------------------------- | --------------------------------------------------- | ------------------------------ |
| `connect()`                            | Verify connectivity (fetch shop info)               | `{"success", "data", "error"}` |
| `read_orders(status=None, since=None)` | Read orders, optionally filtered by status and date | Standardized dict              |
| `read_products()`                      | Read all products in the shop                       | Standardized dict              |
| `update_listing(product_data)`         | Update product price/stock                          | Standardized dict              |
| `read_packages()`                      | Read logistics packages for fulfillment             | Standardized dict              |
| `read_shop_info()`                     | Read shop information and settings                  | Standardized dict              |

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

1. Create directory: `retail/tiktok-shop-connector/` and `retail/tiktok-shop-connector/scripts/`
2. Write `SKILL.md` with frontmatter:
   - `name: tiktok-shop-connector`
   - `description:` ≤60 chars, trigger-first, ends with period
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, connector, tiktok, marketplace]`
   - `triggers: ["tiktok shop", "tiktok connector", "tiktok listing", "tiktok orders"]`
3. Write `scripts/tiktok_shop_connector.py`:
   - Module docstring documenting all env vars
   - Import: `os`, `json`, `time`, `hmac`, `hashlib`, `logging`, `urllib.request`, `urllib.parse`, `datetime`, `typing.Optional`
   - Define `TIKTOK_API_BASES` dict for regions
   - Define exception classes: `TikTokShopError`, `TikTokShopAuthError`, `TikTokShopAPIError`
   - Define `TikTokShopAdapter` class:
     - `__init__()` — read env vars or explicit params, validate region
     - `_sign(path, params, timestamp)` — HMAC-SHA256 per TikTok spec
     - `_request(method, path, body)` — build signed URL, send request, parse JSON, return standardized dict
     - `connect()` — call shop info endpoint
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

#### Skill 5: `website-connector`

**Function:** Connect to WooCommerce OR Shopify REST API (one at a time, selected via env var). Read/write products, orders, inventory.

**Files:**

- Create: `retail/website-connector/SKILL.md`
- Create: `retail/website-connector/scripts/website_connector.py`
- Create: `retail/website-connector/scripts/adapters/woocommerce_adapter.py`
- Create: `retail/website-connector/scripts/adapters/shopify_adapter.py`

**Pattern to follow:** `manufacturing/erp-connector` (multi-adapter framework with base class + pluggable adapters)

**Environment Variables:**

| Variable           | Description                               | Required |
| ------------------ | ----------------------------------------- | -------- |
| `WEBSITE_PLATFORM` | Which adapter: `woocommerce` or `shopify` | Yes      |

**WooCommerce adapter env vars:**

| Variable             | Description                           |
| -------------------- | ------------------------------------- |
| `WC_STORE_URL`       | Store URL (e.g. `https://myshop.com`) |
| `WC_CONSUMER_KEY`    | WooCommerce REST API consumer key     |
| `WC_CONSUMER_SECRET` | WooCommerce REST API consumer secret  |

**Shopify adapter env vars:**

| Variable               | Description                                 |
| ---------------------- | ------------------------------------------- |
| `SHOPIFY_STORE_DOMAIN` | Store domain (e.g. `mystore.myshopify.com`) |
| `SHOPIFY_ACCESS_TOKEN` | Shopify Admin API access token              |
| `SHOPIFY_API_VERSION`  | API version (e.g. `2024-01`)                |

**API Details:**

WooCommerce:

- Base URL: `https://<store-url>/wp-json/wc/v3/`
- Auth: OAuth 1.0a (consumer key/secret via HTTP Basic Auth)
- Key endpoints: `GET /products`, `GET /products/{id}`, `POST /products`, `PUT /products/{id}`, `GET /orders`, `GET /products/{id}/variations`

Shopify:

- Base URL: `https://<store-domain>/admin/api/<version>/`
- Auth: `X-Shopify-Access-Token` header
- Key endpoints: `GET /products.json`, `GET /products/{id}.json`, `PUT /products/{id}.json`, `GET /orders.json`, `GET /inventory_items.json`

**Methods (all adapters implement):**

| Method                         | Description                         |
| ------------------------------ | ----------------------------------- |
| `connect()`                    | Verify connectivity                 |
| `read_products()`              | Read all products                   |
| `read_orders(status, since)`   | Read orders filtered by status/date |
| `update_listing(product_data)` | Update product listing              |
| `update_price(sku, price)`     | Update product price                |
| `read_inventory()`             | Read inventory levels               |

**Build Steps:**

1. Create directories: `retail/website-connector/`, `retail/website-connector/scripts/`, `retail/website-connector/scripts/adapters/`
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

#### Skill 6: `sitegiant-connector`

**Function:** Connect to SiteGiant Open API. Read/write products, orders, inventory, vouchers.

**Files:**

- Create: `retail/sitegiant-connector/SKILL.md`
- Create: `retail/sitegiant-connector/scripts/sitegiant_connector.py`

**Pattern to follow:** `retail/autocount-connector` (RESTful JSON, token-based auth)

**Environment Variables:**

| Variable              | Description                         | Required |
| --------------------- | ----------------------------------- | -------- |
| `SITEGIANT_API_TOKEN` | Access token for SiteGiant Open API | Yes      |
| `SITEGIANT_STORE_ID`  | Store ID in SiteGiant               | Yes      |

**API Details (from https://sgapidocument.sitegiant.co):**

- Base URL: `https://opensgapi.sitegiant.co/api/v1`
- Auth: `Access-Token` header
- Content-Type: `application/json`
- Rate limiting: `X-RateLimit-Remaining` / `X-RateLimit-Limit` response headers — implement pause-and-resume to avoid 429

**Key Endpoints:**

| Path                   | Method | Description                  |
| ---------------------- | ------ | ---------------------------- |
| `/access-token`        | GET    | Get/verify access token      |
| `/products`            | GET    | Get Product List             |
| `/products/{id}`       | GET    | Get Product by ID            |
| `/products/{id}`       | PUT    | Update Product               |
| `/products/{id}/price` | PUT    | Update Product Price         |
| `/products/{id}/image` | POST   | Upload Product Image         |
| `/products`            | POST   | Add Product                  |
| `/products/images-url` | PUT    | Update Product Images by URL |
| `/items`               | GET    | Get Item List                |
| `/items/{id}`          | GET    | Get Item by ID               |
| `/items/{id}`          | PUT    | Update Item                  |
| `/items`               | POST   | Add Item                     |
| `/items/cost-price`    | PUT    | Update Item Cost Price       |
| `/items/{id}/image`    | POST   | Upload Item Image            |
| `/orders`              | GET    | Get Order List               |
| `/orders/{id}`         | GET    | Get Order by ID              |
| `/orders/{id}`         | PUT    | Update Order                 |
| `/orders/{id}/status`  | PUT    | Update Order Status          |
| `/orders`              | POST   | Add Order                    |
| `/stock-adjustments`   | GET    | Get Stock Adjustment List    |
| `/stock-adjustments`   | POST   | Add Stock Adjustment         |
| `/warehouses`          | GET    | Get Warehouse List           |
| `/vendors`             | GET    | Get Vendor List              |
| `/purchase-orders`     | GET    | Get Purchase Order List      |
| `/customers`           | GET    | Get Customer List            |
| `/channels`            | GET    | Get Sales Channel List       |
| `/vouchers/validity`   | POST   | Check Voucher Validity       |
| `/vouchers/usage`      | POST   | Add Voucher Usage            |

**Webhooks (HMAC verified):**

- Inventory Update (Sellable Stock), Inventory Update (Stock On Hand), Order Update (Order Status), Package Update, Purchase Order Update, Customer Update, Stock Transfer Update
- HMAC verification: compute HMAC digest using store secret token + request data, compare to `Authorization` header

**Exception Hierarchy:**

```
SiteGiantError (base)
├── SiteGiantAuthError    — invalid/expired token
└── SiteGiantAPIError     — API error responses (status_code + message)
```

**Class:** `SiteGiantAdapter`

**Methods:**

| Method                                         | Description                                     |
| ---------------------------------------------- | ----------------------------------------------- |
| `connect()`                                    | Verify token validity                           |
| `read_products()`                              | Get Product List                                |
| `read_product(product_id)`                     | Get Product by ID                               |
| `read_items()`                                 | Get Item List                                   |
| `read_item(item_id)`                           | Get Item by ID                                  |
| `read_orders(status, since)`                   | Get Order List (filtered)                       |
| `read_order(order_id)`                         | Get Order by ID                                 |
| `read_stock_adjustments()`                     | Get Stock Adjustment List                       |
| `read_warehouses()`                            | Get Warehouse List                              |
| `read_vendors()`                               | Get Vendor List                                 |
| `read_purchase_orders()`                       | Get Purchase Order List                         |
| `read_customers()`                             | Get Customer List                               |
| `read_channels()`                              | Get Sales Channel List                          |
| `update_product(product_id, data)`             | Update Product                                  |
| `update_product_price(product_id, price)`      | Update Product Price                            |
| `update_item(item_id, data)`                   | Update Item                                     |
| `add_product(data)`                            | Add Product                                     |
| `add_item(data)`                               | Add Item                                        |
| `upload_product_image(product_id, image_data)` | Upload Product Image                            |
| `check_voucher_validity(voucher_data)`         | Check Voucher Validity                          |
| `add_voucher_usage(voucher_data)`              | Add Voucher Usage                               |
| `read_rate_limit()`                            | Read `X-RateLimit-Remaining` from last response |

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

1. Create directories: `retail/sitegiant-connector/`, `retail/sitegiant-connector/scripts/`
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

### PHASE 2 — Data Ingestion (2 new skills)

#### Skill 7: `autocount-product-sync`

**Function:** Pull all product data from AutoCount into Shogun master store.

**Files:**

- Create: `retail/autocount-product-sync/SKILL.md`
- Create: `retail/autocount-product-sync/scripts/autocount_product_sync.py`

**Depends on:** `autocount-connector` (existing — calls `read_stock_balance()`, `read_sales_invoices()`)

**What it does:**

1. Calls `autocount-connector.read_stock_balance()` to get all products with stock levels
2. Calls `autocount-connector.read_sales_invoices()` to get pricing and sales velocity data
3. Merges data by SKU
4. Writes to Shogun master store: `products.jsonl`, `stock-balances.jsonl`, `sales-invoices.jsonl`, `sync-state.json`

**Product fields pulled per client requirements:** SKU, Product name, Barcode, Brand, Category, UOM, Product description, Selling price, Cost price, Stock balance, Product images

**Sync modes:** `full` (all products), `incremental` (changed since last sync using `sync-state.json` timestamp)

**Methods:**

| Method                     | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `sync(mode="incremental")` | Pull from AutoCount → write to master store     |
| `get_last_sync_time()`     | Read last sync timestamp from `sync-state.json` |
| `get_product_count()`      | Count products in master store                  |
| `get_product(sku)`         | Read single product from master store           |

**CLI:**

```bash
python autocount_product_sync.py sync          # incremental
python autocount_product_sync.py sync --full  # full
python autocount_product_sync.py status       # last sync time + counts
python autocount_product_sync.py product <sku>
```

**Build Steps:**

1. Create directories: `retail/autocount-product-sync/`, `retail/autocount-product-sync/scripts/`
2. Write `SKILL.md`:
   - `name: autocount-product-sync`
   - `description:` ≤60 chars — "Pull all product data from AutoCount into Shogun master store."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, data-ingestion, autocount, sync]`
   - `triggers: ["autocount sync", "product sync", "pull autocount data"]`
3. Write `scripts/autocount_product_sync.py`:
   - Import `AutoCountAdapter` from `autocount_connector`
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

#### Skill 8: `sitegiant-product-sync`

**Function:** Pull all product data from SiteGiant into Shogun master store (optional secondary source).

**Files:**

- Create: `retail/sitegiant-product-sync/SKILL.md`
- Create: `retail/sitegiant-product-sync/scripts/sitegiant_product_sync.py`

**Depends on:** `sitegiant-connector` (Skill 6 — calls `read_products()`, `read_items()`)

**What it does:**

1. Calls `sitegiant-connector.read_products()` to get product list
2. Calls `sitegiant-connector.read_items()` to get item-level data (SKUs, barcodes, stock)
3. Merges products + items by product ID
4. Writes to Shogun master store (same location as Skill 7, but tagged `source: "sitegiant"`)
5. If a product with the same SKU already exists (from AutoCount sync), merges — SiteGiant data supplements (fills missing images, descriptions)

**Sync modes:** `full`, `incremental`

**Methods:**

| Method                     | Description                                 |
| -------------------------- | ------------------------------------------- |
| `sync(mode="incremental")` | Pull from SiteGiant → write to master store |
| `get_last_sync_time()`     | Last sync timestamp                         |
| `get_product_count()`      | Count products from SiteGiant source        |

**Build Steps:**

1. Create directories: `retail/sitegiant-product-sync/`, `retail/sitegiant-product-sync/scripts/`
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

### PHASE 3 — Listing Sync (4 new skills)

> One per platform. Each takes Shogun master data → formats for that platform → pushes via connector. Create vs update auto-detected (SKU exists → update, SKU new → create). Formatting is internal to each skill.

#### Skill 9: `shopee-listing-sync`

**Function:** Create & update Shopee listings from Shogun master data.

**Files:**

- Create: `retail/shopee-listing-sync/SKILL.md`
- Create: `retail/shopee-listing-sync/scripts/shopee_listing_sync.py`

**Depends on:** `shopee-connector` (existing), Shogun master store (Skills 7-8)

**Shopee schema rules (internal formatting):**

- Title: max 120 chars, auto-truncate with ellipsis
- Images: max 9, min 500x500px, JPG/PNG
- Description: max 3000 chars, supports basic HTML
- Category: mapped via `config/category-mapping-shopee.yaml`
- Variations: if AutoCount product has UOM variants, create Shopee variations

**Methods:**

| Method                    | Description                                 |
| ------------------------- | ------------------------------------------- |
| `sync_sku(sku)`           | Sync one SKU to Shopee (auto create/update) |
| `sync_batch(skus)`        | Sync multiple SKUs                          |
| `sync_all()`              | Sync all products in master store           |
| `get_listing_status(sku)` | Check if SKU is listed on Shopee            |

**Build Steps:**

1. Create directories: `retail/shopee-listing-sync/`, `retail/shopee-listing-sync/scripts/`
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
   - Define category mapping config: `config/category-mapping-shopee.yaml`
   - CLI entry point
4. Verify:
   - [ ] `skill_view(name='shopee-listing-sync')` returns content
   - [ ] `sync_sku()` with a new SKU calls connector create path
   - [ ] `sync_sku()` with an existing SKU calls connector update path
   - [ ] SKU mapping is updated after create
   - [ ] Title truncation respects 120 char limit

---

#### Skill 10: `lazada-listing-sync`

**Function:** Create & update Lazada listings from Shogun master data.

**Files:**

- Create: `retail/lazada-listing-sync/SKILL.md`
- Create: `retail/lazada-listing-sync/scripts/lazada_listing_sync.py`

**Depends on:** `lazada-connector` (existing), Shogun master store

**Lazada schema rules (internal formatting):**

- Title: max 255 chars
- Images: max 8, min 500x500px, JPG/PNG
- Description: max 3000 chars
- Category: mapped via `config/category-mapping-lazada.yaml`

**Methods:** Same structure as Skill 9 (`sync_sku`, `sync_batch`, `sync_all`, `get_listing_status`)

**Build Steps:** Same structure as Skill 9, adapted for Lazada API. Uses `LazadaAdapter`. SKU mapping stores Lazada `seller_sku` and `product_id`.

**Verify:**

- [ ] Same checks as Skill 9, adapted for Lazada
- [ ] Title respects 255 char limit
- [ ] Max 8 images enforced

---

#### Skill 11: `tiktok-listing-sync`

**Function:** Create & update TikTok Shop listings from Shogun master data.

**Files:**

- Create: `retail/tiktok-listing-sync/SKILL.md`
- Create: `retail/tiktok-listing-sync/scripts/tiktok_listing_sync.py`

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

#### Skill 12: `website-listing-sync`

**Function:** Create & update website listings from Shogun master data.

**Files:**

- Create: `retail/website-listing-sync/SKILL.md`
- Create: `retail/website-listing-sync/scripts/website_listing_sync.py`

**Depends on:** `website-connector` (Skill 5), Shogun master store

**Website schema rules (internal formatting):**

- Title: unlimited (recommend max 255 chars)
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

### PHASE 4 — Price Sync (4 new skills)

> One per platform. Each takes SKU + new price → pushes to that platform. Returns success/failure. Keeps its own change log.

#### Skill 13: `shopee-price-sync`

**Function:** Update prices on Shopee only.

**Files:**

- Create: `retail/shopee-price-sync/SKILL.md`
- Create: `retail/shopee-price-sync/scripts/shopee_price_sync.py`

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
  "old_price": 150.0,
  "new_price": 135.0,
  "item_id": 123456789,
  "status": "success"
}
```

**Methods:**

| Method                         | Description                         |
| ------------------------------ | ----------------------------------- |
| `update_price(sku, new_price)` | Update one SKU price on Shopee      |
| `update_batch(price_map)`      | Bulk update — `{"sku": price, ...}` |
| `get_price_log(since=None)`    | Read price change log               |
| `get_failed_updates()`         | Return SKUs that failed last sync   |

**CLI:**

```bash
python shopee_price_sync.py update <sku> <price>
python shopee_price_sync.py batch <price_map.json>
python shopee_price_sync.py log
python shopee_price_sync.py failures
```

**Build Steps:**

1. Create directories: `retail/shopee-price-sync/`, `retail/shopee-price-sync/scripts/`
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

#### Skill 14: `lazada-price-sync`

**Function:** Update prices on Lazada only.

**Files:**

- Create: `retail/lazada-price-sync/SKILL.md`
- Create: `retail/lazada-price-sync/scripts/lazada_price_sync.py`

**Depends on:** `lazada-connector` (existing), SKU mapping

**What it does:** Same as Skill 13 but for Lazada. Calls `lazada-connector.update_product()`. Log: `price-changes-lazada.jsonl`.

**Build Steps:** Same structure as Skill 13. Uses `LazadaAdapter`. SKU mapping stores Lazada `seller_sku`.

**Verify:** Same checks as Skill 13, adapted for Lazada.

---

#### Skill 15: `tiktok-price-sync`

**Function:** Update prices on TikTok Shop only.

**Files:**

- Create: `retail/tiktok-price-sync/SKILL.md`
- Create: `retail/tiktok-price-sync/scripts/tiktok_price_sync.py`

**Depends on:** `tiktok-shop-connector` (Skill 4), SKU mapping

**What it does:** Same as Skill 13 but for TikTok Shop. Calls `tiktok-shop-connector.update_listing()`. Log: `price-changes-tiktok.jsonl`.

**Build Steps:** Same structure as Skill 13. Uses `TikTokShopAdapter`. SKU mapping stores TikTok `product_id`.

**Verify:** Same checks as Skill 13, adapted for TikTok.

---

#### Skill 16: `website-price-sync`

**Function:** Update prices on website only (WooCommerce or Shopify).

**Files:**

- Create: `retail/website-price-sync/SKILL.md`
- Create: `retail/website-price-sync/scripts/website_price_sync.py`

**Depends on:** `website-connector` (Skill 5), SKU mapping

**What it does:** Same as Skill 13 but for website. Calls `website-connector.update_price()`. Log: `price-changes-website.jsonl`.

**Build Steps:** Same structure as Skill 13. Uses `get_adapter()` from `website_connector`.

**Verify:** Same checks as Skill 13, adapted for website.

---

### PHASE 5 — Product Analysis (2 new skills)

> One per metric domain. Velocity (sales speed) and Margin (profitability) are separate analytical functions.

#### Skill 17: `product-velocity-analyzer`

**Function:** Classify products by sales velocity: dead, slow, fast, zero-sales.

**Files:**

- Create: `retail/product-velocity-analyzer/SKILL.md`
- Create: `retail/product-velocity-analyzer/scripts/product_velocity_analyzer.py`

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
| -------------- | ------------------------------------------------------------- |
| Dead stock     | `days_since_last_sale > 180` OR `avg_monthly_velocity = 0`    |
| Slow-moving    | `months_of_cover > 8` AND not dead                            |
| Fast-moving    | `avg_monthly_velocity > 2 * category_avg_velocity`            |
| Zero-sales     | `units_sold_total = 0` in period (default 30 days)            |

4. Output ranked list per category, sorted by `capital_tied_up = stock_balance * cost_price` descending

**Relationship to existing `dead-slow-stock-detector`:**

- `dead-slow-stock-detector` reads from procurement gbrain source only
- This skill reads from all sales platforms via the unified master store
- This skill EXTENDS detection to all velocity tiers (dead + slow + fast + zero-sales)

**Config:** `config/velocity-thresholds.yaml`

```yaml
dead_stock_days: 180
slow_stock_months_cover: 8
fast_stock_multiplier: 2.0
zero_sales_days: 30
analysis_period_days: 180
```

**Methods:**

| Method                      | Description                                            |
| --------------------------- | ------------------------------------------------------ |
| `analyze(period_days=180)`  | Full velocity analysis — returns classification report |
| `get_classification(sku)`   | Single SKU classification                              |
| `get_by_category(category)` | All SKUs in a velocity category                        |
| `get_ranked_by_capital()`   | All dead/slow SKUs ranked by capital tied up           |

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
      "capital_tied_up": 21600.0,
      "recommendation": "Scrap / Write-off"
    }
  ]
}
```

**Build Steps:**

1. Create directories: `retail/product-velocity-analyzer/`, `retail/product-velocity-analyzer/scripts/`
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

#### Skill 18: `product-margin-analyzer`

**Function:** Classify products by margin: high-margin, low-margin, rank by margin contribution.

**Files:**

- Create: `retail/product-margin-analyzer/SKILL.md`
- Create: `retail/product-margin-analyzer/scripts/product_margin_analyzer.py`

**Depends on:** Shogun master store (`products.jsonl` — has `selling_price` and `cost_price`)

**What it does:**

1. Read product data from `~/.hermes/ecommerce/master/products.jsonl`
2. Compute per-SKU margin metrics:
   - `margin_amount` = `selling_price - cost_price`
   - `margin_pct` = `(selling_price - cost_price) / selling_price * 100`
   - `margin_contribution` = `margin_amount * units_sold` (from sales data)
3. Classify each SKU:

| Classification  | Criteria (configurable via `config/margin-thresholds.yaml`)                 |
| --------------- | --------------------------------------------------------------------------- |
| High-margin     | `margin_pct > 2 * target_margin_pct` (default target: 20%, so high = > 40%) |
| Low-margin      | `margin_pct < margin_floor_pct` (default floor: 15%)                        |
| Negative margin | `margin_pct < 0` (selling below cost)                                       |
| Normal          | Between floor and high                                                      |

4. Rank by margin contribution (which products contribute most to total profit)

**Config:** `config/margin-thresholds.yaml`

```yaml
target_margin_pct: 20
margin_floor_pct: 15
high_margin_multiplier: 2.0
```

**Methods:**

| Method                         | Description                                          |
| ------------------------------ | ---------------------------------------------------- |
| `analyze()`                    | Full margin analysis — returns classification report |
| `get_classification(sku)`      | Single SKU margin classification                     |
| `get_by_category(category)`    | All SKUs in a margin category                        |
| `get_ranked_by_contribution()` | All SKUs ranked by margin contribution               |
| `get_negative_margin_skus()`   | SKUs selling below cost                              |

**Build Steps:**

1. Create directories: `retail/product-margin-analyzer/`, `retail/product-margin-analyzer/scripts/`
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

### PHASE 6 — Marketing (2 new skills)

#### Skill 19: `promo-recommender`

**Function:** Given analysis results → output: which products to promote, campaign theme, promo angle, suggested promo price.

**Files:**

- Create: `retail/promo-recommender/SKILL.md`
- Create: `retail/promo-recommender/scripts/promo_recommender.py`

**Depends on:** `product-velocity-analyzer` (Skill 17), `product-margin-analyzer` (Skill 18)

**What it does:**

1. Read velocity classification (dead, slow, fast, zero-sales)
2. Read margin classification (high, low, negative)
3. Cross-reference to generate promo recommendations:

| Product State            | Promo Action            | Campaign Theme               | Promo Angle                             |
| ------------------------ | ----------------------- | ---------------------------- | --------------------------------------- |
| Dead stock + high margin | Clearance discount      | "Clearance Sale"             | "Last chance — make room for new stock" |
| Dead stock + low margin  | Bundle with best-seller | "Bundle Deal"                | "Buy together, save more"               |
| Slow + high margin       | Flash sale              | "Flash Sale"                 | "Limited time offer — selling fast!"    |
| Slow + low margin        | Small discount          | "Weekly Specials"            | "Special price this week only"          |
| Zero-sales + high margin | Featured promotion      | "New Arrival" / "Rediscover" | "You've been missing out"               |
| Fast + high margin       | Best seller highlight   | "Best Seller"                | "Our customers' top pick"               |

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

| Method                                     | Description                             |
| ------------------------------------------ | --------------------------------------- |
| `generate(velocity_report, margin_report)` | Full recommendation report              |
| `get_recommendation(sku)`                  | Single SKU recommendation               |
| `get_promo_price(sku)`                     | Suggested promo price + margin impact   |
| `get_campaign_summary()`                   | Group recommendations by campaign theme |

**Output format:**

```json
{
  "generated_at": "2026-08-14T10:00:00Z",
  "campaigns": [
    {
      "theme": "Clearance Sale",
      "product_count": 45,
      "total_potential_recovery": 125000.0
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
      "selling_price": 150.0,
      "cost_price": 60.0,
      "suggested_promo_price": 90.0,
      "discount_pct": 40.0,
      "margin_after_discount_pct": 33.3,
      "capital_tied_up": 21600.0,
      "urgency_score": 9
    }
  ]
}
```

**Build Steps:**

1. Create directories: `retail/promo-recommender/`, `retail/promo-recommender/scripts/`
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

#### Skill 20: `cross-sell-bundle-recommender`

**Function:** Given order history + product catalog → output: cross-sell pairs, bundle suggestions with rationale.

**Files:**

- Create: `retail/cross-sell-bundle-recommender/SKILL.md`
- Create: `retail/cross-sell-bundle-recommender/scripts/bundle_recommender.py`

**Depends on:** Shogun master store (`sales-invoices.jsonl` for order history, `products.jsonl` for catalog)

**What it does:**

1. Read order history from `sales-invoices.jsonl`
2. Analyze co-occurrence: which SKUs are frequently bought together in the same order
3. Generate recommendations:

| Recommendation Type                | Logic                                                            |
| ---------------------------------- | ---------------------------------------------------------------- |
| Cross-sell pair                    | Two SKUs frequently bought together (e.g., phone + case)         |
| Bundle (dead stock + best seller)  | Dead/slow SKU bundled with fast-moving SKU to clear inventory    |
| Bundle (complementary categories)  | SKUs from complementary categories (e.g., shampoo + conditioner) |
| Bundle (high-margin + fast-moving) | High-margin slow SKU + fast-moving SKU to boost profit           |

4. For each bundle, calculate: bundle price, savings %, expected margin, rationale

**Methods:**

| Method                                               | Description                       |
| ---------------------------------------------------- | --------------------------------- |
| `generate(velocity_report=None, margin_report=None)` | Full bundle/cross-sell report     |
| `get_cross_sell(sku)`                                | Cross-sell pairs for a given SKU  |
| `get_bundles()`                                      | All bundle suggestions            |
| `get_bundle_pricing(bundle_id)`                      | Bundle price + margin calculation |

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
      "individual_price_sum": 225.0,
      "bundle_price": 199.0,
      "savings_pct": 11.6,
      "expected_margin": 89.0,
      "rationale": "Clear dead stock (Widget A) by bundling with best-seller (Case B)"
    }
  ]
}
```

**Build Steps:**

1. Create directories: `retail/cross-sell-bundle-recommender/`, `retail/cross-sell-bundle-recommender/scripts/`
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

### PHASE 7 — Content Generation (3 new skills)

> One per output format group. Each uses the agent's LLM (the Hermes agent itself) — no external AI API needed. Content is tailored to product data from the master store.

#### Skill 21: `video-content-generator`

**Function:** Generate video concept + full script (hook, shots, voiceover, text overlay) for a given product + promo.

**Files:**

- Create: `retail/video-content-generator/SKILL.md`
- Create: `retail/video-content-generator/scripts/video_generator.py`
- Create: `retail/video-content-generator/scripts/templates/video_script_template.py`

**Depends on:** Shogun master store (product data), `promo-recommender` (promo context)

**What it does:**

1. Read product data from master store (name, features, price, images, category)
2. Read promo context from `promo-recommender` (campaign theme, promo angle, promo price)
3. Generate:
   - **Video concept:** 1-paragraph concept + visual direction + target length (15s, 30s, 60s)
   - **Video script:** structured script with hook (first 3 seconds), scene-by-scene shots, voiceover text, text overlay, CTA
   - Tailored to platform: TikTok (vertical, fast-paced), Reels (vertical, trending audio), YouTube Shorts (informative)

**Script format:**

```json
{
  "sku": "PROD-001",
  "product_name": "Widget A",
  "platform": "tiktok",
  "duration_seconds": 30,
  "concept": "Show Widget A solving a real customer problem in 30 seconds...",
  "scenes": [
    {
      "scene_number": 1,
      "duration": "0-3s",
      "visual": "Person struggling with [problem]",
      "voiceover": "Tired of dealing with [problem]?",
      "text_overlay": "Problem: [pain point]"
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

| Method                                                                     | Description                   |
| -------------------------------------------------------------------------- | ----------------------------- |
| `generate_concept(sku, platform="tiktok", duration=30)`                    | Video concept only            |
| `generate_script(sku, platform="tiktok", duration=30, promo_context=None)` | Full video script             |
| `generate_batch(skus, platform, duration)`                                 | Scripts for multiple products |

**Build Steps:**

1. Create directories: `retail/video-content-generator/`, `retail/video-content-generator/scripts/`, `retail/video-content-generator/scripts/templates/`
2. Write `SKILL.md`:
   - `name: video-content-generator`
   - `description:` ≤60 chars — "Generate video concepts and scripts for product promotions."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, content, video, script, tiktok]`
   - `triggers: ["video script", "video concept", "product video", "tiktok video"]`
3. Write `scripts/templates/video_script_template.py` — prompt templates per platform (TikTok, Reels, YouTube Shorts)
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

#### Skill 22: `social-content-generator`

**Function:** Generate platform-specific captions, hashtags, keywords, and CTAs for a given product.

**Files:**

- Create: `retail/social-content-generator/SKILL.md`
- Create: `retail/social-content-generator/scripts/social_generator.py`

**Depends on:** Shogun master store (product data), `promo-recommender` (promo context)

**What it does:**

1. Read product data from master store
2. Read promo context (campaign theme, promo angle, promo price)
3. Generate per platform:

| Platform  | Caption        | Hashtags                  | Keywords       | CTA                          |
| --------- | -------------- | ------------------------- | -------------- | ---------------------------- |
| Shopee    | Max 3000 chars | 10-15 tags                | 10-15 keywords | "Buy Now", "Add to Cart"     |
| Lazada    | Max 3000 chars | 10-15 tags                | 10-15 keywords | "Add to Cart", "Buy Now"     |
| TikTok    | Max 500 chars  | 5-10 tags (#fyp, #foryou) | 5-10 keywords  | "Link in bio", "Shop now"    |
| Instagram | Max 2200 chars | 10-15 tags                | 5-10 keywords  | "Link in bio", "Tap to shop" |
| Facebook  | Max 5000 chars | 5-10 tags                 | 5-10 keywords  | "Shop Now", "Learn More"     |

**Methods:**

| Method                                      | Description              |
| ------------------------------------------- | ------------------------ |
| `generate_captions(sku, platform, count=3)` | 3 caption variants       |
| `generate_hashtags(sku, platform)`          | Platform hashtags        |
| `generate_keywords(sku)`                    | SEO keywords             |
| `generate_cta(platform, promo_type)`        | Platform-appropriate CTA |
| `generate_all(sku, platform)`               | Full content package     |

**Build Steps:**

1. Create directories: `retail/social-content-generator/`, `retail/social-content-generator/scripts/`
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

#### Skill 23: `product-copy-generator`

**Function:** Generate product descriptions, promo headlines, and banner copy for a given product.

**Files:**

- Create: `retail/product-copy-generator/SKILL.md`
- Create: `retail/product-copy-generator/scripts/product_copy_generator.py`

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

| Method                                         | Description                           |
| ---------------------------------------------- | ------------------------------------- |
| `generate_description(sku, platform)`          | Platform-specific product description |
| `generate_headlines(sku, promo_type, count=3)` | Promo headline variants               |
| `generate_banner_copy(sku, promo_type)`        | Headline + subheadline for banners    |
| `generate_all(sku, promo_type)`                | Full copy package                     |

**Build Steps:**

1. Create directories: `retail/product-copy-generator/`, `retail/product-copy-generator/scripts/`
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

### PHASE 8 — Creative (1 new skill)

#### Skill 24: `banner-generator`

**Function:** Generate promotional banner image (brand template + product image + promo text + price) via ComfyUI.

**Files:**

- Create: `retail/banner-generator/SKILL.md`
- Create: `retail/banner-generator/scripts/banner_generator.py`
- Create: `retail/banner-generator/scripts/templates/banner_template.html`
- Create: `retail/banner-generator/scripts/templates/brand-config.yaml`

**Depends on:** `comfyui` (existing), `product-copy-generator` (Skill 23 — banner copy), `promo-recommender` (Skill 19 — campaign theme + promo price)

**What it does:**

1. Read product data from master store (product image, name)
2. Read banner copy from `product-copy-generator` (headline, subheadline)
3. Read promo price from `promo-recommender`
4. Read brand config (logo path, brand colors, fonts)
5. Generate banner using HTML/CSS template → render to PNG
6. Save to `~/.hermes/ecommerce/banners/pending/` (awaiting approval)

**Banner sizes per platform:**

| Platform    | Dimensions                             |
| ----------- | -------------------------------------- |
| Shopee      | 1024x1024 (product), 1920x600 (cover)  |
| Lazada      | 800x800 (product), 1920x600 (cover)    |
| TikTok Shop | 1080x1080 (product), 1080x1920 (story) |
| Website     | 1200x628 (OG), 1920x600 (hero)         |

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

| Method                                                | Description                       |
| ----------------------------------------------------- | --------------------------------- |
| `generate(sku, promo_type, platform, size="product")` | Generate banner → save to pending |
| `get_pending()`                                       | List banners awaiting approval    |
| `get_brand_config()`                                  | Read brand config                 |
| `update_brand_config(config)`                         | Update brand config               |

**Build Steps:**

1. Create directories: `retail/banner-generator/`, `retail/banner-generator/scripts/`, `retail/banner-generator/scripts/templates/`
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

### PHASE 9 — Orchestration & Governance (3 new skills)

#### Skill 25: `ecommerce-workflow-orchestrator`

**Function:** Run the 10-step pipeline: pull data → analyze → identify → recommend → content → banners → prices → listings → sync → log.

**Files:**

- Create: `retail/ecommerce-workflow-orchestrator/SKILL.md`
- Create: `retail/ecommerce-workflow-orchestrator/scripts/workflow_orchestrator.py`

**Depends on:** All skills (this is the conductor — calls each in sequence). Cross-department: calls skills from Merchandising, Marketing, and Compliance.

**What it does:**
The orchestrator calls each skill in sequence. It contains NO business logic — only orchestration (call order, state tracking, error handling, approval gates, dependency awareness).

**Workflow steps:**

| Step | Action                           | Skill Called                                                                                   | Home Department | Gated?                  | Required?                 |
| ---- | -------------------------------- | ---------------------------------------------------------------------------------------------- | --------------- | ----------------------- | ------------------------- |
| 1    | Pull product data from AutoCount | `autocount-product-sync.sync()`                                                                | E-commerce      | No                      | Yes                       |
| 2    | Analyze sales velocity           | `product-velocity-analyzer.analyze()`                                                          | Merchandising   | No                      | Yes                       |
| 3    | Analyze product margins          | `product-margin-analyzer.analyze()`                                                            | Merchandising   | No                      | Yes                       |
| 4    | Generate promo recommendations   | `promo-recommender.generate()`                                                                 | Marketing       | Yes — campaign approval | No (skip = no promo recs) |
| 5    | Generate bundle recommendations  | `cross-sell-bundle-recommender.generate()`                                                     | Marketing       | No                      | No                        |
| 6    | Generate video content           | `video-content-generator.generate_script()`                                                    | Marketing       | No                      | No                        |
| 7    | Generate social content          | `social-content-generator.generate_all()`                                                      | Marketing       | No                      | No                        |
| 8    | Generate product copy            | `product-copy-generator.generate_all()`                                                        | Marketing       | No                      | No                        |
| 9    | Generate banners                 | `banner-generator.generate()`                                                                  | Marketing       | Yes — banner approval   | No                        |
| 10   | Update prices                    | `shopee-price-sync` + `lazada-price-sync` + `tiktok-price-sync` + `website-price-sync`         | E-commerce      | Yes — price approval    | No                        |
| 11   | Update listings                  | `shopee-listing-sync` + `lazada-listing-sync` + `tiktok-listing-sync` + `website-listing-sync` | E-commerce      | Yes — listing approval  | No                        |
| 12   | Log all actions                  | `action-audit-log.log_workflow()`                                                              | Compliance      | No                      | No                        |

**Modes:**

- `full` — all 12 steps
- `partial` — selected steps (e.g., `steps=[1,2,3]`)
- `single` — one step only

**Dependency awareness:**

- At runtime, checks if each step's skill is available in the profile
- If a required skill is missing → returns error
- If an optional skill is missing → logs skip and continues

**State tracking:**

- Current step, completed steps, failed steps, elapsed time
- State persisted to `~/.hermes/ecommerce/workflow-state.json`
- Resume from any step after approval or failure

**Approval gate integration:**

- At gated steps, orchestrator calls `approval-gate.request()` and pauses
- When approval is received (via `approval-gate.approve()`), orchestrator resumes via `resume_from()`
- If rejected, orchestrator skips that step and continues

**Methods:**

| Method                     | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `run_full()`               | Execute all 12 steps in sequence (pause at gates)   |
| `run_steps(step_numbers)`  | Execute selected steps only                         |
| `run_step(step_number)`    | Execute one step                                    |
| `get_status()`             | Current progress (step, completed, failed, elapsed) |
| `resume_from(step_number)` | Resume after approval or failure                    |
| `pause()`                  | Pause at approval gate                              |
| `abort()`                  | Abort workflow                                      |

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

1. Create directories: `retail/ecommerce-workflow-orchestrator/`, `retail/ecommerce-workflow-orchestrator/scripts/`
2. Write `SKILL.md`:
   - `name: ecommerce-workflow-orchestrator`
   - `description:` ≤60 chars — "Run the 10-step e-commerce pipeline: pull to log."
   - `version: 1.0.0`
   - `tags: [retail, ecommerce, orchestration, workflow, pipeline]`
   - `triggers: ["ecommerce workflow", "run pipeline", "full workflow"]`
3. Write `scripts/workflow_orchestrator.py`:
   - Import all skill modules (or define step-to-skill mapping in config)
   - Define `WorkflowOrchestrator` class:
     - `__init__()` — init all adapters, load state
     - `_load_state()` / `_save_state()` — read/write `workflow-state.json`
     - `_call_skill(step_number)` — map step number to skill, call it, return result
     - `_skill_available(skill_name)` — check if skill is installed in profile
     - `_check_gate(step_number)` — if step is gated, call `approval-gate.request()` and return pending status
     - `run_full()` — loop steps 1-12, pause at gates, skip missing optional skills
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
   - [ ] Missing optional skills are skipped gracefully with log message

---

#### Skill 26: `approval-gate`

**Function:** Hold actions pending human approval. Approve / reject / modify.

**Files:**

- Create: `retail/approval-gate/SKILL.md`
- Create: `retail/approval-gate/scripts/approval_gate.py`
- Create: `retail/approval-gate/scripts/config/approval-config.yaml`

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

| Gate Type            | What it gates                  | Default  |
| -------------------- | ------------------------------ | -------- |
| `price_change`       | Price updates before sync      | Optional |
| `banner_publishing`  | Banner publishing to platforms | Required |
| `product_publishing` | New listing publishing         | Required |
| `campaign_launch`    | Marketing campaign launch      | Required |
| `promo_pricing`      | Promo price going live         | Required |

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
    "old_price": 150.0,
    "new_price": 90.0,
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

| Method                                          | Description                       |
| ----------------------------------------------- | --------------------------------- |
| `request(gate_type, payload)`                   | Create pending request, return ID |
| `check(request_id)`                             | Get status of a request           |
| `approve(request_id, decided_by)`               | Approve a request                 |
| `reject(request_id, decided_by, reason)`        | Reject a request                  |
| `modify(request_id, modifications, decided_by)` | Approve with modifications        |
| `get_pending()`                                 | All pending approvals             |
| `expire_stale(timeout_hours=24)`                | Expire requests past timeout      |
| `deliver_request(request_id, channel)`          | Send to Slack/Telegram for review |

**Build Steps:**

1. Create directories: `retail/approval-gate/`, `retail/approval-gate/scripts/`, `retail/approval-gate/scripts/config/`
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
     - `deliver_request(request_id, channel)` — format message, send via Hermes comm layer
   - CLI entry point
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

#### Skill 27: `action-audit-log`

**Function:** Record every action: timestamp, skill, SKU, platform, old_value, new_value, status, error. Queryable audit trail.

**Files:**

- Create: `retail/action-audit-log/SKILL.md`
- Create: `retail/action-audit-log/scripts/action_audit_log.py`

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
  "old_value": { "price": 150.0 },
  "new_value": { "price": 135.0 },
  "status": "success",
  "error": null,
  "metadata": {
    "workflow_id": "wf-2026-08-14-001",
    "step": 10,
    "approval_id": "approval-2026-08-14-001"
  }
}
```

---

### PHASE 10 — Retail Operations (4 new skills)

> These are daily operational skills that the client needs but were missing from the original 27-skill plan. Each fills a specific gap in the daily retail workflow. Full build specs are in `retail-plan-ver1.md`.

#### Skill 28: `daily-sales-dashboard`

**Function:** Generate a daily 6 AM report with total sales, top 20 best sellers, channel breakdown, GP%, and day-over-day comparison.

**Files:** `retail/daily-sales-dashboard/SKILL.md` + `scripts/daily_sales_dashboard.py`

**Depends on:** Shogun master store, all platform connectors

**What it does:**

1. Pulls yesterday's sales from all platforms (Shopee, Lazada, TikTok, Website)
2. Merges by SKU into unified daily sales dataset
3. Calculates: total revenue/units, channel breakdown per platform, top 20 best sellers, GP% = `(revenue - cost) / revenue * 100`, day-over-day vs yesterday + same weekday last week
4. Delivers via Slack/Telegram at 6 AM (cron-schedulable)
5. Saves to `~/.hermes/ecommerce/reports/daily-sales-<date>.json`

**Methods:** `generate(date)`, `get_top_sellers(date, count)`, `get_channel_breakdown(date)`, `get_dod_comparison(date)`, `deliver(date, channel)`

**Cron:** `0 6 * * *` — daily 6 AM

---

#### Skill 29: `stock-reorder-supplier-analysis`

**Function:** Check stock levels against reorder thresholds AND analyze supplier bulk deals (8+1 free, 10+2 free) to calculate whether bulk purchase saves money vs stockout cost.

**Files:** `retail/stock-reorder-supplier-analysis/SKILL.md` + `scripts/stock_reorder_analysis.py` + `config/supplier-deals.yaml`

**Depends on:** `autocount-connector` (existing), Shogun master store, existing `reorder-alert-watchdog`

**What it does:**

1. Reads stock levels from AutoCount, identifies items at/below reorder threshold
2. For each item, looks up supplier deals and parses deal structures:

| Deal Type           | Calculation                                      |
| ------------------- | ------------------------------------------------ |
| `8+1_free`          | `effective_cost = original * 8 / 9`              |
| `10+2_free`         | `effective_cost = original * 10 / 12`            |
| `flat_discount_pct` | `effective_cost = original * (1 - discount_pct)` |
| `tiered_pricing`    | `effective_cost = tier_cost_for_qty`             |

3. Calculates stockout risk: `days_of_cover < supplier_lead_time` → HIGH risk
4. Calculates stockout cost: `estimated_lost_sales * margin_per_unit`
5. Compares bulk deal savings vs stockout cost
6. Outputs recommendation per SKU + ranked by urgency

**Methods:** `analyze()`, `get_items_below_reorder()`, `analyze_deal(sku, deal_type, params)`, `compare_deals(sku)`, `get_stockout_risk(sku)`, `get_recommendation(sku)`, `get_ranked_by_urgency()`

---

#### Skill 30: `competitive-pricing-research`

**Function:** Check live Shopee/Lazada/TikTok prices vs your CSP, calculate net effective cost after promo free units, and compare side-by-side margins vs named competitors.

**Files:** `retail/competitive-pricing-research/SKILL.md` + `scripts/competitive_pricing.py` + `config/competitors.yaml`

**Depends on:** `shopee-connector`, `lazada-connector`, `tiktok-shop-connector`, Shogun master store

**What it does:**

1. For each SKU, searches Shopee/Lazada/TikTok for the same product (by barcode, name, or keyword)
2. Pulls competitor listings: price, promo (free units, discounts), shipping fee, rating
3. Calculates competitor net effective cost:
   - "buy 2 free 1" → `effective = price * 2 / 3`
   - "10% off" → `effective = price * 0.9`
   - Adds shipping fee for true landed cost
4. Compares against your CSP, calculates your margin vs competitor margin
5. Flags: PRICED_OUT (competitor >threshold% cheaper), ADVANTAGE (you're >threshold% cheaper)
6. Configurable named competitors (e.g. Big Pharmacy, HTM Pharmacy)

**Methods:** `analyze(sku)`, `search_competitor_price(sku, competitor, platform)`, `calculate_effective_price(listing_price, promo)`, `compare_margins(your_price, your_cost, competitor_price, est_cost)`, `get_priced_out()`, `get_advantage()`, `get_competitor_summary()`

---

#### Skill 31: `product-deep-dive-verifier`

**Function:** Deep-dive verification for a single product: UOM conversion (SET vs BOX vs CAP), IV (online) vs OS (counter) sales split, and expiry date checking against 6-month clearance rule.

**Files:** `retail/product-deep-dive-verifier/SKILL.md` + `scripts/product_deep_dive.py` + `config/expiry-rules.yaml`

**Depends on:** `autocount-connector` (existing), Shogun master store, all platform connectors

**What it does:**

1. **UOM conversion verification:** Checks that conversions are consistent (1 SET = 12 BOX = 144 CAP), flags mismatches between AutoCount UOM and platform listing UOM, verifies stock reconciliation across UOM levels
2. **IV vs OS split:** Calculates sales units/revenue split: online (IV — Shopee/Lazada/TikTok/Website) vs offline (OS — counter/store), shows trend, flags if online >80% (dependency risk) or <20% (underutilized)
3. **Expiry date checking:** Reads batch/expiry data from AutoCount, classifies batches:

| Status                | Criteria             | Action                                                 |
| --------------------- | -------------------- | ------------------------------------------------------ |
| SAFE                  | > 6 months to expiry | None                                                   |
| CLEARANCE_RECOMMENDED | < 6 months           | Suggest clearance price (20% discount)                 |
| URGENT                | < 3 months           | Suggest clearance price (40% discount)                 |
| CRITICAL              | < 30 days            | Suggest clearance price (70% discount), write-off risk |

**Methods:** `deep_dive(sku)`, `verify_uom(sku)`, `get_iv_os_split(sku, period_days)`, `check_expiry(sku)`, `get_uom_mismatches(sku)`

---

## Build Order & Dependencies

| Phase | #   | Skill                             | Department    | Depends On                                                                  | Files      |
| ----- | --- | --------------------------------- | ------------- | --------------------------------------------------------------------------- | ---------- |
| 1     | 4   | `tiktok-shop-connector`           | E-commerce    | —                                                                           | 2          |
| 1     | 5   | `website-connector`               | E-commerce    | —                                                                           | 4          |
| 1     | 6   | `sitegiant-connector`             | E-commerce    | —                                                                           | 2          |
| 2     | 7   | `autocount-product-sync`          | E-commerce    | `autocount-connector` (existing)                                            | 2          |
| 2     | 8   | `sitegiant-product-sync`          | E-commerce    | `sitegiant-connector` (Skill 6)                                             | 2          |
| 3     | 9   | `shopee-listing-sync`             | E-commerce    | `shopee-connector` (existing), Skills 7-8                                   | 2 + config |
| 3     | 10  | `lazada-listing-sync`             | E-commerce    | `lazada-connector` (existing), Skills 7-8                                   | 2 + config |
| 3     | 11  | `tiktok-listing-sync`             | E-commerce    | `tiktok-shop-connector` (Skill 4), Skills 7-8                               | 2 + config |
| 3     | 12  | `website-listing-sync`            | E-commerce    | `website-connector` (Skill 5), Skills 7-8                                   | 2 + config |
| 4     | 13  | `shopee-price-sync`               | E-commerce    | `shopee-connector` (existing)                                               | 2          |
| 4     | 14  | `lazada-price-sync`               | E-commerce    | `lazada-connector` (existing)                                               | 2          |
| 4     | 15  | `tiktok-price-sync`               | E-commerce    | `tiktok-shop-connector` (Skill 4)                                           | 2          |
| 4     | 16  | `website-price-sync`              | E-commerce    | `website-connector` (Skill 5)                                               | 2          |
| 5     | 17  | `product-velocity-analyzer`       | Merchandising | Skills 7-8 (master store)                                                   | 2 + config |
| 5     | 18  | `product-margin-analyzer`         | Merchandising | Skills 7-8 (master store)                                                   | 2 + config |
| 6     | 19  | `promo-recommender`               | Marketing     | Skills 17, 18                                                               | 2          |
| 6     | 20  | `cross-sell-bundle-recommender`   | Marketing     | Skills 7-8 (master store)                                                   | 2          |
| 7     | 21  | `video-content-generator`         | Marketing     | Skills 7-8 (master store)                                                   | 3          |
| 7     | 22  | `social-content-generator`        | Marketing     | Skills 7-8 (master store)                                                   | 2 + config |
| 7     | 23  | `product-copy-generator`          | Marketing     | Skills 7-8 (master store)                                                   | 2          |
| 8     | 24  | `banner-generator`                | Marketing     | Skills 19, 23 + `comfyui` (existing)                                        | 4          |
| 9     | 25  | `ecommerce-workflow-orchestrator` | E-commerce    | All skills (cross-dept)                                                     | 2 + config |
| 9     | 26  | `approval-gate`                   | Compliance    | —                                                                           | 2 + config |
| 9     | 27  | `action-audit-log`                | Compliance    | —                                                                           | 2          |
| 10    | 28  | `daily-sales-dashboard`           | E-commerce    | Skills 7-8, all connectors                                                  | 2          |
| 10    | 29  | `stock-reorder-supplier-analysis` | E-commerce    | `autocount-connector` (existing), Skills 7-8                                | 2 + config |
| 10    | 30  | `competitive-pricing-research`    | E-commerce    | `shopee-connector`, `lazada-connector`, `tiktok-shop-connector`, Skills 7-8 | 2 + config |
| 10    | 31  | `product-deep-dive-verifier`      | Merchandising | `autocount-connector` (existing), Skills 7-8, all connectors                | 2 + config |

**Total: 28 new skills, ~62 files, 10 phases, 4 departments.**
