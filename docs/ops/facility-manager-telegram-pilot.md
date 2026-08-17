# Facility Manager Telegram Pilot Runbook

This runbook covers the end-to-end setup and testing of the Facility Manager (Eizen) Telegram bot for quarters image inspection.

## Prerequisites

- Shogun OS installed and verified (`./scripts/verify-install.sh --quick`)
- `facility-manager` profile generated (`python scripts/generate-profile.py facility-manager --type facility`)
- Telegram bot token from @BotFather
- At least one inspection pack configured (see `examples/quarters-inspection/plantation-pack.sample.json`)

## Setup Steps

### 1. Create Telegram Bot

1. Open Telegram, search for @BotFather
2. Send `/newbot`
3. Choose a name (e.g. "Shogun Facility Manager")
4. Choose a username (e.g. `shogun_facility_bot`)
5. Copy the bot token: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### 2. Configure Profile Environment

```bash
# Edit the facility-manager profile .env
cat > ~/.hermes/profiles/facility-manager/.env << EOF
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
OPENAI_API_KEY=your-key-here
DASHSCOPE_API_KEY=your-key-here
EOF
```

### 3. Create Gbrain Source

```bash
gbrain sources add facilities --path ~/brain/facilities
```

### 4. Generate Profile

```bash
python scripts/generate-profile.py facility-manager --type facility
```

Verify the SOUL contains Eizen:
```bash
grep "Eizen" ~/.hermes/profiles/facility-manager/SOUL.md
```

### 5. Install Skills

```bash
hermes skills install tapway/shogun-os/quarters-inspection --profile facility-manager
hermes skills install tapway/shogun-os/furniture-count --profile facility-manager
hermes skills install tapway/shogun-os/cleanliness-check --profile facility-manager
hermes skills install tapway/shogun-os/site-condition-check --profile facility-manager
```

### 6. Start Gateway

```bash
hermes serve --profile facility-manager --port 9111
```

### 7. Test the Bot

1. Open Telegram, find your bot
2. Send `/start`
3. Send a test message: `hello`
4. The bot should respond as Eizen

## Pilot Test: Quarters Inspection

### Step 1: Configure Pack

Send the pack JSON file to the bot, or:
```
inspect pack plantation-type-a-v1
```

### Step 2: Inspect Unit

```
inspect estate-demo Block-A-12 plantation-type-a-v1
```

Then attach 1-4 photos of the staff quarters.

### Step 3: Verify Response

The bot should reply with a structured report:

```
# Inspection Report — Block-A-12

**Overall Status:** ❌ FAIL

## Failed Items
- ❌ cupboard
- ❌ no_mold

## Inventory Results
| Item | Expected | Observed | Status |
|------|----------|----------|--------|
| Bed | 2 | 2 | ✅ pass |
| Cupboard | 1 | 0 | ❌ fail |
...

## Checklist Results
| Check | Status | Notes |
|-------|--------|-------|
| No visible mold | ❌ fail | Black spots near window |
...
```

### Step 4: Test Edge Cases

- **No pack**: Send `inspect estate-demo Block-A-12` without configuring a pack → should use default rubrics
- **Offline submit**: Capture photos while offline, send when online with same command
- **Missing photos**: Send `inspect` command without photos → should ask for photos

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Bot doesn't respond | Check gateway is running on port 9111 |
| VLM timeout | Photos may be too large — resize before sending |
| "Pack not found" | Ensure pack JSON was sent or pack ID matches |
| No skills loaded | Run `hermes skills list --profile facility-manager` |

## Teardown

```bash
# Stop gateway
# Kill the hermes serve process

# Remove profile (optional)
hermes profile remove facility-manager
```
