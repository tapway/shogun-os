# Deal Attachments Feature — Implementation Plan for Demo Branch

## Overview
Add file attachment support to CRM deals. Users can upload files (contracts, proposals, etc.) 
to individual deals, with metadata persisted to the brain and files stored on disk.

## Architecture

### Backend: `shogun-web/server/deal_attachments.py`
New router module with 3 endpoints:

1. **POST `/api/departments/{name}/dashboard/deals/{slug}/attachments`**
   - Accept multipart form: `file` (required) + `note` (optional)
   - Validate file extension (reject .sh, .exe, .bat, etc.)
   - Save to `~/brain/crm/deals/attachments/<slug>/<timestamp>_<filename>`
   - Append attachment entry to deal's markdown frontmatter in `~/brain/crm/deals/<slug>.md`
   - Log activity to `~/brain/crm/deals/activity-log.md`
   - Auth: `get_current_user` + `require_department_access(name="crm")`
   - Return: `{ ok: true, filename, size_bytes, uploaded_at }`

2. **GET `/api/departments/{name}/dashboard/deals/{slug}/attachments`**
   - List all attachments for a deal (newest first)
   - Read from deal's frontmatter `attachments:` array
   - Auth: same as POST
   - Return: `{ attachments: [{ filename, size_bytes, uploaded_at, note }] }`

3. **GET `/api/departments/{name}/dashboard/deals/{slug}/attachments/{filename}`**
   - Serve file bytes with proper Content-Type
   - Traversal-safe: validate filename has no `..` or `/`
   - Auth: same as POST
   - Return: File response with `Content-Disposition: attachment`

### Brain Persistence Structure
```
~/brain/crm/deals/
├── <slug>.md              # Deal file with frontmatter
│   └── attachments:       # YAML list in frontmatter
│       - filename: 20260904_120000_contract.pdf
│         size_bytes: 12345
│         uploaded_at: 2026-09-04T12:00:00Z
│         note: "Signed LOI"
│         uploaded_by: "Chee How"
├── attachments/
│   └── <slug>/
│       ├── 20260904_120000_contract.pdf
│       └── 20260904_120500_proposal.docx
└── activity-log.md        # Append-only log
```

### Frontend: `DealAttachmentsPanel.tsx`
New component wired into `DealDetailView` in `DealsTab.tsx`:

- **Props**: `dealSlug: string`, `color: string`
- **Features**:
  - "Attach file" button → file picker + optional note input
  - Live list of attachments (filename, size, date, note)
  - Per-file download button
  - Loading states, error handling
  - Uses React Query for caching/refetch

### API Helpers: `api.ts`
Add to `departmentsApi`:
```typescript
crmDealAttachmentsList: (dept: string, slug: string) => ...
crmDealAttachmentUpload: (dept: string, slug: string, file: File, note?: string) => ...
crmDealAttachmentDownloadUrl: (dept: string, slug: string, filename: string) => string
```

### Integration Points

1. **main.py**: Mount new router
   ```python
   import deal_attachments
   app.include_router(deal_attachments.router, prefix="/api")
   ```

2. **DealsTab.tsx**: Import and render `DealAttachmentsPanel` inside `DealDetailView`
   ```tsx
   <DealAttachmentsPanel dealSlug={deal.slug} color={color} />
   ```

3. **types.ts**: Add `CrmDealAttachment` interface
   ```typescript
   export interface CrmDealAttachment {
     filename: string;
     size_bytes: number;
     uploaded_at: string;
     note?: string;
     uploaded_by?: string;
   }
   ```

## Security Considerations

1. **File validation**: Whitelist extensions (.pdf, .docx, .xlsx, .png, .jpg, .txt, .csv)
2. **Path traversal**: Reject filenames containing `..`, `/`, `\`
3. **Auth gating**: All endpoints require valid session + CRM department access
4. **File size limit**: Max 10MB per upload
5. **Storage quota**: None initially (can add later)

## Test Matrix

| Test | Expected |
|------|----------|
| POST with valid file | 200 + file saved + frontmatter updated |
| POST without auth | 401 |
| POST with bad extension (.sh) | 400 |
| POST to non-existent deal | 404 (or create deal dir?) |
| GET list | 200 + attachments array |
| GET download valid file | 200 + file bytes |
| GET download with traversal (`../etc/passwd`) | 400 |
| GET download non-existent file | 404 |

## Files to Create/Modify

### New Files
1. `shogun-web/server/deal_attachments.py` (~150 lines)
2. `shogun-web/ui/src/components/dashboards/crm/DealAttachmentsPanel.tsx` (~120 lines)

### Modified Files
1. `shogun-web/server/main.py` (+2 lines: import + mount router)
2. `shogun-web/ui/src/components/dashboards/crm/DealsTab.tsx` (+7 lines: import + render panel)
3. `shogun-web/ui/src/lib/api.ts` (+17 lines: 3 API helpers)
4. `shogun-web/ui/src/lib/types.ts` (+8 lines: CrmDealAttachment interface)

## Implementation Order

1. ✅ Study existing codebase (done)
2. Create `deal_attachments.py` backend router
3. Add types to `types.ts`
4. Add API helpers to `api.ts`
5. Create `DealAttachmentsPanel.tsx` frontend component
6. Wire panel into `DealsTab.tsx`
7. Mount router in `main.py`
8. Test all endpoints manually
9. Commit only these 6 files (leave other uncommitted work untouched)

## Notes

- Demo branch uses mock data, but attachments will persist to real brain filesystem
- Deal slugs in mock data use format `deals/<slug>` — need to strip prefix for filesystem paths
- Activity log format matches existing brain conventions (timestamp + emoji + description)
- No database changes needed — all persistence via filesystem + markdown frontmatter
