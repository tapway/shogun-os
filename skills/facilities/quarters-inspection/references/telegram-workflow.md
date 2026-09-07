# Telegram Workflow

## Command Protocol

### Configure Pack
```
inspect pack plantation-type-a-v1
```
Or send the pack JSON file directly.

### Inspect Unit
```
inspect estate-demo Block-A-12 plantation-type-a-v1
<photo attachments>
```

First line is the command. Photos are attached as media. The agent:
1. Loads the pack
2. Sends photos to VLM with assessment prompt
3. Replies with structured report (pass/fail per item + failed items list)

### Offline Submit
1. Capture photos on device while offline
2. When online, send photos with the same command caption
3. Agent processes as normal

## Bot Setup

1. Create Telegram bot via @BotFather → get `TELEGRAM_BOT_TOKEN`
2. Add token to facility-manager profile `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   ```
3. Generate profile:
   ```bash
   python scripts/generate-profile.py facility-manager --type facility
   ```
4. Start gateway:
   ```bash
   hermes serve --profile facility-manager --port 9111
   ```
5. Send `/start` to the bot, then `inspect` command with photos

## Message Format

The bot replies with a markdown report:
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
```

## Pitfalls

- ❌ Do not attempt face/resident identification from photos
- ❌ Do not create work orders automatically in v1
- ❌ If pack is missing, use default rubrics but warn the user
- ❌ Large photos may timeout — resize before sending if needed
