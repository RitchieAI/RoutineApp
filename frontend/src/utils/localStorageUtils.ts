import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalRoutine {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  recurrence_type: string;
  recurrence_days?: string[];
  is_active: boolean;
  current_streak: number;
  best_streak?: number;
  created_at: string;
}

export interface LocalRoutineCompletion {
  id: string;
  routine_id: string;
  completed_at: string;
  notes?: string;
}

export interface LocalItem {
  id: string;
  routine_id: string;
  title: string;
  notes?: string;
  priority: string;
  has_specific_time: boolean;
  time?: string;
  repeat_per_day_count: number;
  is_all_day: boolean;
  order_index: number;
  weekdays?: string[]; // ['monday', 'tuesday', ...] - empty means all days
  created_at: string;
}

const ROUTINES_KEY = '@guest_routines';
const ITEMS_KEY = '@guest_items';
const COMPLETIONS_KEY = '@guest_completions';

// Einfache UUID v4 Generator
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getLocalRoutines(): Promise<LocalRoutine[]> {
  try {
    const data = await AsyncStorage.getItem(ROUTINES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading local routines:', error);
    return [];
  }
}

export async function saveLocalRoutine(routine: LocalRoutine): Promise<void> {
  try {
    const routines = await getLocalRoutines();
    const index = routines.findIndex(r => r.id === routine.id);
    
    if (index >= 0) {
      routines[index] = routine;
    } else {
      routines.push(routine);
    }
    
    await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  } catch (error) {
    console.error('Error saving local routine:', error);
    throw error;
  }
}

export async function deleteLocalRoutine(routineId: string): Promise<void> {
  try {
    const routines = await getLocalRoutines();
    const filtered = routines.filter(r => r.id !== routineId);
    await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting local routine:', error);
    throw error;
  }
}

export async function getLocalCompletions(routineId: string): Promise<LocalRoutineCompletion[]> {
  try {
    const data = await AsyncStorage.getItem(`${COMPLETIONS_KEY}_${routineId}`);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading local completions:', error);
    return [];
  }
}

export async function saveLocalCompletion(
  routineId: string,
  completion: LocalRoutineCompletion
): Promise<void> {
  try {
    const completions = await getLocalCompletions(routineId);
    completions.push(completion);
    await AsyncStorage.setItem(`${COMPLETIONS_KEY}_${routineId}`, JSON.stringify(completions));
  } catch (error) {
    console.error('Error saving local completion:', error);
    throw error;
  }
}

export async function clearAllLocalData(): Promise<void> {
  try {
    const routines = await getLocalRoutines();
    await AsyncStorage.removeItem(ROUTINES_KEY);
    await AsyncStorage.removeItem(ITEMS_KEY);
    
    for (const routine of routines) {
      await AsyncStorage.removeItem(`${COMPLETIONS_KEY}_${routine.id}`);
    }
  } catch (error) {
    console.error('Error clearing local data:', error);
    throw error;
  }
}

// Items Functions
export async function getLocalItems(routineId: string): Promise<LocalItem[]> {
  try {
    const data = await AsyncStorage.getItem(ITEMS_KEY);
    const allItems: LocalItem[] = data ? JSON.parse(data) : [];
    return allItems.filter(item => item.routine_id === routineId);
  } catch (error) {
    console.error('Error loading local items:', error);
    return [];
  }
}

export async function saveLocalItem(item: LocalItem): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(ITEMS_KEY);
    const allItems: LocalItem[] = data ? JSON.parse(data) : [];
    const index = allItems.findIndex(i => i.id === item.id);
    
    if (index >= 0) {
      allItems[index] = item;
    } else {
      allItems.push(item);
    }
    
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(allItems));
  } catch (error) {
    console.error('Error saving local item:', error);
    throw error;
  }
}

export async function deleteLocalItem(itemId: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(ITEMS_KEY);
    const allItems: LocalItem[] = data ? JSON.parse(data) : [];
    const filtered = allItems.filter(i => i.id !== itemId);
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting local item:', error);
    throw error;
  }
}
