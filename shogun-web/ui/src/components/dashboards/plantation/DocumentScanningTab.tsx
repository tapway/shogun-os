import { useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface DocumentScanningTabProps {
  color: string;
}

export function DocumentScanningTab({ color }: DocumentScanningTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('department', 'estate-ops');

    try {
      const response = await fetch('/api/departments/estate-ops/dashboard/scan-document', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'Failed to scan document' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 dark:border-slate-700">
        <div className="flex flex-col items-center gap-4">
          <Upload className="h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-500">Upload a PDF or image (invoice, quotation, legal doc)</p>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <button
            onClick={handleScan}
            disabled={!file || loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: color }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Scanning...
              </span>
            ) : (
              'Scan Document'
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          {result.error ? (
            <p className="text-red-500">{result.error}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h3 className="font-semibold capitalize">{result.document_type}</h3>
              </div>
              <pre className="overflow-x-auto rounded bg-slate-50 p-3 text-xs dark:bg-slate-900">
                {JSON.stringify(result.fields, null, 2)}
              </pre>
              <div>
                <h4 className="text-sm font-medium text-slate-500">Summary</h4>
                <p className="text-sm">{result.summary}</p>
              </div>
              {result.storage_path && (
                <p className="text-xs text-slate-400">Stored to: {result.storage_path}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
