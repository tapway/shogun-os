import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinanceDetailModal } from './FinanceDetailModal';
import { emailTemplatesApi } from '../../../lib/api';
import type { DunningItem, EmailDraft, EmailTemplate } from '../../../lib/types';

interface DunningEmailModalProps {
  dunningItem: DunningItem;
  department: string;
  onClose: () => void;
}

const fmtMyr = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';

type Step = 'form' | 'draft' | 'sending' | 'sent';

export function DunningEmailModal({ dunningItem, department, onClose }: DunningEmailModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('form');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [sendError, setSendError] = useState<string>('');

  // Load templates
  const templatesQuery = useQuery({
    queryKey: ['email-templates', department],
    queryFn: () => emailTemplatesApi.list(department),
  });

  const templates: EmailTemplate[] = templatesQuery.data?.templates ?? [];

  // Auto-select first dunning template
  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      const firstDunning = templates.find((t) => t.scenario.startsWith('dunning')) ?? templates[0];
      setSelectedTemplateId(firstDunning.id);
    }
  }, [templates, selectedTemplateId]);

  // Generate draft mutation
  const draftMutation = useMutation({
    mutationFn: () =>
      emailTemplatesApi.draft(department, {
        template_id: selectedTemplateId,
        context: {
          company: dunningItem.customer,
          amount_due: fmtMyr(dunningItem.amount),
          overdue_days: dunningItem.aging_days,
          invoice_no: dunningItem.invoice_no,
        },
        custom_instructions: customInstructions || undefined,
      }),
    onSuccess: (data) => {
      setDraft(data);
      setEditableSubject(data.subject);
      setEditableBody(data.body);
      setStep('draft');
    },
    onError: (err: Error) => {
      setSendError(`Failed to generate draft: ${err.message}`);
    },
  });

  // Send email mutation
  const sendMutation = useMutation({
    mutationFn: () =>
      emailTemplatesApi.send(department, {
        to: recipientEmail,
        subject: editableSubject,
        body: editableBody,
      }),
    onSuccess: () => {
      setStep('sent');
      queryClient.invalidateQueries({ queryKey: ['email-templates', department] });
    },
    onError: (err: Error) => {
      setSendError(`Failed to send email: ${err.message}`);
      setStep('draft');
    },
  });

  const handleGenerateDraft = () => {
    setSendError('');
    draftMutation.mutate();
  };

  const handleConfirmSend = () => {
    setSendError('');
    setStep('sending');
    sendMutation.mutate();
  };

  const handleRegenerateDraft = () => {
    setIsEditing(false);
    draftMutation.mutate();
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <FinanceDetailModal
      title="Send Reminder Email"
      subtitle={`${dunningItem.customer} · ${dunningItem.invoice_no}`}
      onClose={onClose}
      maxWidth="42rem"
    >
      {/* Step 1: Pre-filled form */}
      {step === 'form' && (
        <div className="sd-stack">
          {/* Context summary (read-only) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED }}>Amount Due</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: TEXT, fontSize: '1.1rem' }}>{fmtMyr(dunningItem.amount)}</div>
            </div>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED }}>Overdue Days</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--samurai-danger)', fontSize: '1.1rem' }}>{dunningItem.aging_days}d</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.2rem' }}>Customer</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{dunningItem.customer}</div>
            </div>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.2rem' }}>Invoice #</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{dunningItem.invoice_no}</div>
            </div>
          </div>

          {/* Template selector */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.72rem', color: MUTED, display: 'block', marginBottom: '0.3rem' }}>Email Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.6rem', borderRadius: '0.4rem',
                background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}`, fontSize: '0.85rem',
              }}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {selectedTemplate && (
              <p style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.3rem' }}>
                Subject: {selectedTemplate.subject_template}
              </p>
            )}
          </div>

          {/* Recipient email */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.72rem', color: MUTED, display: 'block', marginBottom: '0.3rem' }}>Recipient Email</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="customer@company.com"
              style={{
                width: '100%', padding: '0.5rem 0.6rem', borderRadius: '0.4rem',
                background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}`, fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Custom instructions (optional) */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.72rem', color: MUTED, display: 'block', marginBottom: '0.3rem' }}>
              Custom Instructions <span style={{ color: MUTED }}>(optional — e.g. "tone: firmer", "mention 7-day deadline")</span>
            </label>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Be more assertive about the deadline"
              style={{
                width: '100%', padding: '0.5rem 0.6rem', borderRadius: '0.4rem',
                background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}`, fontSize: '0.85rem',
              }}
            />
          </div>

          {sendError && (
            <p style={{ fontSize: '0.8rem', color: 'var(--samurai-danger)', marginBottom: '0.5rem' }}>{sendError}</p>
          )}

          <button
            type="button"
            onClick={handleGenerateDraft}
            disabled={!selectedTemplateId || !recipientEmail || draftMutation.isPending}
            className="sd-btn sd-btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.7rem', fontSize: '0.85rem' }}
          >
            {draftMutation.isPending ? 'Generating Draft…' : 'Generate Draft →'}
          </button>
        </div>
      )}

      {/* Step 2: Draft preview / edit */}
      {step === 'draft' && draft && (
        <div className="sd-stack">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', color: MUTED }}>
              Draft generated via {draft.source === 'llm' ? 'AI' : 'template'}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="sd-btn sd-btn-secondary"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
              >
                {isEditing ? 'Preview' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={handleRegenerateDraft}
                disabled={draftMutation.isPending}
                className="sd-btn sd-btn-secondary"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
              >
                Regenerate
              </button>
            </div>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: '0.5rem' }}>
            {isEditing ? (
              <>
                <label style={{ fontSize: '0.72rem', color: MUTED, display: 'block', marginBottom: '0.2rem' }}>Subject</label>
                <input
                  type="text"
                  value={editableSubject}
                  onChange={(e) => setEditableSubject(e.target.value)}
                  style={{
                    width: '100%', padding: '0.5rem 0.6rem', borderRadius: '0.4rem',
                    background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}`, fontSize: '0.85rem',
                  }}
                />
              </>
            ) : (
              <div style={{ padding: '0.5rem 0.6rem', borderRadius: '0.4rem', background: SURFACE_2 }}>
                <span style={{ fontSize: '0.72rem', color: MUTED }}>Subject: </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{editableSubject}</span>
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{ marginBottom: '0.75rem' }}>
            {isEditing ? (
              <>
                <label style={{ fontSize: '0.72rem', color: MUTED, display: 'block', marginBottom: '0.2rem' }}>Email Body</label>
                <textarea
                  value={editableBody}
                  onChange={(e) => setEditableBody(e.target.value)}
                  rows={14}
                  style={{
                    width: '100%', padding: '0.6rem', borderRadius: '0.4rem',
                    background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}`,
                    fontSize: '0.82rem', fontFamily: 'monospace', resize: 'vertical',
                  }}
                />
              </>
            ) : (
              <div
                style={{
                  padding: '0.75rem', borderRadius: '0.4rem', background: SURFACE_2,
                  fontSize: '0.82rem', color: TEXT, whiteSpace: 'pre-wrap', lineHeight: 1.5,
                  maxHeight: '300px', overflowY: 'auto',
                }}
              >
                {editableBody}
              </div>
            )}
          </div>

          {/* Recipient reminder */}
          <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.5rem' }}>
            To: <strong style={{ color: TEXT }}>{recipientEmail}</strong>
          </div>

          {sendError && (
            <p style={{ fontSize: '0.8rem', color: 'var(--samurai-danger)', marginBottom: '0.5rem' }}>{sendError}</p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setStep('form')}
              className="sd-btn sd-btn-secondary"
              style={{ flex: 1, justifyContent: 'center', padding: '0.6rem', fontSize: '0.85rem' }}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleConfirmSend}
              className="sd-btn sd-btn-primary"
              style={{ flex: 2, justifyContent: 'center', padding: '0.6rem', fontSize: '0.85rem' }}
            >
              Confirm & Send →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Sending */}
      {step === 'sending' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="h-7 w-7 animate-spin rounded-full mx-auto mb-3"
            style={{ border: `2px solid var(--samurai-lime)`, borderTopColor: 'transparent' }} />
          <p style={{ fontSize: '0.85rem', color: MUTED }}>Sending email to {recipientEmail}…</p>
        </div>
      )}

      {/* Step 4: Sent */}
      {step === 'sent' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{
            width: '3rem', height: '3rem', borderRadius: '50%',
            background: 'var(--samurai-ok)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: TEXT, marginBottom: '0.3rem' }}>Email Sent</h3>
          <p style={{ fontSize: '0.82rem', color: MUTED, marginBottom: '0.75rem' }}>
            Reminder email sent to {recipientEmail}
          </p>
          <p style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '1rem' }}>
            Subject: {editableSubject}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="sd-btn sd-btn-primary"
            style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
          >
            Done
          </button>
        </div>
      )}
    </FinanceDetailModal>
  );
}
