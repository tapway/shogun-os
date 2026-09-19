"""Gateway Manager — spawn, monitor, restart, and kill Hermes gateway processes.

Each active department gets its own ``hermes serve --profile <name> --port <port>``
subprocess. The manager tracks PIDs, runs periodic health checks via TCP connect,
and auto-restarts crashed gateways (up to MAX_RESTARTS consecutive failures).

Usage::

    # In main.py lifespan():
    from gateway_manager import gateway_manager
    await gateway_manager.start()   # spawns active dept gateways
    yield                           # app runs
    await gateway_manager.stop()    # kills all on shutdown
"""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
import signal
import socket
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────────────────────

HERMES_BIN = shutil.which("hermes") or str(
    Path.home() / "AppData" / "Local" / "hermes" / "hermes-agent" / "venv" / "Scripts" / "hermes.exe"
)
HEALTH_CHECK_INTERVAL = 15  # seconds between TCP health checks
SPAWN_STAGGER_DELAY = 2  # seconds between each gateway spawn
MAX_RESTARTS = 5  # max consecutive restarts before giving up
RESTART_COOLDOWN = 60  # seconds before resetting consecutive failure count
CONNECT_TIMEOUT = 3  # seconds for TCP health check


@dataclass
class GatewayState:
    """Per-department gateway process state."""
    profile_name: str
    port: int
    process: Optional[asyncio.subprocess.Process] = None
    pid: Optional[int] = None
    state: str = "stopped"  # stopped | spawning | running | failed
    consecutive_failures: int = 0
    last_failure_time: float = 0.0
    restart_count: int = 0
    status_message: str = ""


class GatewayManager:
    """Manages Hermes gateway subprocesses for all active departments."""

    def __init__(self) -> None:
        self._gateways: Dict[str, GatewayState] = {}
        self._health_task: Optional[asyncio.Task] = None
        self._running = False

    @property
    def gateways(self) -> Dict[str, GatewayState]:
        return self._gateways

    def get_state(self, dept_name: str) -> Optional[GatewayState]:
        """Get gateway state for a department (by name or profile_name)."""
        if dept_name in self._gateways:
            return self._gateways[dept_name]
        # Try matching by profile_name
        for gw in self._gateways.values():
            if gw.profile_name == dept_name:
                return gw
        return None

    def is_ready(self, dept_name: str) -> bool:
        """Check if a department's gateway is running and healthy."""
        gw = self.get_state(dept_name)
        return gw is not None and gw.state == "running"

    async def start(self, departments: List[Tuple[str, str, int]]) -> None:
        """Start gateway processes for all active departments.

        Args:
            departments: List of (name, profile_name, port) tuples from DB.
        """
        if self._running:
            logger.warning("GatewayManager already running")
            return

        self._running = True
        logger.info("GatewayManager starting — %d departments", len(departments))

        # Initialize states
        for name, profile_name, port in departments:
            self._gateways[name] = GatewayState(
                profile_name=profile_name,
                port=port,
                state="stopped",
                status_message="Waiting to start...",
            )

        # Spawn gateways with stagger to avoid resource spike
        for name, profile_name, port in departments:
            if not self._running:
                break
            await self._spawn(name)
            await asyncio.sleep(SPAWN_STAGGER_DELAY)

        # Start health check loop
        self._health_task = asyncio.create_task(self._health_check_loop())
        logger.info("GatewayManager started — %d gateways managed", len(self._gateways))

    async def stop(self) -> None:
        """Stop all gateway processes gracefully."""
        self._running = False

        if self._health_task and not self._health_task.done():
            self._health_task.cancel()
            try:
                await self._health_task
            except asyncio.CancelledError:
                pass

        for name, gw in self._gateways.items():
            await self._kill(name)

        logger.info("GatewayManager stopped — all gateways terminated")

    async def _spawn(self, name: str) -> None:
        """Spawn a gateway process for the given department."""
        gw = self._gateways.get(name)
        if not gw:
            return

        # Check if already running
        if gw.state == "running" and gw.process and gw.process.returncode is None:
            return

        # Check max restarts
        if gw.consecutive_failures >= MAX_RESTARTS:
            elapsed = asyncio.get_event_loop().time() - gw.last_failure_time
            if elapsed < RESTART_COOLDOWN:
                gw.state = "failed"
                gw.status_message = f"Max restarts ({MAX_RESTARTS}) reached — waiting {int(RESTART_COOLDOWN - elapsed)}s"
                logger.warning("Gateway %s hit max restarts, cooling down", name)
                return
            else:
                # Reset after cooldown
                gw.consecutive_failures = 0
                gw.restart_count = 0

        gw.state = "spawning"
        gw.status_message = f"Starting {gw.profile_name} on port {gw.port}..."
        logger.info("Spawning gateway %s (profile=%s port=%d)", name, gw.profile_name, gw.port)

        try:
            env = dict(os.environ)
            env["HERMES_HOME"] = str(Path.home() / ".hermes")

            cmd = [
                HERMES_BIN,
                "-p", gw.profile_name,
                "serve",
                "--port", str(gw.port),
                "--host", "127.0.0.1",
                "--skip-build",
                "--isolated",
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )

            gw.process = process
            gw.pid = process.pid

            # Wait briefly for startup, then check if process died immediately
            await asyncio.sleep(1.5)
            if process.returncode is not None:
                stderr = ""
                try:
                    stderr = (await process.stderr.read()).decode(errors="replace")[:500]
                except Exception:
                    pass
                gw.state = "failed"
                gw.consecutive_failures += 1
                gw.last_failure_time = asyncio.get_event_loop().time()
                gw.restart_count += 1
                gw.status_message = f"Failed to start (exit {process.returncode}): {stderr[:100]}" if stderr else f"Process exited immediately (code {process.returncode}). Check profile '{gw.profile_name}' exists in ~/.hermes/profiles/"
                logger.error("Gateway %s failed to start (exit %d): %s", name, process.returncode, stderr[:200])
                return

            gw.state = "running"
            gw.status_message = f"Running on port {gw.port}"
            logger.info("Gateway %s started (pid=%d port=%d)", name, gw.pid, gw.port)

        except FileNotFoundError:
            gw.state = "failed"
            gw.status_message = f"Hermes binary not found at {HERMES_BIN}"
            logger.error("Hermes binary not found: %s", HERMES_BIN)
        except Exception as exc:
            gw.state = "failed"
            gw.consecutive_failures += 1
            gw.last_failure_time = asyncio.get_event_loop().time()
            gw.status_message = f"Spawn error: {exc}"
            logger.error("Failed to spawn gateway %s: %s", name, exc)

    async def _kill(self, name: str) -> None:
        """Kill a gateway process."""
        gw = self._gateways.get(name)
        if not gw or not gw.process:
            return

        if gw.process.returncode is not None:
            gw.state = "stopped"
            gw.status_message = "Stopped"
            return

        logger.info("Stopping gateway %s (pid=%d)", name, gw.pid)
        try:
            gw.process.terminate()
            try:
                await asyncio.wait_for(gw.process.wait(), timeout=10)
            except asyncio.TimeoutError:
                logger.warning("Gateway %s did not exit gracefully, killing", name)
                gw.process.kill()
                await gw.process.wait()
        except ProcessLookupError:
            pass
        except Exception as exc:
            logger.warning("Error stopping gateway %s: %s", name, exc)

        gw.state = "stopped"
        gw.pid = None
        gw.process = None
        gw.status_message = "Stopped"

    def _port_open(self, host: str, port: int) -> bool:
        """Quick TCP connect check."""
        try:
            with socket.create_connection((host, port), timeout=CONNECT_TIMEOUT):
                return True
        except OSError:
            return False

    async def _health_check_loop(self) -> None:
        """Periodic health check — restart dead gateways."""
        while self._running:
            try:
                await asyncio.sleep(HEALTH_CHECK_INTERVAL)
            except asyncio.CancelledError:
                return

            for name, gw in list(self._gateways.items()):
                if not self._running:
                    break

                if gw.state == "failed" and gw.consecutive_failures >= MAX_RESTARTS:
                    # Check if cooldown expired
                    elapsed = asyncio.get_event_loop().time() - gw.last_failure_time
                    if elapsed >= RESTART_COOLDOWN:
                        gw.consecutive_failures = 0
                        gw.restart_count = 0
                        await self._spawn(name)
                    continue

                if gw.state not in ("running", "spawning"):
                    continue

                # Check if process died
                if gw.process and gw.process.returncode is not None:
                    logger.warning("Gateway %s process died (exit %d)", name, gw.process.returncode)
                    gw.consecutive_failures += 1
                    gw.last_failure_time = asyncio.get_event_loop().time()
                    gw.restart_count += 1
                    gw.process = None
                    gw.pid = None

                    if gw.consecutive_failures < MAX_RESTARTS:
                        gw.status_message = f"Restarting ({gw.restart_count})..."
                        await self._spawn(name)
                    else:
                        gw.state = "failed"
                        gw.status_message = f"Crashed {MAX_RESTARTS} times — profile '{gw.profile_name}' may be misconfigured. Check ~/.hermes/profiles/{gw.profile_name}/ and server logs."
                    continue

                # TCP health check for running gateways
                if gw.state == "running":
                    if not self._port_open("127.0.0.1", gw.port):
                        # Port not responding but process alive — might still be starting
                        # Only count as failure if it's been running for a while
                        gw.status_message = f"Port {gw.port} not responding..."
                    else:
                        # Healthy — reset failure counter
                        if gw.consecutive_failures > 0:
                            gw.consecutive_failures = 0
                            gw.restart_count = 0
                        gw.status_message = f"Running on port {gw.port}"


# ── Singleton instance ───────────────────────────────────────────────────────

gateway_manager = GatewayManager()
