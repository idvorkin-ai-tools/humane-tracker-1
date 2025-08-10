import { HabitCategory } from '../types/habit';

export interface DefaultHabit {
  name: string;
  category: HabitCategory;
  targetPerWeek: number;
}

export const DEFAULT_HABITS: DefaultHabit[] = [
  // Physical Mobility
  { name: 'Physical Mobility', category: 'mobility', targetPerWeek: 5 },
  { name: 'Back Twists', category: 'mobility', targetPerWeek: 3 },
  { name: 'Shin Boxes', category: 'mobility', targetPerWeek: 3 },
  { name: 'Shoulder Ys', category: 'mobility', targetPerWeek: 2 },
  { name: 'Side Planks', category: 'mobility', targetPerWeek: 2 },
  { name: 'Wall slides', category: 'mobility', targetPerWeek: 2 },
  { name: 'Heavy Clubs 3x10', category: 'mobility', targetPerWeek: 2 },
  { name: 'Half Lotus', category: 'mobility', targetPerWeek: 2 },
  { name: 'Biking', category: 'mobility', targetPerWeek: 2 },
  
  // Family (Connections)
  { name: 'Tori Act Of Service', category: 'connection', targetPerWeek: 2 },
  { name: 'Zach Time', category: 'connection', targetPerWeek: 2 },
  { name: 'Amelia Time', category: 'connection', targetPerWeek: 2 },
  
  // Emotional Habits (Inner Balance)
  { name: 'Cult Meditate', category: 'balance', targetPerWeek: 3 },
  { name: 'Box Breathing', category: 'balance', targetPerWeek: 3 },
  
  // Joy
  { name: 'Juggling', category: 'joy', targetPerWeek: 2 },
  { name: 'Publish Reel', category: 'joy', targetPerWeek: 2 },
  { name: 'Magic Practice', category: 'joy', targetPerWeek: 3 },
  { name: 'Magic Trick for Other', category: 'joy', targetPerWeek: 1 },
  { name: 'Daily Selfie', category: 'joy', targetPerWeek: 7 },
  
  // Physical Strength
  { name: 'TGU 28KG', category: 'strength', targetPerWeek: 2 },
  { name: 'TGU 32KG', category: 'strength', targetPerWeek: 1 },
  { name: '1H Swings - 28 KG', category: 'strength', targetPerWeek: 2 },
  { name: '1H Swings - 32 KG', category: 'strength', targetPerWeek: 1 },
  { name: 'Pistols', category: 'strength', targetPerWeek: 2 },
  { name: 'L-Sit Hangs', category: 'strength', targetPerWeek: 2 },
  { name: 'Pull Ups', category: 'strength', targetPerWeek: 3 },
  { name: 'Kettlebility Class3e/6e', category: 'strength', targetPerWeek: 2 },
];