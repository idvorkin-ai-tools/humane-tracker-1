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
import { startOfWeek, endOfWeek, isToday, differenceInDays, format } from 'date-fns';

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

  // Add a habit entry (optimized - no wait for server)
  async addEntry(entry: Omit<HabitEntry, 'id' | 'createdAt'>): Promise<string> {
    const newEntry = {
      ...entry,
      date: Timestamp.fromDate(entry.date),
      createdAt: Timestamp.now()
    };
    // Don't wait for server confirmation
    const docRef = addDoc(this.entriesCollection, newEntry);
    return (await docRef).id;
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
    
    // Count unique days with entries (not total values)
    // A day counts if there's any entry with value > 0
    const daysWithEntries = new Set(
      weekEntries
        .filter(e => e.value > 0)
        .map(e => format(e.date, 'yyyy-MM-dd'))
    ).size;
    
    const todayEntry = weekEntries.find(e => isToday(e.date));
    
    // Check if done today
    if (todayEntry && todayEntry.value >= 1) {
      return 'done';
    }
    
    // Check if weekly target is met (counting days, not total values)
    if (daysWithEntries >= habit.targetPerWeek) {
      return 'met';
    }
    
    // Calculate days left and days still needed
    const daysLeft = differenceInDays(weekEnd, currentDate) + 1;
    const daysNeeded = habit.targetPerWeek - daysWithEntries;
    
    // Check if due today
    if (daysLeft <= daysNeeded && !todayEntry) {
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
      
      // Count unique days with entries (not total values)
      // According to PRD: "Weekly goals count DAYS not total sets"
      const currentWeekCount = new Set(
        entries
          .filter(e => e.value > 0)
          .map(e => format(e.date, 'yyyy-MM-dd'))
      ).size;
      
      habitsWithStatus.push({
        ...habit,
        status,
        currentWeekCount,
        entries
      });
    }
    
    return habitsWithStatus;
  }

  // Update entry value (optimized - no wait for server)
  async updateEntry(entryId: string, value: number): Promise<void> {
    const entryRef = doc(this.entriesCollection, entryId);
    // Don't wait for server confirmation
    setDoc(entryRef, { value }, { merge: true });
  }

  // Delete entry
  async deleteEntry(entryId: string): Promise<void> {
    await deleteDoc(doc(this.entriesCollection, entryId));
  }

  // Delete habit
  async deleteHabit(habitId: string): Promise<void> {
    await deleteDoc(doc(this.habitsCollection, habitId));
  }

  // Update habit
  async updateHabit(habitId: string, updates: Partial<Habit>): Promise<void> {
    const habitRef = doc(this.habitsCollection, habitId);
    await setDoc(habitRef, updates, { merge: true });
  }

  // Get entries for a specific habit
  async getEntriesForHabit(habitId: string): Promise<HabitEntry[]> {
    const q = query(this.entriesCollection, where('habitId', '==', habitId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
    } as HabitEntry));
  }

  // Get all habits for a user
  async getHabits(userId: string): Promise<Habit[]> {
    const q = query(this.habitsCollection, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
      updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date()
    } as Habit));
  }
}