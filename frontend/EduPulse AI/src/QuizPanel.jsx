import { useState, useEffect } from 'react';
import { localDB } from './db';

export default function QuizPanel({ setSidebarOpen, user, uploadedFiles }) {
  // Config parameters
  const [numQuestions, setNumQuestions] = useState(5);
  const [numOptions, setNumOptions] = useState(4);
  const [difficulty, setDifficulty] = useState('Medium');
  
  // App engine states: 'setup' | 'loading' | 'active' | 'results'
  const [quizState, setQuizState] = useState('setup');
  const [quizData, setQuizData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [studentAnswers, setStudentAnswers] = useState({}); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [wrongTopics, setWrongTopics] = useState([]);
  const [score, setScore] = useState(0);

  const calculateBaseTime = () => {
    if (difficulty === 'Easy') return 45;
    if (difficulty === 'Medium') return 30;
    return 15;
  };

  useEffect(() => {
    if (quizState !== 'active' || timeLeft <= 0) {
      if (timeLeft === 0 && quizState === 'active') handleNextSubmission(true);
      return;
    }
    const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timerId);
  }, [timeLeft, quizState]);

  const handleStartQuiz = async () => {
    setQuizState('loading');
    try {
      const response = await fetch('https://edu-p-luse-backend-ai.vercel.app/api/auth/generate-quiz/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: user?.meta || 'Computer Science',
          num_questions: numQuestions,
          num_options: numOptions,
          difficulty: difficulty,
          files: uploadedFiles
        })
      });
      const data = await response.json();
      if (response.ok && data.questions) {
        setQuizData(data.questions);
        setCurrentIndex(0);
        setStudentAnswers({});
        setSelectedAnswer('');
        setTimeLeft(calculateBaseTime());
        setQuizState('active');
      } else {
        alert('Engine mapping rejected. Verify terminal bounds.');
        setQuizState('setup');
      }
    } catch (e) {
      alert('Error fetching quiz from Django backend.');
      setQuizState('setup');
    }
  };

  const handleNextSubmission = (isTimeout = false) => {
    const currentQ = quizData[currentIndex];
    const finalAnswer = isTimeout ? 'NO_ANSWER_TIMEOUT' : selectedAnswer;
    
    setStudentAnswers(prev => ({ ...prev, [currentQ.id]: finalAnswer }));

    if (currentIndex + 1 < quizData.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer('');
      setTimeLeft(calculateBaseTime());
    } else {
      processExamResults({ ...studentAnswers, [currentQ.id]: finalAnswer });
    }
  };

  const processExamResults = async (finalAnswers) => {
    let correctCount = 0;
    const missedTopics = [];

    quizData.forEach(q => {
      if (finalAnswers[q.id] === q.correct_answer) {
        correctCount++;
      } else {
        if (!missedTopics.includes(q.topic)) missedTopics.push(q.topic);
      }
    });

    // Extract small clean topic text
    const rawTopic = quizData[0]?.topic || 'General Concepts';
    const shortenedTopic = rawTopic.length > 25 ? rawTopic.substring(0, 25) + '...' : rawTopic;

    const currentTimestamp = Date.now();
    const formattedDateStr = new Date(currentTimestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Commit completely parsed evaluation metric into localDB
    await localDB.quizzes.add({
      difficulty: difficulty,
      topic: shortenedTopic,
      score: correctCount,
      totalQuestions: quizData.length,
      timestamp: currentTimestamp,
      dateTimeStr: formattedDateStr
    });

    setScore(correctCount);
    setWrongTopics(missedTopics);
    setQuizState('results');
  };

  if (quizState === 'setup') {
    return (
      <div className="quiz-workspace" style={{ padding: '2rem' }}>
        <header className="content-header" style={{ marginBottom: '2rem' }}>
          <h2>Custom AI Quiz Generator</h2>
          <p className="subtitle">Configure parameters to stress-test conceptual retention limits.</p>
        </header>
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
          <div className="input-group">
            <label>Question Quantity</label>
            <input type="number" min="3" max="15" value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value))} />
          </div>
          <div className="input-group">
            <label>Option Range</label>
            <select value={numOptions} onChange={e => setNumOptions(parseInt(e.target.value))}>
              <option value="2">2 (True / False Paradigm)</option>
              <option value="4">4 (Standard Quad Multiple Choice)</option>
            </select>
          </div>
          <div className="input-group">
            <label>Target Difficulty Matrix</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="Easy">Easy (45s per item)</option>
              <option value="Medium">Medium (30s per item)</option>
              <option value="Hard">Hard (15s rush limits)</option>
            </select>
          </div>
          <button className="btn btn-primary btn-block" onClick={handleStartQuiz} style={{ marginTop: '1.5rem' }}>
            Compile & Launch Quiz Engine
          </button>
        </div>
      </div>
    );
  }

  if (quizState === 'loading') {
    return (
      <div className="quiz-workspace text-center" style={{ padding: '5rem', textAlign: 'center' }}>
        <div className="logo" style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite' }}>EduPulse <span>AI Parsing...</span></div>
        <p className="subtitle" style={{ marginTop: '1rem' }}>Extracting core syllabus entities and forging assessment metrics.</p>
      </div>
    );
  }

  if (quizState === 'active') {
    const currentQ = quizData[currentIndex];
    return (
      <div className="quiz-workspace" style={{ padding: '2rem' }}>
        <header className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Question {currentIndex + 1} of {quizData.length}</h2>
            <span className="badge badge-warning" style={{ backgroundColor: 'var(--bg-primary)' }}>Topic: {currentQ.topic}</span>
          </div>
          <div className="countdown-display" style={{ fontSize: '1.5rem', color: timeLeft < 10 ? 'var(--danger)' : 'var(--warning)' }}>
            ⏱️ {timeLeft}s Left
          </div>
        </header>

        <div className="card" style={{ marginTop: '2rem', padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', lineHeight: '1.4' }}>{currentQ.question}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {currentQ.options.map((opt, i) => (
              <label key={i} className="menu-item" style={{
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                backgroundColor: selectedAnswer === opt ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                border: selectedAnswer === opt ? '1px solid var(--accent)' : '1px solid var(--border)',
                cursor: 'pointer', borderRadius: 'var(--radius)'
              }}>
                <input type="radio" name="options" value={opt} checked={selectedAnswer === opt} 
                  onChange={() => setSelectedAnswer(opt)} style={{ accentColor: 'var(--accent)' }} />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => handleNextSubmission(false)} disabled={!selectedAnswer}
            style={{ marginTop: '2rem', alignSelf: 'flex-end', marginLeft: 'auto', display: 'block' }}>
            {currentIndex + 1 === quizData.length ? 'Finish Evaluation' : 'Submit & Next Question →'}
          </button>
        </div>
      </div>
    );
  }

  if (quizState === 'results') {
    const percentage = Math.round((score / quizData.length) * 100);
    return (
      <div className="quiz-workspace" style={{ padding: '2rem', overflowY: 'auto' }}>
        <header className="content-header">
          <h2>Evaluation Complete</h2>
          <p className="subtitle">Performance results saved to active session index sheets.</p>
        </header>

        <div className="analytics-grid" style={{ marginTop: '2rem' }}>
          <div className="card status-card" style={{ borderTop: percentage >= 70 ? '4px solid var(--success)' : '4px solid var(--danger)' }}>
            <h3>Calculated Accuracy Score</h3>
            <div className="big-stat">{percentage}%</div>
            <p>Validated {score} items correctly out of {quizData.length} instances.</p>
          </div>

          <div className="card status-card blue">
            <h3>AI Focus Recommendation</h3>
            {wrongTopics.length === 0 ? (
              <p style={{ color: 'var(--success)', marginTop: '1rem', fontWeight: '600' }}>🎖️ Perfect structural mastery verified across all items!</p>
            ) : (
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Target these specific modules in chat:</p>
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', color: 'var(--warning)' }}>
                  {wrongTopics.map((topic, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{topic}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        <button className="btn btn-secondary" onClick={() => setQuizState('setup')} style={{ marginTop: '1.5rem', marginInline: 'auto', display: 'block' }}>
          Return to Setup Console
        </button>
      </div>
    );
  }
}