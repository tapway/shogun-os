import { useState, useEffect } from 'react';
import { Users, BookOpen, Globe, Shield, FileText, X, Video, Image as ImageIcon, MapPin, Briefcase, Clock, Calendar, CreditCard, Building, Package, UserCheck, GraduationCap, Trophy, Heart, Star, Target, Play, Eye, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface Props {
  department?: string;
  color?: string;
}

const NAVY = 'var(--samurai-primary, #1a284d)';
const SURFACE = 'var(--samurai-surface, #0e1424)';
const SURFACE_2 = 'var(--samurai-surface-2, #151c2e)';
const BORDER = 'var(--samurai-border, #243047)';
const TEXT = 'var(--samurai-text, #ffffff)';
const MUTED = 'var(--samurai-muted, #a8a8a8)';
const LIME = 'var(--samurai-lime, #ceef7d)';
const LIME_DIM = 'var(--samurai-lime-dim, #b5d96a)';
const LIME_TEXT = 'var(--samurai-accent-button-text, #1a284d)';

export interface TopicItem {
  id: string;
  title: string;
  type?: 'document' | 'video' | 'link' | 'image' | 'pdf' | 'embed';
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  pdfUrl?: string;
  embedUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  content?: string;
}

export interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  topics: TopicItem[];
}

// Icon map for resolving icon names from API responses
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Users, BookOpen, Globe, Shield, FileText, Video, ImageIcon, MapPin,
  Briefcase, Clock, Calendar, CreditCard, Building, Package, UserCheck,
  GraduationCap, Trophy, Heart, Star, Target, Play, Eye,
};

function resolveIcon(name?: string) {
  if (!name) return FileText;
  return ICON_MAP[name] || FileText;
}

const ALLOWED_IFRAME_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'youtube-nocookie.com',
  'drive.google.com', 'docs.google.com', 'www.googleapis.com',
  'player.vimeo.com', 'embed.cloudflarestream.com',
]);

function isSafeIframeUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_IFRAME_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

// Section/topic structure — titles and content loaded from gbrain at runtime.
// These defaults define the expected section/topic IDs and types only.
const DEFAULT_SECTIONS: Section[] = [
  {
    id: 'team',
    title: 'Team',
    icon: Users,
    topics: [
      { id: 'handbook', title: 'Employee Handbook', type: 'pdf', icon: BookOpen },
      { id: 'mission', title: 'Mission, Vision, Values', type: 'document', icon: Target },
      { id: 'core-values-video', title: 'Core Values Video', type: 'video', icon: Play },
      { id: 'org-chart', title: 'Organisational Chart', type: 'image', icon: Building },
      { id: 'office-tour', title: 'Office Tour', type: 'document', icon: Eye },
      { id: 'directions', title: 'Office Directions', type: 'document', icon: MapPin },
    ],
  },
  {
    id: 'sop',
    title: 'SOP',
    icon: BookOpen,
    topics: [
      { id: 'attendance', title: 'Attendance Guidelines', type: 'document', icon: Clock },
      { id: 'clock-in-out', title: 'Clock In/Out Guide', type: 'document', icon: Clock },
      { id: 'project-sop', title: 'Project Activities SOP', type: 'document', icon: Briefcase },
      { id: 'product-sop', title: 'Product & Secondment SOP', type: 'document', icon: Briefcase },
      { id: 'submit-claim', title: 'Claims Submission', type: 'document', icon: CreditCard },
      { id: 'facility-guide', title: 'Facility Guide', type: 'document', icon: Building },
      { id: 'parcel', title: 'Parcel Collection', type: 'document', icon: Package },
      { id: 'visitor-log', title: 'Visitor Protocol', type: 'document', icon: UserCheck },
      { id: 'office-tidy', title: 'Office Cleanliness', type: 'document', icon: Star },
    ],
  },
  {
    id: 'website-training',
    title: 'Official Website/Training',
    icon: Globe,
    topics: [
      { id: 'learning-platform', title: 'Learning Platform', type: 'link', icon: GraduationCap },
      { id: 'company-website', title: 'Company Website', type: 'link', icon: Globe },
      { id: 'social-media', title: 'Social Media', type: 'document', icon: Heart },
      { id: 'cert-guideline', title: 'Certification Guideline', type: 'document', icon: Trophy },
    ],
  },
  {
    id: 'policies',
    title: 'Company Policies',
    icon: Shield,
    topics: [
      { id: 'code-conduct', title: 'Code of Conduct', type: 'document', icon: Shield },
      { id: 'leave-rules', title: 'Leave Rules & Categories', type: 'document', icon: Calendar },
      { id: 'wages', title: 'Wages & Payroll', type: 'document', icon: CreditCard },
      { id: 'overtime', title: 'Overtime Policy', type: 'document', icon: Clock },
      { id: 'commission', title: 'Commission Policy', type: 'document', icon: Trophy },
      { id: 'expenses', title: 'Claimable Expenses', type: 'document', icon: CreditCard },
      { id: 'training-dev', title: 'Training & Development', type: 'document', icon: GraduationCap },
      { id: 'anti-harassment', title: 'Anti-harassment Policy', type: 'document', icon: Shield },
    ],
  },
];

export function HrCornerTab({ department, color }: Props) {
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('team');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<any[]>('/hr-corner/sections');
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          // Merge gbrain data into default structure — preserve topics not yet in gbrain
          const apiMap = new Map(data.map((s: any) => [s.id, s]));
          const merged = DEFAULT_SECTIONS.map((defSection) => {
            const apiSection = apiMap.get(defSection.id);
            if (!apiSection) return defSection; // No gbrain data for this section
            const apiTopics = new Map((apiSection.topics || []).map((t: any) => [t.id, t]));
            const mergedTopics = defSection.topics.map((defTopic) => {
              const apiTopic = apiTopics.get(defTopic.id) as TopicItem | undefined;
              if (!apiTopic) return defTopic; // No gbrain data for this topic
              return {
                ...defTopic,
                content: apiTopic.content || defTopic.content,
                pdfUrl: apiTopic.pdfUrl || (defTopic as any).pdfUrl,
                videoUrl: apiTopic.videoUrl || (defTopic as any).videoUrl,
                imageUrl: apiTopic.imageUrl || (defTopic as any).imageUrl,
                embedUrl: apiTopic.embedUrl || (defTopic as any).embedUrl,
              };
            });
            return { ...defSection, topics: mergedTopics };
          });
          // Append any gbrain-only sections not in defaults
          const defaultIds = new Set(DEFAULT_SECTIONS.map(s => s.id));
          for (const apiSection of data) {
            if (!defaultIds.has(apiSection.id)) {
              merged.push({
                ...apiSection,
                icon: resolveIcon(apiSection.icon),
                topics: (apiSection.topics || []).map((t: any) => ({
                  ...t,
                  icon: t.icon ? resolveIcon(t.icon) : undefined,
                })),
              });
            }
          }
          setSections(merged);
        }
      } catch {
        // Keep default structure if API unavailable
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="sd-stack" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: LIME }} />
      </div>
    );
  }

  return (
    <div className="sd-stack">
      {/* Welcome Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, ${SURFACE_2} 100%)`,
        border: `1px solid ${BORDER}`,
        borderRadius: '12px',
        padding: '28px 32px',
        color: TEXT,
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
          <span style={{ fontSize: '2rem' }}>👋🏻</span>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: TEXT }}>Welcome to HR Corner</h2>
            <p style={{ fontSize: '0.85rem', color: LIME, margin: '4px 0 0', fontWeight: 600 }}>Employee Handbook & Resources Centre</p>
          </div>
        </div>
        <p style={{ fontSize: '0.88rem', lineHeight: 1.6, margin: '16px 0 0', color: MUTED, maxWidth: '800px' }}>
          This dashboard is designed to provide you with information about working conditions, employee benefits and policies. 
          For more details you may refer to the company handbook. If you are in doubt in certain contents of this dashboard 
          or in the handbook, you should seek clarification from the Human Resource Department.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Sidebar */}
        <div style={{ gridColumn: 'span 4' }}>
          <div className="sd-chart-card" style={{ 
            background: SURFACE, 
            border: `1px solid ${BORDER}`,
            padding: 0,
            borderRadius: '12px',
          }}>
            {sections.map((section) => {
              const Icon = section.icon;
              const isExpanded = expandedSection === section.id;
              return (
                <div key={section.id}>
                  <button
                    onClick={() => setExpandedSection(isExpanded ? '' : section.id)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      background: isExpanded ? SURFACE_2 : 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${BORDER}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Icon className="h-5 w-5" style={{ color: isExpanded ? LIME : MUTED }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: isExpanded ? TEXT : MUTED, transition: 'color 0.2s ease' }}>
                        {section.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: MUTED, transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  </button>
                  
                  {isExpanded && (
                    <div style={{ padding: '8px 0', background: SURFACE_2 }}>
                      {section.topics.length === 0 ? (
                        <div style={{ padding: '16px 20px 16px 52px', fontSize: '0.8rem', color: MUTED, fontStyle: 'italic' }}>
                          No topics available yet
                        </div>
                      ) : (
                        section.topics.map((topic) => {
                          const isSelected = selectedTopic?.id === topic.id;
                          return (
                            <button
                              key={topic.id}
                              onClick={() => setSelectedTopic(topic)}
                              style={{
                                width: '100%',
                                padding: '12px 20px 12px 52px',
                                background: isSelected ? `${LIME}20` : 'transparent',
                                border: 'none',
                                borderLeft: isSelected ? `3px solid ${LIME}` : '3px solid transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.82rem',
                                color: isSelected ? LIME : MUTED,
                                fontWeight: isSelected ? 600 : 400,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = `${LIME}10`; }}
                              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}>
                                {topic.icon ? (
                                  <topic.icon className="w-4 h-4" style={{ color: isSelected ? LIME : MUTED }} />
                                ) : (
                                  <>
                                    {topic.type === 'pdf' && '📕'}
                                    {topic.type === 'video' && '🎥'}
                                    {topic.type === 'link' && '🔗'}
                                    {topic.type === 'image' && '🖼️'}
                                    {topic.type === 'document' && '📄'}
                                  </>
                                )}
                              </span>
                              <span className="truncate" style={{ flex: 1 }}>{topic.title}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ gridColumn: 'span 8' }}>
          {selectedTopic ? (
            <TopicDetailView topic={selectedTopic} onClose={() => setSelectedTopic(null)} />
          ) : (
            <div className="sd-chart-card" style={{ 
              background: SURFACE, border: `1px solid ${BORDER}`, padding: '60px 40px', textAlign: 'center',
              borderRadius: '12px', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.3 }}>📚</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT, margin: '0 0 12px' }}>Select a topic from the sidebar</h3>
              <p style={{ fontSize: '0.88rem', color: MUTED, maxWidth: '450px', lineHeight: 1.6, margin: 0 }}>
                Browse through Team, SOP, Training, or Company Policies sections to access detailed information and resources.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Topic Detail View ────────────────────────────────────────────────────────

function TopicDetailView({ topic, onClose }: { topic: TopicItem; onClose: () => void }) {
  const getTypeInfo = (type?: string) => {
    switch (type) {
      case 'pdf': return { icon: '📕', label: 'PDF Document', color: LIME };
      case 'video': return { icon: '🎥', label: 'Video', color: '#ef4444' };
      case 'link': return { icon: '🔗', label: 'External Link', color: '#3b82f6' };
      case 'image': return { icon: '🖼️', label: 'Image Gallery', color: '#8b5cf6' };
      case 'embed': return { icon: '📊', label: 'Embedded View', color: LIME };
      default: return { icon: '📄', label: 'Document', color: LIME };
    }
  };

  const typeInfo = getTypeInfo(topic.type);

  // PDF viewer mode
  if (topic.type === 'pdf' && topic.pdfUrl) {
    return (
      <div className="sd-chart-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>{typeInfo.icon}</span>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT, margin: 0 }}>{topic.title}</h3>
              <span style={{ fontSize: '0.7rem', color: LIME, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, background: `${LIME}15`, padding: '3px 8px', borderRadius: '4px' }}>
                {typeInfo.label}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <a href={topic.pdfUrl} download style={{
              padding: '8px 16px', background: LIME, color: LIME_TEXT, border: 'none', borderRadius: '8px',
              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
            }}>📥 Download</a>
            <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${BORDER}`, fontSize: '1rem', color: MUTED, cursor: 'pointer', padding: '6px 10px', borderRadius: '8px' }}>✕</button>
          </div>
        </div>
        <div style={{ height: '75vh', width: '100%' }}>
          {isSafeIframeUrl(topic.pdfUrl) ? <iframe src={topic.pdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} title={topic.title} /> : <div style={{ padding: '40px', textAlign: 'center', color: MUTED }}>PDF preview unavailable — <a href={topic.pdfUrl} download style={{ color: LIME }}>Download instead</a></div>}
        </div>
      </div>
    );
  }

  // Video embed mode (YouTube, etc.)
  if (topic.type === 'video' && topic.videoUrl) {
    return (
      <div className="sd-chart-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>{typeInfo.icon}</span>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT, margin: 0 }}>{topic.title}</h3>
              <span style={{ fontSize: '0.7rem', color: LIME, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, background: `${LIME}15`, padding: '3px 8px', borderRadius: '4px' }}>
                {typeInfo.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${BORDER}`, fontSize: '1rem', color: MUTED, cursor: 'pointer', padding: '6px 10px', borderRadius: '8px' }}>✕</button>
        </div>
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
          <iframe 
            src={isSafeIframeUrl(topic.videoUrl) ? topic.videoUrl : ''} 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} 
            title={topic.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Image view mode
  if (topic.type === 'image' && topic.imageUrl) {
    return (
      <div className="sd-chart-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>{typeInfo.icon}</span>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT, margin: 0 }}>{topic.title}</h3>
              <span style={{ fontSize: '0.7rem', color: LIME, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, background: `${LIME}15`, padding: '3px 8px', borderRadius: '4px' }}>
                {typeInfo.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${BORDER}`, fontSize: '1rem', color: MUTED, cursor: 'pointer', padding: '6px 10px', borderRadius: '8px' }}>✕</button>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <img src={topic.imageUrl} alt={topic.title} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', border: `1px solid ${BORDER}` }} />
        </div>
      </div>
    );
  }

  // Embedded content mode (Google Slides, etc.)
  if (topic.type === 'embed' && topic.embedUrl) {
    return (
      <div className="sd-chart-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>{typeInfo.icon}</span>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT, margin: 0 }}>{topic.title}</h3>
              <span style={{ fontSize: '0.7rem', color: LIME, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, background: `${LIME}15`, padding: '3px 8px', borderRadius: '4px' }}>
                {typeInfo.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${BORDER}`, fontSize: '1rem', color: MUTED, cursor: 'pointer', padding: '6px 10px', borderRadius: '8px' }}>✕</button>
        </div>
        <div style={{ height: '75vh', width: '100%' }}>
          <iframe 
            src={isSafeIframeUrl(topic.embedUrl) ? topic.embedUrl : ''} 
            style={{ width: '100%', height: '100%', border: 'none' }} 
            title={topic.title}
            frameBorder="0"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Standard content view
  return (
    <div className="sd-chart-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{typeInfo.icon}</span>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT, margin: '0 0 6px' }}>{topic.title}</h3>
            <span style={{ fontSize: '0.7rem', color: LIME, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, background: `${LIME}15`, padding: '4px 10px', borderRadius: '6px' }}>
              {typeInfo.label}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${BORDER}`, fontSize: '1.2rem', color: MUTED, cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.color = LIME; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED; }}
        >✕</button>
      </div>

      <div style={{ padding: '28px' }}>
        {topic.content ? (
          <div style={{ fontSize: '0.92rem', lineHeight: 1.8, color: TEXT, whiteSpace: 'pre-line' }}>
            {topic.content}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: MUTED }}>
            <p>Content coming soon. Please check back later or contact HR for details.</p>
          </div>
        )}

        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {topic.type === 'document' && (
            <>
              <button style={{ padding: '12px 24px', background: LIME, color: LIME_TEXT, border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(206,239,125,0.2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = LIME_DIM; }} onMouseLeave={(e) => { e.currentTarget.style.background = LIME; }}>
                📥 Download PDF
              </button>
              <button style={{ padding: '12px 24px', background: 'transparent', color: TEXT, border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.color = LIME; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT; }}>
                🔖 Bookmark
              </button>
            </>
          )}
          {topic.type === 'video' && (
            <button style={{ padding: '12px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>▶️ Play Video</button>
          )}
          {topic.type === 'link' && (
            <button style={{ padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>🔗 Open Link</button>
          )}
          {topic.type === 'image' && (
            <button style={{ padding: '12px 24px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>🖼️ View Gallery</button>
          )}
          <button style={{ padding: '12px 24px', background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = LIME; e.currentTarget.style.color = LIME; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED; }}>
            ❓ Contact HR
          </button>
        </div>
      </div>
    </div>
  );
}
