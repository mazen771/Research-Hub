import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space, message, Tag, Switch, Radio } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ExperimentOutlined,
  RocketOutlined,
  KeyOutlined,
  CloudServerOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { AppSettings, AIModelInfo } from '../types';
import { checkBackendHealth, getAvailableModels } from '../services/api';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  settings,
  onSave,
}) => {
  const [form] = Form.useForm<AppSettings>();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [openRouterModels, setOpenRouterModels] = useState<AIModelInfo[]>([]);
  const [geminiModels, setGeminiModels] = useState<AIModelInfo[]>([]);
  const [openRouterConnected, setOpenRouterConnected] = useState<boolean>(true);
  const [activeProvider, setActiveProvider] = useState<'openrouter' | 'gemini'>(
    settings.provider || (settings.geminiModel?.startsWith('gemini') ? 'gemini' : 'openrouter')
  );

  const fetchModels = async (refresh: boolean = false) => {
    const currentUrl = form.getFieldValue('backendUrl') || settings.backendUrl;
    setFetchingModels(true);
    try {
      const res = await getAvailableModels(currentUrl, refresh);
      if (res) {
        if (res.openRouterModels?.length) {
          setOpenRouterModels(res.openRouterModels);
        }
        if (res.geminiModels?.length) {
          setGeminiModels(res.geminiModels);
        }
        setOpenRouterConnected(res.openRouterConnected);
        if (refresh) {
          message.success(`تم تحديث الموديلات بنجاح (${res.openRouterModels?.length || 0} موديل مجاني متاح)`);
        }
      }
    } catch {
      // ignore
    } finally {
      setFetchingModels(false);
    }
  };

  useEffect(() => {
    if (open) {
      const initialProvider =
        settings.provider || (settings.geminiModel?.startsWith('gemini') ? 'gemini' : 'openrouter');
      setActiveProvider(initialProvider);
      form.setFieldsValue({
        ...settings,
        provider: initialProvider,
        openRouterModel: settings.openRouterModel || settings.selectedModel || 'openrouter/free',
        geminiModel: settings.geminiModel?.startsWith('gemini') ? settings.geminiModel : 'gemini-2.5-flash',
      });
      fetchModels(false);
    }
  }, [open]);

  const handleTestConnection = async () => {
    const currentUrl = form.getFieldValue('backendUrl') || settings.backendUrl;
    setTesting(true);
    setTestResult(null);

    const isAlive = await checkBackendHealth(currentUrl);
    setTesting(false);

    if (isAlive) {
      setTestResult('success');
      message.success('خادم البحث المحلي متصل وجاهز!');
      fetchModels(true);
    } else {
      setTestResult('failed');
      message.error('تعذر الاتصال بالخادم. يرجى التحقق من الرابط وعمل السيرفر.');
    }
  };

  const handleProviderChange = (newProv: 'openrouter' | 'gemini') => {
    setActiveProvider(newProv);
    form.setFieldValue('provider', newProv);
  };

  const handleFinish = (values: AppSettings) => {
    const chosenModel =
      values.provider === 'openrouter'
        ? values.openRouterModel || 'openrouter/free'
        : values.geminiModel || 'gemini-2.5-flash';

    onSave({
      ...settings,
      ...values,
      provider: values.provider,
      selectedModel: chosenModel,
      geminiModel: values.geminiModel,
      openRouterModel: values.openRouterModel,
    });
    message.success(
      `تم حفظ الإعدادات بنجاح (المزود النشط: ${
        values.provider === 'openrouter' ? 'OpenRouter المجاني' : 'Google Gemini'
      })`
    );
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <CloudServerOutlined style={{ color: '#526D5C' }} />
          <span>إعدادات الذكاء الاصطناعي والمزودات (Settings)</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={460}
      style={{ maxWidth: '94vw', top: 20 }}
      className="compact-modal"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ...settings,
          provider: activeProvider,
          openRouterModel: settings.openRouterModel || settings.selectedModel || 'openrouter/free',
          geminiModel: settings.geminiModel?.startsWith('gemini') ? settings.geminiModel : 'gemini-2.5-flash',
        }}
        onFinish={handleFinish}
        size="small"
      >
        {/* Provider Switcher */}
        <Form.Item
          label="اختر مزود الذكاء الاصطناعي (Select AI Provider)"
          name="provider"
          rules={[{ required: true }]}
        >
          <Radio.Group
            value={activeProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            buttonStyle="solid"
            style={{ width: '100%', display: 'flex' }}
          >
            <Radio.Button
              value="openrouter"
              style={{
                flex: 1,
                textAlign: 'center',
                fontWeight: 600,
                background: activeProvider === 'openrouter' ? '#3C5245' : undefined,
                borderColor: activeProvider === 'openrouter' ? '#3C5245' : undefined,
              }}
            >
              <RocketOutlined style={{ marginInlineEnd: 4 }} />
              OpenRouter (مجاني)
            </Radio.Button>
            <Radio.Button
              value="gemini"
              style={{
                flex: 1,
                textAlign: 'center',
                fontWeight: 600,
                background: activeProvider === 'gemini' ? '#3C5245' : undefined,
                borderColor: activeProvider === 'gemini' ? '#3C5245' : undefined,
              }}
            >
              <RobotOutlined style={{ marginInlineEnd: 4 }} />
              Google Gemini (رسمي)
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* OpenRouter Model Selection */}
        {activeProvider === 'openrouter' && (
          <Form.Item
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>موديل OpenRouter المجاني (OpenRouter Model)</span>
                <Button
                  type="link"
                  size="small"
                  icon={<SyncOutlined spin={fetchingModels} />}
                  onClick={() => fetchModels(true)}
                  style={{ padding: 0, fontSize: '11px', height: 'auto' }}
                >
                  تحديث الموديلات
                </Button>
              </div>
            }
            name="openRouterModel"
            extra="موديلات مجانية تماماً وبدون أي تكلفة. اختر الموديل الأنسب أو دع الراوتر التلقائي يختار الأسرع."
          >
            <Select
              placeholder="اختر موديل OpenRouter"
              loading={fetchingModels}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string || '').toLowerCase().includes(input.toLowerCase()) ||
                (option?.value as string || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {(openRouterModels.length > 0
                ? openRouterModels
                : [
                    { id: 'openrouter/free', name: '🚀 Free Models Auto-Router (Best Available Free Model)' },
                    { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', name: '🧠 NVIDIA Nemotron 3 Nano Omni (Free Reasoning)' },
                    { id: 'liquid/lfm-3-1.7b:free', name: '⚡ LiquidAI LFM3-1.7B (Ultra Fast Free)' },
                    { id: 'google/gemma-4-26b-a4b-it:free', name: 'Google Gemma 4 26B A4B (Free)' },
                    { id: 'baidu/ernie-5.5-flash-preview:free', name: 'Baidu ERNIE 5.5 Flash (Free)' },
                    { id: 'inclusionai/ling-3.2-flash:free', name: 'inclusionAI Ling 3.2 Flash (Free)' },
                    { id: 'nvidia/nemotron-3.5-lightning:free', name: 'NVIDIA Nemotron 3.5 Lightning (Free)' },
                    { id: 'nvidia/nemotron-3.5-super-vl:free', name: 'NVIDIA Nemotron 3.5 Super VL (Free)' },
                    { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'NVIDIA Nemotron 3 Ultra 550B (Free)' },
                    { id: 'particle-ai/particle-1:free', name: 'Particle AI Particle-1 (Free)' },
                    { id: 'recursive/flint-v1.0:free', name: 'Recursive Flint v1.0 (Free)' },
                    { id: 'google/gemma-4-31b-it:free', name: 'Google Gemma 4 31B (Free)' },
                  ]
              ).map((m) => (
                <Select.Option key={m.id} value={m.id}>
                  {m.name || m.id}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Google Gemini Model Selection */}
        {activeProvider === 'gemini' && (
          <Form.Item
            label="موديل Google Gemini (Gemini Model)"
            name="geminiModel"
            extra="اختر إصدار Google Gemini (Flash, Lite, Pro, 2.5, إلخ)"
          >
            <Select placeholder="اختر موديل Gemini">
              {(geminiModels.length > 0
                ? geminiModels
                : [
                    { id: 'gemini-2.5-flash', name: '⚡ Gemini 2.5 Flash (Recommended - Ultra Fast & Accurate)' },
                    { id: 'gemini-2.0-flash', name: '⚡ Gemini 2.0 Flash (Next-Gen Multimodal)' },
                    { id: 'gemini-2.0-flash-lite', name: '🪶 Gemini 2.0 Flash Lite (Lowest Latency)' },
                    { id: 'gemini-1.5-flash', name: '⚡ Gemini 1.5 Flash (Standard Fast)' },
                    { id: 'gemini-1.5-pro', name: '🧠 Gemini 1.5 Pro (Deep Reasoning & Analysis)' },
                    { id: 'gemini-3.8-flash', name: '🚀 Gemini 3.8 Flash (Experimental Preview)' },
                    { id: 'gemini-3.7-flash', name: '🚀 Gemini 3.7 Flash (Experimental Reasoning)' },
                    { id: 'gemini-3.5-flash', name: '🚀 Gemini 3.5 Flash (Experimental Preview)' },
                  ]
              ).map((m) => (
                <Select.Option key={m.id} value={m.id}>
                  {m.name || m.id}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Preferred Language */}
        <Form.Item
          label="Preferred Response Language (لغة الإجابة)"
          name="language"
        >
          <Select
            options={[
              { label: 'Automatic (تلقائي بناءً على لغتك)', value: 'auto' },
              { label: 'العربية (Arabic)', value: 'ar' },
              { label: 'English (الإنجليزية)', value: 'en' },
            ]}
          />
        </Form.Item>

        {/* API Key overrides based on provider */}
        {activeProvider === 'openrouter' ? (
          <Form.Item
            label={
              <Space>
                <KeyOutlined style={{ color: '#526D5C' }} />
                <span>مفتاح OpenRouter API (اختياري)</span>
              </Space>
            }
            name="openRouterApiKey"
            extra="مسجل تلقائياً من .env.local. املأ هنا فقط إذا أردت استبداله بمفتاح آخر."
          >
            <Input.Password placeholder="sk-or-v1-..." />
          </Form.Item>
        ) : (
          <Form.Item
            label={
              <Space>
                <KeyOutlined style={{ color: '#526D5C' }} />
                <span>مفتاح Google Gemini API (اختياري)</span>
              </Space>
            }
            name="customApiKey"
            extra="مسجل تلقائياً من .env.local. املأ هنا في حال أردت استخدام مفتاح Google AI Studio مخصص."
          >
            <Input.Password placeholder="AIzaSy... or AQ.Ab..." />
          </Form.Item>
        )}

        {/* Backend API Base URL */}
        <Form.Item
          label="Backend API Base URL"
          name="backendUrl"
          rules={[{ required: true, message: 'Please enter the backend URL' }]}
          extra="رابط خادم البحث الأكاديمي المحلي (افتراضياً: http://localhost:5023)"
        >
          <Input placeholder="http://localhost:5023" />
        </Form.Item>

        {/* Connection Status */}
        <Form.Item label="حالة الاتصال والخدمات (Status)">
          <Space wrap size={6}>
            <Button
              size="small"
              icon={<SyncOutlined spin={testing} />}
              loading={testing}
              onClick={handleTestConnection}
            >
              فحص الاتصال
            </Button>
            {testResult === 'success' && (
              <Tag icon={<CheckCircleOutlined />} color="success">
                متصل
              </Tag>
            )}
            {testResult === 'failed' && (
              <Tag icon={<CloseCircleOutlined />} color="error">
                غير متصل
              </Tag>
            )}
            {openRouterConnected && (
              <Tag icon={<RocketOutlined />} color="processing" style={{ borderRadius: 999 }}>
                OpenRouter: {openRouterModels.length > 0 ? `${openRouterModels.length} موديل مجاني` : 'متصل'}
              </Tag>
            )}
          </Space>
        </Form.Item>

        {/* Local Mock Mode */}
        <Form.Item
          label={
            <Space>
              <ExperimentOutlined style={{ color: '#fa8c16' }} />
              <span>Local Demo / Mock Mode</span>
            </Space>
          }
          name="useMockMode"
          valuePropName="checked"
          extra="تفعيل الوضع التجريبي المحلي بدون استهلاك أي APIs خارجية."
        >
          <Switch checkedChildren="Mock On" unCheckedChildren="Live API" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 12, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>إلغاء</Button>
            <Button type="primary" htmlType="submit" style={{ background: '#3C5245', borderColor: '#3C5245' }}>
              حفظ الإعدادات
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
