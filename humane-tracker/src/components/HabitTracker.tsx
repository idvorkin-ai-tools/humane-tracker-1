import React, { useState, useEffect, useRef } from 'react';
import { HabitWithStatus, CategorySection, SummaryStats } from '../types/habit';
import { HabitService } from '../services/habitService';
import { HabitManager } from './HabitManager';
import { InitializeHabits } from './InitializeHabits';
import { CleanupDuplicates } from './CleanupDuplicates';
import { DEFAULT_HABITS } from '../data/defaultHabits';
import { format, addDays, isYesterday, isToday } from 'date-fns';
import './HabitTracker.css';

const habitService = new HabitService();

const CATEGORIES: { [key: string]: { name: string; color: string } } = {
  mobility: { name: 'Movement & Mobility', color: '#60a5fa' },
  connection: { name: 'Connections', color: '#a855f7' },
  balance: { name: 'Inner Balance', color: '#fbbf24' },
  joy: { name: 'Joy & Play', color: '#f472b6' },
  strength: { name: 'Strength Building', color: '#34d399' }
};

export const HabitTracker: React.FC<{ userId: string }> = ({ userId }) => {
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [sections, setSections] = useState<CategorySection[]>([]);
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [showHabitManager, setShowHabitManager] = useState(false);
  const [showInitializer, setShowInitializer] = useState(false);
  const [showCleanup, setShowCleanup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const collapsedSectionsRef = useRef<Set<string>>(new Set(['balance', 'joy']));
  const useMockMode = !userId || userId === 'mock-user';
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    dueToday: 0,
    overdue: 0,
    doneToday: 0,
    onTrack: 0
  });

  useEffect(() => {
    // Reset state when mode changes
    setHabits([]);
    setSections([]);
    
    // Set up trailing 7 days (today and previous 6 days)
    const today = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      dates.push(addDays(today, -i));
    }
    setWeekDates(dates);

    // Check if we should use mock mode
    if (useMockMode) {
      // Use mock data for testing with default habits and some sample entries  
      const today = new Date();
      const mockHabits: HabitWithStatus[] = DEFAULT_HABITS.map((habit, index) => {
        // Add some sample entries for demo
        const entries = [];
        
        // Add sample entries for some habits
        if (habit.name === 'Back Twists') {
          entries.push(
            { id: 'e1', habitId: `mock-${index}`, userId, date: addDays(today, -6), value: 2, createdAt: new Date() },
            { id: 'e2', habitId: `mock-${index}`, userId, date: addDays(today, -5), value: 4, createdAt: new Date() },
            { id: 'e3', habitId: `mock-${index}`, userId, date: addDays(today, -4), value: 4, createdAt: new Date() },
            { id: 'e4', habitId: `mock-${index}`, userId, date: addDays(today, -3), value: 4, createdAt: new Date() }
          );
        } else if (habit.name === 'Shin Boxes') {
          entries.push(
            { id: 'e5', habitId: `mock-${index}`, userId, date: addDays(today, -6), value: 2, createdAt: new Date() },
            { id: 'e6', habitId: `mock-${index}`, userId, date: addDays(today, -4), value: 1, createdAt: new Date() },
            { id: 'e7', habitId: `mock-${index}`, userId, date: addDays(today, -2), value: 1, createdAt: new Date() }
          );
        } else if (habit.name === 'Juggling') {
          entries.push(
            { id: 'e8', habitId: `mock-${index}`, userId, date: addDays(today, -6), value: 3, createdAt: new Date() },
            { id: 'e9', habitId: `mock-${index}`, userId, date: addDays(today, -3), value: 1, createdAt: new Date() }
          );
        } else if (habit.name === 'TGU 28KG') {
          entries.push(
            { id: 'e10', habitId: `mock-${index}`, userId, date: addDays(today, -5), value: 4, createdAt: new Date() },
            { id: 'e11', habitId: `mock-${index}`, userId, date: addDays(today, -2), value: 5, createdAt: new Date() }
          );
        } else if (habit.name === 'Amelia Time') {
          entries.push(
            { id: 'e12', habitId: `mock-${index}`, userId, date: addDays(today, -6), value: 1, createdAt: new Date() },
            { id: 'e13', habitId: `mock-${index}`, userId, date: addDays(today, -4), value: 1, createdAt: new Date() },
            { id: 'e14', habitId: `mock-${index}`, userId, date: addDays(today, -3), value: 0.5, createdAt: new Date() }
          );
        }
        
        const currentWeekCount = entries.reduce((sum, e) => sum + e.value, 0);
        let status: any = 'pending';
        
        if (currentWeekCount >= habit.targetPerWeek) {
          status = 'met';
        } else if (habit.name === 'Physical Mobility' || habit.name === 'Cult Meditate') {
          status = 'today';
        } else if (habit.name === 'Heavy Clubs 3x10') {
          status = 'overdue';
        }
        
        return {
          id: `mock-${index}`,
          name: habit.name,
          category: habit.category,
          targetPerWeek: habit.targetPerWeek,
          userId: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          status,
          currentWeekCount,
          entries
        };
      });
      
      // Deduplicate habits by name
      const uniqueHabits = mockHabits.reduce((acc, habit) => {
        if (!acc.find(h => h.name === habit.name)) {
          acc.push(habit);
        }
        return acc;
      }, [] as HabitWithStatus[]);
      
      console.log('Mock mode: Setting', uniqueHabits.length, 'unique habits (from', mockHabits.length, 'total)');
      
      setHabits(uniqueHabits);
      
      // Group by category with unique habits
      const categorySections: CategorySection[] = Object.keys(CATEGORIES).map(cat => {
        const categoryHabits = uniqueHabits.filter(h => h.category === cat);
        console.log(`Category ${cat}: ${categoryHabits.length} habits`);
        return {
          category: cat as any,
          name: CATEGORIES[cat].name,
          color: CATEGORIES[cat].color,
          habits: categoryHabits,
          isCollapsed: collapsedSectionsRef.current.has(cat)
        };
      });
      setSections(categorySections);
      
      // Set sample stats
      setSummaryStats({
        dueToday: 2,
        overdue: 1,
        doneToday: 0,
        onTrack: 0
      });
      
      // Mark as loaded
      setIsLoading(false);
      
      return;
    }

    // Function to fetch and update habits with their status
    const updateHabitsWithStatus = async () => {
      try {
        setIsLoading(true);
        const habitsWithStatus = await habitService.getHabitsWithStatus(userId);
        
        // Deduplicate habits by name (keeping the one with most entries)
        const uniqueHabits = habitsWithStatus.reduce((acc, habit) => {
          const existing = acc.find(h => h.name === habit.name);
          if (!existing) {
            acc.push(habit);
          } else if (habit.entries.length > existing.entries.length) {
            // Replace with the one that has more entries
            const index = acc.indexOf(existing);
            acc[index] = habit;
          }
          return acc;
        }, [] as HabitWithStatus[]);
        
        if (uniqueHabits.length < habitsWithStatus.length) {
          console.log(`Removed ${habitsWithStatus.length - uniqueHabits.length} duplicate habits`);
        }
        
        setHabits(uniqueHabits);
        
        // Check if user has no habits and show initializer
        if (uniqueHabits.length === 0 && !showInitializer) {
          setShowInitializer(true);
        }
        
        // Group by category
        const categorySections: CategorySection[] = Object.keys(CATEGORIES).map(cat => ({
          category: cat as any,
          name: CATEGORIES[cat].name,
          color: CATEGORIES[cat].color,
          habits: uniqueHabits.filter(h => h.category === cat),
          isCollapsed: collapsedSectionsRef.current.has(cat)
        }));
        setSections(categorySections);
        
        // Calculate summary stats
        const stats: SummaryStats = {
          dueToday: uniqueHabits.filter(h => h.status === 'today').length,
          overdue: uniqueHabits.filter(h => h.status === 'overdue').length,
          doneToday: uniqueHabits.filter(h => h.status === 'done').length,
          onTrack: uniqueHabits.filter(h => h.status === 'met').length
        };
        setSummaryStats(stats);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching habits:', error);
        // Set defaults on error
        setSections(Object.keys(CATEGORIES).map(cat => ({
          category: cat as any,
          name: CATEGORIES[cat].name,
          color: CATEGORIES[cat].color,
          habits: [],
          isCollapsed: cat === 'balance' || cat === 'joy'
        })));
        setSummaryStats({
          dueToday: 0,
          overdue: 0,
          doneToday: 0,
          onTrack: 0
        });
        setIsLoading(false);
      }
    };

    // Subscribe to habits changes
    const unsubscribeHabits = habitService.subscribeToHabits(userId, () => {
      updateHabitsWithStatus();
    });

    // Subscribe to entries changes for the trailing 7 days
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    
    const unsubscribeEntries = habitService.subscribeToWeekEntries(userId, startDate, endDate, () => {
      updateHabitsWithStatus();
    });

    // Initial load
    updateHabitsWithStatus();

    return () => {
      if (!useMockMode) {
        unsubscribeHabits();
        unsubscribeEntries();
      }
    };
  }, [userId, useMockMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSection = (category: string) => {
    if (collapsedSectionsRef.current.has(category)) {
      collapsedSectionsRef.current.delete(category);
    } else {
      collapsedSectionsRef.current.add(category);
    }
    setSections(prev => prev.map(s => 
      s.category === category ? { ...s, isCollapsed: !s.isCollapsed } : s
    ));
  };

  const expandAll = () => {
    collapsedSectionsRef.current.clear();
    setSections(prev => prev.map(s => ({ ...s, isCollapsed: false })));
  };

  const collapseAll = () => {
    Object.keys(CATEGORIES).forEach(cat => collapsedSectionsRef.current.add(cat));
    setSections(prev => prev.map(s => ({ ...s, isCollapsed: true })));
  };

  const handleCellClick = async (habitId: string, date: Date) => {
    // Check if date is older than yesterday and confirm
    if (!isToday(date) && !isYesterday(date)) {
      const dateStr = format(date, 'MMM d');
      if (!window.confirm(`Are you sure you want to modify entries for ${dateStr}? This is an older date.`)) {
        return;
      }
    }
    
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
      console.error('Habit not found:', habitId);
      return;
    }
    
    const existingEntry = habit.entries.find(e => 
      format(e.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    
    // Handle mock mode updates locally
    if (useMockMode) {
      // Update local state for mock mode
      const updatedHabits = habits.map(h => {
        if (h.id !== habitId) return h;
        
        let newEntries = [...h.entries];
        
        if (existingEntry) {
          // Cycle through values: number -> number+1 -> 0.5 -> 0 (remove)
          if (existingEntry.value >= 1) {
            if (existingEntry.value < 5) {
              newEntries = newEntries.map(e => 
                e.id === existingEntry.id ? { ...e, value: existingEntry.value + 1 } : e
              );
            } else {
              newEntries = newEntries.map(e => 
                e.id === existingEntry.id ? { ...e, value: 0.5 } : e
              );
            }
          } else if (existingEntry.value === 0.5) {
            newEntries = newEntries.filter(e => e.id !== existingEntry.id);
          }
        } else {
          // Add new entry
          newEntries.push({
            id: `new-${Date.now()}`,
            habitId,
            userId,
            date,
            value: 1,
            createdAt: new Date()
          } as any);
        }
        
        const currentWeekCount = newEntries.reduce((sum, e) => sum + e.value, 0);
        let status = h.status;
        if (currentWeekCount >= h.targetPerWeek) {
          status = 'met';
        }
        
        return { ...h, entries: newEntries, currentWeekCount, status };
      });
      
      setHabits(updatedHabits);
      
      // Update sections
      const categorySections: CategorySection[] = Object.keys(CATEGORIES).map(cat => ({
        category: cat as any,
        name: CATEGORIES[cat].name,
        color: CATEGORIES[cat].color,
        habits: updatedHabits.filter(h => h.category === cat),
        isCollapsed: sections.find(s => s.category === cat)?.isCollapsed || false
      }));
      setSections(categorySections);
      
      // Update stats
      setSummaryStats({
        dueToday: updatedHabits.filter(h => h.status === 'today').length,
        overdue: updatedHabits.filter(h => h.status === 'overdue').length,
        doneToday: updatedHabits.filter(h => h.status === 'done').length,
        onTrack: updatedHabits.filter(h => h.status === 'met').length
      });
      
      return;
    }
    
    // Firebase mode - handle cycling through values
    console.log('Handling click for habit:', habit.name, 'on date:', format(date, 'yyyy-MM-dd'));
    console.log('Existing entry:', existingEntry);
    
    try {
      if (existingEntry) {
        // Cycle through values: 1 -> 2 -> 3 -> 4 -> 5 -> 0.5 -> delete
        console.log('Updating existing entry with value:', existingEntry.value);
        if (existingEntry.value >= 1 && existingEntry.value < 5) {
          await habitService.updateEntry(existingEntry.id, existingEntry.value + 1);
          console.log('Updated to:', existingEntry.value + 1);
        } else if (existingEntry.value >= 5) {
          await habitService.updateEntry(existingEntry.id, 0.5);
          console.log('Updated to: 0.5');
        } else if (existingEntry.value === 0.5) {
          await habitService.deleteEntry(existingEntry.id);
          console.log('Deleted entry');
        }
      } else {
        // Create new entry with value 1
        console.log('Creating new entry for habit:', habitId);
        const entryId = await habitService.addEntry({
          habitId,
          userId,
          date,
          value: 1
        });
        console.log('Created entry with id:', entryId);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return '●';
      case 'met': return '✓';
      case 'today': return '⏰';
      case 'tomorrow': return '→';
      case 'overdue': return '!';
      default: return '';
    }
  };

  const getCellContent = (habit: HabitWithStatus, date: Date) => {
    const entry = habit.entries.find(e => 
      format(e.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    
    if (!entry) return '';
    if (entry.value === 1) return '✓';
    if (entry.value === 0.5) return '½';
    return entry.value > 1 ? entry.value.toString() : '';
  };

  const getCellClass = (habit: HabitWithStatus, date: Date) => {
    const entry = habit.entries.find(e => 
      format(e.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    
    if (!entry) return '';
    if (entry.value >= 1) return 'completed';
    if (entry.value === 0.5) return 'partial';
    return '';
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="container" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px', animation: 'pulse 1.5s ease-in-out infinite' }}>⏳</div>
        <div style={{ fontSize: '18px', color: '#94a3b8' }}>Loading your habits...</div>
        <div style={{ fontSize: '14px', color: '#64748b' }}>Setting up your tracking dashboard</div>
      </div>
    );
  }
  
  return (
    <div className="container">
      <div className="week-header">
        <div className="week-title">
          Last 7 Days • 
          <span className="current-day">{format(new Date(), 'EEEE, MMM d')}</span>
        </div>
        <div className="view-toggle">
          <button className="toggle-btn" onClick={expandAll}>Expand All</button>
          <button className="toggle-btn" onClick={collapseAll}>Collapse All</button>
          <button className="toggle-btn active">Dense View</button>
          <button className="toggle-btn add-habit" onClick={() => setShowHabitManager(true)}>
            + Add Habit
          </button>
          {habits.length === 0 && (
            <button className="toggle-btn initialize" onClick={() => setShowInitializer(true)}>
              📥 Load Default Habits
            </button>
          )}
          {!useMockMode && habits.length > 0 && (
            <button className="toggle-btn cleanup" onClick={() => setShowCleanup(true)}
              style={{ background: '#dc2626', marginLeft: '8px' }}>
              🧹 Clean Duplicates
            </button>
          )}
        </div>
      </div>

      <div className="summary-bar">
        <div className="summary-item">
          <span className="summary-label">Due Today:</span>
          <span className="summary-value value-today">{summaryStats.dueToday}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Overdue:</span>
          <span className="summary-value value-overdue">{summaryStats.overdue}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Done Today:</span>
          <span className="summary-value value-done">{summaryStats.doneToday}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">On Track:</span>
          <span className="summary-value value-track">{summaryStats.onTrack}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th className="col-habit">Habit</th>
            <th className="col-status">●</th>
            {weekDates.map(date => (
              <th key={date.toISOString()} className="col-day">
                {format(date, 'E')[0]}<br/>
                {format(date, 'd')}
              </th>
            ))}
            <th className="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {sections.map(section => (
            <React.Fragment key={section.category}>
              <tr className="section-header" onClick={() => toggleSection(section.category)}>
                <td colSpan={10}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="section-title">
                      <span className={`section-arrow ${section.isCollapsed ? 'collapsed' : ''}`}>▼</span>
                      <span 
                        className="section-indicator" 
                        style={{ background: section.color }}
                      />
                      {section.name}
                    </div>
                    {section.isCollapsed && (
                      <div className="section-summary">
                        <span className="summary-stat">
                          <span className={`stat-value stat-${
                            section.habits.filter(h => h.status === 'met').length > 0 ? 'good' :
                            section.habits.filter(h => h.status === 'today').length > 0 ? 'warn' : 'bad'
                          }`}>
                            {section.habits.filter(h => h.status === 'met').length} met
                          </span>
                        </span>
                        <span className="summary-stat">
                          {section.habits.reduce((sum, h) => sum + h.currentWeekCount, 0)} total
                        </span>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
              {!section.isCollapsed && section.habits.map(habit => (
                <tr key={habit.id} className="section-row">
                  <td className="col-habit">
                    <div className="habit-name">
                      {habit.name}
                      <span className="habit-target">({habit.targetPerWeek}/w)</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status status-${habit.status}`}>
                      {getStatusIcon(habit.status)}
                    </span>
                  </td>
                  {weekDates.map(date => (
                    <td 
                      key={date.toISOString()} 
                      className={getCellClass(habit, date)}
                      onClick={() => handleCellClick(habit.id, date)}
                      style={{ cursor: 'pointer' }}
                    >
                      {getCellContent(habit, date)}
                    </td>
                  ))}
                  <td className={`total total-${
                    habit.currentWeekCount >= habit.targetPerWeek ? 'good' :
                    habit.currentWeekCount > 0 ? 'warn' : 'bad'
                  }`}>
                    {habit.currentWeekCount}/{habit.targetPerWeek}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div className="legend-strip">
        <div className="legend-item">● = done</div>
        <div className="legend-item">✓ = met target</div>
        <div className="legend-item">⏰ = due today</div>
        <div className="legend-item">→ = tomorrow</div>
        <div className="legend-item">! = overdue</div>
        <div className="legend-item">½ = partial</div>
      </div>

      {showHabitManager && (
        <HabitManager 
          userId={userId} 
          onClose={() => setShowHabitManager(false)} 
        />
      )}
      
      {showInitializer && (
        <InitializeHabits 
          userId={userId} 
          onComplete={() => setShowInitializer(false)} 
        />
      )}
      
      {showCleanup && (
        <CleanupDuplicates 
          userId={userId} 
          onComplete={() => {
            setShowCleanup(false);
            // Force refresh after cleanup
            window.location.reload();
          }} 
        />
      )}
    </div>
  );
};