import { useState } from 'react';
import { Users, BookOpen, Globe, Shield } from 'lucide-react';

interface Props {
  department: string;
  color: string;
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

interface TopicItem {
  id: string;
  title: string;
  content?: string;
  type?: 'document' | 'video' | 'link' | 'image';
}

interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  topics: TopicItem[];
}

const SECTIONS: Section[] = [
  {
    id: 'team',
    title: 'Team',
    icon: Users,
    topics: [
      { id: 'handbook', title: 'Employee Handbook 2026', type: 'document' },
      { id: 'mission', title: 'Mission, Vision, Values', type: 'document' },
      { id: 'values-video', title: 'Core Values Video', type: 'video' },
      { id: 'org-chart', title: 'Organisational Chart', type: 'document' },
      { id: 'office-tour', title: 'Office Tour', type: 'video' },
      { id: 'directions-tapway', title: 'How to Get to Tapway', type: 'document' },
      { id: 'directions-itmax', title: 'How to Get to ITMAX new office', type: 'document' },
      { id: 'staff-pics', title: 'Staff Pics', type: 'image' },
    ],
  },
  {
    id: 'sop',
    title: 'SOP',
    icon: BookOpen,
    topics: [
      { id: 'briohr-video', title: 'BRIOHR & Attendance Video Guidelines', type: 'video' },
      { id: 'jibble-clock', title: 'How to Clock In/Out (Jibble)', type: 'document' },
      { id: 'jibble-project', title: 'Jibble - Project & Support Team Activities SOP', type: 'document' },
      { id: 'jibble-product', title: 'Jibble - Product & Secondment Project SOP', type: 'document' },
      { id: 'submit-claim', title: 'How To Submit Claim?', type: 'document' },
      { id: 'roller-shutter', title: 'Roller Shutter Guide', type: 'document' },
      { id: 'collect-parcel', title: 'Collecting Parcel', type: 'document' },
      { id: 'visitor-log', title: 'Visitor Log', type: 'document' },
      { id: 'tidy-office', title: 'Keeping a Tidy Office', type: 'document' },
    ],
  },
  {
    id: 'website-training',
    title: 'Official Website/Training',
    icon: Globe,
    topics: [
      { id: 'aclouddguru', title: 'AcloudGuru Free Learning!', type: 'link' },
      { id: 'website', title: 'Tapway Website', type: 'link' },
      { id: 'social-media', title: 'Social Media', type: 'link' },
      { id: 'aws-cert', title: 'AWS Certification Guideline', type: 'document' },
    ],
  },
  {
    id: 'policies',
    title: 'Company Policies',
    icon: Shield,
    topics: [
      { id: 'code-conduct', title: 'Code of Conduct', type: 'document' },
      { id: 'leave-rules', title: 'Leave Rule & Categories', type: 'document' },
      { id: 'wages', title: 'Wages', type: 'document' },
      { id: 'overtime', title: 'Overtime (OT)', type: 'document' },
      { id: 'commission', title: 'Commission', type: 'document' },
      { id: 'expenses', title: 'Claimable Expenses', type: 'document' },
      { id: 'training-dev', title: 'Training & Development', type: 'document' },
      { id: 'anti-harassment', title: 'Anti-harassment and non-discrimination Policy', type: 'document' },
    ],
  },
];

export function HrCornerTab({ department, color }: Props) {
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('team');

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
            <p style={{ fontSize: '0.85rem', color: LIME, margin: '4px 0 0', fontWeight: 600 }}>Employee Handbook 2026</p>
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
        {/* Left Sidebar - Sections Navigation */}
        <div style={{ gridColumn: 'span 4' }}>
          <div className="sd-chart-card" style={{ 
            background: SURFACE, 
            border: `1px solid ${BORDER}`,
            padding: 0,
            borderRadius: '12px',
          }}>
            {SECTIONS.map((section) => {
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
                      <Icon 
                        className="h-5 w-5"
                        style={{ color: isExpanded ? LIME : MUTED }}
                      />
                      <span style={{ 
                        fontSize: '0.88rem', 
                        fontWeight: 600, 
                        color: isExpanded ? TEXT : MUTED,
                        transition: 'color 0.2s ease',
                      }}>
                        {section.title}
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: MUTED,
                      transition: 'transform 0.2s ease',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}>
                      ▶
                    </span>
                  </button>
                  
                  {isExpanded && (
                    <div style={{ padding: '8px 0', background: SURFACE_2 }}>
                      {section.topics.map((topic) => {
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
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = `${LIME}10`;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                          >
                            <span style={{ opacity: 0.7 }}>
                              {topic.type === 'video' && '🎥'}
                              {topic.type === 'link' && '🔗'}
                              {topic.type === 'image' && '🖼️'}
                              {topic.type === 'document' && '📄'}
                            </span>
                            <span className="truncate" style={{ flex: 1 }}>{topic.title}</span>
                          </button>
                        );
                      })}
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
              background: SURFACE, 
              border: `1px solid ${BORDER}`,
              padding: '60px 40px', 
              textAlign: 'center',
              borderRadius: '12px',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{ 
                fontSize: '4rem', 
                marginBottom: '20px',
                opacity: 0.3,
              }}>📚</div>
              <h3 style={{ 
                fontSize: '1.2rem', 
                fontWeight: 700, 
                color: TEXT, 
                margin: '0 0 12px' 
              }}>
                Select a topic from the sidebar
              </h3>
              <p style={{ 
                fontSize: '0.88rem', 
                color: MUTED, 
                maxWidth: '450px',
                lineHeight: 1.6,
                margin: 0,
              }}>
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
      case 'video': return { icon: '🎥', label: 'Video', color: '#ef4444' };
      case 'link': return { icon: '🔗', label: 'External Link', color: '#3b82f6' };
      case 'image': return { icon: '🖼️', label: 'Image Gallery', color: '#8b5cf6' };
      default: return { icon: '📄', label: 'Document', color: LIME };
    }
  };

  const typeInfo = getTypeInfo(topic.type);

  const getSampleContent = (topicId: string): string => {
    const contents: Record<string, string> = {
      'handbook': 'The Employee Handbook 2026 contains comprehensive guidelines on company policies, procedures, and expectations. Download the PDF version for offline reading.',
      'mission': 'Our Mission: Empower businesses with intelligent vision solutions.\n\nOur Vision: To be the leading AI-powered security and analytics provider in Southeast Asia by 2030.\n\nOur Values: Innovation, Integrity, Customer-Centricity, Teamwork.',
      'org-chart': 'Tapway organisational structure showing reporting lines, departments, and key personnel. Updated Q3 2026.',
      'code-conduct': 'This policy outlines expected behaviors, professional standards, and ethical guidelines for all employees. Violations may result in disciplinary action.',
      'leave-rules': 'Annual Leave: 14 days (probation), 16 days (confirmed). Sick Leave: 14 days per year. Hospitalization Leave: 60 days per year. Unpaid Leave: Subject to approval.',
    };
    return contents[topicId] || `Detailed content for: ${topic.title}`;
  };

  return (
    <div className="sd-chart-card" style={{ 
      background: SURFACE, 
      border: `1px solid ${BORDER}`,
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ 
        padding: '24px 28px', 
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{typeInfo.icon}</span>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT, margin: '0 0 6px' }}>
              {topic.title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontSize: '0.7rem', 
                color: LIME, 
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                background: `${LIME}15`,
                padding: '4px 10px',
                borderRadius: '6px',
              }}>
                {typeInfo.label}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: `1px solid ${BORDER}`,
            fontSize: '1.2rem',
            color: MUTED,
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = LIME;
            e.currentTarget.style.color = LIME;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = BORDER;
            e.currentTarget.style.color = MUTED;
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '28px' }}>
        <div style={{ 
          fontSize: '0.92rem', 
          lineHeight: 1.8, 
          color: TEXT,
          whiteSpace: 'pre-line',
          marginBottom: '28px',
        }}>
          {getSampleContent(topic.id)}
        </div>

        {/* Action Buttons */}
        <div style={{ 
          marginTop: '32px', 
          paddingTop: '24px',
          borderTop: `1px solid ${BORDER}`,
          display: 'flex', 
          gap: '12px', 
          flexWrap: 'wrap',
        }}>
          {topic.type === 'document' && (
            <>
              <button style={{
                padding: '12px 24px',
                background: LIME,
                color: LIME_TEXT,
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(206, 239, 125, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = LIME_DIM;
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(206, 239, 125, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = LIME;
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(206, 239, 125, 0.2)';
              }}
              >
                📥 Download PDF
              </button>
              <button style={{
                padding: '12px 24px',
                background: 'transparent',
                color: TEXT,
                border: `1px solid ${BORDER}`,
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = LIME;
                e.currentTarget.style.color = LIME;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = BORDER;
                e.currentTarget.style.color = TEXT;
              }}
              >
                🔖 Bookmark
              </button>
            </>
          )}
          {topic.type === 'video' && (
            <button style={{
              padding: '12px 24px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ef4444';
            }}
            >
              ▶️ Play Video
            </button>
          )}
          {topic.type === 'link' && (
            <button style={{
              padding: '12px 24px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#3b82f6';
            }}
            >
              🔗 Open Link
            </button>
          )}
          {topic.type === 'image' && (
            <button style={{
              padding: '12px 24px',
              background: '#8b5cf6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7c3aed';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#8b5cf6';
            }}
            >
              🖼️ View Gallery
            </button>
          )}
          <button style={{
            padding: '12px 24px',
            background: 'transparent',
            color: MUTED,
            border: `1px solid ${BORDER}`,
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = LIME;
            e.currentTarget.style.color = LIME;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = BORDER;
            e.currentTarget.style.color = MUTED;
          }}
          >
            ❓ Contact HR
          </button>
        </div>
      </div>
    </div>
  );
}
