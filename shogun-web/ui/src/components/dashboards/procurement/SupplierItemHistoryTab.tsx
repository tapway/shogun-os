import { useState } from 'react';
import { Search, X, Building2, Phone, Mail, Globe, MapPin, CreditCard, Truck, Package } from 'lucide-react';
import { MOCK_SUPPLIER_HISTORY, MOCK_SUPPLIERS, type SupplierRecord } from '../../../lib/procurement-mock-data';

interface Props {
  stats: any;
  color: string;
  onAction?: (actionType: string, entity: unknown) => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const SURFACE_2 = 'var(--samurai-surface-2)';

export function SupplierItemHistoryTab({ stats, color }: Props) {
  const [searchMode, setSearchMode] = useState<'supplier' | 'item'>('supplier');
  const [query, setQuery] = useState('');
  const [viewingSupplier, setViewingSupplier] = useState<SupplierRecord | null>(null);

  // Filter based on search mode
  const filteredSuppliers = MOCK_SUPPLIERS.filter((s) => {
    if (searchMode !== 'supplier') return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.companyName.toLowerCase().includes(q) ||
      s.companyRegNo.toLowerCase().includes(q) ||
      s.picName.toLowerCase().includes(q) ||
      s.picEmail.toLowerCase().includes(q) ||
      s.website.toLowerCase().includes(q)
    );
  });

  // Item search: find items and their suppliers
  const itemSearchResults = (() => {
    if (searchMode !== 'item') return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    
    // Group by item name
    const itemMap = new Map<string, typeof MOCK_SUPPLIER_HISTORY>();
    MOCK_SUPPLIER_HISTORY.forEach((entry) => {
      const itemName = entry.item_name.toLowerCase();
      if (itemName.includes(q)) {
        if (!itemMap.has(entry.item_name)) {
          itemMap.set(entry.item_name, []);
        }
        itemMap.get(entry.item_name)!.push(entry);
      }
    });
    
    // Convert to array sorted by relevance
    return Array.from(itemMap.entries()).map(([itemName, entries]) => ({
      itemName,
      suppliers: entries.sort((a, b) => b.rating - a.rating),
      bestPrice: Math.min(...entries.map(e => e.last_price)),
      totalOrders: entries.reduce((sum, e) => sum + e.orders_count, 0),
    }));
  })();

  return (
    <div className="sd-stack">
      {/* Header Card */}
      <div className="sd-chart-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: 'auto' }}>Supplier & Item History</h3>
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--samurai-surface)', padding: '0.25rem', borderRadius: '0.5rem', border: `1px solid ${BORDER}` }}>
            <button
              type="button"
              onClick={() => { setSearchMode('supplier'); setQuery(''); }}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.85rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                background: searchMode === 'supplier' ? color : 'transparent',
                color: searchMode === 'supplier' ? '#fff' : TEXT,
                fontWeight: searchMode === 'supplier' ? 600 : 400,
              }}
            >
              Search Supplier
            </button>
            <button
              type="button"
              onClick={() => { setSearchMode('item'); setQuery(''); }}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.85rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                background: searchMode === 'item' ? color : 'transparent',
                color: searchMode === 'item' ? '#fff' : TEXT,
                fontWeight: searchMode === 'item' ? 600 : 400,
              }}
            >
              Search Item
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchMode === 'supplier' ? "Search company, PIC, email…" : "Search item name (e.g., laptop, chair)…"}
              style={{ width: '20rem', borderRadius: '0.5rem', border: `1px solid ${BORDER}`, background: 'var(--samurai-surface)', paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.85rem', color: TEXT }}
            />
          </div>
        </div>
        <p className="sd-chart-sub">
          {searchMode === 'supplier' 
            ? 'Complete supplier contact and payment information for procurement reference'
            : 'Find items and compare suppliers by price, rating, and delivery time'}
        </p>
      </div>

      {/* Supplier Table (shown when in supplier mode or no search) */}
      {searchMode === 'supplier' && (
        <div className="sd-chart-card">
          {filteredSuppliers.length === 0 ? (
            <p style={{ padding: '1rem 0', textAlign: 'center', fontSize: '0.85rem', color: MUTED }}>
              No suppliers match the search criteria.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th className="px-3 py-2.5 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Company Name</th>
                    <th className="px-3 py-2.5 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Reg. No.</th>
                    <th className="px-3 py-2.5 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Office Phone</th>
                    <th className="px-3 py-2.5 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>PIC Name</th>
                    <th className="px-3 py-2.5 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>PIC Contact</th>
                    <th className="px-3 py-2.5 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>PIC Email</th>
                    <th className="px-3 py-2.5 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Payment Term</th>
                    <th className="px-3 py-2.5 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Bank</th>
                    <th className="px-3 py-2.5 text-center" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td className="px-3 py-2.5">
                        <div style={{ fontWeight: 600, color: TEXT }}>{supplier.companyName}</div>
                        <div style={{ fontSize: '0.65rem', color: MUTED, marginTop: '0.125rem' }}>
                          <Globe className="inline h-3 w-3 mr-1" />
                          {supplier.website}
                        </div>
                      </td>
                      <td className="px-3 py-2.5" style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', color: MUTED }}>
                        {supplier.companyRegNo}
                      </td>
                      <td className="px-3 py-2.5" style={{ fontSize: '0.72rem', color: TEXT }}>
                        <Phone className="inline h-3 w-3 mr-1" style={{ color: MUTED }} />
                        {supplier.officePhone}
                      </td>
                      <td className="px-3 py-2.5" style={{ fontWeight: 500, color: TEXT }}>
                        {supplier.picName}
                      </td>
                      <td className="px-3 py-2.5" style={{ fontSize: '0.72rem', color: TEXT }}>
                        <Phone className="inline h-3 w-3 mr-1" style={{ color: MUTED }} />
                        {supplier.picContact}
                      </td>
                      <td className="px-3 py-2.5" style={{ fontSize: '0.72rem', color: TEXT }}>
                        <Mail className="inline h-3 w-3 mr-1" style={{ color: MUTED }} />
                        {supplier.picEmail}
                      </td>
                      <td className="px-3 py-2.5" style={{ fontSize: '0.72rem', color: MUTED }}>
                        {supplier.paymentTerm}
                      </td>
                      <td className="px-3 py-2.5">
                        <div style={{ fontSize: '0.72rem', fontWeight: 500, color: TEXT }}>{supplier.paymentBank}</div>
                        <div style={{ fontSize: '0.65rem', color: MUTED, marginTop: '0.125rem' }}>
                          <CreditCard className="inline h-3 w-3 mr-1" />
                          {supplier.bankAccountNo}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setViewingSupplier(supplier)}
                          className="sd-btn sd-btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                        >
                          View Full
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Item Search Results */}
      {searchMode === 'item' && query.trim() !== '' && (
        <div className="sd-chart-card">
          {itemSearchResults.length === 0 ? (
            <p style={{ padding: '1rem 0', textAlign: 'center', fontSize: '0.85rem', color: MUTED }}>
              No items found matching "{query}". Try searching for generic terms like "laptop", "chair", "monitor", etc.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {itemSearchResults.map((result) => (
                <div
                  key={result.itemName}
                  style={{
                    border: `1px solid ${BORDER}`,
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    background: 'var(--samurai-surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Package className="h-5 w-5" style={{ color }} />
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: TEXT, margin: 0 }}>{result.itemName}</h4>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      background: `${color}20`,
                      color: color,
                      fontWeight: 600,
                    }}>
                      {result.suppliers.length} supplier{result.suppliers.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', color: MUTED }}>Best Price</div>
                    <div style={{ fontSize: '0.72rem', color: MUTED }}>Total Orders</div>
                    <div style={{ fontSize: '0.72rem', color: MUTED }}>Avg Rating</div>
                    <div style={{ fontSize: '0.72rem', color: MUTED }}>Avg Lead Time</div>
                    
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>RM {result.bestPrice.toLocaleString()}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{result.totalOrders}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>
                      {(result.suppliers.reduce((sum, s) => sum + s.rating, 0) / result.suppliers.length).toFixed(1)} ⭐
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>
                      {Math.round(result.suppliers.reduce((sum, s) => sum + s.avg_lead_time_days, 0) / result.suppliers.length)} days
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '0.75rem' }}>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 600, color: TEXT, marginBottom: '0.5rem' }}>Suppliers:</h5>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {result.suppliers.map((entry, idx) => (
                        <div
                          key={entry.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            background: SURFACE_2,
                            borderRadius: '0.375rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                            <Building2 className="h-4 w-4" style={{ color: MUTED }} />
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{entry.supplier_name}</div>
                              <div style={{ fontSize: '0.72rem', color: MUTED }}>
                                Last order: {entry.last_order_date} • {entry.orders_count} order{entry.orders_count > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.72rem', color: MUTED }}>Last Price</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: TEXT }}>RM {entry.last_price.toLocaleString()}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.72rem', color: MUTED }}>Rating</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: entry.rating >= 4.5 ? '#22c55e' : entry.rating >= 4.0 ? '#f59e0b' : '#ef4444' }}>
                                {entry.rating.toFixed(1)} ⭐
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.72rem', color: MUTED }}>Lead Time</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{entry.avg_lead_time_days} days</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Supplier Details Modal */}
      {viewingSupplier && (
        <>
          <button
            type="button"
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'default' }}
            onClick={() => setViewingSupplier(null)}
            aria-label="Close"
          />
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={() => setViewingSupplier(null)}
          >
            <div
              className="sd-card"
              style={{ position: 'relative', zIndex: 50, width: '100%', maxWidth: '45rem', maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: `1px solid ${BORDER}`, paddingBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: TEXT, margin: 0 }}>
                    {viewingSupplier.companyName}
                  </h2>
                  <p style={{ fontSize: '0.72rem', color: MUTED, margin: 0 }}>Company Reg. No: {viewingSupplier.companyRegNo}</p>
                </div>
                <button type="button" className="sd-icon-btn" onClick={() => setViewingSupplier(null)} aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Company Information */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 className="h-4 w-4" />
                  Company Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Registered Address</div>
                    <div style={{ fontSize: '0.75rem', color: TEXT, display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: MUTED }} />
                      <span>{viewingSupplier.registeredAddress}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Website</div>
                    <div style={{ fontSize: '0.75rem', color: TEXT, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Globe className="h-4 w-4 flex-shrink-0" style={{ color: MUTED }} />
                      <a href={`https://${viewingSupplier.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--samurai-blue)', textDecoration: 'underline' }}>
                        {viewingSupplier.website}
                      </a>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Office Phone</div>
                    <div style={{ fontSize: '0.75rem', color: TEXT, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone className="h-4 w-4 flex-shrink-0" style={{ color: MUTED }} />
                      {viewingSupplier.officePhone}
                    </div>
                  </div>
                </div>
              </div>

              {/* Person In Charge */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: SURFACE_2, borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 className="h-4 w-4" />
                  Person In Charge (PIC)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Name</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: TEXT }}>{viewingSupplier.picName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Contact No.</div>
                    <div style={{ fontSize: '0.75rem', color: TEXT, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone className="h-3 w-3" style={{ color: MUTED }} />
                      {viewingSupplier.picContact}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Email</div>
                    <div style={{ fontSize: '0.75rem', color: TEXT, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail className="h-3 w-3" style={{ color: MUTED }} />
                      <a href={`mailto:${viewingSupplier.picEmail}`} style={{ color: 'var(--samurai-blue)', textDecoration: 'underline' }}>
                        {viewingSupplier.picEmail}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CreditCard className="h-4 w-4" />
                  Payment Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Payment Term</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: TEXT }}>{viewingSupplier.paymentTerm}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Payment Currency</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: TEXT }}>{viewingSupplier.paymentCurrency}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Bank Name</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: TEXT }}>{viewingSupplier.paymentBank}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Bank Account No.</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: TEXT }}>
                      {viewingSupplier.bankAccountNo}
                    </div>
                  </div>
                  {viewingSupplier.bankSwiftCode && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>SWIFT Code</div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: TEXT }}>
                        {viewingSupplier.bankSwiftCode}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Logistics */}
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid var(--samurai-blue)', borderRadius: '0.25rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck className="h-4 w-4" />
                  Preferred Courier Services
                </h3>
                <div style={{ fontSize: '0.75rem', fontWeight: 500, color: TEXT }}>
                  {viewingSupplier.preferredCourier}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '1rem', borderTop: `1px solid ${BORDER}` }}>
                <button type="button" onClick={() => setViewingSupplier(null)} className="sd-btn sd-btn-secondary">
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert(`Create PR for ${viewingSupplier.companyName}? (Demo mode)`);
                    setViewingSupplier(null);
                  }}
                  className="sd-btn sd-btn-primary"
                >
                  Create PR for This Supplier
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
