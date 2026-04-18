import React, { useState } from 'react';
import { Bot, Send, Search, FileText, LayoutList, PanelRightClose, PanelRightOpen } from 'lucide-react';
import Modal from './Modal';
import { fetchWithAuth } from '../utils/fetchWithAuth.js';
import './chat.css';

const normalizeAiMessage = (data) => {
   if (data && typeof data === 'object') {
      const answer = data.answer || data.summary || 'Xin lỗi, quá trình truy vấn gặp lỗi.';
      const citations = Array.isArray(data.citations) ? data.citations : [];
       const riskScore = typeof data.risk_score === 'number' ? data.risk_score : null;

       return {
          text: answer,
          citations,
          riskScore,
          confidence: typeof data.confidence === 'number' ? data.confidence : null,
          warnings: Array.isArray(data.warnings) ? data.warnings : [],
       };
   }

   return {
      text: data || 'Xin lỗi, quá trình truy vấn gặp lỗi.',
      citations: [],
      riskScore: null,
      confidence: null,
      warnings: [],
   };
};

export default function ChatPanel() {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
   const [collapsed, setCollapsed] = useState(false);
  
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const showAlert = (msg) => {
      setAlertMsg(msg);
      setAlertOpen(true);
  };

  const handleSend = async (textOveride) => {
    const textToSend = textOveride || inputVal;
    if(!textToSend.trim()) {
        showAlert('Vui lòng nhập câu hỏi pháp lý!');
        return;
    }

    const unewMsg = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, unewMsg]);
    setIsLoading(true);
    setInputVal('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      
      const res = await fetchWithAuth(`${apiUrl}/v1/legal/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: unewMsg.text })
      });
      const data = await res.json();

         if (!res.ok) {
            throw new Error(data.error || 'Không thể gọi API tư vấn pháp lý.');
         }
      
         setMessages(prev => [...prev, { sender: 'ai', ...normalizeAiMessage(data) }]);
      } catch {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Mất kết nối với Backend Server!' }]);
      showAlert('Kết nối mạng gặp vấn đề. Vui lòng bật Server Port 8080.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className={`chat-right-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="chat-panel-header">
         <div className="title">
             <Bot size={20} color="#8b5cf6"/> 
             Trợ lý Pháp lý Agent
         </div>
             <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#94a3b8'}}>
            <div className="status-pulse"></div> Trực tuyến
                  <button
                     type="button"
                     className="chat-toggle-btn"
                     aria-label={collapsed ? 'Mở rộng chat panel' : 'Thu gọn chat panel'}
                     onClick={() => setCollapsed((prev) => !prev)}
                  >
                     {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
                  </button>
         </div>
      </div>

         {!collapsed && <div className="chat-panel-body">
            <div className="chat-sr-live" aria-live="polite" aria-atomic="true">
               {isLoading ? 'Trợ lý đang trả lời' : `Đã có ${messages.length} tin nhắn`}
            </div>
        {messages.length === 0 ? (
           <>
              <div className="welcome-msg">
                 <div style={{display: 'flex', justifyContent: 'center', marginBottom: 15}}><ScaleIcon /></div>
                 <h3>Xin chào! 👋</h3>
                 <p>Tôi có thể giúp bạn tra cứu luật, rà soát hợp đồng, soạn văn bản pháp lý.</p>
              </div>
              
              <div className="chip-container">
                 <button type="button" className="prompt-chip" onClick={() => handleSend("Phân tích hợp đồng lao động")}>
                    <FileText size={16} color="#ef4444"/> Phân tích hợp đồng lao động
                 </button>
                 <button type="button" className="prompt-chip" onClick={() => handleSend("Tra cứu quy định nghỉ phép")}>
                    <Search size={16} color="#3b82f6"/> Tra cứu quy định nghỉ phép
                 </button>
                 <button type="button" className="prompt-chip" onClick={() => handleSend("Lập hồ sơ hợp đồng")}>
                    <LayoutList size={16} color="#8b5cf6"/> Lập hồ sơ hợp đồng
                 </button>
              </div>
           </>
        ) : (
                <div className="chat-feed" role="log" aria-live="polite" aria-relevant="additions text">
                   {messages.map((m, idx) => (
                   <div key={idx} className={`chat-bubble-wrapper ${m.sender}`} role="article" aria-label={m.sender === 'ai' ? 'Tin nhắn trợ lý' : 'Tin nhắn người dùng'}>
                <div className={`chat-bubble ${m.sender}`}>
                  <div>{m.text}</div>
                  {m.sender === 'ai' && (m.riskScore !== null || m.citations.length > 0 || m.confidence !== null || m.warnings.length > 0) && (
                    <div className="chat-meta">
                      {m.riskScore !== null && <div className="chat-meta-line">Risk score: {m.riskScore}/100</div>}
                      {m.confidence !== null && <div className="chat-meta-line">Confidence: {Math.round(m.confidence * 100)}%</div>}
                      {m.citations.length > 0 && (
                        <div className="chat-citations">
                          {m.citations.map((item, citationIdx) => (
                            <span key={`${idx}-${citationIdx}`} className="citation-pill">
                                             {item.law_title
                                                ? `${item.law_title}${item.article ? ` · ${item.article}` : ''}`
                                                : (item.article || item.source || 'source')}
                            </span>
                          ))}
                        </div>
                      )}
                      {m.warnings.length > 0 && (
                        <div className="chat-meta-line chat-warning">{m.warnings.join(' • ')}</div>
                      )}
                    </div>
                  )}
                </div>
             </div>
           ))}
           </div>
        )}
        
        {isLoading && <div className="chat-bubble-wrapper ai"><div className="chat-bubble ai">Đang suy nghĩ...</div></div>}
         </div>}

         {!collapsed && <div className="input-dock">
         <div className="input-wrapper">
             <input 
                type="text" 
                placeholder="Hỏi bất kỳ câu hỏi pháp lý nào..." 
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             />
             <button type="button" className="send-btn" aria-label="Gửi câu hỏi pháp lý" onClick={() => handleSend()}>
                <Send size={18} color="#8b5cf6" />
             </button>
         </div>
        </div>}

      <Modal isOpen={alertOpen} title="Hệ thống" message={alertMsg} onConfirm={() => setAlertOpen(false)} />
    </div>
  );
}

   function ScaleIcon() {
      return (
         <div style={{background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: '50%'}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v17"></path><path d="M5 8h14"></path><path d="M5 8v6"></path><path d="M19 8v6"></path><path d="M2.5 15h5"></path><path d="M16.5 15h5"></path><path d="M7 15l-2.5 5"></path><path d="M17 15l2.5 5"></path><path d="M4 20h3"></path><path d="M17 20h3"></path><path d="M10 20h4"></path></svg>
         </div>
      );
   }
