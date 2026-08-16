"""Comms channel management — test bot tokens, discover chat IDs.

Endpoints:
  POST /api/departments/{name}/comms/test
      Body: { channel_id: str (the CommsChannelConfig.id) }
      Tests the bot token for the specified channel by calling the
      platform's "who am I" API (Telegram getMe, Slack auth.test, etc).
      Updates the channel's last_tested_at, last_test_status, bot_username,
      bot_name, and last_error fields in provider_config.

  POST /api/departments/{name}/comms/discover
      Body: { channel_id: str (the CommsChannelConfig.id) }
      Discovers chat/group IDs from the platform (Telegram getUpdates,
      Slack conversations.list) so the admin can pick the right channel_id
      for cron delivery and group routing.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from auth import get_current_user, require_admin
from database import get_db
from models import Department, User, UserDepartment

logger = logging.getLogger("shogun.comms")
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_dept(db, tenant_id: int, name: str) -> Department:
    dept = db.execute(
        select(Department).where(
            Department.tenant_id == tenant_id,
            Department.name == name,
        )
    ).scalar_one_or_none()
    if dept is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Department not found")
    return dept


def _check_dept_access(db, user: User, dept: Department) -> None:
    if user.role in ("admin", "owner"):
        return
    assignment = db.execute(
        select(UserDepartment).where(
            UserDepartment.user_id == user.id,
            UserDepartment.department_id == dept.id,
        )
    ).scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="No access to this department")


def _get_channel_config(dept: Department, channel_id: str) -> Dict[str, Any]:
    """Find a comms channel by its .id field within the department config."""
    cfg = dept.provider_config or {}
    channels = cfg.get("comms_channels") or []
    for ch in channels:
        if ch.get("id") == channel_id:
            return ch
    raise HTTPException(
        status.HTTP_404_NOT_FOUND,
        detail=f"Channel '{channel_id}' not found in department config",
    )


def _get_bot_token(ch: Dict[str, Any]) -> Optional[str]:
    """Extract the bot token, accounting for '***' masking."""
    token = ch.get("bot_token")
    if token and token != "***":
        return token
    # Check credentials bag for platforms that store token there
    creds = ch.get("credentials") or {}
    for key in ("app_token", "bot_token", "access_token", "client_secret"):
        val = creds.get(key)
        if val and val != "***":
            return val
    return None


def _save_channel_update(
    db, dept: Department, channel_id: str, updates: Dict[str, Any]
) -> Dict[str, Any]:
    """Merge updates into a channel within dept.provider_config and persist."""
    cfg = dict(dept.provider_config or {})
    channels = list(cfg.get("comms_channels") or [])
    updated_channel: Optional[Dict[str, Any]] = None
    for i, ch in enumerate(channels):
        if ch.get("id") == channel_id:
            merged = {**ch, **updates}
            channels[i] = merged
            updated_channel = merged
            break
    if updated_channel is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Channel '{channel_id}' not found",
        )
    cfg["comms_channels"] = channels
    dept.provider_config = cfg
    flag_modified(dept, "provider_config")
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return updated_channel


# ---------------------------------------------------------------------------
# Platform-specific testers
# ---------------------------------------------------------------------------

async def _test_telegram(token: str) -> Dict[str, Any]:
    """Call Telegram getMe to validate the bot token."""
    url = f"https://api.telegram.org/bot{token}/getMe"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        data = resp.json()
    if not data.get("ok"):
        return {
            "ok": False,
            "error": data.get("description", "Telegram API returned error"),
        }
    result = data.get("result", {})
    return {
        "ok": True,
        "bot_username": result.get("username", ""),
        "bot_name": result.get("first_name", ""),
        "bot_id": str(result.get("id", "")),
    }


async def _test_slack(bot_token: str, app_token: Optional[str] = None) -> Dict[str, Any]:
    """Call Slack auth.test to validate the bot token."""
    if not bot_token:
        return {"ok": False, "error": "No bot token (xoxb-) provided"}
    headers = {"Authorization": f"Bearer {bot_token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post("https://slack.com/api/auth.test", headers=headers)
        data = resp.json()
    if not data.get("ok"):
        return {
            "ok": False,
            "error": data.get("error", "Slack auth.test failed"),
        }
    return {
        "ok": True,
        "bot_username": data.get("user", ""),
        "bot_name": data.get("user_id", ""),
        "bot_id": data.get("bot_id", ""),
        "team": data.get("team", ""),
        "url": data.get("url", ""),
    }


async def _test_discord(token: str) -> Dict[str, Any]:
    """Call Discord users/@me to validate the bot token."""
    headers = {"Authorization": f"Bot {token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get("https://discord.com/api/v10/users/@me", headers=headers)
    if resp.status_code == 401:
        return {"ok": False, "error": "Invalid bot token"}
    if resp.status_code >= 400:
        return {"ok": False, "error": f"Discord API returned {resp.status_code}"}
    data = resp.json()
    return {
        "ok": True,
        "bot_username": data.get("username", ""),
        "bot_name": data.get("global_name") or data.get("username", ""),
        "bot_id": data.get("id", ""),
    }


async def _test_generic(token: str) -> Dict[str, Any]:
    """Fallback for platforms without a simple 'who am I' API."""
    if not token:
        return {"ok": False, "error": "No bot token configured"}
    return {"ok": True, "bot_username": "", "bot_name": "configured"}


# ---------------------------------------------------------------------------
# Platform-specific chat ID discoverers
# ---------------------------------------------------------------------------

async def _discover_telegram(token: str) -> Dict[str, Any]:
    """Discover Telegram chat IDs.

    Tries two sources in order:
    1. Hermes state.db — the gateway already receives all messages and stores
       sessions with chat IDs. This works even while the gateway is running
       (getUpdates would return 409 Conflict).
    2. Telegram getUpdates API — fallback when gateway is not running.
       Requires that someone has sent a message in the group recently.
    """
    # --- Source 1: Hermes state.db (primary) ---
    chats = _discover_from_state_db()
    if chats:
        return {"ok": True, "chats": chats, "source": "state.db"}

    # --- Source 2: Telegram getUpdates (fallback) ---
    url = f"https://api.telegram.org/bot{token}/getUpdates"
    # Use offset=-1 to get only the last update, timeout=0 for instant response
    params = {"limit": 100, "timeout": 0}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params)
        data = resp.json()

    if not data.get("ok"):
        error_desc = data.get("description", "getUpdates failed")
        # 409 Conflict means the gateway is long-polling — state.db should have
        # been our primary source, so if we're here, state.db wasn't available.
        if "Conflict" in error_desc or "409" in str(data.get("error_code", "")):
            return {
                "ok": False,
                "error": (
                    "The Hermes gateway is running and consuming Telegram updates, "
                    "but state.db is not accessible. Make sure the gateway is running "
                    "and state.db is available, then try again. "
                    "Alternatively, stop the gateway temporarily and retry."
                ),
                "chats": [],
            }
        return {
            "ok": False,
            "error": error_desc,
            "chats": [],
        }

    chats: List[Dict[str, Any]] = []
    seen_ids = set()
    for update in data.get("result", []):
        msg = update.get("message") or update.get("my_chat_member") or {}
        chat = msg.get("chat", {})
        chat_id = str(chat.get("id", ""))
        if not chat_id or chat_id in seen_ids:
            continue
        seen_ids.add(chat_id)
        chat_type = chat.get("type", "private")
        title = chat.get("title") or (
            f"{chat.get('first_name', '')} {chat.get('last_name', '')}".strip()
        )
        chats.append({
            "id": chat_id,
            "title": title or "Unknown",
            "type": chat_type,
            "username": chat.get("username", ""),
        })

    if not chats:
        return {
            "ok": True,
            "chats": [],
            "source": "getUpdates",
            "note": (
                "No chats found. Send any message in the group so the bot can see it, "
                "then click Discover again."
            ),
        }

    return {"ok": True, "chats": chats, "source": "getUpdates"}


def _discover_from_state_db() -> List[Dict[str, Any]]:
    """Query Hermes state.db for Telegram sessions to discover chat IDs.

    The gateway receives all messages and stores sessions in state.db.
    Each session has a chat_id and display_name. We extract unique chat IDs
    along with the most recent display name for each.
    """
    import sys as _sys
    from pathlib import Path as _Path

    _HERMES_AGENT_DIR = _Path(r"C:\Users\user\AppData\Local\hermes\hermes-agent")
    _SessionDB = None

    # Try to import SessionDB (read Hermes state.db directly)
    try:
        if str(_HERMES_AGENT_DIR) not in _sys.path:
            _sys.path.insert(0, str(_HERMES_AGENT_DIR))
        from hermes_state import SessionDB  # type: ignore
        _SessionDB = SessionDB
    except Exception:
        return []

    try:
        sdb = _SessionDB()
    except Exception:
        return []

    chats: List[Dict[str, Any]] = []
    seen_ids = set()

    try:
        sessions = sdb.list_gateway_sessions(platform="telegram", active_only=False)
    except Exception:
        try:
            sdb.close()
        except Exception:
            pass
        return []

    for sess in sessions:
        chat_id = str(sess.get("chat_id", "") or "")
        if not chat_id or chat_id in seen_ids:
            continue
        seen_ids.add(chat_id)

        display_name = sess.get("display_name") or "Unknown"
        chat_type = sess.get("chat_type", "")

        # Infer chat type from chat_id sign convention
        # Negative = group/supergroup, positive = private DM
        if not chat_type:
            try:
                cid = int(chat_id)
                chat_type = "supergroup" if cid < 0 else "private"
            except ValueError:
                chat_type = "unknown"

        chats.append({
            "id": chat_id,
            "title": display_name,
            "type": chat_type,
            "username": "",
        })

    try:
        sdb.close()
    except Exception:
        pass

    return chats


async def _discover_slack(bot_token: str) -> Dict[str, Any]:
    """List public + private channels the bot is a member of."""
    headers = {"Authorization": f"Bearer {bot_token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            "https://slack.com/api/conversations.list",
            headers=headers,
            json={"types": "public_channel,private_channel", "limit": 200},
        )
        data = resp.json()
    if not data.get("ok"):
        return {
            "ok": False,
            "error": data.get("error", "conversations.list failed"),
            "chats": [],
        }

    chats: List[Dict[str, Any]] = []
    for ch in data.get("channels", []):
        chats.append({
            "id": ch.get("id", ""),
            "title": ch.get("name", "Unknown"),
            "type": "channel" if ch.get("is_channel") else "group",
            "is_member": ch.get("is_member", False),
            "num_members": ch.get("num_members", 0),
        })
    return {"ok": True, "chats": chats}


async def _discover_discord(token: str) -> Dict[str, Any]:
    """List guilds (servers) the bot is in. Channel-level discovery requires
    the GUILD_MESSAGES intent, so we return guilds as a starting point."""
    headers = {"Authorization": f"Bot {token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://discord.com/api/v10/users/@me/guilds", headers=headers
        )
    if resp.status_code >= 400:
        return {
            "ok": False,
            "error": f"Discord API returned {resp.status_code}",
            "chats": [],
        }
    guilds = resp.json()
    chats: List[Dict[str, Any]] = []
    for g in guilds:
        chats.append({
            "id": g.get("id", ""),
            "title": g.get("name", "Unknown"),
            "type": "guild",
        })
    return {"ok": True, "chats": chats}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/departments/{name}/comms/test")
async def test_comms_channel(
    name: str,
    body: Dict[str, Any] = Body(...),
    user: User = Depends(require_admin),
    db=Depends(get_db),
) -> Dict[str, Any]:
    """Test a comms channel's bot token by calling the platform's whoami API.

    Updates the channel's test status fields in provider_config and returns
    the result. Also auto-fills bot_username and bot_name if discovered.
    """
    channel_id = body.get("channel_id") or ""
    if not channel_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="channel_id is required")

    dept = _get_dept(db, user.tenant_id, name)
    ch = _get_channel_config(dept, channel_id)
    platform = ch.get("key", "")
    token = _get_bot_token(ch)

    if not token:
        return {
            "ok": False,
            "channel_id": channel_id,
            "error": "No bot token configured. Enter a token first.",
        }

    # Dispatch to platform tester
    try:
        if platform == "telegram":
            result = await _test_telegram(token)
        elif platform == "slack":
            app_token = (ch.get("credentials") or {}).get("app_token")
            if app_token and app_token != "***":
                pass  # app_token is not tested here, only bot_token
            result = await _test_slack(token)
        elif platform == "discord":
            result = await _test_discord(token)
        else:
            result = await _test_generic(token)
    except httpx.HTTPError as e:
        result = {"ok": False, "error": f"Network error: {e}"}
    except Exception as e:
        logger.exception("Comms test failed for %s/%s", name, channel_id)
        result = {"ok": False, "error": str(e)}

    # Persist results
    now = datetime.now(timezone.utc).isoformat()
    updates: Dict[str, Any] = {
        "last_tested_at": now,
        "last_test_status": "ok" if result.get("ok") else "error",
        "status": "connected" if result.get("ok") else "error",
    }
    if result.get("ok"):
        updates["bot_username"] = result.get("bot_username", "")
        updates["bot_name"] = result.get("bot_name", "")
        updates["last_error"] = ""
    else:
        updates["last_error"] = result.get("error", "Unknown error")

    updated = _save_channel_update(db, dept, channel_id, updates)

    return {
        "ok": result.get("ok", False),
        "channel_id": channel_id,
        "platform": platform,
        "bot_username": updates.get("bot_username", ""),
        "bot_name": updates.get("bot_name", ""),
        "error": result.get("error"),
        "last_tested_at": now,
        "channel": _mask_channel_for_ui(updated),
    }


@router.post("/departments/{name}/comms/discover")
async def discover_comms_chats(
    name: str,
    body: Dict[str, Any] = Body(...),
    user: User = Depends(require_admin),
    db=Depends(get_db),
) -> Dict[str, Any]:
    """Discover chat/group IDs from the platform.

    Returns a list of chats the bot can see. The admin can pick one to
    auto-fill the channel_id field for cron delivery and group routing.
    """
    channel_id = body.get("channel_id") or ""
    if not channel_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="channel_id is required")

    dept = _get_dept(db, user.tenant_id, name)
    ch = _get_channel_config(dept, channel_id)
    platform = ch.get("key", "")
    token = _get_bot_token(ch)

    if not token:
        return {
            "ok": False,
            "error": "No bot token configured. Test the connection first.",
            "chats": [],
        }

    try:
        if platform == "telegram":
            result = await _discover_telegram(token)
        elif platform == "slack":
            result = await _discover_slack(token)
        elif platform == "discord":
            result = await _discover_discord(token)
        else:
            result = {
                "ok": False,
                "error": f"Chat discovery not supported for platform '{platform}'",
                "chats": [],
            }
    except httpx.HTTPError as e:
        result = {"ok": False, "error": f"Network error: {e}", "chats": []}
    except Exception as e:
        logger.exception("Comms discover failed for %s/%s", name, channel_id)
        result = {"ok": False, "error": str(e), "chats": []}

    return {
        "ok": result.get("ok", False),
        "channel_id": channel_id,
        "platform": platform,
        "chats": result.get("chats", []),
        "error": result.get("error"),
    }


def _mask_channel_for_ui(ch: Dict[str, Any]) -> Dict[str, Any]:
    """Return a copy of the channel dict with secrets masked for UI return."""
    ch_copy = dict(ch)
    if ch_copy.get("bot_token"):
        ch_copy["bot_token"] = "***"
    if ch_copy.get("webhook_url"):
        ch_copy["webhook_url"] = "***"
    creds = ch_copy.get("credentials")
    if isinstance(creds, dict):
        masked_creds = {}
        for ck, cv in creds.items():
            if cv and any(
                s in ck.lower() for s in ("secret", "token", "password", "api_key", "key")
            ):
                masked_creds[ck] = "***"
            else:
                masked_creds[ck] = cv
        ch_copy["credentials"] = masked_creds
    return ch_copy
