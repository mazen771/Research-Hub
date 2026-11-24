import { useId, useMemo, useState } from 'react';
import { DatabaseOutlined, DownOutlined } from '@ant-design/icons';
import type { ChatMessage } from '../types';

interface MemoryCardProps {
  summary: string;
  messages: ChatMessage[];
  isArabic?: boolean;
  isRtl?: boolean;
}

// Split the free-text rolling summary into a clean body + a few structured details
function parseSummary(raw: string) {
  const body = raw
    .replace(/^\s*Conversation Summary(?: So Far)?\s*:\s*/i, '')
    .trim();
  const via = body.match(/via\s+(.+?)\s*\(([^)]+)\)/i);
  return {
    body,
    provider: via?.[1]?.trim(),
    model: via?.[2]?.trim(),
  };
}

export function MemoryCard({ summary, messages, isArabic = false, isRtl = false }: MemoryCardProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const { body, provider, model } = useMemo(() => parseSummary(summary), [summary]);

  const stats = useMemo(() => {
    const questions = messages.filter((m) => m.role === 'user').length;
    const claims = messages.reduce((n, m) => n + (m.claims?.length || 0), 0);
    const tokens = Math.round(summary.length / 3.6);
    return { questions, claims, tokens };
  }, [messages, summary]);

  const t = isArabic
    ? {
        title: 'ذاكرة المحادثة',
        active: 'نشطة',
        summary: 'الملخص',
        details: 'التفاصيل',
        model: 'النموذج',
        questions: 'الأسئلة',
        claims: 'الأدلة',
        tokens: 'رموز',
      }
    : {
        title: 'Conversation Memory',
        active: 'Active',
        summary: 'Summary',
        details: 'Details',
        model: 'Model',
        questions: 'Questions',
        claims: 'Claims',
        tokens: 'Tokens',
      };

  return (
    <div className={`memory-card ${open ? 'open' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <button
        type="button"
        className="memory-card-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="memory-card-icon" aria-hidden="true">
          <DatabaseOutlined />
        </span>
        <span className="memory-card-title">{t.title}</span>
        <span className="memory-card-badge">
          <span className="memory-card-dot" aria-hidden="true" />
          {t.active}
        </span>
        <DownOutlined className="memory-card-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div id={panelId} className="memory-card-body">
          <div className="memory-section">
            <div className="memory-section-label">{t.summary}</div>
            <div className="memory-summary-text">{body}</div>
          </div>

          <div className="memory-section">
            <div className="memory-section-label">{t.details}</div>
            {model && (
              <div className="memory-model">
                <span className="memory-model-label">{t.model}</span>
                <span className="memory-model-value">{provider ? `${provider} · ${model}` : model}</span>
              </div>
            )}
            <div className="memory-stats">
              <div className="memory-stat">
                <span className="memory-stat-value">{stats.questions}</span>
                <span className="memory-stat-label">{t.questions}</span>
              </div>
              <div className="memory-stat">
                <span className="memory-stat-value">{stats.claims}</span>
                <span className="memory-stat-label">{t.claims}</span>
              </div>
              <div className="memory-stat">
                <span className="memory-stat-value">~{stats.tokens}</span>
                <span className="memory-stat-label">{t.tokens}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
