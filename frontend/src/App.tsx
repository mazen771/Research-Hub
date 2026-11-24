import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ConfigProvider,
  theme,
  Button,
  Space,
  Typography,
  Tooltip,
  Badge,
  Tag,
  message,
  Popconfirm,
  Image,
} from 'antd';
import {
  Bubble,
  Sender,
  XProvider,
} from '@ant-design/x';
import {
  PlusOutlined,
  SettingOutlined,
  DeleteOutlined,
  RobotOutlined,
  UserOutlined,
  BookOutlined,
  RocketOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CopyOutlined,
  ReloadOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  PaperClipOutlined,
  CheckOutlined,
  SearchOutlined,
  StarOutlined,
  StarFilled,
  StopOutlined,
  CloseOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileOutlined,
  DownloadOutlined,
  DownOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from './components/markdownComponents';
import { MemoryCard } from './components/MemoryCard';

import type { ChatMessage, Conversation, AppSettings } from './types';
import { askQuestionStream, checkBackendHealth, RateLimitError } from './services/api';
import { SettingsModal } from './components/SettingsModal';
import { EvidenceView } from './components/EvidenceView';
import { RateLimitCard } from './components/RateLimitCard';
import { VoiceRecorder } from './components/VoiceRecorder';
import { ThinkingProcess } from './components/ThinkingProcess';
import { TokenUsageBar } from './components/TokenUsageBar';
import { LibrarianModal } from './components/LibrarianModal';
import './App.css';

const { Text } = Typography;

const DEFAULT_SETTINGS: AppSettings = {
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5023',
  language: (import.meta.env.VITE_DEFAULT_LANGUAGE as 'auto' | 'en' | 'ar') || 'auto',
  isDarkMode: false,
  useMockMode: false,
  geminiModel: import.meta.env.VITE_GEMINI_MODEL || 'openrouter/free',
  selectedModel: 'openrouter/free',
  customApiKey: '',
  openRouterApiKey: '',
};

export interface RecommendationItem {
  key: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  query: string;
  icon: React.ReactNode;
}

const RECOMMENDATIONS: RecommendationItem[] = [
  {
    key: 'plant-disease',
    title: 'Deep Learning for Plant Disease Detection',
    titleAr: 'التعلم العميق لكشف أمراض النباتات',
    description: 'Leaf pathology diagnosis & lightweight CNN architectures in precision agriculture',
    descriptionAr: 'تشخيص أمراض أوراق النباتات ونماذج الشبكات العصبية في الزراعة الدقيقة',
    query: 'What are the latest advances in deep learning for plant disease detection and leaf diagnosis in precision agriculture?',
    icon: <ExperimentOutlined style={{ color: '#2E7D32', fontSize: 18 }} />,
  },
  {
    key: 'transformer-attention',
    title: 'Transformer Attention Innovations',
    titleAr: 'ابتكارات آليات الانتباه في المحولات',
    description: 'Key architectural innovations and efficiency advances in transformer attention',
    descriptionAr: 'أبرز الابتكارات المعمارية وتطورات الكفاءة في آليات الانتباه بالمحولات',
    query: 'What are the key architectural innovations and efficiency breakthroughs in transformer attention mechanisms?',
    icon: <RocketOutlined style={{ color: '#526D5C', fontSize: 18 }} />,
  },
  {
    key: 'quantum-mitigation',
    title: 'Quantum Error Mitigation',
    titleAr: 'تخفيف الأخطاء في الحوسبة الكمومية',
    description: 'Error mitigation techniques for NISQ devices & fault-tolerant computing',
    descriptionAr: 'تقنيات تقليل الأخطاء في أجهزة NISQ والحوسبة المقاومة للأخطاء',
    query: 'How do modern quantum error mitigation techniques improve NISQ hardware reliability and algorithm fidelity?',
    icon: <BookOutlined style={{ color: '#3C5245', fontSize: 18 }} />,
  },
  {
    key: 'crispr-therapies',
    title: 'CRISPR & Gene Editing Therapies',
    titleAr: 'علاجات كريسبر وتعديل الجينات',
    description: 'Clinical trial outcomes and delivery vectors in modern human medicine',
    descriptionAr: 'نتائج التجارب السريرية وناقلات التوصيل الجيني في الطب البشري',
    query: 'Summarize recent clinical trial progress of CRISPR gene therapies in human medicine.',
    icon: <MedicineBoxOutlined style={{ color: '#8EAFA0', fontSize: 18 }} />,
  },
];

// Mockup Topic Discs for Upper Sage Zone
const TOPIC_DISCS = [
  { key: 'all', label: 'All', icon: <BookOutlined /> },
  { key: 'ai', label: 'AI & ML', icon: <RocketOutlined /> },
  { key: 'bio', label: 'BioMed', icon: <MedicineBoxOutlined /> },
  { key: 'neuro', label: 'Neuro', icon: <ExperimentOutlined /> },
  { key: 'food', label: 'AgriTech', icon: <ExperimentOutlined /> },
];

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  file?: File;
}

export const App: React.FC = () => {
  // Load settings from localStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('researchhub_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const isProdHost =
          typeof window !== 'undefined' &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1';
        const initialBackendUrl =
          isProdHost && parsed.backendUrl === 'http://localhost:5023' && DEFAULT_SETTINGS.backendUrl !== 'http://localhost:5023'
            ? DEFAULT_SETTINGS.backendUrl
            : (parsed.backendUrl || DEFAULT_SETTINGS.backendUrl);

        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          backendUrl: initialBackendUrl,
          useMockMode: false,
          isDarkMode: false,
        };
      } catch {
        // fallback
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Load conversations from localStorage
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('researchhub_conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Clean up initial conversations: remove all pre-loaded demo conversations
          const filtered = parsed.filter(
            (c: Conversation) => !c.id.startsWith('demo-')
          );
          if (filtered.length > 0) return filtered;
        }
      } catch {
        // fallback
      }
    }
    return [
      {
        id: '1',
        title: 'New Research Chat',
        messages: [],
        updatedAt: Date.now(),
      },
    ];
  });

  const [activeKey, setActiveKey] = useState<string>(() => {
    return conversations[0]?.id || '1';
  });

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth <= 640
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [librarianModalOpen, setLibrarianModalOpen] = useState(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  // Sidebar Filter & Search States
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [filterTab, setFilterTab] = useState<'all' | 'starred'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Screen Reader Live Announcement (Section 6 Accessibility)
  const [srAnnouncement, setSrAnnouncement] = useState<string>(
    'Proof Point Research Hub loaded. Ready for academic query.'
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const lastSentQueryRef = useRef<string>('');
  const activePendingRef = useRef<{ userMsgId: string; assistantMsgId: string; convId: string } | null>(null);

  // Attachment Dock States & File Input Ref
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (!fileList.length) return;

    fileList.forEach((file) => {
      if (file.size > 25 * 1024 * 1024) {
        message.error(
          settings.language === 'ar'
            ? `حجم الملف ${file.name} كبير جداً (الحد الأقصى 25 ميجابايت)`
            : `File ${file.name} exceeds 25MB limit`
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setAttachments((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              dataUrl,
              file,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [settings.language]);

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Clipboard paste listener: paste images or files from clipboard directly
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        processFiles(pastedFiles);
        message.success(
          settings.language === 'ar'
            ? `تم إرفاق ${pastedFiles.length} عنصر من الحافظة`
            : `Attached ${pastedFiles.length} item(s) from clipboard`
        );
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFiles, settings.language]);

  // Cancel & rollback in-flight request to save money / credits
  const handleCancelRequest = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }

    if (activePendingRef.current) {
      const { userMsgId, assistantMsgId, convId } = activePendingRef.current;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === convId) {
            return {
              ...c,
              messages: c.messages.filter(
                (m) => m.id !== assistantMsgId && m.id !== userMsgId
              ),
            };
          }
          return c;
        })
      );
      activePendingRef.current = null;
    }

    if (lastSentQueryRef.current) {
      setInputText(lastSentQueryRef.current);
    }

    setLoading(false);
    message.info(
      settings.language === 'ar'
        ? '🛑 تم إيقاف الطلب ومسحه لمنع استهلاك الرصيد، وتمت استعادة نص السؤال.'
        : '🛑 Request paused & cancelled to save credits. Query text restored.'
    );
    setSrAnnouncement('Request cancelled.');
  };

  // Sync settings
  useEffect(() => {
    localStorage.setItem('researchhub_settings', JSON.stringify(settings));
    document.documentElement.classList.toggle('dark-theme', settings.isDarkMode);
  }, [settings]);

  // Sync conversations
  useEffect(() => {
    localStorage.setItem('researchhub_conversations', JSON.stringify(conversations));
  }, [conversations]);

  // Check backend health
  useEffect(() => {
    let mounted = true;
    checkBackendHealth(settings.backendUrl).then((healthy) => {
      if (mounted) setIsBackendHealthy(healthy);
    });
    return () => {
      mounted = false;
    };
  }, [settings.backendUrl]);

  // Smart User-Scroll Detection & Auto-Scroll Management
  const isAutoScrollAttachedRef = useRef<boolean>(true);
  const [showScrollDownBtn, setShowScrollDownBtn] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change or as each new word streams in
  const currentConversation = conversations.find((c) => c.id === activeKey) || conversations[0];
  const messages = currentConversation?.messages || [];
  const lastMsg = messages[messages.length - 1];
  const lastMsgContent = lastMsg?.content || '';
  const lastMsgThought = lastMsg?.thought || '';

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth', force: boolean = false) => {
    if (!force && !isAutoScrollAttachedRef.current) return;
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    // Check distance from bottom (60px threshold)
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 60;
    if (!isAtBottom) {
      // User scrolled up: detach auto-scroll so user can read without jumps
      isAutoScrollAttachedRef.current = false;
      setShowScrollDownBtn(true);
    } else {
      // User scrolled back to bottom: re-attach auto-scroll
      isAutoScrollAttachedRef.current = true;
      setShowScrollDownBtn(false);
    }
  }, []);

  useEffect(() => {
    if (!isAutoScrollAttachedRef.current) return;
    if (loading || lastMsg?.isStreaming) {
      scrollToBottom('auto');
    } else {
      scrollToBottom('smooth');
    }
  }, [messages.length, lastMsgContent, lastMsgThought, loading, scrollToBottom]);

  // Compute text direction for bilingual support
  const isArabic = settings.language === 'ar';
  const isRtl =
    settings.language === 'ar' ||
    (settings.language === 'auto' && /[\u0600-\u06FF]/.test(inputText));

  // Create new chat
  const handleNewChat = () => {
    isAutoScrollAttachedRef.current = true;
    setShowScrollDownBtn(false);
    const newId = Date.now().toString();
    const newConv: Conversation = {
      id: newId,
      title: 'New Research Chat',
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveKey(newId);
    setSrAnnouncement('New research conversation started.');
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  };

  // Toggle star status on a conversation
  const handleToggleStar = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, isStarred: !c.isStarred } : c))
    );
  };

  // Delete chat
  const handleDeleteChat = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const freshId = Date.now().toString();
        const freshConv: Conversation = {
          id: freshId,
          title: 'New Research Chat',
          messages: [],
          updatedAt: Date.now(),
        };
        setActiveKey(freshId);
        return [freshConv];
      }
      if (activeKey === id) {
        setActiveKey(filtered[0].id);
      }
      return filtered;
    });
    message.success('Conversation deleted');
    setSrAnnouncement('Conversation deleted.');
  };

  // Clear all chats
  const handleClearAll = () => {
    const newId = Date.now().toString();
    const fresh: Conversation = {
      id: newId,
      title: 'New Research Chat',
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations([fresh]);
    setActiveKey(newId);
    message.success('All conversations cleared');
    setSrAnnouncement('All chat history cleared.');
  };

  // Send message
  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    const currentAttachments = [...attachments];
    if ((!textToSend && currentAttachments.length === 0) || loading) return;

    setInputText('');
    setAttachments([]);
    isAutoScrollAttachedRef.current = true;
    setShowScrollDownBtn(false);
    requestAnimationFrame(() => scrollToBottom('smooth', true));

    const resolvedText =
      textToSend ||
      (settings.language === 'ar'
        ? 'تحليل المرفقات المرفقة'
        : 'Analyze the attached research file(s)');

    const userMessageId = Date.now().toString();
    const assistantMessageId = (Date.now() + 1).toString();

    const userTokens = Math.max(1, Math.round(resolvedText.length / 3.6));
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: resolvedText,
      timestamp: Date.now(),
      attachments: currentAttachments.map((att) => ({
        id: att.id,
        name: att.name,
        type: att.type,
        url: att.dataUrl,
        size: att.size,
      })),
      usage: {
        promptTokens: userTokens,
        completionTokens: 0,
        totalTokens: userTokens,
      },
    };

    const targetConvId = activeKey;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      loading: true,
      isStreaming: true,
      timestamp: Date.now(),
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === targetConvId) {
          const isFirst = conv.messages.length === 0;
          const newTitle = isFirst
            ? resolvedText.slice(0, 30) + (resolvedText.length > 30 ? '...' : '')
            : conv.title;
          return {
            ...conv,
            title: newTitle,
            updatedAt: Date.now(),
            messages: [...conv.messages, userMessage, assistantPlaceholder],
          };
        }
        return conv;
      })
    );

    setLoading(true);
    setSrAnnouncement('Searching OpenAlex papers and synthesizing evidence...');

    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    lastSentQueryRef.current = resolvedText;
    activePendingRef.current = {
      userMsgId: userMessageId,
      assistantMsgId: assistantMessageId,
      convId: targetConvId,
    };

    const currentConv = conversations.find((c) => c.id === targetConvId);
    const recentHistory = (currentConv?.messages || [])
      .slice(-5)
      .map((m) => ({ role: m.role, content: m.content }));
    const chatSummary = currentConv?.summary;

    try {
      const apiAttachments = currentAttachments.map((a) => ({
        name: a.name,
        type: a.type,
        data: a.dataUrl,
      }));

      const response = await askQuestionStream(
        resolvedText,
        settings.language,
        settings.backendUrl,
        settings.useMockMode,
        chatSummary,
        recentHistory,
        {
          onThought: (_chunk, accumulatedThought) => {
            if (isAutoScrollAttachedRef.current) {
              requestAnimationFrame(() => scrollToBottom('auto'));
            }
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id === targetConvId) {
                  return {
                    ...conv,
                    messages: conv.messages.map((m) => {
                      if (m.id === assistantMessageId) {
                        return {
                          ...m,
                          thought: accumulatedThought,
                        };
                      }
                      return m;
                    }),
                  };
                }
                return conv;
              })
            );
          },
          onChunk: (_chunk, accumulated) => {
            if (isAutoScrollAttachedRef.current) {
              requestAnimationFrame(() => scrollToBottom('auto'));
            }
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id === targetConvId) {
                  return {
                    ...conv,
                    messages: conv.messages.map((m) => {
                      if (m.id === assistantMessageId) {
                        return {
                          ...m,
                          content: accumulated,
                          loading: false,
                          isStreaming: true,
                        };
                      }
                      return m;
                    }),
                  };
                }
                return conv;
              })
            );
          },
        },
        settings.provider === 'gemini'
          ? (settings.geminiModel || 'gemini-2.5-flash')
          : (settings.openRouterModel || settings.selectedModel || 'openrouter/free'),
        settings.customApiKey,
        abortController.signal,
        settings.openRouterApiKey,
        apiAttachments.length > 0 ? apiAttachments : undefined
      );

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === targetConvId) {
            return {
              ...conv,
              summary: response.updatedSummary || conv.summary,
              updatedAt: Date.now(),
              messages: conv.messages.map((m) => {
                if (m.id === assistantMessageId) {
                  return {
                    ...m,
                    content: response.answer,
                    thought: response.thought,
                    thinkingDuration: response.thinkingDuration,
                    usage: response.usage,
                    claims: response.claims,
                    loading: false,
                    isStreaming: false,
                  };
                }
                return m;
              }),
            };
          }
          return conv;
        })
      );
      setIsBackendHealthy(true);
      if (isAutoScrollAttachedRef.current) {
        requestAnimationFrame(() => scrollToBottom('smooth'));
      }
      const claimsCount = response.claims?.length || 0;
      setSrAnnouncement(
        `Research synthesis received with ${claimsCount} verified claim${claimsCount === 1 ? '' : 's'}.`
      );
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError' || activeAbortControllerRef.current?.signal.aborted) {
        console.log('Query stream was cleanly cancelled by user.');
        return;
      }

      if (err instanceof RateLimitError) {
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id === targetConvId) {
              return {
                ...conv,
                updatedAt: Date.now(),
                messages: conv.messages.map((m) => {
                  if (m.id === assistantMessageId) {
                    return {
                      ...m,
                      content: '',
                      isRateLimited: true,
                      loading: false,
                      isStreaming: false,
                      thought: undefined,
                      error: err.message,
                    };
                  }
                  return m;
                }),
              };
            }
            return conv;
          })
        );
        setSrAnnouncement('Rate limit reached. Retry options available.');
        return;
      }

      const errMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === targetConvId) {
            return {
              ...conv,
              updatedAt: Date.now(),
              messages: conv.messages.map((m) => {
                if (m.id === assistantMessageId) {
                  return {
                    ...m,
                    content: `⚠️ **Error communicating with backend:**\n\n${errMessage}\n\n*Please ensure the ASP.NET backend is running at \`${settings.backendUrl}\` and CORS is enabled.*`,
                    loading: false,
                    isStreaming: false,
                    thought: undefined,
                    error: errMessage,
                  };
                }
                return m;
              }),
            };
          }
          return conv;
        })
      );
      setIsBackendHealthy(false);
      setSrAnnouncement('Error communicating with backend.');
    } finally {
      activeAbortControllerRef.current = null;
      activePendingRef.current = null;
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
    setSrAnnouncement('Answer copied to clipboard.');
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterTab === 'starred' && !c.isStarred) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchSummary = c.summary ? c.summary.toLowerCase().includes(q) : false;
      const matchMsg = c.messages.some((m) => m.content.toLowerCase().includes(q));
      if (!matchTitle && !matchSummary && !matchMsg) return false;
    }
    return true;
  });

  return (
    <ConfigProvider
      theme={{
        algorithm: settings.isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#526D5C',
          borderRadius: 14,
          fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorBgBase: settings.isDarkMode ? '#142019' : '#FFFFFF',
          colorTextBase: settings.isDarkMode ? '#E4EDE6' : '#1A2820',
          colorLink: '#1D4ED8',
          fontSize: 14.5,
        },
        components: {
          Button: {
            borderRadius: 9999,
          },
          Tag: {
            borderRadiusSM: 9999,
          },
        },
      }}
    >
      <XProvider>
        {/* Skip Navigation Link for Screen Readers / Keyboard Focus */}
        <a href="#main-chat-content" className="skip-link" aria-label="Skip to main content">
          Skip to main research content
        </a>

        {/* Screen Reader ARIA Live Region */}
        <div className="sr-only" aria-live="polite" role="status">
          {srAnnouncement}
        </div>

        {/* Main Edge-to-Edge Container */}
        <div
          className="app-container"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Global 3D Ambient Glassmorphic Canvas Background across entire viewport */}
          <div className="ambient-canvas-container" aria-hidden="true">
            <div className="ambient-orb orb-sidebar" />
            <div className="ambient-orb orb-1" />
            <div className="ambient-orb orb-2" />
            <div className="ambient-orb orb-3" />
            <div className="ambient-orb orb-4" />
            <div className="ambient-orb orb-5" />
            <div className="ambient-glass-overlay" />
          </div>

          {/* Mobile Backdrop when sidebar is active */}
          <div
            className={`sidebar-backdrop ${sidebarCollapsed ? 'sidebar-backdrop-hidden' : ''}`}
            onClick={() => setSidebarCollapsed(true)}
            aria-hidden="true"
          />

          {/* Sidebar Navigation (Upper Sage Banner + Lower Porcelain Sheet) */}
          <nav
            role="navigation"
            aria-label="Chat history"
            className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
          >
              {/* 1. Upper Sage Zone */}
              <div className="sidebar-sage-banner">
                <div className="sidebar-header-row">
                  <div className="sidebar-brand">
                    <div className="brand-disc" aria-hidden="true">
                      <BookOutlined />
                    </div>
                    <div>
                      <Text strong style={{ color: '#FFFFFF', fontSize: 16, letterSpacing: -0.2 }}>
                        Proof Point
                      </Text>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>Research Hub</span>
                        {settings.useMockMode ? (
                          <Tag color="orange" style={{ margin: 0, fontSize: 10, borderRadius: 9999, padding: '0 6px', height: 17, lineHeight: '15px' }}>Demo</Tag>
                        ) : (
                          <Badge
                            status={isBackendHealthy ? 'success' : isBackendHealthy === false ? 'error' : 'warning'}
                            text={<span style={{ color: '#FFFFFF', fontSize: 11, opacity: 0.9 }}>{isBackendHealthy ? 'API Connected' : 'Offline'}</span>}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <Tooltip title="Collapse Sidebar">
                    <Button
                      type="text"
                      shape="circle"
                      icon={<MenuFoldOutlined style={{ color: '#FFFFFF' }} />}
                      onClick={() => setSidebarCollapsed(true)}
                      aria-label="Collapse sidebar navigation"
                    />
                  </Tooltip>
                </div>

                {/* HAI Principle Tag Moved to Sidebar */}
                <div style={{ marginTop: 2 }}>
                  <Tooltip title="Proof Point enforces HAI Transparency principles: all empirical claims are linked to primary academic literature from OpenAlex with verifiable retrieval scores.">
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 10px',
                      borderRadius: 9999,
                      background: 'rgba(255, 255, 255, 0.16)',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'help',
                      border: '1px solid rgba(255, 255, 255, 0.28)',
                    }}>
                      <span>🛡️ HAI Transparency • OpenAlex</span>
                    </div>
                  </Tooltip>
                </div>

                {/* Story Discs (Biophilic Research Collections) */}
                <div className="story-discs-container" role="tablist" aria-label="Research Topic Collections">
                  {TOPIC_DISCS.map((topic) => {
                    const isSelected = selectedTopic === topic.key;
                    return (
                      <button
                        key={topic.key}
                        type="button"
                        className="story-disc-item"
                        onClick={() => {
                          setSelectedTopic(topic.key);
                        }}
                        role="tab"
                        aria-selected={isSelected}
                        aria-label={`Filter by ${topic.label}`}
                      >
                        <div className={`story-disc-circle ${isSelected ? 'active' : ''}`}>
                          {topic.icon}
                        </div>
                        <span className="story-disc-label">{topic.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Prominent "+ New Research Chat" Pill Button */}
                <button
                  type="button"
                  className="btn-new-chat-pill"
                  onClick={handleNewChat}
                  aria-label="Start new research chat"
                >
                  <PlusOutlined style={{ fontSize: 15 }} />
                  <span>New Research Chat</span>
                </button>
              </div>

              {/* 2. Lower Porcelain White Sheet */}
              <div className="sidebar-sheet">
                {/* Category Filter Capsule Pills */}
                <div className="sidebar-filter-pills" role="tablist" aria-label="Filter conversations">
                  <button
                    type="button"
                    className={`filter-capsule-btn ${filterTab === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterTab('all')}
                    aria-label="All conversations"
                  >
                    All Chats
                  </button>
                  <button
                    type="button"
                    className={`filter-capsule-btn ${filterTab === 'starred' ? 'active' : ''}`}
                    onClick={() => setFilterTab('starred')}
                    aria-label="Starred conversations"
                  >
                    ★ Starred
                  </button>
                </div>

                  {/* Search Bar */}
                  <div className="sidebar-search-container">
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <SearchOutlined
                        style={{
                          position: 'absolute',
                          left: isRtl ? 'auto' : 12,
                          right: isRtl ? 12 : 'auto',
                          color: '#7A8D80',
                          fontSize: 13,
                        }}
                      />
                      <input
                        type="text"
                        className="sidebar-search-input"
                        placeholder={settings.language === 'ar' ? 'بحث في المحادثات...' : 'Search discussions...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          paddingLeft: isRtl ? 14 : 32,
                          paddingRight: isRtl ? 32 : 14,
                        }}
                        aria-label="Search conversation history"
                      />
                    </div>
                  </div>

                  {/* Conversation Memory (rolling summary) */}
                  {currentConversation?.summary && (
                    <MemoryCard
                      summary={currentConversation.summary}
                      messages={currentConversation.messages}
                      isArabic={isArabic}
                      isRtl={isRtl}
                    />
                  )}

                  {/* Conversation Feed List */}
                  <div className="sidebar-conversations-feed" role="listbox" aria-label="Conversation list">
                    {filteredConversations.map((c) => {
                      const isActive = c.id === activeKey;
                      const lastMsg = c.messages[c.messages.length - 1];
                      const snippet = lastMsg
                        ? lastMsg.content.slice(0, 48) + (lastMsg.content.length > 48 ? '...' : '')
                        : c.summary
                        ? c.summary.slice(0, 48)
                        : 'New research discussion';
                      const timeStr = formatTimestamp(c.updatedAt);

                      return (
                        <div
                          key={c.id}
                          className={`conv-item-card ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            setActiveKey(c.id);
                            if (window.innerWidth <= 768) {
                              setSidebarCollapsed(true);
                            }
                          }}
                          role="option"
                          aria-selected={isActive}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setActiveKey(c.id);
                            }
                          }}
                        >
                          <div className="conv-avatar-disc" aria-hidden="true">
                            <BookOutlined />
                          </div>
                          <div className="conv-details">
                            <div className="conv-title-row">
                              <span className="conv-title">{c.title}</span>
                              <span className="conv-time">{timeStr}</span>
                            </div>
                            <div className="conv-snippet-row">
                              <span className="conv-snippet">{snippet}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span className="conv-status-tick" title="Retrieved & Grounded">
                                  <CheckOutlined style={{ fontSize: 11 }} />
                                  <CheckOutlined style={{ fontSize: 11, marginLeft: -6 }} />
                                </span>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => handleToggleStar(e, c.id)}
                                  style={{
                                    cursor: 'pointer',
                                    color: c.isStarred ? '#faad14' : 'var(--sage-400)',
                                    padding: '2px 4px',
                                  }}
                                  aria-label={c.isStarred ? 'Unstar conversation' : 'Star conversation'}
                                >
                                  {c.isStarred ? (
                                    <StarFilled style={{ fontSize: 12 }} />
                                  ) : (
                                    <StarOutlined style={{ fontSize: 12 }} />
                                  )}
                                </span>
                                <Popconfirm
                                  title="Delete this chat?"
                                  onConfirm={(e) => {
                                    e?.stopPropagation();
                                    handleDeleteChat(c.id);
                                  }}
                                  onCancel={(e) => e?.stopPropagation()}
                                  okText="Delete"
                                  cancelText="Cancel"
                                  okButtonProps={{ danger: true }}
                                >
                                  <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Delete conversation ${c.title}`}
                                    style={{ padding: 2, height: 'auto', width: 'auto' }}
                                  />
                                </Popconfirm>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredConversations.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '28px 12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                        <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' }}>
                          {isArabic ? 'لا توجد محادثات مطابقة' : 'No matching conversations'}
                        </Text>
                      </div>
                    )}
                  </div>

                  {/* Sidebar Sheet Footer */}
                  <div className="sidebar-footer">
                    <Tooltip title={isArabic ? 'إعدادات الاتصال واللغة' : 'Backend & Language Settings'}>
                      <Button
                        type="text"
                        shape="circle"
                        icon={<SettingOutlined />}
                        onClick={() => setSettingsOpen(true)}
                        aria-label="Open backend and language settings"
                      />
                    </Tooltip>

                    <Popconfirm
                      title="Clear all chat history?"
                      onConfirm={handleClearAll}
                      okText="Clear"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Tooltip title="Clear All Chats">
                        <Button
                          type="text"
                          shape="circle"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label="Clear all chat history"
                        />
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </div>
              </nav>

            {/* Central Chat Viewport (Immersive Sage Canvas with 3D Ambient Glassmorphism) */}
            <div className="chat-container">
              {/* Semantic Header Landmark - Unified Sage Green Bar */}
              <header role="banner" className="chat-header">
                <Space align="center" wrap size={10}>
                  {sidebarCollapsed && (
                    <Tooltip title={isArabic ? 'فتح القائمة والمحادثات' : 'Open Sidebar / History'}>
                      <Button
                        type="default"
                        icon={<MenuUnfoldOutlined style={{ fontSize: 16, color: '#FFFFFF' }} />}
                        onClick={() => setSidebarCollapsed(false)}
                        aria-label="Expand sidebar navigation"
                        className="header-pill-btn"
                        style={{
                          background: 'rgba(255, 255, 255, 0.22)',
                          borderColor: 'rgba(255, 255, 255, 0.45)',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          borderRadius: 9999,
                          padding: '4px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                      >
                        <span className="hide-on-mobile">{isArabic ? 'فتح القائمة' : 'Open Sidebar'}</span>
                      </Button>
                    </Tooltip>
                  )}

                  {/* Talk to Librarian Button */}
                  <Button
                    type="default"
                    icon={<TeamOutlined style={{ color: '#FFFFFF' }} />}
                    onClick={() => setLibrarianModalOpen(true)}
                    aria-label="Talk to a Person or University Librarian"
                    className="header-pill-btn"
                    style={{
                      background: 'rgba(255, 255, 255, 0.18)',
                      borderColor: 'rgba(255, 255, 255, 0.35)',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      borderRadius: 9999,
                      padding: '4px 12px',
                    }}
                  >
                    <span className="hide-on-mobile">{isArabic ? 'تحدث مع أمين المكتبة' : 'Talk to Librarian'}</span>
                  </Button>
                </Space>

                <Space align="center" wrap size={6}>
                  {/* Current Active AI Provider & Model Tag */}
                  <Tooltip title="انقر لتغيير المزود (OpenRouter أو Google Gemini) واختيار الموديل من الإعدادات">
                    <Tag
                      icon={
                        settings.provider === 'gemini' ? (
                          <RobotOutlined style={{ color: '#FFFFFF' }} />
                        ) : (
                          <RocketOutlined style={{ color: '#C8E6C9' }} />
                        )
                      }
                      className="header-model-tag"
                      style={{
                        cursor: 'pointer',
                        borderRadius: 9999,
                        background: 'rgba(255, 255, 255, 0.22)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255, 255, 255, 0.35)',
                        fontWeight: 600,
                        fontSize: 12,
                        padding: '3px 10px',
                      }}
                      onClick={() => setSettingsOpen(true)}
                    >
                      {settings.provider === 'gemini'
                        ? `⚡ Gemini: ${(settings.geminiModel || '2.5-flash').replace('gemini-', '')}`
                        : `🚀 OpenRouter: ${(settings.openRouterModel || settings.selectedModel || 'free').replace(':free', '').replace('openrouter/', '')}`}
                    </Tag>
                  </Tooltip>

                  {/* Settings Button */}
                  <Tooltip title="Configure API Base URL & Language">
                    <Button
                      size="middle"
                      shape="circle"
                      icon={<SettingOutlined style={{ color: '#FFFFFF', fontSize: 16 }} />}
                      onClick={() => setSettingsOpen(true)}
                      aria-label="Configure settings"
                      style={{
                        background: 'rgba(255, 255, 255, 0.18)',
                        borderColor: 'rgba(255, 255, 255, 0.35)',
                      }}
                    />
                  </Tooltip>
                </Space>
              </header>

              {/* Main Discussion Canvas */}
              <main
                ref={chatContainerRef}
                onScroll={handleScroll}
                role="main"
                id="main-chat-content"
                tabIndex={-1}
                className="chat-messages"
              >
                <div className="chat-messages-inner">
                  {messages.length === 0 ? (
                    <div className="welcome-hero-container">
                      <div className="welcome-hero-icon" aria-hidden="true">
                        <BookOutlined style={{ fontSize: 26, color: 'var(--sage-700)' }} />
                      </div>

                      <h1 className="welcome-hero-title">
                        {isArabic ? 'مركز الأبحاث الأكاديمية' : 'Proof Point — Research Hub'}
                      </h1>

                      <p className="welcome-hero-subtitle">
                        {isArabic
                          ? 'ذكاء اصطناعي أكاديمي مدعوم بمصادر علمية محكمة وقابلة للتحقق من OpenAlex'
                          : 'Grounded Academic Intelligence with Verifiable Empirical Citations from OpenAlex'}
                      </p>

                      <div className="welcome-disclosure-box">
                        <Space align="start" size={10}>
                          <SafetyCertificateOutlined
                            style={{
                              fontSize: 17,
                              color: 'var(--sage-700)',
                              marginTop: 2,
                              flexShrink: 0,
                            }}
                          />
                          <span className="welcome-disclosure-text">
                            {isArabic
                              ? 'المساعد يبحث في الأدبيات العلمية الموثقة. يتم ربط كافة الادعاءات بأوراق بحثية، ويمكنك مراجعة أمين المكتبة لأي استفسار.'
                              : 'Answers are synthesized from peer-reviewed literature. Every empirical claim is tied to primary citations with transparent confidence metrics.'}
                          </span>
                        </Space>
                      </div>

                      <div className="recommendations-section">
                        <div className="recommendations-header">
                          <RocketOutlined />
                          <span>
                            {isArabic ? 'مواضيع بحثية موصى بها' : 'Recommended Research Topics'}
                          </span>
                        </div>
                        <div className="recommendations-grid">
                          {RECOMMENDATIONS.map((rec) => (
                            <button
                              key={rec.key}
                              type="button"
                              className="recommendation-chip"
                              onClick={() => handleSend(rec.query)}
                              aria-label={isArabic ? rec.titleAr : rec.title}
                            >
                              <div className="rec-chip-icon" aria-hidden="true">
                                {rec.icon}
                              </div>
                              <div className="rec-chip-text">
                                <span className="rec-chip-title">
                                  {isArabic ? rec.titleAr : rec.title}
                                </span>
                                <span className="rec-chip-desc">
                                  {isArabic ? rec.descriptionAr : rec.description}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {messages.map((msg) => (
                        <Bubble
                          key={msg.id}
                          placement={msg.role === 'user' ? 'end' : 'start'}
                          avatar={
                            msg.role === 'user' ? (
                              <div className="user-avatar-disc" aria-label="User Avatar">
                                <UserOutlined />
                              </div>
                            ) : (
                              <div className="ai-avatar-disc" aria-label="AI Assistant Avatar">
                                <RobotOutlined />
                              </div>
                            )
                          }
                          loading={msg.loading && !msg.content && !msg.thought}
                          content={
                            msg.isRateLimited ? (
                              <RateLimitCard
                                language={settings.language}
                                loading={loading}
                                onRetry={() => {
                                  const lastUserMsg = [...messages]
                                    .reverse()
                                    .find((m) => m.role === 'user');
                                  if (lastUserMsg) {
                                    handleSend(lastUserMsg.content);
                                  }
                                }}
                              />
                            ) : (
                              <div>
                                {msg.role === 'assistant' && !msg.error && !msg.isRateLimited && msg.thought && (
                                  <ThinkingProcess
                                    thought={msg.thought}
                                    duration={msg.thinkingDuration}
                                    thinkingTokens={msg.usage?.thinkingTokens}
                                    loading={msg.loading && !msg.content}
                                    isStreaming={msg.isStreaming}
                                    language={settings.language}
                                  />
                                )}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {/* Images Preview Grid */}
                                    {msg.attachments.some((a) => a.type.startsWith('image/')) && (
                                      <div
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns:
                                            msg.attachments.filter((a) => a.type.startsWith('image/')).length === 1
                                              ? 'minmax(120px, 280px)'
                                              : 'repeat(auto-fill, minmax(130px, 1fr))',
                                          gap: 8,
                                          maxWidth: 420,
                                        }}
                                      >
                                        <Image.PreviewGroup>
                                          {msg.attachments
                                            .filter((a) => a.type.startsWith('image/'))
                                            .map((img) => (
                                              <div
                                                key={img.id}
                                                style={{
                                                  borderRadius: 10,
                                                  overflow: 'hidden',
                                                  border: '1px solid rgba(0,0,0,0.1)',
                                                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                                  background: '#FFFFFF',
                                                }}
                                              >
                                                <Image
                                                  src={img.url}
                                                  alt={img.name}
                                                  style={{
                                                    width: '100%',
                                                    height: 110,
                                                    objectFit: 'cover',
                                                    display: 'block',
                                                  }}
                                                />
                                                <div
                                                  style={{
                                                    padding: '4px 8px',
                                                    fontSize: 11,
                                                    color: 'var(--sage-800)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    background: 'rgba(255, 255, 255, 0.95)',
                                                  }}
                                                  title={img.name}
                                                >
                                                  {img.name}
                                                </div>
                                              </div>
                                            ))}
                                        </Image.PreviewGroup>
                                      </div>
                                    )}

                                    {/* Documents List */}
                                    {msg.attachments.some((a) => !a.type.startsWith('image/')) && (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {msg.attachments
                                          .filter((a) => !a.type.startsWith('image/'))
                                          .map((doc) => {
                                            const isPdf = doc.type.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');
                                            const isText = doc.type.includes('text') || doc.name.toLowerCase().endsWith('.txt');
                                            return (
                                              <a
                                                key={doc.id}
                                                href={doc.url}
                                                download={doc.name}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="attachment-doc-card"
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: 10,
                                                  padding: '8px 12px',
                                                  borderRadius: 10,
                                                  background:
                                                    msg.role === 'user'
                                                      ? 'rgba(255, 255, 255, 0.22)'
                                                      : 'var(--sage-50, #F4F7F5)',
                                                  border:
                                                    msg.role === 'user'
                                                      ? '1px solid rgba(255, 255, 255, 0.35)'
                                                      : '1px solid rgba(0, 0, 0, 0.08)',
                                                  color: 'inherit',
                                                  textDecoration: 'none',
                                                  fontSize: 12,
                                                  maxWidth: 280,
                                                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                                }}
                                              >
                                                <span style={{ fontSize: 20 }}>
                                                  {isPdf ? (
                                                    <FilePdfOutlined style={{ color: '#E53935' }} />
                                                  ) : isText ? (
                                                    <FileTextOutlined style={{ color: '#1E88E5' }} />
                                                  ) : (
                                                    <FileOutlined style={{ color: 'var(--sage-700)' }} />
                                                  )}
                                                </span>
                                                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                  <span
                                                    style={{
                                                      fontWeight: 600,
                                                      whiteSpace: 'nowrap',
                                                      overflow: 'hidden',
                                                      textOverflow: 'ellipsis',
                                                    }}
                                                    title={doc.name}
                                                  >
                                                    {doc.name}
                                                  </span>
                                                  {doc.size ? (
                                                    <span style={{ fontSize: 10.5, opacity: 0.75 }}>
                                                      {formatFileSize(doc.size)}
                                                    </span>
                                                  ) : null}
                                                </div>
                                                <DownloadOutlined style={{ marginLeft: 'auto', fontSize: 13, opacity: 0.7 }} />
                                              </a>
                                            );
                                          })}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {msg.content && (
                                  <div className="markdown-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                      {msg.content}
                                    </ReactMarkdown>
                                    {msg.isStreaming && <span className="streaming-cursor" />}
                                  </div>
                                )}
                                {msg.claims && msg.claims.length > 0 && (
                                  <EvidenceView claims={msg.claims} language={settings.language} />
                                )}
                                {msg.usage && !msg.loading && !msg.isStreaming && (
                                  <TokenUsageBar usage={msg.usage} language={settings.language} />
                                )}
                              </div>
                            )
                          }
                          footer={
                            msg.role === 'assistant' &&
                            !msg.loading &&
                            !msg.isStreaming &&
                            msg.content &&
                            !msg.isRateLimited ? (
                              <Space size={6} style={{ marginTop: 8 }}>
                                <Tooltip title="Copy Answer">
                                  <Button
                                    type="text"
                                    size="small"
                                    shape="circle"
                                    icon={<CopyOutlined style={{ color: 'var(--sage-700)' }} />}
                                    onClick={() => handleCopy(msg.content)}
                                    aria-label="Copy assistant answer to clipboard"
                                  />
                                </Tooltip>
                                <Tooltip title="Regenerate">
                                  <Button
                                    type="text"
                                    size="small"
                                    shape="circle"
                                    icon={<ReloadOutlined style={{ color: 'var(--sage-700)' }} />}
                                    onClick={() => {
                                      const lastUserMsg = [...messages]
                                        .reverse()
                                        .find((m) => m.role === 'user');
                                      if (lastUserMsg) {
                                        handleSend(lastUserMsg.content);
                                      }
                                    }}
                                    aria-label="Regenerate answer from last user query"
                                  />
                                </Tooltip>
                              </Space>
                            ) : msg.role === 'user' ? (
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'flex-end',
                                  alignItems: 'center',
                                  gap: 6,
                                  marginTop: 4,
                                  fontSize: 11,
                                  color: 'var(--sage-700)',
                                }}
                              >
                                <span>{formatTimestamp(msg.timestamp)}</span>
                                <CheckOutlined style={{ fontSize: 10 }} />
                              </div>
                            ) : undefined
                          }
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </main>

              {/* Floating Glassmorphic Input Composer Dock */}
              <footer role="contentinfo" className="chat-footer">
                <div className="chat-footer-inner">
                  {/* Floating Glass "Scroll to Bottom" Arrow Button */}
                  {showScrollDownBtn && (
                    <div className="floating-scroll-down-container">
                      <Tooltip title={isArabic ? 'النزول لأسفل المحادثة ومتابعة التوليد' : 'Scroll to bottom and resume auto-scroll'}>
                        <button
                          type="button"
                          className="floating-scroll-down-btn"
                          onClick={() => {
                            isAutoScrollAttachedRef.current = true;
                            setShowScrollDownBtn(false);
                            scrollToBottom('smooth', true);
                          }}
                          aria-label={isArabic ? 'النزول لأسفل المحادثة' : 'Scroll to bottom'}
                        >
                          <DownOutlined className="scroll-down-icon" />
                          <span className="scroll-down-label">
                            {isArabic ? 'إلى الأسفل' : 'Scroll Down'}
                          </span>
                          {(loading || lastMsg?.isStreaming) && (
                            <span
                              className="scroll-down-badge-dot"
                              title={isArabic ? 'يجري توليد أفكار جديدة...' : 'New content streaming...'}
                            />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  )}

                  {/* Floating Stop / Cancel Action Button while generating */}
                  {loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                      <Button
                        type="primary"
                        danger
                        size="middle"
                        icon={<StopOutlined style={{ fontSize: 15 }} />}
                        onClick={handleCancelRequest}
                        aria-label="Stop generating & cancel query"
                        style={{
                          borderRadius: 9999,
                          fontWeight: 700,
                          fontSize: 13,
                          padding: '6px 20px',
                          height: 'auto',
                          background: '#E53935',
                          borderColor: '#D32F2F',
                          boxShadow: '0 4px 18px rgba(229, 57, 53, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                        }}
                      >
                        {isArabic
                          ? 'إيقاف الطلب فوراً ومسحه (Stop / Cancel)'
                          : 'Stop generating & cancel query'}
                      </Button>
                    </div>
                  )}

                  <div
                    className={`glass-composer-capsule ${attachments.length > 0 ? 'has-attachments' : ''} ${isDraggingOver ? 'dragging-over' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isDraggingOver) setIsDraggingOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingOver(false);
                      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                        processFiles(e.dataTransfer.files);
                        message.success(
                          settings.language === 'ar'
                            ? `تم إرفاق ${e.dataTransfer.files.length} ملف بنجاح`
                            : `Attached ${e.dataTransfer.files.length} file(s)`
                        );
                      }
                    }}
                  >
                    {/* Hidden Native File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,.pdf,.txt,.doc,.docx"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFileInputChange}
                    />

                    {/* Elegant Attachment Preview Dock Above Textarea */}
                    {attachments.length > 0 && (
                      <div
                        className="attachment-preview-dock"
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          padding: '8px 12px',
                          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                          background: 'rgba(255, 255, 255, 0.75)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '16px 16px 0 0',
                        }}
                      >
                        {attachments.map((att) => {
                          const isImage = att.type.startsWith('image/');
                          const isPdf = att.type.includes('pdf') || att.name.toLowerCase().endsWith('.pdf');
                          const isText = att.type.includes('text') || att.name.toLowerCase().endsWith('.txt');

                          return (
                            <div
                              key={att.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: isImage ? '3px 8px 3px 3px' : '5px 10px',
                                borderRadius: 9999,
                                background: 'rgba(240, 244, 241, 0.95)',
                                border: '1px solid rgba(46, 125, 50, 0.25)',
                                fontSize: 12,
                                color: 'var(--sage-900)',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                maxWidth: 240,
                              }}
                            >
                              {isImage ? (
                                <img
                                  src={att.dataUrl}
                                  alt={att.name}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    display: 'block',
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: 16, display: 'flex', alignItems: 'center' }}>
                                  {isPdf ? (
                                    <FilePdfOutlined style={{ color: '#E53935' }} />
                                  ) : isText ? (
                                    <FileTextOutlined style={{ color: '#1E88E5' }} />
                                  ) : (
                                    <FileOutlined style={{ color: 'var(--sage-700)' }} />
                                  )}
                                </span>
                              )}
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  overflow: 'hidden',
                                  lineHeight: 1.2,
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: 110,
                                  }}
                                  title={att.name}
                                >
                                  {att.name}
                                </span>
                                <span style={{ fontSize: 10, opacity: 0.7 }}>
                                  {formatFileSize(att.size)}
                                </span>
                              </div>
                              <Button
                                type="text"
                                size="small"
                                shape="circle"
                                icon={<CloseOutlined style={{ fontSize: 10, color: 'var(--sage-800)' }} />}
                                onClick={() => removeAttachment(att.id)}
                                aria-label={`Remove ${att.name}`}
                                style={{
                                  width: 18,
                                  height: 18,
                                  minWidth: 18,
                                  padding: 0,
                                  marginLeft: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Sender
                      loading={loading}
                      onCancel={handleCancelRequest}
                      value={inputText}
                      onChange={(val) => setInputText(val)}
                      onSubmit={() => handleSend()}
                      prefix={
                        <Space size={4} align="center">
                          <Tooltip
                            title={
                              settings.language === 'ar'
                                ? 'إرفاق صور أو أوراق بحثية (Images / PDF / TXT)'
                                : 'Attach images or research files (Images / PDF / TXT)'
                            }
                          >
                            <Badge count={attachments.length} size="small" offset={[-2, 2]}>
                              <Button
                                type="text"
                                shape="circle"
                                icon={<PaperClipOutlined style={{ fontSize: 17, color: 'var(--sage-800)' }} />}
                                className="composer-icon-btn"
                                aria-label="Attach images or research files"
                                onClick={() => fileInputRef.current?.click()}
                              />
                            </Badge>
                          </Tooltip>
                          <VoiceRecorder
                            language={settings.language}
                            disabled={loading}
                            onTranscript={(transcript) => {
                              setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
                            }}
                          />
                        </Space>
                      }
                      placeholder={
                        isArabic
                          ? isMobile
                            ? 'اسأل سؤالاً بحثياً...'
                            : 'اسأل سؤالاً بحثياً أو اضغط على الميكروفون للتحدث...'
                          : isMobile
                          ? 'Ask a research question...'
                          : 'Ask an academic research question or click microphone to speak...'
                      }
                    />
                  </div>
                  <div className="chat-disclaimer">
                    {isArabic
                      ? 'Proof Point يبحث في أوراق OpenAlex الأكاديمية ونماذج Google Gemini. الادعاءات موثقة بمصادر محكمة. استشر أمين مكتبة جامعتك للتحقق.'
                      : 'Proof Point searches OpenAlex academic works and Google Gemini. Empirical claims are linked to peer-reviewed sources. Consult your university librarian for thesis validation.'}
                  </div>
                </div>
              </footer>
            </div>

            {/* Settings Modal */}
            <SettingsModal
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              settings={settings}
              onSave={(newSettings) => setSettings(newSettings)}
            />

            {/* Librarian & Faculty Advisor Consultation Modal (Feature 8) */}
            <LibrarianModal
              open={librarianModalOpen}
              onClose={() => setLibrarianModalOpen(false)}
              language={settings.language}
            />
          </div>
      </XProvider>
    </ConfigProvider>
  );
};

export default App;
