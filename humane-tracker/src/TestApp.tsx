import React from 'react';
import { HabitTracker } from './components/HabitTracker';
import './App.css';

function TestApp() {
  // Use mock mode - no authentication required
  return (
    <div className="App">
      <div className="app-header">
        <div className="user-info">
          <span className="user-name">Test Mode (No Auth Required)</span>
        </div>
      </div>
      <HabitTracker userId="mock-user" />
    </div>
  );
}

export default TestApp;