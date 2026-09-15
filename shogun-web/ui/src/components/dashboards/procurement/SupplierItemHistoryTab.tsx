import { useState } from 'react';
import { Search, X, Building2, Phone, Mail, Globe, MapPin, CreditCard, Truck, Package } from 'lucide-react';
import type { SupplierHistoryEntry, SupplierRecord } from '../../../lib/types';

interface Props {
  history: SupplierHistoryEntry[];
  suppliers: SupplierRecord[];
  color: string;
  onAction?: (actionType: string, entity: unknown) => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const SURFACE_2 = 'var(--samurai-surface-2)';

export function SupplierItemHistoryTab({ history, suppliers, color, onAction }: Props) {
  const [query, setQuery] = useState('');
  const [viewingSupplier, setViewingSupplier] = useState<SupplierRecord | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="sd-empty">
        <p>No supplier purchase history available.</p>
      </div>
    );
  }

  // Unified search across both items and suppliers
  const filteredHistory = history.filter((entry) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.item_name.toLowerCase().includes(q) ||
      entry.supplier_name.toLowerCase().includes(q)
    );
  });

  // Group by item for expandable view
  const groupedByItem = (() => {
    const map = new Map<string, SupplierHistoryEntry[]>();
    filteredHistory.forEach((entry) => {
      if (!map.has(entry.item_name)) {
        map.set(entry.item_name, []);
      }
      map.get(entry.item_name)!.push(entry);
    });
    
    // Sort entries within each item by rating (highest first)
    map.forEach((entries) => {
      entries.sort((a, b) => b.rating - a.rating);
    });
    
    return Array.from(map.entries()).map(([itemName, entries]) => ({
      itemName,
      entries,
      bestPrice: Math.min(...entries.map(e => e.last_price)),
      totalOrders: entries.reduce((sum, e) => sum + e.orders_count, 0),
      avgRating: entries.reduce((sum, e) => sum + e.rating, 0) / entries.length,
      supplierCount: entries.length,
    }));
  })();

  return (
    <div className="sd-stack">
      {/* Header Card */}
      <div className="sd-chart-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: 'auto' }}>Item-Supplier Purchase History</h3>
          <div style={{ position: 'relative' }}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search item or supplier name…"
              style={{ width: '22rem', borderRadius: '0.5rem', border: `1px solid ${BORDER}`, background: 'var(--samurai-surface)', paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.85rem', color: TEXT }}
            />
          </div>
        </div>
        <p className="sd-chart-sub">
          Complete purchase history showing which items were bought from which suppliers, with pricing and performance metrics
        </p>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="sd-chart-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Total Items Tracked</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEXT }}>{groupedByItem.length}</div>
        </div>
        <div className="sd-chart-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Total Purchase Records</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEXT }}>{filteredHistory.length}</div>
        </div>
        <div className="sd-chart-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Active Suppliers</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEXT }}>
            {new Set(filteredHistory.map(e => e.supplier_name)).size}
          </div>
        </div>
        <div className="sd-chart-card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Avg Rating</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEXT }}>
            {filteredHistory.length > 0 ? (filteredHistory.reduce((sum, e) => sum + e.rating, 0) / filteredHistory.length).toFixed(1) : '0.0'} ⭐
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="sd-chart-card">
        {groupedByItem.length === 0 ? (
          <p style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.85rem', color: MUTED }}>
            No purchase history found matching "{query}". Try a different search term.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  <th className="px-3 py-2.5 text-left" style={{ fontSize: '0.72rem', fontWeight: 600, color: MUTED, width: '30%' }}>Item Name</th>
                  <th className="px-3 py-2.5 text-center" style={{ fontSize: '0.72rem', fontWeight: 600, color: MUTED }}>Suppliers</th>
                  <th className="px-3 py-2.5 text-right" style={{ fontSize: '0.72rem', fontWeight: 600, color: MUTED }}>Best Price</th>
                  <th className="px-3 py-2.5 text-center" style={{ fontSize: '0.72rem', fontWeight: 600, color: MUTED }}>Total Orders</th>
                  <th className="px-3 py-2.5 text-center" style={{ fontSize: '0.72rem', fontWeight: 600, color: MUTED }}>Avg Rating</th>
                  <th className="px-3 py-2.5 text-center" style={{ fontSize: '0.72rem', fontWeight: 600, color: MUTED }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedByItem.map((item) => (
                  <>
                    <tr 
                      key={item.itemName}
                      style={{ 
                        borderBottom: expandedItem === item.itemName ? 'none' : `1px solid ${BORDER}`,
                        cursor: 'pointer',
                        background: expandedItem === item.itemName ? SURFACE_2 : 'transparent',
                      }}
                      onClick={() => setExpandedItem(expandedItem === item.itemName ? null : item.itemName)}
                    >
                      <td className="px-3 py-3">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Package className="h-4 w-4 flex-shrink-0" style={{ color }} />
                          <div>
                            <div style={{ fontWeight: 600, color: TEXT }}>{item.itemName}</div>
                            <div style={{ fontSize: '0.65rem', color: MUTED, marginTop: '0.125rem' }}>
                              Click to view supplier details
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          background: `${color}20`,
                          color: color,
                          fontWeight: 600,
                        }}>
                          {item.supplierCount}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: TEXT }}>RM {item.bestPrice.toLocaleString()}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{item.totalOrders}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: 600, 
                          color: item.avgRating >= 4.5 ? '#22c55e' : item.avgRating >= 4.0 ? '#f59e0b' : '#ef4444' 
                        }}>
                          {item.avgRating.toFixed(1)} ⭐
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedItem(expandedItem === item.itemName ? null : item.itemName);
                          }}
                          className="sd-btn sd-btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                        >
                          {expandedItem === item.itemName ? 'Hide' : 'View'} Suppliers
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Supplier Details */}
                    {expandedItem === item.itemName && (
                      <tr key={`${item.itemName}-details`}>
                        <td colSpan={6} style={{ padding: 0, background: SURFACE_2 }}>
                          <div style={{ padding: '1rem', borderTop: `1px solid ${BORDER}` }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Building2 className="h-4 w-4" />
                              Suppliers for {item.itemName}
                            </h4>
                            
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                              {item.entries.map((entry) => {
                                // Find full supplier details
                                const supplierDetails = suppliers.find(s => s.companyName === entry.supplier_name);
                                
                                return (
                                  <div
                                    key={entry.id}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                                      gap: '1rem',
                                      alignItems: 'center',
                                      padding: '0.75rem',
                                      background: 'var(--samurai-surface)',
                                      borderRadius: '0.5rem',
                                      border: `1px solid ${BORDER}`,
                                    }}
                                  >
                                    {/* Supplier Info */}
                                    <div>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT, marginBottom: '0.25rem' }}>
                                        {entry.supplier_name}
                                      </div>
                                      {supplierDetails && (
                                        <div style={{ fontSize: '0.72rem', color: MUTED, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <Phone className="h-3 w-3" />
                                          {supplierDetails.picContact}
                                          <Mail className="h-3 w-3 ml-2" />
                                          {supplierDetails.picEmail}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Last Price */}
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '0.65rem', color: MUTED, marginBottom: '0.125rem' }}>Last Price</div>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: TEXT }}>RM {entry.last_price.toLocaleString()}</div>
                                    </div>
                                    
                                    {/* Orders & Lead Time */}
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '0.65rem', color: MUTED, marginBottom: '0.125rem' }}>Orders</div>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{entry.orders_count}</div>
                                      <div style={{ fontSize: '0.65rem', color: MUTED, marginTop: '0.125rem' }}>
                                        {entry.avg_lead_time_days} days lead
                                      </div>
                                    </div>
                                    
                                    {/* Rating */}
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '0.65rem', color: MUTED, marginBottom: '0.125rem' }}>Rating</div>
                                      <div style={{ 
                                        fontSize: '0.85rem', 
                                        fontWeight: 600, 
                                        color: entry.rating >= 4.5 ? '#22c55e' : entry.rating >= 4.0 ? '#f59e0b' : '#ef4444' 
                                      }}>
                                        {entry.rating.toFixed(1)} ⭐
                                      </div>
                                    </div>
                                    
                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      {supplierDetails && (
                                        <button
                                          type="button"
                                          onClick={() => setViewingSupplier(supplierDetails)}
                                          className="sd-btn sd-btn-secondary"
                                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                                        >
                                          View Full
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => onAction?.('create_po', { item_name: entry.item_name, supplier_name: entry.supplier_name })}
                                        className="sd-btn sd-btn-primary"
                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                                      >
                                        Create PO
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                    onAction?.('create_pr', { supplier: viewingSupplier.companyName });
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
