import Dexie from 'dexie';

// Instantiate the browser internal database node
export const localDB = new Dexie('EduPulseLocalStore');

// Map out the tables and primary indexing lookup hooks
localDB.version(2).stores({
  messages: '++id, role, text, timestamp, synced',
  quizzes: '++id, difficulty, topic, score, totalQuestions, timestamp, dateTimeStr'
});