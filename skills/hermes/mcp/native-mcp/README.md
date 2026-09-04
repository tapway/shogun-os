![Hermes](https://img.shields.io/badge/dept-Hermes-green)

# Native MCP Client

> Connect MCP servers and register their tools as first-class agent tools — no bridge CLI needed.

## What It Does

Hermes Agent's built-in MCP client connects to MCP servers at startup, discovers their tools, and makes them available alongside built-in tools like `terminal` and `read_file`. Supports both stdio (npx/uvx) and HTTP transports with automatic reconnection and credential stripping.

## Quick Example

```yaml
# ~/.hermes/config.yaml
mcp_servers:
  time:
    command: "uvx"
    args: ["mcp-server-time"]

  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_..."
```

After restart, tools like `mcp_time_get_current_time` and `mcp_github_list_issues` are available in every conversation.

## When to Use / When NOT To

**Use when:**
- Adding external capabilities via MCP (filesystem, GitHub, databases, APIs)
- Running local stdio-based MCP servers (npx, uvx)
- Connecting to remote HTTP/StreamableHTTP MCP servers
- Making MCP tools auto-discovered in every conversation

**Don't use for:**
- Ad-hoc one-off MCP calls without config → use mcporter
- Non-MCP integrations → use shogunify or native connectors

## Prerequisites

- [ ] `mcp` Python package installed (`pip install mcp`)
- [ ] Node.js for npx-based servers
- [ ] uv for uvx-based servers
- [ ] Server credentials in config `env` block (not shell environment)

## Department & Profile

| Field | Value |
|-------|-------|
| Department | Hermes |
| Owning Profile | default (shared) |
| Slash Command | N/A (config-driven) |
| Related Skills | shogunify, hermes-agent |

## Configuration

```yaml
# Stdio transport
mcp_servers:
  server_name:
    command: "npx"
    args: ["-y", "pkg-name"]
    env: { SOME_API_KEY: "value" }
    timeout: 120
    connect_timeout: 60

# HTTP transport
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/mcp"
    headers: { Authorization: "Bearer sk-..." }
    timeout: 180
```

Tools are named `mcp_{server}_{tool}` with hyphens/dots replaced by underscores.

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — stdio/HTTP transports, auto-discovery, security filtering, sampling support |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
