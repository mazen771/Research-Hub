import React, { useState, useEffect } from 'react';
import { Space, Typography, Tag } from 'antd';
import {
  DownOutlined,
  UpOutlined,
  BulbOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from './markdownComponents';

const { Text } = Typography;

interface ThinkingProcessProps {
  thought?: string;
  duration?: number;
  thinkingTokens?: number;
  loading?: boolean;
  isStreaming?: boolean;
  language?: 'auto' | 'en' | 'ar';
}

export const ThinkingProcess: React.FC<ThinkingProcessProps> = ({
  thought,
  duration,
  thinkingTokens,
  loading = false,
  isStreaming = false,
  language = 'en',
}) => {
  const isArabic = language === 'ar';
  const isWorking = loading || isStreaming;

  // Auto-expand while thinking/streaming, with manual toggle option
  const [expanded, setExpanded] = useState<boolean>(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Live stopwatch while working
  useEffect(() => {
    if (!isWorking) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds((Date.now() - startTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [isWorking]);

  // NEVER render if there is no genuine thought text
  if (!thought || !thought.trim()) return null;

  const thoughtText = thought.trim();

  const displayDuration = isWorking
    ? `${elapsedSeconds.toFixed(1)}s`
    : duration
    ? `${duration.toFixed(1)}s`
    : `${elapsedSeconds > 0 ? elapsedSeconds.toFixed(1) : '1.5'}s`;

  return (
    <div
      className="thinking-process-card"
      style={{
        margin: '4px 0 10px 0',
        borderRadius: '12px',
        border: isWorking
          ? '1.5px solid var(--sage-500, #526D5C)'
          : '1px solid var(--sage-200, #C8DACF)',
        backgroundColor: isWorking ? 'var(--sage-50, #F4F7F5)' : 'var(--sage-50, #F9FAF9)',
        boxShadow: isWorking
          ? '0 3px 12px rgba(60, 82, 69, 0.1)'
          : '0 1px 4px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
      }}
    >
      {/* Header bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          background: isWorking
            ? 'linear-gradient(90deg, rgba(82,109,92,0.08) 0%, rgba(255,255,255,0.4) 100%)'
            : 'transparent',
        }}
      >
        <Space size={8} align="center">
          {isWorking ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'var(--sage-700, #3C5245)',
                color: '#FFFFFF',
                boxShadow: '0 0 8px rgba(60, 82, 69, 0.3)',
              }}
            >
              <LoadingOutlined style={{ fontSize: 12 }} />
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'var(--sage-200, #C8DACF)',
                color: 'var(--sage-800, #3C5245)',
              }}
            >
              <BulbOutlined style={{ fontSize: 12 }} />
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text strong style={{ fontSize: '12px', color: 'var(--sage-900, #1E2D24)' }}>
                {isWorking
                  ? isArabic
                    ? 'وضع التفكير الفعلي'
                    : 'Thinking Mode Active'
                  : isArabic
                  ? 'سياق التفكير والاستدلال'
                  : 'Reasoning Process'}
              </Text>
              <Tag
                style={{
                  margin: 0,
                  fontSize: '10px',
                  borderRadius: 9999,
                  fontWeight: 600,
                  background: isWorking ? '#E8F5E9' : 'var(--sage-100)',
                  color: isWorking ? '#1B5E20' : 'var(--sage-800)',
                  border: isWorking ? '1px solid #A5D6A7' : '1px solid var(--sage-300)',
                  padding: '0 6px',
                }}
              >
                ⏱️ {displayDuration}
              </Tag>
            </div>
          </div>
        </Space>

        <Space size={6} align="center">
          {thinkingTokens !== undefined && thinkingTokens > 0 && (
            <Tag
              style={{
                margin: 0,
                fontSize: '10px',
                borderRadius: 9999,
                background: '#E4EDE6',
                color: '#1B5E20',
                border: '1px solid #A5D6A7',
                fontWeight: 600,
                padding: '0 6px',
              }}
            >
              {thinkingTokens} {isArabic ? 'توكن' : 'tokens'}
            </Tag>
          )}
          <span style={{ fontSize: '11px', color: 'var(--sage-600, #678673)' }}>
            {expanded ? <UpOutlined /> : <DownOutlined />}
          </span>
        </Space>
      </div>

      {/* Foldable Content Body */}
      {expanded && (
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--sage-200, #C8DACF)',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            fontSize: '12px',
            lineHeight: 1.55,
            color: 'var(--sage-900, #22342A)',
          }}
        >
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{thoughtText}</ReactMarkdown>
            {isWorking && (
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 12,
                  marginLeft: 4,
                  background: 'var(--sage-600)',
                  animation: 'blink 1s infinite',
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
