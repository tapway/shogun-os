import { useState, useEffect, useRef } from 'react';
import { Printer, Package, ChevronDown, Search, Tag, Building2 } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import type { ProgressTrackerProject, BarcodeBatch } from '../../../lib/types';

interface Props {
  projects: ProgressTrackerProject[];
  barcodeBatches: BarcodeBatch[];
  color?: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const SURFACE_2 = 'var(--samurai-surface-2)';

const MAX_BARCODE_RENDER = 100;

// Barcode Card Component - renders visual barcode using JsBarcode
function BarcodeCard({ barcode }: { barcode: { code: string; itemName: string; poNumber: string; projectName: string; generatedAt: string; unitIndex: number; totalUnits: number } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !barcode.code) return;
    try {
      JsBarcode(canvasRef.current, barcode.code, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        background: "#ffffff",
        lineColor: "#000000"
      });
    } catch (e) {
      console.error('Barcode generation error:', e);
    }
  }, [barcode.code]);

  return (
    <div className="barcode-label-card" style={{
      padding: '1rem',
      border: `1px solid ${BORDER}`,
      borderRadius: '0.5rem',
      background: '#ffffff',
      textAlign: 'center'
    }}>
      <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
      
      <div style={{ marginTop: '0.75rem', borderTop: `1px solid ${BORDER}`, paddingTop: '0.5rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: TEXT }}>
          {barcode.itemName}
        </div>
        <div style={{ fontSize: '0.65rem', color: MUTED, marginTop: '0.25rem' }}>
          Unit {barcode.unitIndex} of {barcode.totalUnits}
        </div>
        <div style={{ fontSize: '0.65rem', color: MUTED, marginTop: '0.125rem' }}>
          PO: {barcode.poNumber}
        </div>
        <div style={{ fontSize: '0.6rem', color: MUTED, marginTop: '0.25rem', fontStyle: 'italic' }}>
          Generated: {new Date(barcode.generatedAt).toLocaleTimeString('en-MY')}
        </div>
      </div>
    </div>
  );
}

export function BarcodeScanCounterTab({ projects, barcodeBatches, color = '#2563eb' }: Props) {
  // Section 1: Generate Barcode State
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedPO, setSelectedPO] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [generatedBarcodes, setGeneratedBarcodes] = useState<Array<{
    code: string;
    itemName: string;
    poNumber: string;
    projectName: string;
    generatedAt: string;
    unitIndex: number;
    totalUnits: number;
  }> | null>(null);

  // Section 2: View All Items State
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Derive project list from props
  const projectList = projects.map(p => ({
    id: p.project_id,
    name: p.project_name,
    prNumber: p.pr_number,
  }));

  // Get POs for selected project — scope to project by matching item names
  const availablePOs = selectedProject ? (() => {
    const proj = projects.find(p => p.project_id === selectedProject);
    if (!proj) return [];
    const projectItemNames = new Set(proj.hardware_items.map(i => i.name));
    const poSet = new Set<string>();
    barcodeBatches.forEach(b => {
      if (!b.po_number) return;
      // Include PO if any of its items belong to the selected project
      const hasProjectItem = b.items.some(bi => projectItemNames.has(bi.item_name));
      if (hasProjectItem) poSet.add(b.po_number);
    });
    return Array.from(poSet).map(po => ({ poNumber: po, supplier: '' }));
  })() : [];

  // Get items for selected PO — derive from project hardware items ONLY (no hardcoded fallback)
  const availableItems = selectedPO ? (() => {
    const proj = projects.find(p => p.project_id === selectedProject);
    if (proj && proj.hardware_items.length > 0) {
      return proj.hardware_items.map(item => ({
        id: item.item_id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      }));
    }
    return [];
  })() : [];

  const handleGenerateBarcode = () => {
    if (!selectedProject || !selectedPO || !selectedItem) return;

    const project = projectList.find(p => p.id === selectedProject);
    const item = availableItems.find(i => i.id === selectedItem);
    
    if (!project || !item) return;

    const itemIndex = availableItems.findIndex(i => i.id === selectedItem) + 1;
    const barcodes = [];
    const renderCount = Math.min(item.quantity, MAX_BARCODE_RENDER);
    
    for (let unitNum = 1; unitNum <= renderCount; unitNum++) {
      const barcodeCode = `${selectedPO}-${String(itemIndex).padStart(3, '0')}-${String(unitNum).padStart(3, '0')}`;
      barcodes.push({
        code: barcodeCode,
        itemName: item.name,
        poNumber: selectedPO,
        projectName: project.name,
        generatedAt: new Date().toISOString(),
        unitIndex: unitNum,
        totalUnits: item.quantity,
      });
    }

    setGeneratedBarcodes(barcodes);
  };

  const handlePrintBarcode = () => {
    if (!generatedBarcodes || generatedBarcodes.length === 0) return;
    window.print();
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

  // Filter projects for Section 2
  const filteredProjects = projects.filter(project => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      project.project_name.toLowerCase().includes(q) ||
      project.hardware_items.some(item => item.name.toLowerCase().includes(q))
    );
  });

  if (!projects || projects.length === 0) {
    return (
      <div className="sd-empty">
        <p>No project data available for barcode generation.</p>
      </div>
    );
  }

  return (
    <div className="sd-stack">
      {/* Section 1: Generate Barcode */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tag className="h-5 w-5" />
          Generate Barcode
        </h3>
        <p className="sd-chart-sub">Select project → PO → item to generate barcode labels</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', marginTop: '1rem', alignItems: 'end' }}>
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
                setGeneratedBarcodes(null);
              }}
              className="sd-input"
              style={{ width: '100%' }}
            >
              <option value="">-- Select Project --</option>
              {projectList.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.prNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, color: MUTED, marginBottom: '0.25rem' }}>
              Select PO
            </label>
            <select
              value={selectedPO}
              onChange={(e) => {
                setSelectedPO(e.target.value);
                setSelectedItem('');
                setGeneratedBarcodes(null);
              }}
              className="sd-input"
              style={{ width: '100%' }}
              disabled={!selectedProject || availablePOs.length === 0}
            >
              <option value="">{availablePOs.length === 0 && selectedProject ? 'No POs available' : '-- Select PO --'}</option>
              {availablePOs.map((po) => (
                <option key={po.poNumber} value={po.poNumber}>
                  {po.poNumber}{po.supplier ? ` - ${po.supplier}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, color: MUTED, marginBottom: '0.25rem' }}>
              Select Item
            </label>
            <select
              value={selectedItem}
              onChange={(e) => {
                setSelectedItem(e.target.value);
                setGeneratedBarcodes(null);
              }}
              className="sd-input"
              style={{ width: '100%' }}
              disabled={!selectedPO || availableItems.length === 0}
            >
              <option value="">{availableItems.length === 0 && selectedPO ? 'No items available' : '-- Select Item --'}</option>
              {availableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.quantity} {item.unit})
                </option>
              ))}
            </select>
          </div>

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

        {/* Generated Barcodes Display */}
        {generatedBarcodes && generatedBarcodes.length > 0 && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderLeft: '3px solid var(--samurai-ok)', borderRadius: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.25rem' }}>Generated Barcodes ({generatedBarcodes.length})</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: TEXT }}>
                  {generatedBarcodes[0].itemName}
                </div>
                <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.25rem' }}>
                  {generatedBarcodes[0].totalUnits} units • PO: {generatedBarcodes[0].poNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrintBarcode}
                className="sd-btn sd-btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Printer className="h-4 w-4" />
                Print Labels ({generatedBarcodes.length})
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: TEXT, marginBottom: '0.75rem' }}>
                Generated Barcodes ({generatedBarcodes.length}):
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '1rem',
                maxHeight: '25rem',
                overflowY: 'auto',
                padding: '0.5rem'
              }}>
                {generatedBarcodes.map((barcode) => (
                  <BarcodeCard key={barcode.code} barcode={barcode} />
                ))}
              </div>
            </div>

            {generatedBarcodes[0].totalUnits > MAX_BARCODE_RENDER && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', color: 'var(--samurai-warning)' }}>
                ⚠ Showing first {MAX_BARCODE_RENDER} of {generatedBarcodes[0].totalUnits} units. Remaining barcodes will be generated when backend persistence is wired.
              </div>
            )}

            <div style={{ marginTop: '0.75rem', fontSize: '0.65rem', color: MUTED, fontStyle: 'italic' }}>
              ✓ {generatedBarcodes.length} barcode label(s) generated. Each barcode links individual unit to PO {generatedBarcodes[0].poNumber} from project {generatedBarcodes[0].projectName}. Changes are preview-only until backend API is connected.
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

                  {isExpanded && (
                    <div style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {project.hardware_items.map((item) => {
                          // Exact match on item_name instead of substring includes()
                          const hasBarcode = barcodeBatches.some(batch => 
                            batch.items.some(barcodeItem => barcodeItem.item_name === item.name)
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
                                  Quantity: {item.quantity} {item.unit} • Supplier: {item.selected_supplier?.name ?? '—'}
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
                                    setSelectedProject(project.project_id);
                                    setSelectedPO('');
                                    setSelectedItem('');
                                    setGeneratedBarcodes(null);
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
