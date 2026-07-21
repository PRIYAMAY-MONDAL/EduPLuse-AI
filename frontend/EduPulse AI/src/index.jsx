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
  { q: 'What is the primary architectural bottleneck in standard B-Trees?', a: 'Disk I/O operations structural bounds caused by deep hierarchy node traversals.' }
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

  const [examTitle, setExamTitle] = useState(() => localStorage.getItem('edupulse_exam_title') || 'Time to Finals');
  const [examTargetTime, setExamTargetTime] = useState(() => parseInt(localStorage.getItem('edupulse_exam_target_time')) || (Date.now() + 14 * 24 * 60 * 60 * 1000));
  const [countdownStr, setCountdownStr] = useState('');
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [modalExamTitle, setModalExamTitle] = useState('');

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

  // ── Target Feature: Delete Individual Chat Session Matrix ──
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

  // ── Target Feature: Rename Individual Chat Session Module ──
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
      const response = await fetch('http://127.0.0.1:8000/api/auth/chat/', {
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
          openTimingModal={() => setShowTimingModal(true)}
        />

        <main className="main-content">
          <section className={`tab-pane ${activeTab === 'chat' ? 'active' : ''}`}>
            <ChatPanel 
              messages={messages} chatInput={chatInput} setChatInput={setChatInput} 
              handleChatSubmit={handleChatSubmit} setSidebarOpen={setSidebarOpen} 
              convertMarkdownShorthand={convertMarkdownShorthand} 
            />
          </section>
          <section className={`tab-pane ${activeTab === 'quiz' ? 'active' : ''}`}>
            <QuizPanel setSidebarOpen={setSidebarOpen} user={user} uploadedFiles={uploadedFiles} />
          </section>
          <section className={`tab-pane ${activeTab === 'flashcards' ? 'active' : ''}`}>
            <FlashcardsPanel currentCard={flashcards[currentCardIndex] || { q: '', a: '' }} currentCardIndex={currentCardIndex} totalCards={flashcards.length} isFlipped={isFlipped} setIsFlipped={setIsFlipped} navigateFlashcards={navigateFlashcards} setSidebarOpen={setSidebarOpen} />
          </section>
          <section className={`tab-pane ${activeTab === 'analytics' ? 'active' : ''}`}>
            <AnalyticsPanel setSidebarOpen={setSidebarOpen} /> {/* Dexie useLiveQuery hooks handle internal logic automatically */}
          </section>
        </main>
      </div>
    </>
  );
}