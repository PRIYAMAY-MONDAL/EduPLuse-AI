import { useState } from 'react';

export default function Sidebar({ 
  user, 
  activeTab, 
  setActiveTab, 
  uploadedFiles, 
  handleFileUpload,
  handleLogout, 
  setSidebarOpen,
  sidebarOpen,
  sessions,
  activeSessionId,
  onSwitchSession,
  onCreateNewChat,
  onDeleteSession,
  onRenameSession,
  openTimingModal,
  countdownStr,
  examTitle
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const menuItems = [
    { id: 'chat', label: 'Study Assistant', icon: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' },
    { id: 'quiz', label: 'AI Quiz Lab', icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
    { id: 'flashcards', label: 'AI Flashcards', icon: 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z' },
    { id: 'analytics', label: 'Readiness Audit', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z' }
  ];

  const startInlineRename = (sess, e) => {
    e.stopPropagation();
    setEditingId(sess.id);
    setEditTitle(sess.title);
  };

  const commitInlineRename = (id) => {
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="logo">EduPulse <span>AI</span></div>
        <button className="hamburger-btn" onClick={() => setSidebarOpen(false)} style={{ display: 'block', fontSize: '1.5rem', color: 'var(--text-muted)' }}>&times;</button>
      </div>

      <div className="user-profile">
        <div className="avatar">{user?.name ? user.name.substring(0, 2).toUpperCase() : 'ST'}</div>
        <div className="user-info">
          <h4>{user?.name || 'Student'}</h4>
          <span className="status-badge">● Verified Profile</span>
        </div>
      </div>

      {countdownStr && (
        <div className="sidebar-widget" style={{ marginBottom: '1rem' }}>
          <div className="widget-header-row">
            <span className="widget-title" style={{ fontSize: '0.75rem' }}>{examTitle}</span>
            <button className="icon-btn" onClick={openTimingModal}>⚙️</button>
          </div>
          <div className="countdown-display" style={{ fontSize: '1rem', marginTop: '0.25rem' }}>{countdownStr}</div>
        </div>
      )}

      <nav className="sidebar-menu" style={{ marginBottom: '1rem' }}>
        {menuItems.map((item) => (
          <button key={item.id} className={`menu-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}>
            <svg className="icon" viewBox="0 0 24 24" style={{ marginRight: '8px' }}><path d={item.icon} /></svg>
            {item.label}
          </button>
        ))}
      </nav>

      {/* ── INTERACTIVE CHAT TUNNEL MANAGEMENT SYSTEM ── */}
      <div className="chat-history-hub" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '700' }}>Conversations</span>
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCreateNewChat(); }} 
            style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
          >
            ➕ New Chat
          </button>
        </div>
        
        <div className="sessions-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          {(sessions || []).map((sess) => (
            <div 
              key={sess.id} 
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)',
                backgroundColor: activeSessionId === sess.id ? 'var(--bg-tertiary)' : 'transparent',
                transition: 'all 0.15s ease'
              }}
            >
              {editingId === sess.id ? (
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => commitInlineRename(sess.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitInlineRename(sess.id); }}
                  autoFocus
                  style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--accent)', color: 'white', padding: '0.2rem 0.4rem', fontSize: '0.82rem', borderRadius: '4px' }}
                />
              ) : (
                <span 
                  onClick={() => { onSwitchSession(sess.id); setActiveTab('chat'); }}
                  onDoubleClick={(e) => startInlineRename(sess, e)}
                  style={{
                    flex: 1, textAlign: 'left', fontStyle: 'normal', fontSize: '0.82rem', cursor: 'pointer',
                    color: activeSessionId === sess.id ? 'var(--accent)' : 'var(--text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '0.5rem'
                  }}
                >
                  💬 {sess.title}
                </span>
              )}

              {/* Action Operations Control Tray */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {editingId !== sess.id && (
                  <button onClick={(e) => startInlineRename(sess, e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.75rem' }} title="Rename Track">
                    ✏️
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); onDeleteSession(sess.id); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.75rem' }} title="Delete Track">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="upload-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
        <h3>Context Materials</h3>
        <label className="upload-dropzone">
          <span>Upload Syllabus PDF</span>
          <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
        </label>
        <div className="uploaded-files-list">
          {(uploadedFiles || []).map((file, i) => <div className="file-item" key={i}><span>📄 {file}</span></div>)}
        </div>
      </div>

      <button className="btn btn-secondary btn-block logout-btn" style={{ marginTop: 'auto' }} onClick={handleLogout}>Sign Out</button>
    </aside>
  );
}