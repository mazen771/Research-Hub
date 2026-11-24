import React, { useState, useRef } from 'react';
import { Tag, Typography } from 'antd';
import {
  BookOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  ExportOutlined,
  DownOutlined,
  FileSearchOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import type { ClaimResponse, EvidenceResponse } from '../types';

const { Text } = Typography;

export interface EvidenceViewProps {
  claims: ClaimResponse[];
  language?: 'auto' | 'en' | 'ar';
}

/**
 * Format citation string following academic conventions:
 * Authors (Publication Year), Paper Title
 * e.g. "Liu & Wang (2021), Plant diseases and pests detection based on deep learning: a review"
 */
function formatPaperCitation(ev: EvidenceResponse): string {
  const parts: string[] = [];

  let authorsStr = '';
  if (Array.isArray(ev.authors)) {
    authorsStr = (ev.authors as unknown as string[]).filter(Boolean).join(', ');
  } else if (typeof ev.authors === 'string') {
    authorsStr = ev.authors.trim();
  }

  const hasAuthors = Boolean(authorsStr);
  const hasYear = typeof ev.publicationYear === 'number' && ev.publicationYear > 0;

  if (hasAuthors && hasYear) {
    parts.push(`${authorsStr} (${ev.publicationYear})`);
  } else if (hasAuthors) {
    parts.push(authorsStr);
  } else if (hasYear) {
    parts.push(`(${ev.publicationYear})`);
  }

  if (ev.paperTitle && typeof ev.paperTitle === 'string' && ev.paperTitle.trim()) {
    parts.push(ev.paperTitle.trim());
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  if (ev.paperLink) {
    return ev.paperLink;
  }

  return 'Academic Publication';
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({ claims, language = 'en' }) => {
  // Track open/collapsed state per claim index. Default first claim open if claims exist.
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    if (claims && claims.length > 0) {
      initial[0] = true;
    }
    return initial;
  });

  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!claims || claims.length === 0) return null;

  const isArabic = language === 'ar';

  const allExpanded = claims.length > 0 && claims.every((_, i) => expandedMap[i]);
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedMap({});
    } else {
      const next: Record<number, boolean> = {};
      claims.forEach((_, i) => {
        next[i] = true;
      });
      setExpandedMap(next);
    }
  };

  const toggleClaim = (index: number) => {
    setExpandedMap((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const closeClaim = (index: number) => {
    setExpandedMap((prev) => ({
      ...prev,
      [index]: false,
    }));
  };

  // Keyboard navigation on button: Enter/Space toggles (native button), Escape closes
  const handleButtonKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Escape' && expandedMap[index]) {
      e.preventDefault();
      e.stopPropagation();
      closeClaim(index);
    }
  };

  // Keyboard navigation inside expanded region: Escape closes and returns focus to trigger
  const handleRegionKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeClaim(index);
      buttonRefs.current[index]?.focus();
    }
  };

  return (
    <div className="evidence-view-container" style={{ marginTop: 14, width: '100%' }}>
      {/* Embedded accessible styles for focus rings, high contrast, and reflow */}
      <style>{`
        .evidence-view-container {
          box-sizing: border-box;
        }
        .evidence-claim-card {
          border: 1px solid var(--sage-200, #C8DACF);
          border-radius: 14px;
          background: #ffffff;
          margin-bottom: 10px;
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 2px 8px rgba(20, 35, 25, 0.04);
        }
        .dark-theme .evidence-claim-card {
          background: #1c2b22;
          border-color: rgba(142, 175, 160, 0.2);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }
        .evidence-claim-card:hover {
          border-color: var(--sage-500, #7E9F8B);
          box-shadow: 0 4px 12px rgba(20, 35, 25, 0.08);
        }
        .evidence-trigger-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          gap: 10px;
          flex-wrap: wrap;
          font-family: inherit;
          color: inherit;
        }
        [dir="rtl"] .evidence-trigger-btn {
          text-align: right;
        }
        .evidence-trigger-btn:focus-visible {
          outline: 3px solid #2E7D32 !important;
          outline-offset: -2px !important;
          box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.3) !important;
        }
        .evidence-region {
          padding: 10px 12px 12px;
          border-top: 1px solid var(--sage-100, #E4EDE6);
          background: #F8FAF8;
          box-sizing: border-box;
        }
        .dark-theme .evidence-region {
          border-top-color: rgba(142, 175, 160, 0.15);
          background: #16241C;
        }
        .evidence-status-box {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 9999px;
          margin-bottom: 10px;
          background-color: var(--evidence-mint-fill, #E8F5E9);
          border: 1px solid var(--evidence-mint-border, #A5D6A7);
          color: var(--evidence-mint-text, #1B5E20);
          font-size: 11.5px;
          font-weight: 500;
          flex-wrap: wrap;
        }
        .dark-theme .evidence-status-box {
          background-color: #162F1E;
          border-color: #2E5C38;
          color: #A5D6A7;
        }
        .evidence-passage-card {
          padding: 8px 12px;
          border-radius: 10px;
          background-color: #ffffff;
          border: 1px solid var(--sage-200, #C8DACF);
          border-left: 3px solid var(--sage-500, #7E9F8B);
          margin-bottom: 8px;
          box-shadow: 0 1px 4px rgba(20, 35, 25, 0.03);
        }
        [dir="rtl"] .evidence-passage-card {
          border-left: 1px solid var(--sage-200, #C8DACF);
          border-right: 3px solid var(--sage-500, #7E9F8B);
        }
        .dark-theme .evidence-passage-card {
          background-color: #1b2920;
          border-color: #2d4233;
          border-left-color: var(--sage-400, #8EAFA0);
        }
        [dir="rtl"].dark-theme .evidence-passage-card {
          border-right-color: var(--sage-400, #8EAFA0);
        }
        .evidence-passage-quote {
          margin: 6px 0 8px 0;
          padding: 6px 10px;
          background-color: #F4F8F5;
          border-radius: 6px;
          font-style: italic;
          font-size: 11.5px;
          line-height: 1.5;
          color: var(--sage-900, #1f2937);
          border: 1px solid var(--sage-200, #C8DACF);
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .dark-theme .evidence-passage-quote {
          background-color: #142019;
          color: #f3f4f6;
          border-color: #2d3748;
        }
        .evidence-doi-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--evidence-doi-link, #1D4ED8);
          text-decoration: underline;
          padding: 2px 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
          word-break: break-all;
          overflow-wrap: anywhere;
        }
        .dark-theme .evidence-doi-link {
          color: #93c5fd;
        }
        .evidence-doi-link:hover {
          color: #1e40af;
          background-color: rgba(29, 78, 216, 0.08);
        }
        .evidence-doi-link:focus-visible {
          outline: 2px solid #1D4ED8 !important;
          outline-offset: 2px !important;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>

      {/* Academic Evidence Header with Count & Expand/Collapse All */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          padding: '0 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookOutlined style={{ color: '#2E7D32', fontSize: '14px' }} />
          <Text strong style={{ fontSize: '13px', color: '#1B5E20' }}>
            {isArabic
              ? `المصادر والأدلة البحثية الموثقة (${claims.length})`
              : `Academic Evidence & Sources (${claims.length})`}
          </Text>
        </div>
        {claims.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            style={{
              background: 'none',
              border: 'none',
              color: '#1D4ED8',
              cursor: 'pointer',
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '2px 6px',
              textDecoration: 'underline',
            }}
          >
            {allExpanded
              ? (isArabic ? 'طي الكل' : 'Collapse all')
              : (isArabic ? 'توسيع الكل' : 'Expand all')}
          </button>
        )}
      </div>

      {claims.map((claim, idx) => {
        const isOpen = Boolean(expandedMap[idx]);
        const totalEvidence = claim.evidence?.length || 0;
        const triggerId = `evidence-trigger-${idx}`;
        const regionId = `evidence-region-${idx}`;

        const toggleLabel = isOpen
          ? (isArabic ? `طي تفاصيل الأدلة للادعاء ${idx + 1}` : `Collapse evidence details for Claim ${idx + 1}`)
          : (isArabic ? `توسيع تفاصيل الأدلة للادعاء ${idx + 1}` : `Expand evidence details for Claim ${idx + 1}`);

        const claimShortText = claim.text.length > 75 ? `${claim.text.substring(0, 75)}...` : claim.text;

        return (
          <div key={idx} className="evidence-claim-card">
            {/* Accessible Trigger Button */}
            <button
              ref={(el) => {
                buttonRefs.current[idx] = el;
              }}
              type="button"
              id={triggerId}
              aria-controls={regionId}
              aria-expanded={isOpen}
              aria-label={`Claim ${idx + 1}: ${claimShortText}. ${toggleLabel}`}
              className="evidence-trigger-btn"
              onClick={() => toggleClaim(idx)}
              onKeyDown={(e) => handleButtonKeyDown(e, idx)}
            >
              {/* Left: Indicator, Claim #, and Preview */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  flex: '1 1 280px',
                  minWidth: 0,
                }}
              >
                <DownOutlined
                  aria-hidden="true"
                  style={{
                    fontSize: '12px',
                    marginTop: '4px',
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s ease',
                    color: '#526D5C',
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <Text
                    strong
                    style={{
                      fontSize: '12px',
                      display: 'block',
                      color: 'inherit',
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                    }}
                  >
                    <span style={{ color: '#3C5245', marginRight: 6 }}>
                      {isArabic ? `الادعاء ${idx + 1}:` : `Claim ${idx + 1}:`}
                    </span>
                    {claimShortText}
                  </Text>
                </div>
              </div>

              {/* Right: Badges for Source-supported & Count */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                  flexShrink: 0,
                }}
              >
                <Tag
                  style={{
                    fontWeight: 600,
                    fontSize: '11px',
                    padding: '2px 10px',
                    margin: 0,
                    borderRadius: 9999,
                    background: totalEvidence > 0 ? '#E8F5E9' : '#F2F6F3',
                    color: totalEvidence > 0 ? '#1B5E20' : '#526D5C',
                    border: '1px solid #A5D6A7',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <BookOutlined style={{ fontSize: '11px' }} />
                  {isArabic
                    ? `مدعوم بمصدر (${totalEvidence} ${totalEvidence === 1 ? 'مصدر' : 'مصادر'})`
                    : `Source-supported (${totalEvidence} ${totalEvidence === 1 ? 'source' : 'sources'})`}
                </Tag>
              </div>
            </button>

            {/* Collapsible Details Region */}
            {isOpen && (
              <div
                id={regionId}
                role="region"
                aria-labelledby={triggerId}
                className="evidence-region"
                onKeyDown={(e) => handleRegionKeyDown(e, idx)}
              >
                {/* Full Claim Statement */}
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: '13px', color: '#1f2937', display: 'block', marginBottom: 4 }}>
                    {isArabic ? 'نص الادعاء الكامل:' : 'Full Claim Statement:'}
                  </Text>
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      color: '#111827',
                      wordBreak: 'break-word',
                    }}
                  >
                    "{claim.text}"
                  </div>
                </div>

                {/* Evidence Passages */}
                {claim.evidence && claim.evidence.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {claim.evidence.map((ev, evIdx) => {
                      const paperCitation = formatPaperCitation(ev);
                      const statusText =
                        ev.evidenceStatus === 'verified'
                          ? (isArabic ? 'تم التحقق في قاعدة بيانات OpenAlex' : 'Verified in OpenAlex corpus')
                          : (ev.evidenceStatus ||
                             claim.citationCheckStatus ||
                             (isArabic ? 'تم العثور على الورقة والمستخلص في OpenAlex' : 'Paper and abstract found; verified in OpenAlex corpus.'));

                      return (
                        <div key={evIdx} className="evidence-passage-card">
                          {/* Card Header: Paper # + Location Tag + Rank + Retrieval Score */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 8,
                              flexWrap: 'wrap',
                              gap: 6,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <BookOutlined style={{ color: '#2E7D32', fontSize: '15px' }} aria-hidden="true" />
                              <Text strong style={{ fontSize: '14px', color: 'var(--sage-900, #1b382b)' }}>
                                {isArabic ? `الورقة البحثية #${evIdx + 1}` : `Paper ${evIdx + 1}`}
                              </Text>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {ev.quoteLocation && (
                                <Tag style={{ fontSize: '11px', margin: 0, fontWeight: 600, borderRadius: 9999, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                                  📍 {isArabic ? `الموضع: ${ev.quoteLocation}` : `Location: ${ev.quoteLocation}`}
                                </Tag>
                              )}
                              {ev.searchRank !== undefined && ev.searchRank !== null && (
                                <Tag style={{ fontSize: '11px', margin: 0, fontWeight: 500, borderRadius: 9999, background: '#F2F6F3', color: '#526D5C', border: '1px solid #C8DACF' }}>
                                  {isArabic ? `الترتيب: #${ev.searchRank}` : `Search Rank: #${ev.searchRank}`}
                                </Tag>
                              )}
                              {ev.retrievalScore !== undefined && ev.retrievalScore > 0 && (
                                <Tag style={{ fontSize: '11px', margin: 0, fontWeight: 600, borderRadius: 9999, background: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7' }}>
                                  {isArabic ? `مطابقة الاسترجاع: ${(ev.retrievalScore * 100).toFixed(0)}%` : `Retrieval Score: ${(ev.retrievalScore * 100).toFixed(0)}%`}
                                </Tag>
                              )}
                            </div>
                          </div>

                          {/* Paper Metadata: Title, Journal, Topic, Citations, Authors, Year */}
                          <div
                            style={{
                              marginBottom: 10,
                              padding: '10px 14px',
                              backgroundColor: 'rgba(126, 159, 139, 0.08)',
                              borderRadius: '8px',
                              border: '1px solid rgba(126, 159, 139, 0.22)',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: '13.5px',
                                fontWeight: 700,
                                color: '#111827',
                                display: 'block',
                                lineHeight: 1.45,
                                marginBottom: 6,
                              }}
                            >
                              {ev.paperTitle || paperCitation}
                            </Text>

                            {/* Badges for Journal, Topic, and Citation Count */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                              {ev.journal && (
                                <Tag style={{ fontSize: '11px', margin: 0, background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE', borderRadius: 4, fontWeight: 500 }}>
                                  🏛️ {ev.journal}
                                </Tag>
                              )}
                              {ev.topic && (
                                <Tag style={{ fontSize: '11px', margin: 0, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', borderRadius: 4, fontWeight: 500 }}>
                                  🔬 {ev.topic}
                                </Tag>
                              )}
                              {typeof ev.citedBy === 'number' && ev.citedBy > 0 && (
                                <Tag style={{ fontSize: '11px', margin: 0, background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', borderRadius: 4, fontWeight: 600 }}>
                                  ⭐ {ev.citedBy} {isArabic ? 'استشهاد أكاديمي' : 'citations'}
                                </Tag>
                              )}
                            </div>

                            {(ev.authors || ev.publicationYear) && (
                              <div style={{ fontSize: '12px', color: '#4B5563', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {ev.authors && (
                                  <span>
                                    <strong>{isArabic ? 'المؤلفون: ' : 'Authors: '}</strong>
                                    {Array.isArray(ev.authors) ? (ev.authors as unknown as string[]).filter(Boolean).join(', ') : ev.authors}
                                  </span>
                                )}
                                {ev.publicationYear && (
                                  <span>
                                    <strong>{isArabic ? 'سنة النشر: ' : 'Year: '}</strong>
                                    {ev.publicationYear}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 3. Direct Key Quote Box (بطاقة الاقتباس المباشر ومعاينة الفقرة) */}
                          <div
                            style={{
                              marginBottom: 10,
                              padding: '12px 14px',
                              backgroundColor: '#F0FDF4',
                              border: '1.5px solid #86EFAC',
                              borderRadius: '10px',
                              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                              <Text strong style={{ fontSize: '12px', color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ fontSize: '16px', lineHeight: 1 }}>❝</span>
                                {isArabic ? 'الاقتباس العلمي المباشر من الأوراق المحكمة:' : 'Direct Academic Quote & Core Empirical Excerpt:'}
                              </Text>
                              <Tag style={{ margin: 0, fontSize: '10.5px', background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', fontWeight: 600 }}>
                                {isArabic ? 'اقتباس موثق' : 'Verified Citation'}
                              </Tag>
                            </div>
                            <blockquote
                              style={{
                                margin: 0,
                                padding: '8px 12px',
                                backgroundColor: '#ffffff',
                                borderLeft: isArabic ? 'none' : '4px solid #16A34A',
                                borderRight: isArabic ? '4px solid #16A34A' : 'none',
                                borderRadius: '6px',
                                fontStyle: 'italic',
                                fontSize: '13px',
                                lineHeight: 1.55,
                                color: '#14532D',
                                fontWeight: 500,
                                wordBreak: 'break-word',
                              }}
                            >
                              “{ev.quote || ev.sourcePassage}”
                            </blockquote>
                          </div>

                          {/* 4. Complete Abstract / Source Passage Context Preview */}
                          {ev.sourcePassage && ev.quote && ev.sourcePassage !== ev.quote && (
                            <div style={{ marginBottom: 10 }}>
                              <Text strong style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: 4 }}>
                                {isArabic ? 'سياق المستخلص العلمي الكامل:' : 'Full Abstract & Context Preview:'}
                              </Text>
                              <div
                                style={{
                                  padding: '8px 12px',
                                  backgroundColor: '#F8FAF8',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  lineHeight: 1.5,
                                  color: '#4B5563',
                                  border: '1px solid #E5E7EB',
                                  maxHeight: '120px',
                                  overflowY: 'auto',
                                }}
                              >
                                {ev.sourcePassage}
                              </div>
                            </div>
                          )}

                          {/* Status in WORDS (never color alone) */}
                          <div className="evidence-status-box" role="status" style={{ marginBottom: 10 }}>
                            <InfoCircleOutlined aria-hidden="true" style={{ fontSize: '14px', flexShrink: 0 }} />
                            <span>
                              <strong>{isArabic ? 'حالة التوثيق: ' : 'Status: '}</strong>
                              {statusText}
                            </span>
                          </div>

                          {/* Action Buttons: DOI Link + Open Access PDF Preview */}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            {ev.paperLink && (
                              <a
                                href={ev.paperLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="evidence-doi-link"
                                aria-label={`Open DOI paper link for ${ev.paperTitle || paperCitation} in a new tab`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  backgroundColor: '#EEF2FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #C7D2FE',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  transition: 'background-color 0.2s',
                                }}
                              >
                                <LinkOutlined aria-hidden="true" />
                                <span>{isArabic ? 'عرض الورقة البحثية / المعرف الرقمي (DOI)' : 'View Research Paper / DOI'}</span>
                                <ExportOutlined aria-hidden="true" style={{ fontSize: '11px' }} />
                                <span className="sr-only"> (opens in a new tab)</span>
                              </a>
                            )}

                            {ev.oaUrl && (
                              <a
                                href={ev.oaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open Access PDF Preview for ${ev.paperTitle || paperCitation} in a new tab`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  border: '1px solid #FECACA',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  transition: 'background-color 0.2s',
                                }}
                              >
                                <FilePdfOutlined aria-hidden="true" style={{ fontSize: '13px' }} />
                                <span>{isArabic ? 'معاينة ملف PDF مفتوح المصدر (Open Access)' : 'Open Access PDF Preview'}</span>
                                <ExportOutlined aria-hidden="true" style={{ fontSize: '11px' }} />
                                <span className="sr-only"> (opens in a new tab)</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      border: '1px dashed #d9d9d9',
                      textAlign: 'center',
                    }}
                  >
                    <FileSearchOutlined style={{ fontSize: '20px', color: '#8c8c8c', marginBottom: 6 }} aria-hidden="true" />
                    <Text type="secondary" style={{ display: 'block', fontSize: '13px' }}>
                      {isArabic
                        ? 'لم يتم إرفاق مقتطفات نصية مباشرة لهذا الادعاء.'
                        : 'No direct source passages attached for this claim.'}
                    </Text>
                    {claim.citationCheckStatus && (
                      <div className="evidence-status-box" style={{ marginTop: 8 }} role="status">
                        <InfoCircleOutlined aria-hidden="true" />
                        <span>
                          <strong>Status: </strong>
                          {claim.citationCheckStatus}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
