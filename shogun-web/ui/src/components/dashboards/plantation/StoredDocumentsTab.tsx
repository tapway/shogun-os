import { useState } from 'react';
import { Search, FileText } from 'lucide-react';

interface StoredDocumentsTabProps {
  color: string;
}

export function StoredDocumentsTab({ color }: StoredDocumentsTabProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);

    try {
      const response = await fetch(
        `/api/departments/estate-ops/dashboard/search-documents?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by vendor, type, date... (e.g. 'XYZ invoice')"
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: color }}
        >
          Search
        </button>
      </div>

      {/* Results */}
      {loading && <p className="text-sm text-slate-500">Searching...</p>}
      {!loading && results.length === 0 && query && (
        <p className="text-sm text-slate-500">No documents found. Try a different keyword.</p>
      )}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((doc, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <h4 className="text-sm font-medium">{doc.title}</h4>
              </div>
              <p className="mt-1 text-xs text-slate-500">{doc.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
