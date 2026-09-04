![General](https://img.shields.io/badge/dept-General-gray)

# Obsidian Vault

> Read, search, create, and edit notes in the Obsidian vault using filesystem-first tools.

## What It Does

Provides filesystem-first operations for Obsidian vault management: reading notes with line numbers, listing and searching notes by filename or content, creating new notes, appending content, and adding wikilinks. Uses `read_file`, `search_files`, `write_file`, and `patch` tools instead of shell commands for reliability with paths containing spaces.

## Quick Example

```
# List all notes
search_files(pattern="*.md", target="files", path="/vault/path")
→ meeting-notes/2026-08-14.md
  projects/shogun-os.md
  ideas/product-roadmap.md

# Search note contents
search_files(pattern="sprint.*plan", target="content", 
             path="/vault/path", file_glob="*.md")
→ projects/shogun-os.md:42: ## Sprint Plan Q3

# Read a note
read_file(path="/vault/path/projects/shogun-os.md")
→ 1| # Shogun OS Project Notes
  2| ## Sprint Plan Q3
  ...

# Create a new note
write_file(path="/vault/path/meetings/2026-08-15.md",
           content="# Team Sync\n## Action Items\n- ...")
```

## When to Use / When NOT To

**Use when:**
- Reading or searching Obsidian notes
- Creating new notes or appending to existing ones
- Managing wikilinks between notes
- Any filesystem-based vault operation

**Don't use for:**
- Obsidian plugin operations → use Obsidian GUI
- Graph view or canvas features → use Obsidian GUI
- Non-markdown file management

## Prerequisites

- [ ] Obsidian vault accessible on filesystem
- [ ] `OBSIDIAN_VAULT_PATH` env var set (or default `~/Documents/Obsidian Vault`)
- [ ] Read/write permissions to vault directory

## Department & Profile

| Field | Value |
|-------|-------|
| Department | General |
| Owning Profile | Any |
| Slash Command | `/obsidian` |
| Related Skills | [gbrain-capture](../../gbrain-capture/gbrain-capture/) |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-04 | Initial release — filesystem-first approach, read/list/search/create/append/wikilink |

---

> ℹ️ Full agent instructions: [SKILL.md](./SKILL.md)
