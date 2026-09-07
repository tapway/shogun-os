# Shogun OS — Deal Attachment API Guide

> How to store a file against a CRM deal via the **Shogun OS unified dashboard** at
> `shogunos.gotapway.com`. Every upload persists into the CRM brain
> (`~/brain/deals/attachments/<slug>/`), updates the deal's frontmatter, and
> appends to the activity log.

---

## Key fact: use the DOMAIN, not the public IP

The Shogun web server binds **only to `127.0.0.1:3004`** on the host. It is
**not** reachable on the public IP/port. The only public door is a Cloudflare
tunnel that maps:

```
https://shogunos.gotapway.com  →  localhost:3004
```

So always call: **`https://shogunos.gotapway.com`** — never the public IP.

All endpoints are session-protected: you must send your login token as
`Authorization: Bearer <TOKEN>`. No token ⇒ `401`.

---

## 1. Get a token

```bash
curl -s https://shogunos.gotapway.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@gotapway.com","password":"YOUR_PASSWORD"}'
```

Grab the `access_token` value from the JSON response and use it as `<TOKEN>`
in every call below.

---

## 2. Upload an attachment

```bash
curl -s -X POST \
  "https://shogunos.gotapway.com/api/departments/crm/dashboard/deals/<DEAL_SLUG>/attachments" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/contract.pdf" \
  -F "note=Signed LOI"
```

- `file` — the file bytes (required)
- `note` — optional short note attached to the record

**Success — HTTP 200:**
```json
{
  "ok": true,
  "slug": "habib-jewels-cctv-command-centre",
  "attachment": {
    "at": "2026-09-02T11:17:02.000Z",
    "name": "20260902_111702_contract.pdf",
    "original_name": "contract.pdf",
    "path": "deals/attachments/habib-jewels-cctv-command-centre/20260902_111702_contract.pdf",
    "size": 123,
    "uploaded_by": "Chee How",
    "note": "Signed LOI"
  },
  "deal_file": "deals/habib-jewels-cctv-command-centre.md"
}
```

This writes the bytes to the CRM brain, updates the deal frontmatter
(`attachments:` + `updated`), and appends to the activity log.

---

## 3. List attachments

```bash
curl -s \
  "https://shogunos.gotapway.com/api/departments/crm/dashboard/deals/<DEAL_SLUG>/attachments" \
  -H "Authorization: Bearer <TOKEN>"
```

Returns newest-first:
```json
{
  "slug": "habib-jewels-cctv-command-centre",
  "attachments": [
    { "name": "20260902_111702_contract.pdf", "size": 123, "path": "deals/attachments/.../20260902_111702_contract.pdf", "modified": "2026-09-02T11:17:02.000Z" }
  ],
  "total": 1
}
```

---

## 4. Download one

```bash
curl -s \
  "https://shogunos.gotapway.com/api/departments/crm/dashboard/deals/<DEAL_SLUG>/attachments/<FILE_NAME>" \
  -H "Authorization: Bearer <TOKEN>" \
  -o downloaded.pdf
```

---

## Field reference / rules

| Field | Rule |
|---|---|
| `<DEAL_SLUG>` | The deal's brain file slug, e.g. `habib-jewels-cctv-command-centre`. `deals/` prefix also accepted. |
| `<FILE_NAME>` | The stored name returned by List (starts with a timestamp, e.g. `20260902_111702_contract.pdf`). |
| Dept slug | `crm` — the CRM module on the dashboard. |
| Auth | `Authorization: Bearer <TOKEN>`; missing/invalid ⇒ `401`. |
| Access | Users granted the CRM module, or global admin/owner. |
| Allowed types | `pdf, doc, docx, xls, xlsx, ppt, pptx, csv, png, jpg, jpeg, gif, webp, txt, md` |
| Rejected type | ⇒ `400` (e.g. `.sh`, `.exe`) |
| Max size | 50 MB; over-limit ⇒ `413` |
| Unknown deal | ⇒ `404` |

---

## Also available in the UI (no CLI needed)

Open the Shogun dashboard → **CRM** → **Deals** → click a deal → the
**Attachments** panel offers:
- **Attach file** button (with optional note)
- Live list of uploaded files
- Per-file **Save** (download)

---

### Troubleshooting
- `401` — not logged in / bad token. Re-run step 1.
- `403` — logged in but no CRM module access. Ask an admin to grant the CRM role.
- `404` on upload — the deal slug is wrong, or the file is not a deal record.
- `400` — file type not in the whitelist. See allowed types above.
- `413` — file exceeds 50 MB.