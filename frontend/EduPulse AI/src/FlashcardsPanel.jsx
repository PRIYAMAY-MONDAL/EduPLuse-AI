export default function FlashcardsPanel({ 
  currentCard, 
  currentCardIndex, 
  totalCards, 
  isFlipped, 
  setIsFlipped, 
  navigateFlashcards, 
  setSidebarOpen 
}) {
  return (
    <div className="flashcards-workspace" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="content-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
            <svg className="icon" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" /></svg>
          </button>
          <div>
            <h2>Active Recall Flashcards</h2>
            <p className="subtitle">AI-generated flashcards from your uploaded files designed for spaced repetition.</p>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
        <div className="flashcard-container">
          <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
            <div className="card-face card-front">
              <span className="card-category">Core Concepts</span>
              <p>{currentCard.q}</p>
              <span className="hint-tap">Click Card to Flip</span>
            </div>
            <div className="card-face card-back">
              <span className="card-category">Verification Answer</span>
              <p>{currentCard.a}</p>
              <span className="hint-tap">Click Card to Flip Back</span>
            </div>
          </div>
        </div>

        <div className="flashcard-controls">
          <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); navigateFlashcards(-1); }}>&larr; Previous</button>
          <span>Card {currentCardIndex + 1} / {totalCards}</span>
          <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); navigateFlashcards(1); }}>Next Card &rarr;</button>
        </div>
      </div>
    </div>
  );
}