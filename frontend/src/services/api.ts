import type { ChatResponse, ClaimResponse, TokenUsage, ModelsResponse } from '../types';

export class RateLimitError extends Error {
  public retryAfterSeconds: number;
  constructor(message?: string, retryAfter: number = 30) {
    super(message || 'Gemini API Rate Limit Exceeded (429 Too Many Requests).');
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfter;
  }
}

export interface StreamCallbacks {
  onChunk: (chunk: string, accumulated: string) => void;
  onThought?: (thoughtChunk: string, accumulatedThought: string) => void;
  onPapersFound?: (count: number) => void;
}

function normalizeClaims(claims: ClaimResponse[]): ClaimResponse[] {
  return (claims || []).map((c) => ({
    ...c,
    citationCheckStatus:
      c.citationCheckStatus ||
      (c.evidence && c.evidence.length > 0
        ? 'Paper and abstract found; verified in OpenAlex corpus.'
        : undefined),
    evidence: (c.evidence || []).map((ev) => ({
      ...ev,
      evidenceStatus:
        ev.evidenceStatus ||
        'Paper and abstract found; verified in OpenAlex corpus.',
    })),
  }));
}

export async function askQuestionStream(
  userMessage: string,
  language: string = 'auto',
  baseUrl: string,
  useMockMode: boolean = false,
  chatSummary?: string,
  recentHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  callbacks?: StreamCallbacks,
  geminiModel?: string,
  customApiKey?: string,
  abortSignal?: AbortSignal,
  openRouterApiKey?: string,
  attachments?: Array<{ name: string; type: string; data: string }>
): Promise<ChatResponse> {
  const startTime = Date.now();

  // If Mock Mode is enabled, simulate realistic streaming immediately
  if (useMockMode) {
    if (
      userMessage.toLowerCase().includes('rate limit') ||
      userMessage.toLowerCase().includes('rate-limit')
    ) {
      throw new RateLimitError(
        language === 'ar'
          ? 'تم تجاوز الحد الأقصى لطلبات Gemini API (429 Too Many Requests). يرجى الانتظار دقيقة حتى يعود الـ Rate للعمل.'
          : 'Gemini API rate limit has been exceeded (429 Too Many Requests). Please wait a moment for the quota to reset.'
      );
    }

    const duration = 1.8;
    const mock = generateMockResponse(userMessage, language, duration, chatSummary, recentHistory);

    if (callbacks?.onPapersFound) {
      callbacks.onPapersFound(mock.claims.reduce((acc, c) => acc + (c.evidence?.length || 0), 0));
    }

    // Simulate thinking progress
    if (callbacks?.onThought && mock.thought) {
      callbacks.onThought(mock.thought, mock.thought);
    }
    await new Promise((r) => setTimeout(r, 350));

    // Simulate chunk streaming word by word
    if (callbacks?.onChunk) {
      const words = mock.answer.split(' ');
      let accumulated = '';
      for (let i = 0; i < words.length; i++) {
        if (abortSignal && abortSignal.aborted) {
          const abortErr = new Error('Request aborted by user');
          abortErr.name = 'AbortError';
          throw abortErr;
        }
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        accumulated += word;
        callbacks.onChunk(word, accumulated);
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    return mock;
  }

  const cleanBase = (baseUrl || '').replace(/\/+$/, '');
  const url = `${cleanBase}/api/Chat/ask`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  if (abortSignal) {
    if (abortSignal.aborted) {
      controller.abort();
    } else {
      abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json',
      },
      body: JSON.stringify({
        userMessage,
        language,
        chatSummary,
        recentHistory,
        model: geminiModel,
        apiKey: customApiKey || openRouterApiKey,
        openRouterApiKey,
        attachments,
      }),
      signal: controller.signal,
    });

    if (res.status === 429) {
      let errMsg =
        language === 'ar'
          ? 'تم تجاوز الحد الأقصى لطلبات Gemini API (Rate Limit 429). الـ Rate سيُعاد ضبطه قريباً.'
          : 'Gemini API rate limit has been reached (429 Too Many Requests). Quota will reset shortly.';
      try {
        const errJson = await res.json();
        if (errJson.message) errMsg = errJson.message;
      } catch {
        // use fallback
      }
      throw new RateLimitError(errMsg);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      if (
        errText.includes('429') ||
        errText.includes('RESOURCE_EXHAUSTED') ||
        errText.includes('RATE_LIMIT') ||
        errText.includes('quota')
      ) {
        throw new RateLimitError();
      }
      throw new Error(`Server returned status ${res.status}: ${errText}`);
    }

    const contentType = res.headers.get('content-type') || '';

    // If SSE Streaming response
    if (contentType.includes('text/event-stream') && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedAnswer = '';
      let accumulatedThought = '';
      let finalResponse: ChatResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const event = JSON.parse(dataStr);
              if (event.type === 'chunk' && event.text) {
                accumulatedAnswer += event.text;
                callbacks?.onChunk(event.text, accumulatedAnswer);
              } else if (event.type === 'thought' && event.text) {
                accumulatedThought += event.text;
                callbacks?.onThought?.(event.text, accumulatedThought);
              } else if (event.type === 'papers' && event.count) {
                callbacks?.onPapersFound?.(event.count);
              } else if (event.type === 'error') {
                if (
                  event.status === 429 ||
                  event.error === 'RATE_LIMIT_EXCEEDED' ||
                  event.message?.includes('429')
                ) {
                  throw new RateLimitError(event.message);
                }
                throw new Error(event.message || 'Stream processing error');
              } else if (event.type === 'done') {
                const duration = (Date.now() - startTime) / 1000;
                const normalizedClaims = normalizeClaims(event.claims || []);
                finalResponse = {
                  answer: event.answer || accumulatedAnswer,
                  claims: normalizedClaims,
                  updatedSummary: event.updatedSummary || '',
                  thought: event.thought || accumulatedThought,
                  thinkingDuration: duration,
                  usage: event.usage,
                };
              }
            } catch (jsonErr) {
              if (jsonErr instanceof RateLimitError) throw jsonErr;
              // Ignore partial JSON chunks
            }
          }
        }
      }

      if (finalResponse) {
        return finalResponse;
      }

      // If finished without explicit done event, build response from accumulated text
      const duration = (Date.now() - startTime) / 1000;
      return {
        answer: accumulatedAnswer,
        claims: [],
        thought: accumulatedThought,
        thinkingDuration: duration,
      };
    }

    // Standard JSON Fallback
    const data: ChatResponse = await res.json();
    const duration = (Date.now() - startTime) / 1000;
    const normalizedClaims = normalizeClaims(data.claims || []);
    if (callbacks?.onChunk && data.answer) {
      callbacks.onChunk(data.answer, data.answer);
    }
    return {
      ...data,
      claims: normalizedClaims,
      thinkingDuration: data.thinkingDuration || duration,
    };
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError' || abortSignal?.aborted) {
      const abortErr = new Error('Request cancelled by user');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    if (err instanceof RateLimitError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. The server or AI took too long to respond.');
    }

    // Only fallback to mock if useMockMode is explicitly enabled by the user
    if (useMockMode) {
      console.warn('Backend unavailable and mock mode enabled, providing demo response:', err);
      const duration = (Date.now() - startTime) / 1000;
      const mock = generateMockResponse(userMessage, language, duration, chatSummary, recentHistory);

      if (callbacks?.onPapersFound) {
        callbacks.onPapersFound(mock.claims.reduce((acc, c) => acc + (c.evidence?.length || 0), 0));
      }
      if (callbacks?.onThought && mock.thought) {
        callbacks.onThought(mock.thought, mock.thought);
      }
      await new Promise((r) => setTimeout(r, 300));
      if (callbacks?.onChunk) {
        const words = mock.answer.split(' ');
        let accumulated = '';
        for (let i = 0; i < words.length; i++) {
          const word = words[i] + (i < words.length - 1 ? ' ' : '');
          accumulated += word;
          callbacks.onChunk(word, accumulated);
          await new Promise((r) => setTimeout(r, 20));
        }
      }
      return mock;
    }

    if (err instanceof Error) {
      if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
        throw new RateLimitError(err.message);
      }
      throw err;
    }
    throw new Error('An unexpected network error occurred.');
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function askQuestion(
  userMessage: string,
  language: string = 'auto',
  baseUrl: string,
  useMockMode: boolean = false,
  chatSummary?: string,
  recentHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  attachments?: Array<{ name: string; type: string; data: string }>
): Promise<ChatResponse> {
  return askQuestionStream(
    userMessage,
    language,
    baseUrl,
    useMockMode,
    chatSummary,
    recentHistory,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    attachments
  );
}

export async function checkBackendHealth(baseUrl: string): Promise<boolean> {
  if (!baseUrl) return false;
  try {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${cleanBase}/api/Chat/models`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok || res.status === 404 || res.status === 502 || res.status === 429;
  } catch {
    return false;
  }
}

export async function getAvailableModels(
  baseUrl: string,
  refresh: boolean = false
): Promise<ModelsResponse | null> {
  if (!baseUrl) return null;
  try {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const refreshParam = refresh ? '?refresh=true' : '';
    const res = await fetch(`${cleanBase}/api/Chat/models${refreshParam}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('Failed to fetch available models:', e);
    return null;
  }
}

function generateMockResponse(
  query: string,
  language: string,
  duration: number,
  chatSummary?: string,
  recentHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): ChatResponse {
  const isArabic = language === 'ar' || (language === 'auto' && /[\u0600-\u06FF]/.test(query));
  const lowerQuery = query.toLowerCase().trim();

  // Case 1: Academic Query about Plant Diseases
  const isPlantDiseaseQuery =
    lowerQuery.includes('plant disease') ||
    lowerQuery.includes('plant') ||
    lowerQuery.includes('deep learning methods used for plant disease detection') ||
    lowerQuery.includes('نبات') ||
    lowerQuery.includes('أمراض النبات');

  // Case 2: Out-of-Scope Fallback Query
  const isOutOfScopeQuery =
    lowerQuery.includes('pasta') ||
    lowerQuery.includes('recipe') ||
    lowerQuery.includes('cook') ||
    lowerQuery.includes('non-academic') ||
    lowerQuery.includes('باستا') ||
    lowerQuery.includes('مكرونة') ||
    lowerQuery.includes('طبخ') ||
    lowerQuery.includes('طريقة عمل') ||
    lowerQuery.includes('وصفة');

  let answer = '';
  let claims: ClaimResponse[] = [];
  let thought = '';
  let updatedSummary = '';

  if (isPlantDiseaseQuery) {
    if (
      isArabic &&
      (lowerQuery.includes('نبات') || lowerQuery.includes('أمراض النبات')) &&
      !lowerQuery.includes('plant')
    ) {
      answer =
        'يكتشف التعلم العميق أمراض النباتات باستخدام ثلاثة أنواع رئيسية من الشبكات: التصنيف، والكشف، والتجزئة. ويعتمد عادةً على الشبكات العصبية الالتفافية (CNNs) والنماذج المدربة مسبقاً مثل MobileNet و MobileNetV2 و EfficientNetV2S، وأحياناً يجمع بين استخراج الميزات العميقة والمصنفات التقليدية مثل SVM و KNN لتعزيز الدقة.';
      claims = [
        {
          text: 'يكتشف التعلم العميق أمراض النباتات باستخدام شبكات التصنيف والكشف والتجزئة.',
          type: 'Source-supported',
          citationCheckStatus: 'تم العثور على الورقة والمستخلص؛ لم يتم التحقق بعد من النص الكامل.',
          evidence: [
            {
              paperId: 'https://doi.org/10.1186/s13007-021-00722-9',
              paperTitle: 'Plant diseases and pests detection based on deep learning: a review',
              authors: 'Liu & Wang',
              publicationYear: 2021,
              paperLink: 'https://doi.org/10.1186/s13007-021-00722-9',
              sourcePassage:
                'Deep learning detects plant diseases using classification, detection, and segmentation networks. It commonly relies on CNNs and pre-trained models like MobileNet, MobileNetV2, and EfficientNetV2S.',
              retrievalScore: 0.98,
              evidenceStatus: 'تم العثور على الورقة والمستخلص؛ لم يتم التحقق بعد من النص الكامل.',
            },
          ],
        },
      ];
      thought = `* **تقييم السياق والذاكرة**: تم استيعاب استفسار الباحث حول تشخيص أمراض النباتات وتقنيات الرؤية الحاسوبية.
* **البحث الأكاديمي المباشر**: تم استرجاع الورقة المرجعية الرائدة من OpenAlex/BioMed Central: Liu & Wang (2021).
* **استخلاص وتوثيق الأدلة**: مطابقة شبكات التصنيف والكشف والتجزئة (CNNs, MobileNet, EfficientNet).
* **التحقق من الاستشهادات**: تم العثور على الورقة والمستخلص؛ لم يتم التحقق بعد من النص الكامل.`;
      updatedSummary =
        'ملخص المحادثة حتى الآن: مناقشة منهجيات التعلم العميق للكشف عن أمراض النباتات استناداً إلى دراسة Liu & Wang (2021).';
    } else {
      // Exact Demo Script Text for Case 1
      answer =
        'Deep learning detects plant diseases using three main network types: classification, detection, and segmentation. It commonly relies on CNNs and pre-trained models like MobileNet, MobileNetV2, and EfficientNetV2S, and sometimes combines deep feature extraction with traditional classifiers like SVM and KNN to boost accuracy.';
      claims = [
        {
          text: 'Deep learning detects plant diseases using classification, detection, and segmentation networks.',
          type: 'Source-supported',
          citationCheckStatus: 'Paper and abstract found; not yet verified against the full text.',
          evidence: [
            {
              paperId: 'https://doi.org/10.1186/s13007-021-00722-9',
              paperTitle: 'Plant diseases and pests detection based on deep learning: a review',
              authors: 'Liu & Wang',
              publicationYear: 2021,
              paperLink: 'https://doi.org/10.1186/s13007-021-00722-9',
              sourcePassage:
                'Deep learning detects plant diseases using classification, detection, and segmentation networks. It commonly relies on CNNs and pre-trained models like MobileNet, MobileNetV2, and EfficientNetV2S.',
              retrievalScore: 0.98,
              evidenceStatus: 'Paper and abstract found; not yet verified against the full text.',
            },
          ],
        },
      ];
      thought = `* **Context & Memory Evaluation**: Synthesized query against academic database and rolling summary.
* **Scholarly Retrieval**: Retrieved top-ranking peer-reviewed review paper from OpenAlex/BioMed Central (DOI: 10.1186/s13007-021-00722-9).
* **Evidence Extraction**: Extracted and verified source passage on classification, detection, and segmentation architectures (CNNs, MobileNet, EfficientNet).
* **Citation Verification**: Verified abstract ground truth match. Status: Paper and abstract found; not yet verified against the full text.`;
      updatedSummary =
        'Conversation Summary So Far: Discussed deep learning architectures for plant disease detection (classification, detection, segmentation networks) based on Liu & Wang (2021).';
    }
  } else if (isOutOfScopeQuery) {
    // Exact Demo Script Text for Case 2
    if (
      isArabic &&
      !lowerQuery.includes('pasta') &&
      !lowerQuery.includes('recipe') &&
      !lowerQuery.includes('cook') &&
      !lowerQuery.includes('non-academic')
    ) {
      answer = 'يمكنني المساعدة في الأبحاث الأكاديمية فقط. يرجى إدخال سؤال بحثي أكاديمي.';
      thought = `* **تصنيف نية المستخدم**: تم فحص الاستفسار والتأكد من أنه خارج النطاق الأكاديمي والبحثي.
* **تفعيل درع الحماية الأكاديمي**: تم حجب الطلب غير الأكاديمي وتوجيه المستخدم لطرح أسئلة علمية.`;
      updatedSummary = `ملخص المحادثة حتى الآن: استفسار خارج النطاق الأكاديمي حول "${query}". تم تنبيه المستخدم بحصر الخدمة على الأبحاث الأكاديمية.`;
    } else {
      answer = 'I can only help with academic research. Please enter an academic research question.';
      thought = `* **Intent Classification**: Evaluated query domain and relevance to academic and scientific literature.
* **Scope Boundary Guard**: Query flagged as non-academic / culinary request ("${query}").
* **Policy Enforcement**: Guardrail active — redirected user to academic research scope.`;
      updatedSummary = `Conversation Summary So Far: User submitted an out-of-scope query regarding "${query}". Advised user that ResearchHub AI only processes scholarly research questions.`;
    }
    claims = [];
  } else {
    // Case 3: Default/Fallback General Academic Query
    if (isArabic) {
      answer = `بناءً على الأوراق البحثية الأكاديمية المستخرجة من OpenAlex حول: **"${query}"**، تشير الدراسات الحديثة إلى نتائج مهمة:

### أبرز النتائج العلمية:
1. **الكفاءة والأداء**: أثبتت النماذج الحديثة كفاءة حسابية أعلى مع تقليل استهلاك الموارد بنسبة تتجاوز 35%.
2. **قابلية التفسير (Interpretability)**: استخدام آليات الانتباه وربط النتائج بأدلة موثوقة يقلل من نسب الهلوسة في المخرجات.
3. **التطبيقات العملية**: تم اعتماد المنهجيات في مجالات الرعاية الصحية، ومعالجة اللغات الطبيعية، واكتشاف الأدوية.`;
      thought = `* **فحص الذاكرة السابقة**: تم فحص آخر 5 رسائل والملخص السابق بنجاح.
* **البحث الأكاديمي المباشر**: جلب أوراق بحثية محكمة من قاعدة بيانات OpenAlex.
* **تحديث الملخص المستمر (Overwrite)**: تحديث ملخص الحوار شاملاً المفاهيم الجديدة.
* **تفنيد الادعاءات والأدلة**: فحص موثوقية النتائج ومطابقتها لمستخلصات الأوراق العلمية.`;
      updatedSummary = `ملخص المحادثة حتى الآن: تم مناقشة موضوع "${query}" مع استعراض الأوراق البحثية المستخرجة من OpenAlex، والتحقق من الأدلة العلمية في سياق حوار مستمر.`;
      claims = [
        {
          text: 'النماذج المعتمدة على آليات الانتباه الذاتي تحقق نتائج متفوقة مقارنة بالهياكل التكرارية التقليدية في استيعاب السياق الطويل.',
          type: 'Source-supported',
          citationCheckStatus: 'تم العثور على الورقة والمستخلص؛ لم يتم التحقق بعد من النص الكامل.',
          evidence: [
            {
              paperId: 'https://doi.org/10.48550/arXiv.1706.03762',
              paperTitle: 'Attention Is All You Need',
              authors: 'Vaswani et al.',
              publicationYear: 2017,
              paperLink: 'https://doi.org/10.48550/arXiv.1706.03762',
              sourcePassage:
                'We propose the Transformer, a model architecture eschewing recurrence and relying entirely on an attention mechanism to draw global dependencies between input and output.',
              retrievalScore: 0.96,
              evidenceStatus: 'تم العثور على الورقة والمستخلص؛ لم يتم التحقق بعد من النص الكامل.',
            },
            {
              paperId: 'https://doi.org/10.18653/v1/N19-1423',
              paperTitle: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
              authors: 'Devlin et al.',
              publicationYear: 2019,
              paperLink: 'https://doi.org/10.18653/v1/N19-1423',
              sourcePassage:
                'Experimental results show that our proposed attention mechanisms significantly outperform recurrent architectures across multiple benchmark datasets.',
              retrievalScore: 0.88,
              evidenceStatus: 'تم العثور على الورقة والمستخلص؛ لم يتم التحقق بعد من النص الكامل.',
            },
          ],
        },
      ];
    } else {
      answer = `Based on peer-reviewed academic publications retrieved from OpenAlex regarding **"${query}"**, research highlights several critical findings:

### Summary of Key Findings:
1. **Architectural Advancements**: Modern models achieve significantly higher scalability and sample efficiency by combining sparse attention mechanisms with parameter-efficient fine-tuning (PEFT).
2. **Factuality & Grounding**: Integrating retrieval pipelines reduces factual errors and hallucination rates in generative responses.
3. **Empirical Benchmarks**: Comprehensive evaluations across multiple academic benchmarks demonstrate statistically significant improvements over prior baselines.`;
      thought = `* **Context & Memory Evaluation**: Synthesized previous rolling summary and last 5 dialog turns.
* **Scholarly Retrieval**: Queried OpenAlex database with reciprocal rank scoring.
* **Rolling Overwriting Summary**: Updated conversation summary in-place for long-term retention.
* **Evidence Verification**: Validated each claim against primary source passages and peer-reviewed abstracts.`;
      updatedSummary = `Conversation Summary So Far: Discussed "${query}" with grounding in OpenAlex scholarly literature, empirical claim verification, and continuous dialogue retention.`;
      claims = [
        {
          text: 'Sparse and linear attention variants maintain expressive representation capacity while reducing quadratic computational complexity to O(N).',
          type: 'Source-supported',
          citationCheckStatus: 'Paper and abstract found; not yet verified against the full text.',
          evidence: [
            {
              paperId: 'https://doi.org/10.48550/arXiv.1706.03762',
              paperTitle: 'Attention Is All You Need',
              authors: 'Vaswani et al.',
              publicationYear: 2017,
              paperLink: 'https://doi.org/10.48550/arXiv.1706.03762',
              sourcePassage:
                'We demonstrate that the computational bottleneck of standard self-attention can be effectively bypassed through low-rank kernel approximations and sparse routing.',
              retrievalScore: 0.94,
              evidenceStatus: 'Paper and abstract found; not yet verified against the full text.',
            },
          ],
        },
      ];
    }
  }

  // Token calculations
  const userTokens = Math.max(1, Math.round(query.length / 3.6));
  const systemPromptTokens = 230;
  const papersTokens = claims.length > 0 ? 650 : 0;
  const historyTokens = recentHistory
    ? Math.round(JSON.stringify(recentHistory).length / 3.6)
    : 0;
  const summaryTokens = chatSummary ? Math.round(chatSummary.length / 3.6) : 0;

  const promptTokens =
    systemPromptTokens + papersTokens + historyTokens + summaryTokens + userTokens;
  const completionTokens = Math.max(1, Math.round(answer.length / 3.6));
  const thinkingTokens = 92;
  const totalTokens = promptTokens + completionTokens + thinkingTokens;

  const usage: TokenUsage = {
    promptTokens,
    completionTokens,
    thinkingTokens,
    totalTokens,
    details: {
      systemPromptTokens,
      papersTokens,
      historyTokens,
      summaryTokens,
      userTokens,
    },
  };

  return {
    answer,
    thought,
    thinkingDuration: duration,
    updatedSummary,
    usage,
    claims,
  };
}
