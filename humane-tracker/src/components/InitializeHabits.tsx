import React, { useState } from 'react';
import { HabitService } from '../services/habitService';
import { DEFAULT_HABITS } from '../data/defaultHabits';
import './InitializeHabits.css';

const habitService = new HabitService();

interface InitializeHabitsProps {
  userId: string;
  onComplete: () => void;
}

export const InitializeHabits: React.FC<InitializeHabitsProps> = ({ userId, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const initializeDefaultHabits = async () => {
    setLoading(true);
    setProgress(0);
    
    try {
      const total = DEFAULT_HABITS.length;
      
      for (let i = 0; i < DEFAULT_HABITS.length; i++) {
        const habit = DEFAULT_HABITS[i];
        await habitService.createHabit({
          name: habit.name,
          category: habit.category,
          targetPerWeek: habit.targetPerWeek,
          userId
        });
        setProgress(Math.round(((i + 1) / total) * 100));
      }
      
      onComplete();
    } catch (error) {
      console.error('Error initializing habits:', error);
      alert('Failed to initialize habits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="initialize-habits">
      <div className="init-card">
        <h2>Welcome to Humane Tracker!</h2>
        <p>Would you like to start with the default habit set?</p>
        <p className="habit-count">{DEFAULT_HABITS.length} habits across 5 categories</p>
        
        <div className="categories-preview">
          <div className="category-item">
            <span className="category-dot" style={{ background: '#60a5fa' }}></span>
            Physical Mobility (9 habits)
          </div>
          <div className="category-item">
            <span className="category-dot" style={{ background: '#a855f7' }}></span>
            Family & Connections (3 habits)
          </div>
          <div className="category-item">
            <span className="category-dot" style={{ background: '#fbbf24' }}></span>
            Emotional Balance (2 habits)
          </div>
          <div className="category-item">
            <span className="category-dot" style={{ background: '#f472b6' }}></span>
            Joy (5 habits)
          </div>
          <div className="category-item">
            <span className="category-dot" style={{ background: '#34d399' }}></span>
            Physical Strength (8 habits)
          </div>
        </div>
        
        {loading && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}
        
        <div className="init-actions">
          <button 
            className="btn-skip" 
            onClick={onComplete}
            disabled={loading}
          >
            Skip for now
          </button>
          <button 
            className="btn-initialize" 
            onClick={initializeDefaultHabits}
            disabled={loading}
          >
            {loading ? 'Initializing...' : 'Initialize Default Habits'}
          </button>
        </div>
      </div>
    </div>
  );
};