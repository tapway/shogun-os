import { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertTriangle, X, FileScan, Search } from 'lucide-react';

interface EstateLegalScanTabProps {
  department: string;
  color: string;
}

interface ScanResult {
  id: number;
  filename: string;
  file_url: string;
  document_type: string;
  ocr_summary: string;
  interpretation: Record<string, any>;
  scanned_by: string;
  scan_date: string;
}

export function EstateLegalScanTab({ department, color }: EstateLegalScanTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ScanResult[]>([]);
  const [viewDoc, setViewDoc] = useState<ScanResult | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/departments/${department}/dashboard/scanned-documents`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch { setDocuments([]); }
  }, [department]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setScanResult(null);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/departments/${department}/dashboard/scan-document`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Scan failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setScanResult(data);
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan document');
    } finally {
      setLoading(false);
    }
  };

  const renderInterp = (interp: Record<string, any>) => {
    if (interp.raw_response) {
      return <p className="text-xs" style={{ color: 'var(--samurai-muted)' }}>{interp.raw_response.slice(0, 400)}</p>;
    }
    const interpretation = interp.interpretation || {};
    return (
      <>
        {interpretation.parties && Array.isArray(interpretation.parties) && interpretation.parties.length > 0 && (
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--samurai-muted)' }}>Parties</div>
            <div className="text-xs" style={{ color: 'var(--samurai-text)' }}>{interpretation.parties.join(', ')}</div>
          </div>
        )}
        {interpretation.duration && (
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--samurai-muted)' }}>Duration</div>
            <div className="text-xs" style={{ color: 'var(--samurai-text)' }}>{interpretation.duration}</div>
          </div>
        )}
        {interpretation.value && (
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--samurai-muted)' }}>Contract Value</div>
            <div className="text-xs" style={{ color: 'var(--samurai-text)' }}>{interpretation.value}</div>
          </div>
        )}
        {interpretation.key_obligations && Array.isArray(interpretation.key_obligations) && interpretation.key_obligations.length > 0 && (
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--samurai-muted)' }}>Key Obligations</div>
            <ul className="text-xs list-disc pl-4" style={{ color: 'var(--samurai-text)' }}>
              {interpretation.key_obligations.map((o: string, i: number) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}
        {interpretation.termination_clause && (
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--samurai-muted)' }}>Termination</div>
            <div className="text-xs" style={{ color: 'var(--samurai-text)' }}>{interpretation.termination_clause}</div>
          </div>
        )}
        {interpretation.penalty_clause && (
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--samurai-muted)' }}>Penalty</div>
            <div className="text-xs" style={{ color: 'var(--samurai-text)' }}>{interpretation.penalty_clause}</div>
          </div>
        )}
        {Array.isArray(interp.risks) && interp.risks.length > 0 && (
          <div className="pt-2 border-t" style={{ borderColor: 'var(--samurai-border)' }}>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--samurai-danger)' }}>⚠ Risks</div>
            <ul className="text-xs list-disc pl-4" style={{ color: 'var(--samurai-text)' }}>
              {interp.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
        {Array.isArray(interp.recommendations) && interp.recommendations.length > 0 && (
          <div className="pt-2 border-t" style={{ borderColor: 'var(--samurai-border)' }}>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--samurai-warning)' }}>Recommendations</div>
            <ol className="text-xs list-decimal pl-4" style={{ color: 'var(--samurai-text)' }}>
              {interp.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ol>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Upload + Scan */}
      <div className="rounded-lg border-2 border-dashed p-6 text-center" style={{ borderColor: 'var(--samurai-border)' }}>
        <div className="flex flex-col items-center gap-4">
          {file ? (
            <div className="flex items-center gap-2" style={{ color: 'var(--samurai-text)' }}>
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">{file.name}</span>
              <button type="button" className="text-xs" style={{ color: 'var(--samurai-muted)' }} onClick={() => { setFile(null); setScanResult(null); }}>Remove</button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8" style={{ color: 'var(--samurai-muted)' }} />
              <div>
                <label className="cursor-pointer text-sm font-medium" style={{ color }}>
                  Upload contract or legal document
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
                <p className="mt-1 text-xs" style={{ color: 'var(--samurai-muted)' }}>PDF, PNG, JPG</p>
              </div>
            </>
          )}
        </div>
      </div>

      {file && (
        <button type="button" onClick={handleScan} disabled={loading} className="sd-btn sd-btn-primary">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</> : <><FileScan className="h-4 w-4" /> Scan Document</>}
        </button>
      )}

      {error && (
        <div className="rounded-lg p-4 flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--samurai-danger) 12%, transparent)', color: 'var(--samurai-danger)' }}>
          <AlertTriangle className="h-4 w-4" /><span className="text-sm">{error}</span>
        </div>
      )}

      {/* Scan Result — Summary + Interpretation */}
      {scanResult && !error && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" style={{ color: 'var(--samurai-ok)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>{scanResult.filename}</span>
            </div>
            {scanResult.file_url && (
              <a href={scanResult.file_url} target="_blank" rel="noopener noreferrer" className="sd-btn sd-btn-secondary text-xs inline-flex">
                <FileText className="h-4 w-4" /> View Original
              </a>
            )}
          </div>

          {/* Summary Section */}
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--samurai-border)' }}>
            <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--samurai-surface-2)' }}>
              <FileText className="h-4 w-4" style={{ color: 'var(--samurai-accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>Summary</span>
              {scanResult.document_type && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--samurai-accent-fill)', color: 'var(--samurai-accent-button-text)' }}>{scanResult.document_type}</span>
              )}
              <span className="text-xs" style={{ color: 'var(--samurai-muted)' }}>— {scanResult.scanned_by} · {new Date(scanResult.scan_date).toLocaleString()}</span>
            </div>
            <div className="px-3 py-2">
              <p className="text-sm" style={{ color: 'var(--samurai-text)' }}>
                {scanResult.ocr_summary || scanResult.interpretation?.summary || 'No summary available.'}
              </p>
            </div>
          </div>

          {/* Interpretation Section */}
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--samurai-border)' }}>
            <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--samurai-surface-2)' }}>
              <Search className="h-4 w-4" style={{ color: 'var(--samurai-accent)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>Interpretation</span>
            </div>
            <div className="px-3 py-2 space-y-3">
              {renderInterp(scanResult.interpretation || {})}
            </div>
          </div>
        </div>
      )}

      {/* Scanned Documents List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--samurai-text)' }}>
            <FileText className="h-4 w-4" /> Scanned Documents ({documents.length})
          </h3>
          <button className="sd-btn sd-btn-ghost text-xs" onClick={loadDocuments}>Refresh</button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-6" style={{ color: 'var(--samurai-muted)' }}>
            <FileText className="h-8 w-8 mx-auto mb-2" style={{ opacity: 0.3 }} />
            <p className="text-sm">No scanned documents yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setViewDoc(doc)}
                className="w-full text-left rounded-lg p-3 transition hover:filter brightness-105"
                style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)', cursor: 'pointer' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--samurai-text)' }}>{doc.filename}</span>
                  <span className="text-xs" style={{ color: 'var(--samurai-muted)' }}>{new Date(doc.scan_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--samurai-muted)' }}>
                  {doc.document_type && <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--samurai-surface-2)' }}>{doc.document_type}</span>}
                  <span>By {doc.scanned_by}</span>
                </div>
                {doc.ocr_summary && <p className="text-xs mt-1 truncate" style={{ color: 'var(--samurai-muted)' }}>{doc.ocr_summary}</p>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View Document Modal */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setViewDoc(null)}>
          <div className="rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sticky top-0 z-10" style={{ background: 'var(--samurai-surface)', borderBottom: '1px solid var(--samurai-border)' }}>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: 'var(--samurai-muted)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--samurai-text)' }}>{viewDoc.filename}</span>
              </div>
              <button onClick={() => setViewDoc(null)} className="sd-btn sd-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-xs flex items-center gap-3" style={{ color: 'var(--samurai-muted)' }}>
                <span>{new Date(viewDoc.scan_date).toLocaleString()}</span>
                <span>By {viewDoc.scanned_by}</span>
                {viewDoc.document_type && <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--samurai-accent-fill)', color: 'var(--samurai-accent-button-text)' }}>{viewDoc.document_type}</span>}
              </div>
              {/* Summary */}
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--samurai-border)' }}>
                <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--samurai-surface-2)' }}>
                  <FileText className="h-4 w-4" style={{ color: 'var(--samurai-accent)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>Summary</span>
                </div>
                <div className="px-3 py-2">
                  <p className="text-sm" style={{ color: 'var(--samurai-text)' }}>{viewDoc.ocr_summary || viewDoc.interpretation?.summary || 'No summary available.'}</p>
                </div>
              </div>
              {/* Interpretation */}
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--samurai-border)' }}>
                <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--samurai-surface-2)' }}>
                  <Search className="h-4 w-4" style={{ color: 'var(--samurai-accent)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>Interpretation</span>
                </div>
                <div className="px-3 py-2 space-y-3">
                  {renderInterp(viewDoc.interpretation || {})}
                </div>
              </div>
            </div>
            <div className="p-4 sticky bottom-0 flex justify-end gap-2" style={{ background: 'var(--samurai-surface)', borderTop: '1px solid var(--samurai-border)' }}>
              {viewDoc.file_url && (
                <a href={viewDoc.file_url} target="_blank" rel="noopener noreferrer" className="sd-btn sd-btn-primary">
                  <FileText className="h-4 w-4" /> View Original Document
                </a>
              )}
              <button className="sd-btn sd-btn-secondary" onClick={() => setViewDoc(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
