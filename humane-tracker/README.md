# Humane Tracker

A habit tracking application with Firebase backend for tracking wellness goals across different categories.

**Live App:** https://humane-tracker.surge.sh
**GitHub:** https://github.com/idvorkin/humane-tracker-1

## Features

- Track habits across 5 categories: Movement & Mobility, Connections, Inner Balance, Joy & Play, Strength Building
- Weekly view with daily tracking
- Visual status indicators (due today, overdue, met target, etc.)
- Collapsible sections for better organization
- Real-time sync with Firebase
- Click cells to mark habits as complete, partial, or add counts

## Setup

1. **Configure Firebase:**

   - Create a new Firebase project at https://console.firebase.google.com
   - Enable Firestore Database
   - Enable Anonymous Authentication
   - Copy your Firebase config

2. **Set up environment variables:**

   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration values

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

## Firebase Firestore Structure

The app uses two main collections:

### `habits` collection

```javascript
{
  id: string,
  name: string,
  category: 'mobility' | 'connection' | 'balance' | 'joy' | 'strength',
  targetPerWeek: number,
  userId: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `entries` collection

```javascript
{
  id: string,
  habitId: string,
  userId: string,
  date: Timestamp,
  value: number, // 1 for complete, 0.5 for partial, or actual count
  notes?: string,
  createdAt: Timestamp
}
```

## Usage

- **Add Habit:** Click the "+ Add Habit" button to create a new habit
- **Track Progress:** Click on any day cell to mark it complete (✓), partial (½), or clear it
- **View Sections:** Click section headers to expand/collapse categories
- **Status Indicators:**
  - ● = done today
  - ✓ = weekly target met
  - ⏰ = due today
  - → = due tomorrow
  - ! = overdue
  - ½ = partial completion

## Development

```bash
# Run development server
npm start

# Build for production
npm run build

# Run tests
npm test
```
