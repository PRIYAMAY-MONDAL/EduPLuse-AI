import { useRef, useEffect } from 'react';

export default function ChatPanel({ 
  messages, 
  chatInput, 
  setChatInput, 
  handleChatSubmit, 
  launchMockExam, 
  setSidebarOpen, 
  convertMarkdownShorthand
}) {
  const chatMessagesRef = useRef(null);

  // Automatically scroll the chat container to the bottom whenever a new message is appended
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-workspace" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <header className="content-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
            <svg className="icon" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>
          </button>
          <div>
            <h2>Core AI Study Engine</h2>
            <p className="subtitle">Interrogate document models, ask technical edge cases, or trigger micro-quizzes.</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={launchMockExam}>Simulate Mock Exam</button>
        </div>
      </header>

      {/* Message Output Workspace Container */}
      <div className="messages-container" ref={chatMessagesRef} style={{ flex: 1, overflowY: 'auto' }}>
        {messages.map((msg, i) => (
          <div className={`message ${msg.role}`} key={i}>
            {msg.role === 'assistant' ? (
              /* The assistant sends structural markdown formatting requiring safe parsing */
              <div
                className="msg-bubble"
                dangerouslySetInnerHTML={{
                  __html: convertMarkdownShorthand(msg.text),
                }}
              />
            ) : (
              /* User text inputs are securely isolated as plain text strings to block code execution scripts */
              <div className="msg-bubble">
                {msg.text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Transactional Query Input Form Area */}
      <div className="chat-input-area">
        <form className="chat-form" onSubmit={handleChatSubmit}>
          <input
            type="text"
            className="chat-input"
            placeholder="Ask structural or procedural concepts from your notes..."
            autoComplete="off"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            <svg className="icon inline" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </form>
      </div>
    </div>
  );
}