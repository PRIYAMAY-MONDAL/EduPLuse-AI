import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from './db';
import { AlertTriangle, CheckCircle2, BookOpen, Clock, Trash2 } from 'lucide-react';

export default function AnalyticsPanel({ setSidebarOpen }) {
  // ── Real-Time Aggregate Data Queries ──
  const quizzes = useLiveQuery(() => localDB.quizzes.orderBy('timestamp').reverse().toArray()) || [];

  const totalAttempts = quizzes.length;
  
  const averageAccuracy = totalAttempts > 0 
    ? Math.round((quizzes.reduce((acc, q) => acc + (q.score / q.totalQuestions), 0) / totalAttempts) * 100) 
    : 0;

  const totalCorrectAnswers = quizzes.reduce((acc, q) => acc + q.score, 0);
  const totalQuestionsAnswered = quizzes.reduce((acc, q) => acc + q.totalQuestions, 0);

  // Group items to identify module failures
  const topicBreakdown = quizzes.reduce((acc, quiz) => {
    if (!acc[quiz.topic]) {
      acc[quiz.topic] = { topic: quiz.topic, correct: 0, total: 0 };
    }
    acc[quiz.topic].correct += quiz.score;
    acc[quiz.topic].total += quiz.totalQuestions;
    return acc;
  }, {});

  const sortedTopics = Object.values(topicBreakdown).map(t => ({
    ...t,
    percentage: Math.round((t.correct / t.total) * 100)
  })).sort((a, b) => a.percentage - b.percentage);

  const criticalWeaknesses = sortedTopics.filter(t => t.percentage < 70);

  const clearAnalyticsLog = async () => {
    if (confirm("Reset all historical evaluation attempt indices? This operation cannot be reversed.")) {
      await localDB.quizzes.clear();
    }
  };

  return (
    <div className="quiz-workspace" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <header className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2>Dynamic Readiness Audit</h2>
          <p className="subtitle">Real-time aggregate competence indexes compiled from local lab metrics.</p>
        </div>
        {totalAttempts > 0 && (
          <button className="btn btn-secondary" onClick={clearAnalyticsLog} style={{ display: 'flex', gap: '0.4rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', alignItems: 'center', cursor: 'pointer' }}>
            <Trash2 size={16} /> Reset Log
          </button>
        )}
      </header>

      {totalAttempts === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <BookOpen size={48} style={{ color: 'var(--text-dim)', marginBottom: '1rem', marginInline: 'auto' }} />
          <h3>No Assessment Profiles Found</h3>
          <p className="subtitle" style={{ maxWidth: '420px', margin: '0.5rem auto 1.5rem' }}>
            Complete mock examinations or AI Quiz sessions to generate tracking metrics.
          </p>
        </div>
      ) : (
        <>
          {/* Top Row Grid Metrics panels */}
          <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="card status-card blue" style={{ padding: '1.5rem' }}>
              <h3>Cumulative Accuracy</h3>
              <div className="big-stat" style={{ color: averageAccuracy >= 70 ? 'var(--success)' : 'var(--warning)' }}>{averageAccuracy}%</div>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> {totalCorrectAnswers} / {totalQuestionsAnswered} items validated.
              </p>
            </div>

            <div className="card status-card green" style={{ padding: '1.5rem' }}>
              <h3>Lab Run Instances</h3>
              <div className="big-stat" style={{ color: 'var(--accent)' }}>{totalAttempts}</div>
              <p style={{ marginTop: '0.5rem' }}>Total unique evaluations compiled.</p>
            </div>

            <div className="card status-card" style={{ padding: '1.5rem', borderTop: '3px solid var(--warning)', background: 'linear-gradient(to bottom, rgba(245, 158, 11, 0.02), var(--bg-secondary))' }}>
              <h3>Risk Advisory State</h3>
              {criticalWeaknesses.length > 0 ? (
                <div>
                  <div className="big-stat" style={{ color: 'var(--warning)', fontSize: '1.8rem', margin: '0.4rem 0' }}>REVIEW NEEDED</div>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
                    <AlertTriangle size={14} style={{ color: 'var(--warning)' }} /> Attention requested on {criticalWeaknesses.length} topic pools.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="big-stat" style={{ color: 'var(--success)', fontSize: '1.8rem', margin: '0.4rem 0' }}>STABLE</div>
                  <p style={{ color: 'var(--text-muted)' }}>Comprehension boundary constraints cleared.</p>
                </div>
              )}
            </div>
          </div>

          {/* Middle Competence Progress Bars */}
          <div className="card tracker-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '1.25rem', fontWeight: '600' }}>Subject Module Target Tracking Matrix</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {sortedTopics.map((topicNode, idx) => (
                <div className="tracker-item" key={idx} style={{ marginBottom: 0 }}>
                  <div className="tracker-meta" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: '500' }}>📚 {topicNode.topic}</span>
                    <span style={{ color: topicNode.percentage >= 70 ? 'var(--success)' : 'var(--warning)', fontWeight: '600' }}>
                      {topicNode.percentage}% Accuracy ({topicNode.correct}/{topicNode.total})
                    </span>
                  </div>
                  <div className="progress-bar-bg" style={{ backgroundColor: 'var(--bg-primary)', height: '8px', borderRadius: '4px' }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${topicNode.percentage}%`, 
                        background: topicNode.percentage >= 70 
                          ? 'linear-gradient(90deg, var(--success), #34d399)' 
                          : 'linear-gradient(90deg, var(--danger), var(--warning))' 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Grid Data Table history logs */}
          <div className="card table-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '1rem', fontWeight: '600' }}>Chronological Assessment History Log</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                    <th>Module / Sub-Concept</th>
                    <th>Difficulty</th>
                    <th style={{ textAlign: 'right', paddingRight: '1rem' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map((quiz) => {
                    const pct = Math.round((quiz.score / quiz.totalQuestions) * 100);
                    return (
                      <tr key={quiz.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={12} /> {quiz.dateTimeStr || new Date(quiz.timestamp).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: '500' }}>{quiz.topic}</td>
                        <td>
                          <span className={`badge ${quiz.difficulty === 'Hard' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                            {quiz.difficulty}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '1rem', fontWeight: '700', color: pct >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                          {quiz.score} / {quiz.totalQuestions} ({pct}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}