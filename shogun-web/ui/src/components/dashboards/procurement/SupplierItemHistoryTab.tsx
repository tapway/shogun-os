import { useState } from 'react';
import { Search, X, Building2, Phone, Mail, Globe, MapPin, CreditCard, Truck } from 'lucide-react';
import { MOCK_SUPPLIER_HISTORY } from '../../../lib/procurement-mock-data';

interface Props {
  stats: any;
  color: string;
  onAction?: (actionType: string, entity: unknown) => void;
}

// Supplier directory data structure
interface SupplierRecord {
  id: string;
  companyName: string;
  companyRegNo: string;
  officePhone: string;
  registeredAddress: string;
  website: string;
  picName: string;
  picContact: string;
  picEmail: string;
  paymentTerm: string;
  paymentCurrency: string;
  paymentBank: string;
  bankAccountNo: string;
  bankSwiftCode?: string;
  preferredCourier: string;
}

// Mock supplier directory data with variance
const MOCK_SUPPLIERS: SupplierRecord[] = [
  {
    id: 'sup-001',
    companyName: 'TechWorld Sdn Bhd',
    companyRegNo: '1234567-X',
    officePhone: '+603-2145-6789',
    registeredAddress: 'Level 15, Menara UOA, Bangsar South, 59200 Kuala Lumpur',
    website: 'www.techworld.com.my',
    picName: 'Sarah Lim',
    picContact: '+6012-345-6789',
    picEmail: 'sarah@techworld.my',
    paymentTerm: '50% upfront, 50% on delivery',
    paymentCurrency: 'MYR',
    paymentBank: 'Maybank',
    bankAccountNo: '5623-4567-8901',
    bankSwiftCode: 'MBBEMYKL',
    preferredCourier: 'DHL Express',
  },
  {
    id: 'sup-002',
    companyName: 'OfficePro Malaysia',
    companyRegNo: '2345678-W',
    officePhone: '+603-7890-1234',
    registeredAddress: 'Lot 23, Jalan Teknologi 3/5, Taman Sains Selangor, 47810 Petaling Jaya',
    website: 'www.officepro.com.my',
    picName: 'Ahmad Razak',
    picContact: '+6019-876-5432',
    picEmail: 'ahmad@officepro.com.my',
    paymentTerm: '100% upfront',
    paymentCurrency: 'MYR',
    paymentBank: 'CIMB Bank',
    bankAccountNo: '8012-3456-7890',
    bankSwiftCode: 'CIBBMYKL',
    preferredCourier: 'Pos Laju',
  },
  {
    id: 'sup-003',
    companyName: 'Dell Technologies Malaysia',
    companyRegNo: '3456789-V',
    officePhone: '+603-2053-8888',
    registeredAddress: 'Suite 28-01, The Gardens North Tower, Mid Valley City, 59200 Kuala Lumpur',
    website: 'www.dell.com.my',
    picName: 'David Chen',
    picContact: '+6016-234-5678',
    picEmail: 'david.chen@dell.com',
    paymentTerm: 'Net 30 days',
    paymentCurrency: 'MYR',
    paymentBank: 'HSBC Bank',
    bankAccountNo: '012-345678-901',
    bankSwiftCode: 'HBMBMYKL',
    preferredCourier: 'FedEx',
  },
  {
    id: 'sup-004',
    companyName: 'Toyota Material Handling',
    companyRegNo: '4567890-U',
    officePhone: '+603-5567-8901',
    registeredAddress: 'Plot 12, Jalan Subang 1, Subang Industrial Park, 47610 Subang Jaya',
    website: 'www.toyota-mh.com.my',
    picName: 'Mohd Faisal',
    picContact: '+6013-456-7890',
    picEmail: 'faisal@toyota-mh.com.my',
    paymentTerm: '30% deposit, 70% before delivery',
    paymentCurrency: 'MYR',
    paymentBank: 'Public Bank',
    bankAccountNo: '3123-4567-8901',
    bankSwiftCode: 'PBBEMYKL',
    preferredCourier: 'Self-pickup / Company truck',
  },
  {
    id: 'sup-005',
    companyName: 'Storage Solutions MY',
    companyRegNo: '5678901-T',
    officePhone: '+603-6789-0123',
    registeredAddress: 'No. 45, Jalan Industri 2/3, Kawasan Perindustrian Batu Caves, 68100 Batu Caves',
    website: 'www.storagesolutions.my',
    picName: 'Lisa Wong',
    picContact: '+6017-567-8901',
    picEmail: 'lisa@storagesolutions.my',
    paymentTerm: '50% upfront, 50% on delivery',
    paymentCurrency: 'MYR',
    paymentBank: 'RHB Bank',
    bankAccountNo: '1234-5678-9012',
    bankSwiftCode: 'RHBBMYKL',
    preferredCourier: 'J&T Express',
  },
  {
    id: 'sup-006',
    companyName: 'Epson Malaysia',
    companyRegNo: '6789012-S',
    officePhone: '+603-8901-2345',
    registeredAddress: 'Unit 12-03, Sunway Pyramid Tower, Jalan PJS 11/15, 47500 Petaling Jaya',
    website: 'www.epson.com.my',
    picName: 'Rajesh Kumar',
    picContact: '+6018-678-9012',
    picEmail: 'rajesh@epson.com.my',
    paymentTerm: 'Net 14 days',
    paymentCurrency: 'MYR',
    paymentBank: 'AmBank',
    bankAccountNo: '888-1234567-890',
    bankSwiftCode: 'ARBKMYKL',
    preferredCourier: 'Ninja Van',
  },
  {
    id: 'sup-007',
    companyName: 'Apple Authorized Reseller',
    companyRegNo: '7890123-R',
    officePhone: '+603-9012-3456',
    registeredAddress: 'G-02, Pavilion KL, 168 Jalan Bukit Bintang, 55100 Kuala Lumpur',
    website: 'www.applestore.com.my',
    picName: 'Priya Nair',
    picContact: '+6011-789-0123',
    picEmail: 'priya@applestore.com.my',
    paymentTerm: '100% upfront',
    paymentCurrency: 'MYR',
    paymentBank: 'Standard Chartered',
    bankAccountNo: '012-3456789-012',
    bankSwiftCode: 'SCBLMYKL',
    preferredCourier: 'SF Express',
  },
  {
    id: 'sup-008',
    companyName: 'CompAsia',
    companyRegNo: '8901234-Q',
    officePhone: '+603-0123-4567',
    registeredAddress: 'Level 8, Wisma Genting, Jalan Sultan Ismail, 50250 Kuala Lumpur',
    website: 'www.compasia.com',
    picName: 'Tan Wei Ming',
    picContact: '+6014-890-1234',
    picEmail: 'weiming@compasia.com',
    paymentTerm: 'Net 7 days',
    paymentCurrency: 'MYR',
    paymentBank: 'Hong Leong Bank',
    bankAccountNo: '123-4567890-123',
    bankSwiftCode: 'HLBBMYKL',
    preferredCourier: 'DHL eCommerce',
  },
];

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const SURFACE_2 = 'var(--samurai-surface-2)';

export function SupplierItemHistoryTab({ stats, color }: Props) {
  const [query, setQuery] = useState('');
  const [viewingSupplier, setViewingSupplier] = useState<SupplierRecord | null>(null);

  const filtered = MOCK_SUPPLIERS.filter((s) => {
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

  return (
    <div className="sd-stack">
      {/* Header Card */}
      <div className="sd-chart-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: 'auto' }}>Supplier Directory</h3>
          <div style={{ position: 'relative' }}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search company, PIC, email…"
              style={{ width: '18rem', borderRadius: '0.5rem', border: `1px solid ${BORDER}`, background: 'var(--samurai-surface)', paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.85rem', color: TEXT }}
            />
          </div>
        </div>
        <p className="sd-chart-sub">
          Complete supplier contact and payment information for procurement reference
        </p>
      </div>

      {/* Supplier Table */}
      <div className="sd-chart-card">
        {filtered.length === 0 ? (
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
                {filtered.map((supplier) => (
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
