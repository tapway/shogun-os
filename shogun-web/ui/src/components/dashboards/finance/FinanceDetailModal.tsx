import { useEffect } from 'react';
import { X } from 'lucide-react';

interface FinanceDetailModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string; // e.g. '36rem', '48rem' — default '40rem'
}

const TEXT = 'var(--samurai-text)';
const MUTED = 'var(--samurai-muted)';
const BORDER = 'var(--samurai-border)';

export function FinanceDetailModal({
  title,
  subtitle,
  onClose,
  children,
  maxWidth = '40rem',
}: FinanceDetailModalProps) {
  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: 'rgba(0,0,0,0.5)',
          border: 'none',
          cursor: 'default',
          backdropFilter: 'blur(2px)',
        }}
      />
      {/* Modal container */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '1rem',
          paddingTop: '3rem',
          overflowY: 'auto',
        }}
        onClick={onClose}
      >
        <div
          className="sd-card"
          style={{
            position: 'relative',
            zIndex: 50,
            width: '100%',
            maxWidth,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1.1rem',
              borderBottom: `1px solid ${BORDER}`,
              flexShrink: 0,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: TEXT,
                  margin: 0,
                }}
              >
                {title}
              </h2>
              {subtitle && (
                <p
                  style={{
                    fontSize: '0.72rem',
                    color: MUTED,
                    margin: 0,
                    marginTop: '0.15rem',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              className="sd-icon-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Body — scrollable */}
          <div
            style={{
              overflowY: 'auto',
              padding: '1.1rem',
              flex: 1,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
