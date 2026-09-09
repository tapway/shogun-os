import { useState } from 'react';
import { Printer, Package, ChevronDown, Search, Tag, Building2 } from 'lucide-react';
import { MOCK_PROGRESS_TRACKER, MOCK_BARCODE_BATCHES } from '../../../lib/procurement-mock-data';

interface Props {
  stats: any;
  color?: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const SURFACE_2 = 'var(--samurai-surface-2)';

export function BarcodeScanCounterTab({ stats, color = '#2563eb' }: Props) {
  // Section 1: Generate Barcode State
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedPO, setSelectedPO] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [generatedBarcode, setGeneratedBarcode] = useState<{
    code: string;
    itemName: string;
    poNumber: string;
    projectName: string;
    generatedAt: string;
  } | null>(null);

  // Section 2: View All Items State
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Get projects from mock data
  const projects = MOCK_PROGRESS_TRACKER.map(p => ({
    id: p.project_id,
    name: p.project_name,
    prNumber: p.pr_number,
  }));

  // Get POs for selected project (mock - in real app would filter by project)
  const availablePOs = selectedProject ? [
    { poNumber: 'PO-2025-0042', supplier: 'TechWorld Sdn Bhd' },
    { poNumber: 'PO-2025-0043', supplier: 'OfficePro Malaysia' },
  ] : [];

  // Get items for selected PO (mock)
  const availableItems = selectedPO ? [
    { id: 'item-001', name: 'Dell XPS 15 Laptop', quantity: 5, unit: 'units' },
    { id: 'item-002', name: 'Ergonomic Office Chair', quantity: 20, unit: 'units' },
  ] : [];

  const handleGenerateBarcode = () => {
    if (!selectedProject || !selectedPO || !selectedItem) return;

    const project = projects.find(p => p.id === selectedProject);
    const item = availableItems.find(i => i.id === selectedItem);
    
    if (!project || !item) return;

    // Generate barcode code: PO-ITEM_INDEX
    const itemIndex = availableItems.findIndex(i => i.id === selectedItem) + 1;
    const barcodeCode = `${selectedPO}-${String(itemIndex).padStart(3, '0')}`;

    setGeneratedBarcode({
      code: barcodeCode,
      itemName: item.name,
      poNumber: selectedPO,
      projectName: project.name,
      generatedAt: new Date().toISOString(),
    });

    // In real app, this would save to database
    alert(`Barcode generated and recorded in system!\n\nBarcode: ${barcodeCode}\nItem: ${item.name}\nPO: ${selectedPO}\nProject: ${project.name}`);
  };

  const handlePrintBarcode = () => {
    if (!generatedBarcode) return;
    
    // In real app, this would trigger print dialog with barcode label template
    alert(`Printing barcode label for:\n${generatedBarcode.code}\n\n(Demo mode - no actual print)`);
  };

  const toggleProjectExpand = (projectId: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setExpandedProjects(newSet);
  };

  // Filter items for Section 2
  const filteredProjects = MOCK_PROGRESS_TRACKER.filter(project => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      project.project_name.toLowerCase().includes(q) ||
      project.hardware_items.some(item => item.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="sd-stack">
      {/* Section 1: Generate Barcode */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tag className="h-5 w-5" />
          Generate Barcode
        </h3>
        <p className="sd-chart-sub">Select project → PO → item to generate and record barcode</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', marginTop: '1rem', alignItems: 'end' }}>
          {/* Project Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, color: MUTED, marginBottom: '0.25rem' }}>
              Select Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setSelectedPO('');
                setSelectedItem('');
                setGeneratedBarcode(null);
              }}
              className="sd-input"
              style={{ width: '100%' }}
            >
              <option value="">-- Select Project --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.prNumber})
                </option>
              ))}
            </select>
          </div>

          {/* PO Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, color: MUTED, marginBottom: '0.25rem' }}>
              Select PO
            </label>
            <select
              value={selectedPO}
              onChange={(e) => {
                setSelectedPO(e.target.value);
                setSelectedItem('');
                setGeneratedBarcode(null);
              }}
              className="sd-input"
              style={{ width: '100%' }}
              disabled={!selectedProject}
            >
              <option value="">-- Select PO --</option>
              {availablePOs.map((po) => (
                <option key={po.poNumber} value={po.poNumber}>
                  {po.poNumber} - {po.supplier}
                </option>
              ))}
            </select>
          </div>

          {/* Item Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, color: MUTED, marginBottom: '0.25rem' }}>
              Select Item
            </label>
            <select
              value={selectedItem}
              onChange={(e) => {
                setSelectedItem(e.target.value);
                setGeneratedBarcode(null);
              }}
              className="sd-input"
              style={{ width: '100%' }}
              disabled={!selectedPO}
            >
              <option value="">-- Select Item --</option>
              {availableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.quantity} {item.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerateBarcode}
            className="sd-btn sd-btn-primary"
            disabled={!selectedProject || !selectedPO || !selectedItem}
            style={{ height: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Tag className="h-4 w-4" />
            Generate
          </button>
        </div>

        {/* Generated Barcode Display */}
        {generatedBarcode && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderLeft: '3px solid var(--samurai-ok)', borderRadius: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Generated Barcode</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: TEXT, letterSpacing: '0.1em' }}>
                  {generatedBarcode.code}
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrintBarcode}
                className="sd-btn sd-btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Printer className="h-4 w-4" />
                Print Label
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.72rem' }}>
              <div>
                <span style={{ color: MUTED }}>Item:</span>{' '}
                <span style={{ color: TEXT, fontWeight: 500 }}>{generatedBarcode.itemName}</span>
              </div>
              <div>
                <span style={{ color: MUTED }}>PO Number:</span>{' '}
                <span style={{ color: TEXT, fontWeight: 500 }}>{generatedBarcode.poNumber}</span>
              </div>
              <div>
                <span style={{ color: MUTED }}>Project:</span>{' '}
                <span style={{ color: TEXT, fontWeight: 500 }}>{generatedBarcode.projectName}</span>
              </div>
              <div>
                <span style={{ color: MUTED }}>Generated:</span>{' '}
                <span style={{ color: TEXT, fontWeight: 500 }}>
                  {new Date(generatedBarcode.generatedAt).toLocaleString('en-MY')}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.65rem', color: MUTED, fontStyle: 'italic' }}>
              ✓ Barcode recorded in system. This barcode links item to PO {generatedBarcode.poNumber} from project {generatedBarcode.projectName}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: All Items Grouped by Project */}
      <div className="sd-chart-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <h3 className="sd-chart-title" style={{ margin: 0, marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package className="h-5 w-5" />
            All Items by Project
          </h3>
          <div style={{ position: 'relative' }}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search project or item…"
              style={{ width: '18rem', borderRadius: '0.5rem', border: `1px solid ${BORDER}`, background: 'var(--samurai-surface)', paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem', fontSize: '0.85rem', color: TEXT }}
            />
          </div>
        </div>
        <p className="sd-chart-sub">View all items grouped by project with barcode information</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {filteredProjects.length === 0 ? (
            <p style={{ padding: '1rem 0', textAlign: 'center', fontSize: '0.85rem', color: MUTED }}>
              No projects match the search criteria.
            </p>
          ) : (
            filteredProjects.map((project) => {
              const isExpanded = expandedProjects.has(project.project_id);

              return (
                <div key={project.project_id} className="sd-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Project Header */}
                  <div
                    onClick={() => toggleProjectExpand(project.project_id)}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      borderBottom: isExpanded ? `1px solid ${BORDER}` : 'none',
                      background: SURFACE_2,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Building2 className="h-4 w-4" style={{ color }} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', color: TEXT }}>
                          {project.project_name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: MUTED }}>
                          {project.pr_number} • {project.hardware_items.length} items
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="sd-chip muted">{project.overall_progress}% complete</span>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" style={{ transform: 'rotate(-90deg)' }} />}
                    </div>
                  </div>

                  {/* Expanded Items List */}
                  {isExpanded && (
                    <div style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {project.hardware_items.map((item) => {
                          // Check if this item has barcodes generated (mock check)
                          const hasBarcode = MOCK_BARCODE_BATCHES.some(batch => 
                            batch.items.some(barcodeItem => barcodeItem.item_name.includes(item.name))
                          );

                          return (
                            <div
                              key={item.item_id}
                              style={{
                                padding: '0.75rem',
                                border: `1px solid ${BORDER}`,
                                borderRadius: '0.25rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: TEXT }}>
                                  {item.name}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.25rem' }}>
                                  Quantity: {item.quantity} {item.unit} • Supplier: {item.selected_supplier.name}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {hasBarcode ? (
                                  <span className="sd-chip ok">Barcode Generated</span>
                                ) : (
                                  <span className="sd-chip muted">No Barcode</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Pre-fill the generate form with this item
                                    setSelectedProject(project.project_id);
                                    // In real app, would also select the correct PO and item
                                    alert(`Navigate to Generate Barcode section for ${item.name}`);
                                  }}
                                  className="sd-btn sd-btn-secondary"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                                >
                                  Generate Barcode
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
