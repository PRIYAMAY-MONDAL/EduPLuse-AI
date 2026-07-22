import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from './db';
import { supabase } from './supabaseClient';
import Login from './login';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';
import QuizPanel from './QuizPanel';
import FlashcardsPanel from './FlashcardsPanel';
import AnalyticsPanel from './AnalyticsPanel';

function escapeOutputMarkup(t) {
  if (!t) return '';
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function convertMarkdownShorthand(t) {
  if (!t) return '';
  let html = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>');
  html = html.replace(/^### (.*?)$/gm, '<h3 class="chat-h3">$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h4 class="chat-h4">$1</h4>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="chat-li">$1</li>');
  html = html.replace(/((?:<li class="chat-li">.*?<\/li>\s*)+)/gs, '<ul class="chat-ul">$1</ul>');
  html = html.replace(/\n{2,}/g, '</p><p class="chat-p">');
  
  if (!html.startsWith('<h') && !html.startsWith('<div') && !html.startsWith('<pre') && !html.startsWith('<ul')) {
    html = `<p class="chat-p">${html}</p>`;
  }
  return html;
}

const DEFAULT_FLASHCARDS = [
  { q: 'What is the primary architectural bottleneck in standard B-Trees?', a: 'Disk I/O operations structural bounds caused by deep hierarchy node traversals.' },
  { q: 'Explain the space complexity efficiency parameter of a Breadth-First Search (BFS) algorithm.', a: 'O(W) where W equals the maximum width of the architectural tree structure branch.' },
  { q: "How does 'Spaced Repetition' affect long-term structural retention of complex code paradigms?", a: 'It shifts tracking evaluations out sequentially to flatten the psychological forgetting curve.' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [chatInput, setChatInput] = useState('');
  
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const messages = useLiveQuery(() => localDB.messages.orderBy('timestamp').toArray()) || [];
  const onlineStatus = useLiveQuery(() => navigator.onLine);

  // ── Flashcards Subsystem ──
  const [flashcards, setFlashcards] = useState(DEFAULT_FLASHCARDS);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const navigateFlashcards = useCallback((direction) => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => {
        let next = prev + direction;
        if (next >= flashcards.length) next = 0;
        if (next < 0) next = flashcards.length - 1;
        return next;
      });
    }, 150);
  }, [flashcards.length]);

  // ── Exam Countdown Tracker & Editing Controls ──
  const [examTitle, setExamTitle] = useState(() => localStorage.getItem('edupulse_exam_title') || 'Time to Finals');
  const [examTargetTime, setExamTargetTime] = useState(() => parseInt(localStorage.getItem('edupulse_exam_target_time')) || (Date.now() + 14 * 24 * 60 * 60 * 1000));
  const [countdownStr, setCountdownStr] = useState('');
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [modalExamTitle, setModalExamTitle] = useState('');
  const [modalDatetime, setModalDatetime] = useState('');

  // ── Live Countdown Timer Calculation ──
  const updateCountdown = useCallback(() => {
    const delta = examTargetTime - Date.now();
    if (delta <= 0) { setCountdownStr('EXAM PERIOD ACTIVE'); return; }
    const d = Math.floor(delta / (1000 * 60 * 60 * 24));
    const h = Math.floor((delta % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((delta % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((delta % (1000 * 60)) / 1000);
    setCountdownStr(`${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
  }, [examTargetTime]);

  useEffect(() => {
    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [updateCountdown]);

  const handleOpenTimingModal = () => {
    setModalExamTitle(examTitle);
    const localIso = new Date(examTargetTime - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setModalDatetime(localIso);
    setShowTimingModal(true);
  };

  const handleSaveExamTiming = (e) => {
    e.preventDefault();
    const title = modalExamTitle.trim() || 'Time to Finals';
    if (!modalDatetime) return;

    const newTargetMs = new Date(modalDatetime).getTime();
    if (isNaN(newTargetMs)) return;

    setExamTitle(title);
    setExamTargetTime(newTargetMs);
    localStorage.setItem('edupulse_exam_title', title);
    localStorage.setItem('edupulse_exam_target_time', newTargetMs.toString());
    setShowTimingModal(false);
  };

  // ── Session Switcher & Supabase Integration ──
  const switchActiveSession = async (sessionId) => {
    if (!sessionId) return;
    setActiveSessionId(sessionId);
    await localDB.messages.clear();

    if (!navigator.onLine) return;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (!error && data) {
        for (const msg of data) {
          await localDB.messages.add({
            role: msg.role,
            text: msg.text,
            timestamp: msg.timestamp,
            synced: 1
          });
        }
      }
    } catch (e) { console.error(e); }
  };

  const createNewChatThread = async (studentEmail) => {
    const email = studentEmail || user?.email;
    if (!email) return;

    if (!navigator.onLine) {
      alert("Cannot build new chat tracks while working offline.");
      return;
    }

    try {
      const targetNumber = (sessions || []).length + 1;
      const defaultTitle = `Topic Track ${targetNumber}`;
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{ student_email: email, title: defaultTitle }])
        .select();

      if (!error && data && data.length > 0) {
        const newSession = data[0];
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        
        await localDB.messages.clear();
        await localDB.messages.add({
          role: 'assistant',
          text: `Initialized track context pipeline **"${defaultTitle}"**. Enter your prompt parameters below to begin!`,
          timestamp: Date.now(),
          synced: 1
        });
      }
    } catch (e) { console.error('Failed spinning session trace context:', e); }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!navigator.onLine) {
      alert("Online access required to clear cloud cluster storage instances.");
      return;
    }
    if (!confirm("Are you sure you want to permanently delete this conversation?")) return;

    try {
      const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId);
      if (!error) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(remainingSessions);
        
        if (activeSessionId === sessionId) {
          await localDB.messages.clear();
          if (remainingSessions.length > 0) {
            switchActiveSession(remainingSessions[0].id);
          } else {
            setActiveSessionId(null);
          }
        }
      }
    } catch (e) { console.error("Session removal fault:", e); }
  };

  const handleRenameSession = async (sessionId, newTitle) => {
    if (!newTitle.trim() || !navigator.onLine) return;
    try {
      const { error } = await supabase.from('chat_sessions').update({ title: newTitle.trim() }).eq('id', sessionId);
      if (!error) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle.trim() } : s));
      }
    } catch (e) { console.error("Rename operational failure:", e); }
  };

  const loadUserSessions = useCallback(async (studentEmail) => {
    if (!navigator.onLine || !studentEmail) return;
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('student_email', studentEmail)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSessions(data);
        if (data.length > 0 && !activeSessionId) {
          await switchActiveSession(data[0].id);
        } else if (data.length === 0) {
          await createNewChatThread(studentEmail);
        }
      }
    } catch (e) { console.error(e); }
  }, [activeSessionId]);

  useEffect(() => {
    if (user?.email) {
      loadUserSessions(user.email);
    }
  }, [user, loadUserSessions]);

  // ── Mock Exam Generator ──
  const launchMockExam = async () => {
    setActiveTab('chat');
    if (!activeSessionId) {
      alert("Please select or create an active chat session first.");
      return;
    }

    const systemPromptText = "Generate a challenging 3-question mock exam assessment strictly tailored to my course degree criteria. Present the questions clearly with numbered options, and highlight typical exam traps.";
    
    await localDB.messages.add({
      role: 'user',
      text: '📝 *Simulate Live Mock Exam*',
      timestamp: Date.now(),
      synced: navigator.onLine ? 1 : 0
    });

    if (navigator.onLine) {
      await supabase.from('chat_messages').insert([{
        session_id: activeSessionId,
        role: 'user',
        text: '📝 *Simulate Live Mock Exam*',
        timestamp: Date.now()
      }]);
    } else {
      return;
    }

    try {
      const response = await fetch('https://edu-p-luse-backend-ai.vercel.app/api/auth/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: systemPromptText,
          student_name: user?.name || 'Student',
          student_degree: user?.meta || 'Computer Science',
          history: []
        })
      });

      const data = await response.json();
      const aiResponse = response.ok ? data.response : `⚠️ Mock Exam Generation Failed.`;

      await localDB.messages.add({
        role: 'assistant',
        text: aiResponse,
        timestamp: Date.now(),
        synced: 1
      });

      if (navigator.onLine) {
        await supabase.from('chat_messages').insert([{
          session_id: activeSessionId,
          role: 'assistant',
          text: aiResponse,
          timestamp: Date.now()
        }]);
      }
    } catch (e) {
      console.error('Mock exam error:', e);
      await localDB.messages.add({
        role: 'assistant',
        text: '🚨 Server endpoint connection error while generating mock exam.',
        timestamp: Date.now(),
        synced: 0
      });
    }
  };

  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || !activeSessionId) return;

    await localDB.messages.add({ role: 'user', text, timestamp: Date.now(), synced: navigator.onLine ? 1 : 0 });
    setChatInput('');

    if (navigator.onLine) {
      await supabase.from('chat_messages').insert([{ session_id: activeSessionId, role: 'user', text, timestamp: Date.now() }]);
    } else {
      return;
    }

    try {
      const response = await fetch('https://edu-p-luse-backend-ai.vercel.app/api/auth/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          student_name: user?.name || 'Student',
          student_degree: user?.meta || 'Computer Science',
          history: messages.slice(-5)
        })
      });

      const data = await response.json();
      const aiResponse = response.ok ? data.response : `⚠️ Pipeline Error processing input configurations.`;

      await localDB.messages.add({ role: 'assistant', text: aiResponse, timestamp: Date.now(), synced: 1 });
      await supabase.from('chat_messages').insert([{ session_id: activeSessionId, role: 'assistant', text: aiResponse, timestamp: Date.now() }]);

      const currentActive = sessions.find(s => s.id === activeSessionId);
      if (currentActive && currentActive.title.startsWith('Topic Track')) {
        const cleanTitle = text.length > 20 ? text.substring(0, 20) + '...' : text;
        await handleRenameSession(activeSessionId, cleanTitle);
      }
    } catch {
      await localDB.messages.add({ role: 'assistant', text: '🚨 Server endpoint sync anomaly recorded.', timestamp: Date.now(), synced: 0 });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;
    setUploadedFiles((prev) => [...prev, file.name]);
  };

  if (!user) return <Login onAuthSuccess={setUser} />;

  return (
    <>
      <div className="app-container">
        <Sidebar 
          user={user} 
          examTitle={examTitle} 
          countdownStr={countdownStr} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          uploadedFiles={uploadedFiles}
          handleFileUpload={handleFileUpload}
          handleLogout={() => { setUser(null); setSessions([]); setActiveSessionId(null); localDB.messages.clear(); }} 
          setSidebarOpen={setSidebarOpen} 
          sidebarOpen={sidebarOpen}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSwitchSession={switchActiveSession}
          onCreateNewChat={() => createNewChatThread(user.email)}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
          openTimingModal={handleOpenTimingModal}
        />

        <main className="main-content">
          <section className={`tab-pane ${activeTab === 'chat' ? 'active' : ''}`}>
            <ChatPanel 
              messages={messages} chatInput={chatInput} setChatInput={setChatInput} 
              handleChatSubmit={handleChatSubmit} setSidebarOpen={setSidebarOpen} 
              convertMarkdownShorthand={convertMarkdownShorthand} 
              launchMockExam={launchMockExam}
            />
          </section>
          <section className={`tab-pane ${activeTab === 'quiz' ? 'active' : ''}`}>
            <QuizPanel setSidebarOpen={setSidebarOpen} user={user} uploadedFiles={uploadedFiles} />
          </section>
          <section className={`tab-pane ${activeTab === 'flashcards' ? 'active' : ''}`}>
            <FlashcardsPanel currentCard={flashcards[currentCardIndex] || { q: '', a: '' }} currentCardIndex={currentCardIndex} totalCards={flashcards.length} isFlipped={isFlipped} setIsFlipped={setIsFlipped} navigateFlashcards={navigateFlashcards} setSidebarOpen={setSidebarOpen} />
          </section>
          <section className={`tab-pane ${activeTab === 'analytics' ? 'active' : ''}`}>
            <AnalyticsPanel setSidebarOpen={setSidebarOpen} />
          </section>
        </main>
      </div>

      {/* ── Exam Target Date & Time Configuration Modal ── */}
      {showTimingModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '420px', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Configure Exam Target</h3>
              <button type="button" onClick={() => setShowTimingModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <form onSubmit={handleSaveExamTiming}>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Exam / Assessment Title</label>
                <input 
                  type="text" 
                  required 
                  value={modalExamTitle} 
                  onChange={e => setModalExamTitle(e.target.value)} 
                  style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Target Date &amp; Time</label>
                <input 
                  type="datetime-local" 
                  required 
                  value={modalDatetime} 
                  onChange={e => setModalDatetime(e.target.value)} 
                  style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>Quick Presets</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[1, 3, 7, 14, 30].map(days => (
                    <button 
                      type="button" 
                      key={days} 
                      onClick={() => {
                        const targetMs = Date.now() + days * 24 * 60 * 60 * 1000;
                        const localIso = new Date(targetMs - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                        setModalDatetime(localIso);
                      }}
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      +{days} {days === 7 ? 'Wk' : days === 30 ? 'Mo' : 'Days'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTimingModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}