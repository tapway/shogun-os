import { useState } from 'react';

interface Props {
  department: string;
  color: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE = 'var(--samurai-surface)';
const BORDER = 'var(--samurai-border)';
const NAVY = '#1e3a5f';
const GREEN = '#10b981';
const BLUE = '#3b82f6';

interface TopicItem {
  id: string;
  title: string;
  content?: string;
  type?: 'document' | 'video' | 'link' | 'image';
}

interface Section {
  id: string;
  title: string;
  icon: string;
  topics: TopicItem[];
}

const SECTIONS: Section[] = [
  {
    id: 'team',
    title: 'Team',
    icon: '👥',
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
    icon: '📋',
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
    icon: '🌐',
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
    icon: '⚖️',
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
        background: `linear-gradient(135deg, ${color} 0%, #0d9488 100%)`,
        borderRadius: '12px',
        padding: '24px 28px',
        color: '#fff',
        marginBottom: '20px',
      }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 8px' }}>👋🏻 Welcome to HR Corner!</h2>
        <p style={{ fontSize: '0.88rem', lineHeight: 1.5, margin: 0, opacity: 0.95 }}>
          This dashboard is designed to provide you with information about working conditions, employee benefits and policies. 
          For more details you may refer to the company handbook. If you are in doubt in certain contents of this dashboard 
          or in the handbook, you should seek clarification from the Human Resource Department.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Sidebar - Sections Navigation */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="sd-chart-card" style={{ padding: 0 }}>
            {SECTIONS.map((section) => (
              <div key={section.id}>
                <button
                  onClick={() => setExpandedSection(expandedSection === section.id ? '' : section.id)}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    background: expandedSection === section.id ? `${color}15` : 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${BORDER}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{section.icon}</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: TEXT }}>{section.title}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: MUTED }}>
                    {expandedSection === section.id ? '▼' : '▶'}
                  </span>
                </button>
                
                {expandedSection === section.id && (
                  <div style={{ padding: '8px 0' }}>
                    {section.topics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => setSelectedTopic(topic)}
                        style={{
                          width: '100%',
                          padding: '10px 18px 10px 46px',
                          background: selectedTopic?.id === topic.id ? `${color}15` : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '0.82rem',
                          color: selectedTopic?.id === topic.id ? color : MUTED,
                          fontWeight: selectedTopic?.id === topic.id ? 600 : 400,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {topic.type === 'video' && '🎥'}
                        {topic.type === 'link' && '🔗'}
                        {topic.type === 'image' && '🖼️'}
                        {topic.type === 'document' && '📄'}
                        <span className="truncate">{topic.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ gridColumn: 'span 3' }}>
          {selectedTopic ? (
            <TopicDetailView topic={selectedTopic} onClose={() => setSelectedTopic(null)} />
          ) : (
            <div className="sd-chart-card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📚</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: NAVY, marginBottom: '8px' }}>
                Select a topic from the sidebar
              </h3>
              <p style={{ fontSize: '0.88rem', color: MUTED, maxWidth: '400px', margin: '0 auto' }}>
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
  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'link': return '🔗';
      case 'image': return '🖼️';
      default: return '📄';
    }
  };

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
    <div className="sd-chart-card">
      {/* Header */}
      <div style={{ 
        padding: '20px 24px', 
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.5rem' }}>{getTypeIcon(topic.type)}</span>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: NAVY, margin: 0 }}>{topic.title}</h3>
            <span style={{ fontSize: '0.72rem', color: MUTED, textTransform: 'uppercase' }}>
              {topic.type || 'Document'}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.2rem',
            color: MUTED,
            cursor: 'pointer',
            padding: '8px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ 
          fontSize: '0.9rem', 
          lineHeight: 1.7, 
          color: TEXT,
          whiteSpace: 'pre-line',
        }}>
          {getSampleContent(topic.id)}
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {topic.type === 'document' && (
            <>
              <button style={{
                padding: '10px 20px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                📥 Download PDF
              </button>
              <button style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                color: TEXT,
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                🔖 Bookmark
              </button>
            </>
          )}
          {topic.type === 'video' && (
            <button style={{
              padding: '10px 20px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              ▶️ Play Video
            </button>
          )}
          {topic.type === 'link' && (
            <button style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              🔗 Open Link
            </button>
          )}
          {topic.type === 'image' && (
            <button style={{
              padding: '10px 20px',
              background: '#8b5cf6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              🖼️ View Gallery
            </button>
          )}
          <button style={{
            padding: '10px 20px',
            background: 'transparent',
            color: MUTED,
            border: `1px solid ${BORDER}`,
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            ❓ Contact HR
          </button>
        </div>
      </div>
    </div>
  );
}
