import React, { useState } from 'react';
import { HabitService } from '../services/habitService';
import { HabitCategory } from '../types/habit';
import './HabitManager.css';

const habitService = new HabitService();

interface HabitManagerProps {
  userId: string;
  onClose: () => void;
}

export const HabitManager: React.FC<HabitManagerProps> = ({ userId, onClose }) => {
  const [habitName, setHabitName] = useState('');
  const [category, setCategory] = useState<HabitCategory>('mobility');
  const [targetPerWeek, setTargetPerWeek] = useState(3);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    setLoading(true);
    try {
      await habitService.createHabit({
        name: habitName,
        category,
        targetPerWeek,
        userId
      });
      setHabitName('');
      setTargetPerWeek(3);
      onClose();
    } catch (error) {
      console.error('Error creating habit:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="habit-manager-overlay">
      <div className="habit-manager-modal">
        <div className="modal-header">
          <h2>Add New Habit</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="habitName">Habit Name</label>
            <input
              id="habitName"
              type="text"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              placeholder="e.g., Morning Meditation"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as HabitCategory)}
            >
              <option value="mobility">Movement & Mobility</option>
              <option value="connection">Connections</option>
              <option value="balance">Inner Balance</option>
              <option value="joy">Joy & Play</option>
              <option value="strength">Strength Building</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="target">Target per Week</label>
            <input
              id="target"
              type="number"
              min="1"
              max="7"
              value={targetPerWeek}
              onChange={(e) => setTargetPerWeek(parseInt(e.target.value))}
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};