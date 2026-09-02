import { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertTriangle, X, FileScan, Search, FolderOpen, Clock, Play, Plus, Trash2, Save, Settings } from 'lucide-react';

interface FinanceDocScanTabProps {
  department: string;
  color: string;
}

interface ScanSource {
  id: string;
  title: string;
  drive_url: string;
  template_path: string;
  schedule: string; // cron expression or "daily"|"weekly"
  last_run: string | null;
  next_run: string | null;
  document_type: string; // invoice, delivery_order, purchase_order, etc.
}

interface ScanResult {
  id: number;
  filename: string;
  file_url: string;
  output_excel_url?: string;
  source_id: string;
  source_title: string;
  document_type: string;
  ocr_summary: string;
  interpretation: Record<string, any>;
  scanned_by: string;
  scan_date: string;
  status: 'pending' | 'processed' | 'verified' | 'rejected';
}

export function FinanceDocScanTab({ department, color }: FinanceDocScanTabProps) {
  const [activeView, setActiveView] = useState<'sources' | 'results'>('sources');
  const [sources, setSources] = useState<ScanSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewSource, setViewSource] = useState<ScanSource | null>(null);
  const [editSource, setEditSource] = useState<ScanSource | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [viewResult, setViewResult] = useState<ScanResult | null>(null);

  // Form state for new/edit source
  const [formTitle, setFormTitle] = useState('');
  const [formDriveUrl, setFormDriveUrl] = useState('');
  const [formTemplate, setFormTemplate] = useState<File | null>(null);
  const [formSchedule, setFormSchedule] = useState('daily');
  const [formDocType, setFormDocType] = useState('invoice');

  const loadSources = useCallback(async () => {
    try {
      const res = await fetch(`/api/departments/${department}/dashboard/doc-scan/sources`);
      const data = await res.json();
      setSources(data.sources || []);
    } catch { setSources([]); }
  }, [department]);

  const loadResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/departments/${department}/dashboard/doc-scan/results`);
      const data = await res.json();
      setResults(data.results || []);
    } catch { setResults([]); }
  }, [department]);

  useEffect(() => {
    if (activeView === 'sources') loadSources();
    else loadResults();
  }, [activeView, loadSources, loadResults]);

  const handleSaveSource = async () => {
    if (!formTitle || !formDriveUrl) {
      setError('Title and Drive link are required');
      return;
    }
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('title', formTitle);
    formData.append('drive_url', formDriveUrl);
    formData.append('schedule', formSchedule);
    formData.append('document_type', formDocType);
    if (formTemplate) formData.append('template', formTemplate);

    try {
      const url = editSource 
        ? `/api/departments/${department}/dashboard/doc-scan/sources/${editSource.id}`
        : `/api/departments/${department}/dashboard/doc-scan/sources`;
      const res = await fetch(url, {
        method: editSource ? 'PUT' : 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Save failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      // Reset form
      setFormTitle('');
      setFormDriveUrl('');
      setFormTemplate(null);
      setFormSchedule('daily');
      setFormDocType('invoice');
      setEditSource(null);
      loadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save source');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Delete this source configuration?')) return;
    try {
      const res = await fetch(`/api/departments/${department}/dashboard/doc-scan/sources/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      loadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete source');
    }
  };

  const [lastRunExcelUrl, setLastRunExcelUrl] = useState<string | null>(null);

  const handleRunSource = async (id: string) => {
    setLoading(true);
    setError(null);
    setLastRunExcelUrl(null);
    try {
      const res = await fetch(`/api/departments/${department}/dashboard/doc-scan/sources/${id}/run`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Run failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.output_excel_url) {
        setLastRunExcelUrl(data.output_excel_url);
      }
      loadResults();
      setActiveView('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run source');
    } finally {
      setLoading(false);
    }
  };

  const handleSetSchedule = async (id: string, schedule: string) => {
    try {
      const res = await fetch(`/api/departments/${department}/dashboard/doc-scan/sources/${id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule }),
      });
      if (!res.ok) throw new Error('Schedule update failed');
      loadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule');
    }
  };

  const openEditModal = (source: ScanSource) => {
    setEditSource(source);
    setFormTitle(source.title);
    setFormDriveUrl(source.drive_url);
    setFormSchedule(source.schedule);
    setFormDocType(source.document_type);
    setFormTemplate(null);
    setViewSource(source);
  };

  const renderFields = (interp: Record<string, any>) => {
    const fields = interp.fields || {};
    if (!fields || Object.keys(fields).length === 0) return null;
    return Object.entries(fields).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && v.length === 0));
  };

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--samurai-border)' }}>
        <button
          className={`px-4 py-2 text-sm font-medium transition ${activeView === 'sources' ? 'border-b-2' : ''}`}
          style={{ 
            color: activeView === 'sources' ? color : 'var(--samurai-muted)',
            borderColor: activeView === 'sources' ? color : 'transparent'
          }}
          onClick={() => setActiveView('sources')}
        >
          <FolderOpen className="h-4 w-4 inline mr-2" />
          Scan Sources
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition ${activeView === 'results' ? 'border-b-2' : ''}`}
          style={{ 
            color: activeView === 'results' ? color : 'var(--samurai-muted)',
            borderColor: activeView === 'results' ? color : 'transparent'
          }}
          onClick={() => setActiveView('results')}
        >
          <FileScan className="h-4 w-4 inline mr-2" />
          Scan Results
        </button>
      </div>

      {error && (
        <div className="rounded-lg p-4 flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--samurai-danger) 12%, transparent)', color: 'var(--samurai-danger)' }}>
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* SOURCES VIEW */}
      {activeView === 'sources' && (
        <>
          {/* Add/Edit Source Form */}
          <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}>
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--samurai-text)' }}>
              <Settings className="h-4 w-4" />
              {editSource ? 'Edit Scan Source' : 'Add New Scan Source'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--samurai-muted)' }}>Title *</label>
                <input
                  type="text"
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{ background: 'var(--samurai-surface-2)', border: '1px solid var(--samurai-border)', color: 'var(--samurai-text)' }}
                  placeholder="e.g., Supplier Invoices"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--samurai-muted)' }}>Document Type</label>
                <select
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{ background: 'var(--samurai-surface-2)', border: '1px solid var(--samurai-border)', color: 'var(--samurai-text)' }}
                  value={formDocType}
                  onChange={(e) => setFormDocType(e.target.value)}
                >
                  <option value="invoice">Invoice</option>
                  <option value="delivery_order">Delivery Order</option>
                  <option value="purchase_order">Purchase Order</option>
                  <option value="receipt">Receipt</option>
                  <option value="quotation">Quotation</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium" style={{ color: 'var(--samurai-muted)' }}>Google Drive Folder Link *</label>
                <input
                  type="text"
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{ background: 'var(--samurai-surface-2)', border: '1px solid var(--samurai-border)', color: 'var(--samurai-text)' }}
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={formDriveUrl}
                  onChange={(e) => setFormDriveUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--samurai-muted)' }}>Schedule</label>
                <select
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{ background: 'var(--samurai-surface-2)', border: '1px solid var(--samurai-border)', color: 'var(--samurai-text)' }}
                  value={formSchedule}
                  onChange={(e) => setFormSchedule(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="manual">Manual Only</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--samurai-muted)' }}>Excel Template</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer sd-btn sd-btn-secondary text-xs">
                    <Upload className="h-4 w-4 mr-1" />
                    {formTemplate ? formTemplate.name : 'Upload Template'}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => setFormTemplate(e.target.files?.[0] || null)}
                    />
                  </label>
                  {formTemplate && (
                    <button type="button" className="text-xs" style={{ color: 'var(--samurai-muted)' }} onClick={() => setFormTemplate(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="sd-btn sd-btn-primary" onClick={handleSaveSource} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {editSource ? 'Update Source' : 'Save Source'}
              </button>
              {editSource && (
                <button className="sd-btn sd-btn-ghost" onClick={() => { setEditSource(null); setFormTitle(''); setFormDriveUrl(''); setFormTemplate(null); setFormSchedule('daily'); setFormDocType('invoice'); }}>
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Source List */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--samurai-text)' }}>
              Configured Sources ({sources.length})
            </h3>
            {sources.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--samurai-muted)' }}>
                <FolderOpen className="h-12 w-12 mx-auto mb-2" style={{ opacity: 0.3 }} />
                <p>No scan sources configured yet.</p>
                <p className="text-xs mt-1">Add your first Google Drive folder above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="rounded-lg p-4"
                    style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>{source.title}</h4>
                        <p className="text-xs" style={{ color: 'var(--samurai-muted)' }}>{source.document_type.replace('_', ' ')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="sd-btn sd-btn-ghost text-xs" onClick={() => openEditModal(source)}>
                          <Settings className="h-4 w-4" />
                        </button>
                        <button className="sd-btn sd-btn-ghost text-xs" onClick={() => handleDeleteSource(source.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs space-y-1" style={{ color: 'var(--samurai-muted)' }}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-3 w-3" />
                        <a href={source.drive_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-current">
                          {source.drive_url.slice(0, 50)}...
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Schedule: {source.schedule}</span>
                        {source.next_run && <span>· Next: {new Date(source.next_run).toLocaleString()}</span>}
                      </div>
                      {source.last_run && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3" style={{ color: 'var(--samurai-ok)' }} />
                          <span>Last run: {new Date(source.last_run).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="sd-btn sd-btn-primary text-xs" onClick={() => handleRunSource(source.id)} disabled={loading}>
                        <Play className="h-3 w-3 mr-1" />
                        Run Now
                      </button>
                      <select
                        className="sd-btn sd-btn-secondary text-xs"
                        value={source.schedule}
                        onChange={(e) => handleSetSchedule(source.id, e.target.value)}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="manual">Manual</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* RESULTS VIEW */}
      {activeView === 'results' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>
              Scan Results ({results.length})
            </h3>
            {lastRunExcelUrl && (
              <a href={lastRunExcelUrl} download className="sd-btn sd-btn-primary text-xs inline-flex items-center px-3 py-1.5">
                <FileText className="h-3 w-3 mr-1.5" />
                Download Excel
              </a>
            )}
          </div>
          {results.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--samurai-muted)' }}>
              <FileScan className="h-12 w-12 mx-auto mb-2" style={{ opacity: 0.3 }} />
              <p>No scan results yet.</p>
              <p className="text-xs mt-1">Run a scan source to see results here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => setViewResult(result)}
                  className="w-full text-left rounded-lg p-3 transition hover:filter brightness-105"
                  style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)', cursor: 'pointer' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--samurai-text)' }}>
                      {result.filename}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--samurai-muted)' }}>
                      {new Date(result.scan_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--samurai-muted)' }}>
                    <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--samurai-surface-2)' }}>
                      {result.document_type}
                    </span>
                    <span>{result.source_title}</span>
                    <span>· {result.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Result Modal */}
      {viewResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setViewResult(null)}>
          <div className="rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sticky top-0 z-10" style={{ background: 'var(--samurai-surface)', borderBottom: '1px solid var(--samurai-border)' }}>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: 'var(--samurai-muted)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--samurai-text)' }}>{viewResult.filename}</span>
              </div>
              <button onClick={() => setViewResult(null)} className="sd-btn sd-btn-ghost">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-xs flex items-center gap-3" style={{ color: 'var(--samurai-muted)' }}>
                <span>{new Date(viewResult.scan_date).toLocaleString()}</span>
                <span>From: {viewResult.source_title}</span>
                <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--samurai-accent-fill)', color: 'var(--samurai-accent-button-text)' }}>
                  {viewResult.document_type}
                </span>
                <span className={`px-2 py-0.5 rounded-full ${
                  viewResult.status === 'verified' ? 'bg-green-100 text-green-800' :
                  viewResult.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {viewResult.status}
                </span>
              </div>

              {/* Extracted Fields */}
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--samurai-border)' }}>
                <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--samurai-surface-2)' }}>
                  <Search className="h-4 w-4" style={{ color: 'var(--samurai-accent)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>Extracted Details</span>
                </div>
                <div className="px-3 py-2">
                  {(() => {
                    const interp = viewResult.interpretation || {};
                    if (interp.raw_response) {
                      return <p className="text-xs" style={{ color: 'var(--samurai-muted)' }}>{interp.raw_response.slice(0, 300)}</p>;
                    }
                    const entries = renderFields(interp);
                    if (!entries || entries.length === 0) {
                      return <p className="text-xs" style={{ color: 'var(--samurai-muted)' }}>No fields extracted.</p>;
                    }
                    return (
                      <table className="w-full text-xs">
                        <tbody>
                          {entries.map(([k, v]) => (
                            <tr key={k} className="border-b last:border-0" style={{ borderColor: 'var(--samurai-border)' }}>
                              <td className="py-1.5 pr-3 capitalize" style={{ color: 'var(--samurai-muted)', whiteSpace: 'nowrap' }}>{k.replace(/_/g, ' ')}</td>
                              <td className="py-1.5" style={{ color: 'var(--samurai-text)' }}>
                                {Array.isArray(v) ? (
                                  <ul className="list-disc pl-4">
                                    {v.map((item, i) => <li key={i}>{String(item)}</li>)}
                                  </ul>
                                ) : String(v)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                  {viewResult.interpretation?.validation && (
                    <div className="mt-2 pt-2 border-t text-xs" style={{ borderColor: 'var(--samurai-border)' }}>
                      <span style={{ color: viewResult.interpretation.validation.valid ? 'var(--samurai-ok)' : 'var(--samurai-warning)' }}>
                        {viewResult.interpretation.validation.valid ? '✓ Verified' : '⚠ Issues'}
                      </span>
                      {viewResult.interpretation.validation.message && (
                        <span style={{ color: 'var(--samurai-muted)' }}> — {viewResult.interpretation.validation.message}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Manual verification controls */}
              <div className="flex gap-2 flex-wrap">
                <button className="sd-btn sd-btn-primary flex-1" onClick={async () => {
                  const res = await fetch(`/api/departments/${department}/dashboard/doc-scan/results/${viewResult.id}/verify`, { method: 'POST' });
                  if (res.ok) {
                    setViewResult({ ...viewResult, status: 'verified' });
                    loadResults();
                  }
                }}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Verified
                </button>
                <button className="sd-btn sd-btn-secondary flex-1" onClick={async () => {
                  const res = await fetch(`/api/departments/${department}/dashboard/doc-scan/results/${viewResult.id}/reject`, { method: 'POST' });
                  if (res.ok) {
                    setViewResult({ ...viewResult, status: 'rejected' });
                    loadResults();
                  }
                }}>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </button>
              </div>
            </div>
            <div className="p-4 sticky bottom-0 flex justify-end gap-2" style={{ background: 'var(--samurai-surface)', borderTop: '1px solid var(--samurai-border)' }}>
              {viewResult.file_url && (
                <a href={viewResult.file_url} target="_blank" rel="noopener noreferrer" className="sd-btn sd-btn-primary">
                  <FileText className="h-4 w-4" /> View Original Document
                </a>
              )}
              <button className="sd-btn sd-btn-secondary" onClick={() => setViewResult(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
