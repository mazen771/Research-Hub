import React from 'react';
import { Modal, Typography, Space, Button, Card, Divider, Tag, Alert } from 'antd';
import {
  TeamOutlined,
  MailOutlined,
  CalendarOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface LibrarianModalProps {
  open: boolean;
  onClose: () => void;
  language?: 'auto' | 'en' | 'ar';
}

export const LibrarianModal: React.FC<LibrarianModalProps> = ({
  open,
  onClose,
  language = 'en',
}) => {
  const isArabic = language === 'ar';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose} size="middle" style={{ fontSize: '12px', borderRadius: 6 }} aria-label="Close Librarian Consultation Modal">
          {isArabic ? 'إغلاق النافذة' : 'Close Guide'}
        </Button>,
      ]}
      width={480}
      style={{ maxWidth: '94vw', top: 20 }}
      destroyOnHidden
      className="compact-modal"
      aria-labelledby="librarian-modal-title"
    >
      <div style={{ padding: '4px 2px' }} dir={isArabic ? 'rtl' : 'ltr'}>
        <Space orientation="horizontal" align="center" style={{ marginBottom: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#e6f4ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1677ff',
              fontSize: 18,
            }}
          >
            <TeamOutlined />
          </div>
          <div>
            <Title level={5} id="librarian-modal-title" style={{ margin: 0, fontSize: '14.5px' }}>
              {isArabic ? 'استشارة أمين المكتبة والمشرف الأكاديمي' : 'Talk to a Person — Academic Librarian & Faculty Advisor'}
            </Title>
            <Text type="secondary" style={{ fontSize: '11.5px' }}>
              {isArabic
                ? 'مبدأ التفاعل البشري الذكي (HAI): الشفافية والإرشاد البشري'
                : 'HAI Principle: Human Agency & Oversight — Bridging AI Discovery with Human Expertise'}
            </Text>
          </div>
        </Space>

        <Alert
          type="info"
          showIcon
          icon={<SafetyCertificateOutlined />}
          style={{ marginBottom: 12, padding: '8px 12px' }}
          message={
            <Text strong style={{ fontSize: '12px' }}>
              {isArabic ? 'دور الذكاء الاصطناعي وحدود المسؤولية' : 'AI Assistant Scope & Advisory Role'}
            </Text>
          }
          description={
            <Text style={{ fontSize: '11.5px', lineHeight: 1.45 }}>
              {isArabic
                ? 'المساعد الذكي يستخرج الأوراق البحثية من OpenAlex ويلخصها، لكنه لا يغني عن التقييم البشري النقدي من أمناء المكتبات والمشرفين الأكاديميين لتوثيق الأطروحات ومطابقة معايير البحث العلمي.'
                : 'Proof Point retrieves and synthesizes peer-reviewed OpenAlex literature, but AI interpretations cannot replace critical human scholarly judgment. Always verify thesis citations, empirical claims, and methodology with human specialists.'}
            </Text>
          }
        />

        <div style={{ fontSize: '12.5px', fontWeight: 700, margin: '10px 0 6px', color: 'var(--sage-900)' }}>
          {isArabic ? 'متى ينبغي عليك استشارة أمين المكتبة؟' : 'When should you consult an academic librarian or supervisor?'}
        </div>

        <ul style={{ paddingLeft: isArabic ? 0 : 16, paddingRight: isArabic ? 16 : 0, fontSize: '12px', lineHeight: 1.55 }}>
          <li>
            <Text strong>{isArabic ? 'تضارب النتائج العلمية:' : 'Conflicting Academic Evidence:'} </Text>
            {isArabic
              ? 'عندما تختلف الأوراق البحثية في النتائج أو المنهجية المتبعة.'
              : 'When retrieved papers present conflicting findings, differing experimental setups, or contradictory conclusions.'}
          </li>
          <li>
            <Text strong>{isArabic ? 'المراجعات المنهجية (PRISMA):' : 'Systematic Literature Reviews:'} </Text>
            {isArabic
              ? 'لصياغة استراتيجيات بحث متقدمة بالـ Boolean عبر قواعد Scopus و Web of Science.'
              : 'Constructing robust Boolean search strings and protocol standards for systematic reviews or meta-analyses.'}
          </li>
          <li>
            <Text strong>{isArabic ? 'حقوق النشر والوصول المفتوح:' : 'Copyright & Open Access Compliance:'} </Text>
            {isArabic
              ? 'التحقق من تراخيص الوصول المفتوح (Creative Commons) وإيداع الأطروحات.'
              : 'Verifying institutional repository deposit policies, preprint rights, and licensing terms.'}
          </li>
        </ul>

        <Divider style={{ margin: '16px 0' }} />

        <Title level={5} style={{ marginBottom: 12 }}>
          {isArabic ? 'قنوات التواصل المباشر مع المكتبة الأكاديمية' : 'Direct Consultation & Contact Channels'}
        </Title>

        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Card size="small" style={{ borderRadius: 8, borderColor: '#d9d9d9' }}>
            <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <MailOutlined style={{ fontSize: 18, color: '#1677ff' }} />
                <div>
                  <Text strong>{isArabic ? 'مكتب استشارات أبحاث العلوم والهندسة' : 'University Library Science & Engineering Desk'}</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      library-research@university.edu • Extension: 4421
                    </Text>
                  </div>
                </div>
              </Space>
              <Tag color="blue">{isArabic ? 'رد خلال 24 ساعة' : '24h Response'}</Tag>
            </Space>
          </Card>

          <Card size="small" style={{ borderRadius: 8, borderColor: '#d9d9d9' }}>
            <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <CalendarOutlined style={{ fontSize: 18, color: '#52c41a' }} />
                <div>
                  <Text strong>{isArabic ? 'حجز جلسة إرشاد فردية (1-on-1)' : 'Book 1-on-1 Research Consultation'}</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {isArabic ? 'جلسات حضورية بالمكتبة المركزية أو عبر Zoom' : 'In-person at Central Library Level 2 or online via Zoom'}
                    </Text>
                  </div>
                </div>
              </Space>
              <Button
                size="small"
                type="link"
                href="mailto:library-research@university.edu?subject=Request%20for%20Research%20Consultation"
                aria-label="Request consultation via email"
              >
                {isArabic ? 'إرسال طلب' : 'Request Slot'}
              </Button>
            </Space>
          </Card>

          <Card size="small" style={{ borderRadius: 8, borderColor: '#d9d9d9' }}>
            <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <BookOutlined style={{ fontSize: 18, color: '#722ed1' }} />
                <div>
                  <Text strong>{isArabic ? 'دليل المصادر والتوثيق الأكاديمي (LibGuides)' : 'Subject Research Guides (LibGuides)'}</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {isArabic ? 'أدلة إرشادية لاقتباس APA و IEEE واستخدام OpenAlex' : 'Curated guides for APA, IEEE citation styles and scholarly indexing databases'}
                    </Text>
                  </div>
                </div>
              </Space>
              <Tag color="purple">{isArabic ? 'متاح 24/7' : 'Self-Serve 24/7'}</Tag>
            </Space>
          </Card>
        </Space>
      </div>
    </Modal>
  );
};
