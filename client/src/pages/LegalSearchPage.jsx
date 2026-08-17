import { useState, useRef, useEffect, useCallback } from 'react';
import '../styles/legal-search.css';
import {
  Bot,
  Send,
  Search,
  Trash2,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileText,
  Building2,
  Home,
  Coins,
  Users,
  Scale,
  AlertTriangle,
  Wifi,
  Database,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { fetchWithAuth } from '../utils/fetchWithAuth.js';

const API_URL = import.meta.env.VITE_API_URL || '';

const QUICK_PROMPTS = [
  {
    category: 'Hợp đồng',
    icon: <FileText size={14} />,
    color: '#ef4444',
    prompts: [
      'Hợp đồng lao động cần có những điều khoản nào bắt buộc?',
      'Điều kiện để đơn phương chấm dứt hợp đồng lao động?',
    ],
  },
  {
    category: 'Doanh nghiệp',
    icon: <Building2 size={14} />,
    color: '#3b82f6',
    prompts: [
      'Thủ tục thành lập công ty TNHH một thành viên?',
      'Trách nhiệm pháp lý của người đại diện theo pháp luật?',
    ],
  },
  {
    category: 'Bất động sản',
    icon: <Home size={14} />,
    color: '#10b981',
    prompts: [
      'Điều kiện để chuyển nhượng quyền sử dụng đất?',
      'Hợp đồng thuê nhà cần công chứng không?',
    ],
  },
  {
    category: 'Lao động',
    icon: <Users size={14} />,
    color: '#f59e0b',
    prompts: [
      'Quy định về thời giờ làm việc và nghỉ phép năm?',
      'Mức lương tối thiểu vùng hiện hành là bao nhiêu?',
    ],
  },
  {
    category: 'Thuế & Tài chính',
    icon: <Coins size={14} />,
    color: '#8b5cf6',
    prompts: [
      'Quy định về thuế thu nhập cá nhân từ tiền lương?',
      'Hóa đơn điện tử cần đáp ứng điều kiện gì?',
    ],
  },
];

// Tier metadata for display
const TIER_META = {
  realtime: {
    label: 'Thời gian thực',
    icon: <Wifi size={12} />,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.22)',
  },
  database: {
    label: 'Cơ sở dữ liệu',
    icon: <Database size={12} />,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.22)',
  },
  local: {
    label: 'Kho cục bộ — có thể chưa cập nhật',
    icon: <HardDrive size={12} />,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.28)',
  },
};

function normalizeAiResponse(data) {
  if (data && typeof data === 'object') {
    return {
      text: data.answer || data.summary || 'Không có câu trả lời.',
      citations: Array.isArray(data.citations) ? data.citations : [],
      confidence: typeof data.confidence === 'number' ? data.confidence : null,
      riskScore: typeof data.risk_score === 'number' ? data.risk_score : null,
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
      retrieval_tier: data.metadata?.retrieval_tier || null,
      retrieval_note: data.metadata?.retrieval_note || null,
    };
  }
  return { text: String(data), citations: [], confidence: null, riskScore: null, warnings: [], retrieval_tier: null, retrieval_note: null };
}

function CitationCard({ citation, index }) {
  const [expanded, setExpanded] = useState(false);
  const title = citation.law_title || citation.source || `Nguồn ${index + 1}`;
  const article = citation.article || '';
  const content = citation.content || citation.excerpt || citation.quote || '';
  const tier = citation.source_tier || 'local';
  const tierMeta = TIER_META[tier] || TIER_META.local;
  const sourceUrl = citation.source_url || null;
  const retrievedAt = citation.retrieved_at
    ? new Date(citation.retrieved_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className="ls-citation-card">
      <button
        type="button"
        className="ls-citation-header"
        onClick={() => setExpanded((p) => !p)}
        aria-expanded={expanded}
      >
        <BookOpen size={13} />
        <span className="ls-citation-title">{title}{article ? ` · ${article}` : ''}</span>
        <span
          className="ls-tier-badge"
          style={{ color: tierMeta.color, background: tierMeta.bg, borderColor: tierMeta.border }}
          title={tierMeta.label}
        >
          {tierMeta.icon}
        </span>
        {content && (expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
      </button>

      {expanded && (
        <div className="ls-citation-body">
          {content && <p className="ls-citation-excerpt">{content}</p>}

          <div className="ls-citation-meta">
            <span
              className="ls-tier-full"
              style={{ color: tierMeta.color, background: tierMeta.bg, borderColor: tierMeta.border }}
            >
              {tierMeta.icon} {tierMeta.label}
            </span>

            {retrievedAt && (
              <span className="ls-citation-date">Truy xuất: {retrievedAt}</span>
            )}

            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ls-citation-link"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={12} /> Xem nguồn gốc
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AiMessage({ message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const confidencePct = message.confidence !== null
    ? Math.round(message.confidence * 100)
    : null;

  const confidenceColor =
    confidencePct === null ? null
    : confidencePct >= 80 ? '#10b981'
    : confidencePct >= 50 ? '#f59e0b'
    : '#ef4444';

  return (
    <div className="ls-msg-wrapper ls-msg-ai" role="article" aria-label="Câu trả lời trợ lý">
      <div className="ls-msg-avatar"><Bot size={16} /></div>
      <div className="ls-msg-content">
        <div className="ls-bubble ls-bubble-ai">
          <p className="ls-bubble-text">{message.text}</p>

          {message.warnings.length > 0 && (
            <div className="ls-warning-row">
              <AlertTriangle size={13} />
              <span>{message.warnings.join(' · ')}</span>
            </div>
          )}

          <div className="ls-bubble-footer">
            {confidencePct !== null && (
              <div className="ls-confidence">
                <span className="ls-confidence-label">Độ tin cậy</span>
                <div className="ls-confidence-track">
                  <div
                    className="ls-confidence-fill"
                    style={{ width: `${confidencePct}%`, background: confidenceColor }}
                  />
                </div>
                <span className="ls-confidence-pct" style={{ color: confidenceColor }}>
                  {confidencePct}%
                </span>
              </div>
            )}

            <button
              type="button"
              className="ls-copy-btn"
              onClick={handleCopy}
              title="Sao chép câu trả lời"
            >
              {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
              {copied ? 'Đã sao chép' : 'Sao chép'}
            </button>
          </div>
        </div>

        {message.retrieval_tier && (
        <div className="ls-retrieval-banner" style={{
          color: (TIER_META[message.retrieval_tier] || TIER_META.local).color,
          background: (TIER_META[message.retrieval_tier] || TIER_META.local).bg,
          borderColor: (TIER_META[message.retrieval_tier] || TIER_META.local).border,
        }}>
          {(TIER_META[message.retrieval_tier] || TIER_META.local).icon}
          <span>{message.retrieval_note || (TIER_META[message.retrieval_tier] || TIER_META.local).label}</span>
        </div>
      )}

      {message.citations.length > 0 && (
          <div className="ls-citations-block">
            <div className="ls-citations-label">
              <BookOpen size={13} /> {message.citations.length} trích dẫn pháp lý
            </div>
            <div className="ls-citations-list">
              {message.citations.map((cit, i) => (
                <CitationCard key={i} citation={cit} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LegalSearchPage() {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const feedRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = useCallback(async (textOverride) => {
    const text = (textOverride ?? inputVal).trim();
    if (!text) return;

    setInputVal('');
    setError('');
    setMessages((prev) => [...prev, { role: 'user', text, ts: Date.now() }]);
    setIsLoading(true);

    try {
      const res = await fetchWithAuth(`${API_URL}/v1/legal/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API trả về lỗi.');

      setMessages((prev) => [
        ...prev,
        { role: 'ai', ts: Date.now(), ...normalizeAiResponse(data) },
      ]);
    } catch (err) {
      setError(err.message || 'Mất kết nối server. Vui lòng thử lại.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          ts: Date.now(),
          text: 'Không thể kết nối với máy chủ. Vui lòng kiểm tra server.',
          citations: [],
          confidence: null,
          riskScore: null,
          warnings: [],
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputVal]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setError('');
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="ls-layout">
      {/* Left: Chat panel */}
      <div className="ls-chat-panel">
        {/* Header */}
        <div className="ls-chat-header">
          <div className="ls-chat-title">
            <Scale size={20} />
            <span>Trợ lý Pháp lý AI</span>
            <span className="ls-online-badge">
              <span className="ls-pulse" /> Trực tuyến
            </span>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              className="ls-clear-btn"
              onClick={clearConversation}
              title="Xóa toàn bộ hội thoại"
            >
              <Trash2 size={14} /> Xóa hội thoại
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="ls-feed" ref={feedRef} role="log" aria-live="polite" aria-relevant="additions text">
          {isEmpty ? (
            <div className="ls-welcome">
              <div className="ls-welcome-icon">
                <Scale size={36} strokeWidth={1.5} />
              </div>
              <h2>Xin chào!</h2>
              <p>
                Tôi là Trợ lý Pháp lý AI. Hãy đặt câu hỏi về pháp luật Việt Nam — tôi sẽ trả lời kèm trích dẫn nguồn chính xác.
              </p>

              {/* 3-Layer Verification Info */}
              <div className="ls-verification-info">
                <h3>✅ Cơ chế Xác minh 3 Lớp</h3>
                <ul>
                  <li><strong>Lớp 1:</strong> Kiểm tra với CSDL luật VN cập nhật</li>
                  <li><strong>Lớp 2:</strong> So sánh với các quy định liên quan</li>
                  <li><strong>Lớp 3:</strong> Xác thực trích dẫn từ nguồn chính thức</li>
                </ul>
              </div>

              {/* Warning Banner */}
              <div className="ls-warning-banner">
                <AlertTriangle size={18} />
                <div>
                  <strong>⚠️ Lưu ý quan trọng:</strong> Câu trả lời được xác thực qua 3 lớp kiểm tra. Tuy nhiên, để có tư vấn chính thức, vui lòng tham khảo ý kiến của các chuyên gia pháp lý.
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, i) =>
              msg.role === 'user' ? (
                <div key={i} className="ls-msg-wrapper ls-msg-user" role="article" aria-label="Câu hỏi của bạn">
                  <div className="ls-bubble ls-bubble-user">{msg.text}</div>
                </div>
              ) : (
                <AiMessage key={i} message={msg} />
              )
            )
          )}

          {isLoading && (
            <div className="ls-msg-wrapper ls-msg-ai">
              <div className="ls-msg-avatar"><Bot size={16} /></div>
              <div className="ls-thinking">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="ls-error-bar">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Input */}
        <div className="ls-input-area">
          <div className="ls-input-wrapper">
            <Search size={16} className="ls-input-icon" />
            <textarea
              ref={inputRef}
              className="ls-textarea"
              placeholder="Đặt câu hỏi pháp lý... (Enter để gửi, Shift+Enter xuống dòng)"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              aria-label="Nhập câu hỏi pháp lý"
            />
            <button
              type="button"
              className="ls-send-btn"
              onClick={() => handleSend()}
              disabled={isLoading || !inputVal.trim()}
              aria-label="Gửi câu hỏi"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="ls-input-hint">
            Câu trả lời được trích dẫn từ văn bản pháp luật Việt Nam. Không thay thế tư vấn pháp lý chuyên nghiệp.
          </p>
        </div>
      </div>

      {/* Right: Quick prompts */}
      <aside className="ls-sidebar">
        <div className="ls-sidebar-header">
          <BookOpen size={15} />
          <span>Câu hỏi gợi ý</span>
        </div>

        <div className="ls-prompt-categories">
          {QUICK_PROMPTS.map((cat) => (
            <div key={cat.category} className="ls-prompt-group">
              <div className="ls-prompt-cat-label" style={{ color: cat.color }}>
                {cat.icon} {cat.category}
              </div>
              {cat.prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="ls-prompt-btn"
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="ls-sidebar-info">
          <div className="ls-info-title">Về tính năng này</div>
          <ul className="ls-info-list">
            <li>Trả lời dựa trên cơ sở dữ liệu luật Việt Nam</li>
            <li>Mỗi câu trả lời kèm trích dẫn điều luật</li>
            <li>Hiển thị độ tin cậy của câu trả lời</li>
            <li>Cảnh báo khi nội dung cần xác minh thêm</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
