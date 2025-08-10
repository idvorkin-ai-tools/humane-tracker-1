import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  deleteDoc,
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Habit, HabitEntry, HabitWithStatus, HabitStatus } from '../types/habit';
import { startOfWeek, endOfWeek, isToday, differenceInDays } from 'date-fns';

export class HabitService {
  private habitsCollection = collection(db, 'habits');
  private entriesCollection = collection(db, 'entries');

  // Create a new habit
  async createHabit(habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newHabit = {
      ...habit,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    const docRef = await addDoc(this.habitsCollection, newHabit);
    return docRef.id;
  }

  // Get all habits for a user
  async getUserHabits(userId: string): Promise<Habit[]> {
    const q = query(this.habitsCollection, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Habit));
  }

  // Subscribe to habits changes
  subscribeToHabits(userId: string, callback: (habits: Habit[]) => void) {
    const q = query(this.habitsCollection, where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const habits = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
        } as Habit;
      });
      callback(habits);
    });
  }

  // Add a habit entry
  async addEntry(entry: Omit<HabitEntry, 'id' | 'createdAt'>): Promise<string> {
    const newEntry = {
      ...entry,
      date: Timestamp.fromDate(entry.date),
      createdAt: Timestamp.now()
    };
    const docRef = await addDoc(this.entriesCollection, newEntry);
    return docRef.id;
  }

  // Get entries for a habit within a date range
  async getHabitEntries(habitId: string, startDate: Date, endDate: Date): Promise<HabitEntry[]> {
    const q = query(
      this.entriesCollection,
      where('habitId', '==', habitId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
      } as HabitEntry;
    });
  }

  // Subscribe to entries changes for a date range
  subscribeToWeekEntries(userId: string, startDate: Date, endDate: Date, callback: (entries: HabitEntry[]) => void) {
    const q = query(
      this.entriesCollection,
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );
    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : new Date(),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        } as HabitEntry;
      });
      callback(entries);
    });
  }

  // Calculate habit status
  calculateHabitStatus(habit: Habit, entries: HabitEntry[], currentDate: Date = new Date()): HabitStatus {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Week starts on Monday
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    
    const weekEntries = entries.filter(e => 
      e.date >= weekStart && e.date <= weekEnd
    );
    
    const totalValue = weekEntries.reduce((sum, e) => sum + e.value, 0);
    const todayEntry = weekEntries.find(e => isToday(e.date));
    
    // Check if done today
    if (todayEntry && todayEntry.value >= 1) {
      return 'done';
    }
    
    // Check if weekly target is met
    if (totalValue >= habit.targetPerWeek) {
      return 'met';
    }
    
    // Calculate days left and entries needed
    const daysLeft = differenceInDays(weekEnd, currentDate) + 1;
    const entriesNeeded = habit.targetPerWeek - totalValue;
    
    // Check if due today
    if (daysLeft <= entriesNeeded && !todayEntry) {
      if (daysLeft === 0) return 'overdue';
      if (daysLeft === 1) return 'today';
      if (daysLeft === 2) return 'tomorrow';
      return 'soon';
    }
    
    return 'pending';
  }

  // Get habits with status for trailing 7 days
  async getHabitsWithStatus(userId: string): Promise<HabitWithStatus[]> {
    const habits = await this.getUserHabits(userId);
    const currentDate = new Date();
    // Get trailing 7 days (today and previous 6 days)
    const endDate = new Date(currentDate);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    
    const habitsWithStatus: HabitWithStatus[] = [];
    
    for (const habit of habits) {
      const entries = await this.getHabitEntries(habit.id, startDate, endDate);
      const status = this.calculateHabitStatus(habit, entries, currentDate);
      const currentWeekCount = entries.reduce((sum, e) => sum + e.value, 0);
      
      habitsWithStatus.push({
        ...habit,
        status,
        currentWeekCount,
        entries
      });
    }
    
    return habitsWithStatus;
  }

  // Update entry value
  async updateEntry(entryId: string, value: number): Promise<void> {
    const entryRef = doc(this.entriesCollection, entryId);
    await setDoc(entryRef, { value }, { merge: true });
  }

  // Delete entry
  async deleteEntry(entryId: string): Promise<void> {
    await deleteDoc(doc(this.entriesCollection, entryId));
  }

  // Delete habit
  async deleteHabit(habitId: string): Promise<void> {
    await deleteDoc(doc(this.habitsCollection, habitId));
  }
}