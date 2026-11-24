import React from 'react';
import { Space, Typography, Tooltip } from 'antd';
import { ThunderboltOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { TokenUsage } from '../types';

const { Text } = Typography;

interface TokenUsageBarProps {
  usage?: TokenUsage;
  language?: 'auto' | 'en' | 'ar';
}

export const TokenUsageBar: React.FC<TokenUsageBarProps> = ({
  usage,
  language = 'en',
}) => {
  if (!usage || !usage.totalTokens) return null;

  const isArabic = language === 'ar';
  const details = usage.details;

  const tooltipContent = details ? (
    <div style={{ fontSize: '11.5px', lineHeight: 1.6, padding: '2px' }}>
      <div style={{ fontWeight: 600, marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        {isArabic ? 'تفاصيل استهلاك التوكنز:' : 'Token Usage Breakdown:'}
      </div>
      <div>• {isArabic ? 'التعليمات (System):' : 'System Prompt:'} {details.systemPromptTokens}</div>
      <div>• {isArabic ? 'أوراق البحث (Papers):' : 'Papers Context:'} {details.papersTokens}</div>
      <div>• {isArabic ? 'الذاكرة (Memory):' : '5-Turn Memory:'} {details.historyTokens}</div>
      <div>• {isArabic ? 'الملخص (Summary):' : 'Chat Summary:'} {details.summaryTokens}</div>
      <div>• {isArabic ? 'سؤالك (User):' : 'User Query:'} {details.userTokens}</div>
      {usage.thinkingTokens !== undefined && (
        <div>• {isArabic ? 'التفكير (Think):' : 'Thinking:'} {usage.thinkingTokens}</div>
      )}
      <div>• {isArabic ? 'المخرجات (Result):' : 'Output:'} {details.userTokens ? details.userTokens : usage.completionTokens}</div>
    </div>
  ) : null;

  return (
    <div
      style={{
        marginTop: '12px',
        paddingTop: '8px',
        borderTop: '1px solid var(--sage-200, #C8DACF)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'var(--sage-700, #526D5C)',
        userSelect: 'none',
      }}
    >
      <Space size={6}>
        <ThunderboltOutlined style={{ color: 'var(--sage-700, #526D5C)', fontSize: '12px' }} />
        <Text style={{ fontSize: '12px', color: 'var(--sage-800, #3C5245)', fontWeight: 500 }}>
          {isArabic ? 'إجمالي التوكنز:' : 'Total Tokens:'}{' '}
          <strong style={{ color: 'var(--sage-700, #526D5C)' }}>{usage.totalTokens}</strong>
        </Text>
        {tooltipContent && (
          <Tooltip title={tooltipContent} placement="top">
            <InfoCircleOutlined style={{ cursor: 'pointer', color: 'var(--sage-600, #678673)', fontSize: '11px' }} />
          </Tooltip>
        )}
      </Space>

      <Space size={10} style={{ fontSize: '11.5px', color: 'var(--sage-600, #678673)' }}>
        <span>
          {isArabic ? 'المدخلات (Input):' : 'Input:'} <strong>{usage.promptTokens}</strong>
        </span>
        {usage.thinkingTokens !== undefined && usage.thinkingTokens > 0 && (
          <span>
            {isArabic ? 'التفكير (Think):' : 'Think:'} <strong style={{ color: '#1B5E20' }}>{usage.thinkingTokens}</strong>
          </span>
        )}
        <span>
          {isArabic ? 'المخرجات (Result):' : 'Result:'} <strong style={{ color: '#2E7D32' }}>{usage.completionTokens}</strong>
        </span>
      </Space>
    </div>
  );
};
