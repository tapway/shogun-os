![Manufacturing](https://img.shields.io/badge/dept-Manufacturing-red)

# MES Connector

> Ingest real-time data from MES/SCADA systems — supports Ignition (MQTT + REST) and Modbus TCP for direct PLC reads.

## What It Does

Connects to Manufacturing Execution Systems and SCADA platforms to capture machine states, production counts, and downtime events. Supports Ignition by Inductive Automation via MQTT (Sparkplug B) for real-time data and REST for historical queries, plus Modbus TCP for direct PLC reads on legacy equipment. Configurable tag mapping translates raw tags to standard manufacturing fields.

## Quick Example

```bash
# Connect to Ignition via MQTT
mes connect --adapter ignition-mqtt --host 192.168.1.100 --port 1883
→ ✅ Connected | Subscribed to spBv1.0/Plant1/#

# Read current machine state
mes state --equipment EQ-001
→ State: running | Speed: 45 units/min | Count: 12,340

# Get recent events
mes events --equipment EQ-001 --since "2026-09-04 08:00" --limit 5
→ 08:15 Started | 09:30 Fault code F-012 | 09:45 Resumed

# List available tags
mes tags --equipment EQ-001 --pattern "*temperature*"
→ Line1/Machine1/Temperature: 72.4°C
```

## When to Use / When NOT To

**Use when:**
- Connecting to Ignition, SCADA, or PLC systems
- Reading real-time machine states and production counts
- Capturing automated downtime events from MES
- Getting meter readings for meter-based PMs

**Don't use for:**
- ERP business data (orders, BOMs) → use erp-connector
- Manual data entry workflows

## Prerequisites

- [ ] MES/SCADA system accessible from agent host
- [ ] Network connectivity to OT network (VPN or dedicated link)
- [ ] MQTT broker or REST API credentials configured
- [ ] Tag mapping defined for target equipment
- [ ] NTP synchronisation between MES and agent host

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Manufacturing (Production) |
| Owning Profile | production-manager |
| Slash Command | N/A |
| Related Skills | production-oee, maintenance-downtime, maintenance-pm, erp-connector |

## Configuration

```bash
# .env — Ignition MQTT
MES_ADAPTER=ignition-mqtt
MES_HOST=192.168.1.100
MES_PORT=1883
MES_MQTT_TOPIC_PREFIX=spBv1.0/Plant1
MES_MQTT_CLIENT_ID=hermes-mes-connector-01

# .env — Modbus TCP
MES_ADAPTER=modbus
MES_MODBUS_HOST=192.168.1.50
MES_MODBUS_PORT=502
MES_MODBUS_TIMEOUT=5
```

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — Ignition MQTT/REST + Modbus TCP adapters, tag mapping, poller |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
