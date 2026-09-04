import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Upload, X, Download, RefreshCw } from 'lucide-react';
import { departmentsApi, getToken } from '../../../lib/api';

interface Props {
  dept: string;
  dealSlug: string;
  color: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DealAttachmentsPanel({ dept, dealSlug, color }: Props) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const list = useQuery({
    queryKey: ['deal-attachments', dept, dealSlug],
    queryFn: () => departmentsApi.dealAttachmentList(dept, dealSlug),
    refetchInterval: 60_000,
  });

  const doUpload = useMutation({
    mutationFn: (file: File) => departmentsApi.dealAttachmentUpload(dept, dealSlug, file, note),
    onSuccess: () => {
      setNote('');
      qc.invalidateQueries({ queryKey: ['deal-attachments', dept, dealSlug] });
    },
    onError: (e: Error) => setError(e.message || 'Upload failed'),
  });

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setError('');
    setUploading(true);
    try {
      await doUpload.mutateAsync(f);
    } finally {
      setUploading(false);
    }
  };

  const attachments = list.data?.attachments ?? [];

  // Download through the authenticated API so the session token is attached.
  const download = (name: string) => {
    const token = getToken();
    fetch(departmentsApi.dealAttachmentUrl(dept, dealSlug, name), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) {
          const status = res.status;
          let msg = 'Download failed';
          if (status === 401) msg = 'Session expired — please log in again';
          else if (status === 403) msg = 'Access denied — insufficient permissions';
          else if (status === 404) msg = 'File not found — may have been deleted';
          else if (status >= 500) msg = 'Server error — try again later';
          throw new Error(msg);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  return (
    <div className="sd-chart-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="sd-chart-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Paperclip className="h-4 w-4" style={{ color }} />
          Attachments
        </h3>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['deal-attachments', dept, dealSlug] })}
          title="Refresh"
          style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer' }}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Upload row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#fff',
            background: color,
            borderRadius: 6,
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Uploading…' : 'Attach file'}
          <input
            type="file"
            hidden
            disabled={uploading}
            onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }}
          />
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note (e.g. Signed LOI)"
          style={{
            flex: 1,
            minWidth: 160,
            padding: '8px 12px',
            fontSize: '0.85rem',
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            outline: 'none',
            background: 'transparent',
            color: TEXT,
          }}
        />
        {note && (
          <button
            onClick={() => setNote('')}
            title="Clear note"
            style={{ background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer' }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && <div style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: 8 }}>{error}</div>}

      {list.isLoading ? (
        <div style={{ fontSize: '0.85rem', color: MUTED }}>Loading attachments…</div>
      ) : attachments.length === 0 ? (
        <div style={{ fontSize: '0.85rem', color: MUTED }}>
          No attachments yet. Upload the first one (PDF, DOCX, XLSX, images…).
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {attachments.map((a) => (
            <li
              key={a.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 6,
                border: `1px solid ${BORDER}`,
                marginBottom: 6,
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Paperclip className="h-4 w-4 shrink-0" style={{ color: MUTED }} />
                <span style={{ color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.name}>
                  {a.name.replace(/^\d{8}_\d{6}_/, '')}
                </span>
                <span style={{ color: MUTED, whiteSpace: 'nowrap' }}>({fmtSize(a.size)})</span>
              </div>
              <button
                onClick={() => download(a.name)}
                title="Download"
                style={{
                  background: 'transparent',
                  border: `1px solid ${BORDER}`,
                  color: TEXT,
                  borderRadius: 4,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.75rem',
                }}
              >
                <Download className="h-3.5 w-3.5" /> Save
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}