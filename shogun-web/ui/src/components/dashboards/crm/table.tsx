import React from 'react';

/** Shared table-header cell for CRM list tabs (Deals, Companies, Partners). */
const MUTED = 'var(--samurai-muted)';

const thStyle = { fontSize: '0.72rem', fontWeight: 500, color: MUTED } as const;

export function Th({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return <th className="px-3 py-2.5" style={{ ...thStyle, textAlign: align }}>{children}</th>;
}

export { thStyle };
