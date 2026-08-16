import { useState } from 'react';
import { Upload, Image as ImageIcon, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface SiteInspectionTabProps {
  color: string;
}

export function SiteInspectionTab({ color }: SiteInspectionTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFile = (f: File | null) => {
    setFile(f);
    if (f) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleInspect = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('department', 'estate-ops');

    try {
      const response = await fetch('/api/departments/estate-ops/dashboard/inspect-site', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'Failed to assess image' });
    } finally {
      setLoading(false);
    }
  };

  const ratingColor = (rating?: string) => {
    if (!rating) return '';
    if (rating.includes('good')) return 'text-green-600';
    if (rating.includes('acceptable')) return 'text-yellow-600';
    if (rating.includes('needs')) return 'text-orange-600';
    if (rating.includes('uninhabitable')) return 'text-red-600';
    return '';
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 dark:border-slate-700">
        <div className="flex flex-col items-center gap-4">
          <ImageIcon className="h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-500">Upload a photo or video of staff quarters</p>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          {preview && (
            <img src={preview} alt="Preview" className="max-h-48 rounded-lg object-cover" />
          )}
          <button
            onClick={handleInspect}
            disabled={!file || loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: color }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Assessing...
              </span>
            ) : (
              'Inspect Site'
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {result.error ? (
            <p className="text-red-500">{result.error}</p>
          ) : (
            <>
              {/* Overall rating */}
              <div className={`flex items-center gap-2 text-lg font-semibold ${ratingColor(result.overall_rating)}`}>
                {result.overall_rating?.includes('good') ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
                {result.overall_rating}
              </div>

              {/* Furniture */}
              {result.furniture && (
                <div>
                  <h3 className="mb-2 font-semibold">Furniture</h3>
                  <div className="space-y-1">
                    {result.furniture.map((f: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{f.quantity}× {f.item}</span>
                        <span className="text-slate-500">{f.condition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cleanliness */}
              {result.cleanliness && (
                <div>
                  <h3 className="mb-2 font-semibold">Cleanliness</h3>
                  <div className="text-sm space-y-1">
                    <div>Floor: {result.cleanliness.floor}</div>
                    <div>Walls: {result.cleanliness.walls}</div>
                    <div>Bedding: {result.cleanliness.bedding}</div>
                    <div className="font-medium">Overall: {result.cleanliness.overall}</div>
                  </div>
                </div>
              )}

              {/* Safety */}
              {result.safety_hazards && (
                <div>
                  <h3 className="mb-2 font-semibold">Safety</h3>
                  <ul className="text-sm list-disc pl-5">
                    {result.safety_hazards.map((h: string, i: number) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Priority actions */}
              {result.priority_actions && (
                <div>
                  <h3 className="mb-2 font-semibold">Priority Actions</h3>
                  <ol className="text-sm list-decimal pl-5">
                    {result.priority_actions.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ol>
                </div>
              )}

              {result.storage_path && (
                <p className="text-xs text-slate-400">Stored to: {result.storage_path}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
