import { Injectable } from '@angular/core';
import { HistoryEntry } from '../../shared/models/models';

const HISTORY_KEY = 'qm_history';
const MAX_ENTRIES = 20;

@Injectable({ providedIn: 'root' })
export class HistoryStoreService {

  getAll(): HistoryEntry[] {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as HistoryEntry[];
    } catch {
      return [];
    }
  }

  add(entry: Omit<HistoryEntry, 'time'>): void {
    const all = this.getAll();
    const newEntry: HistoryEntry = {
      ...entry,
      time: new Date().toLocaleTimeString(),
    };
    all.unshift(newEntry);
    if (all.length > MAX_ENTRIES) all.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
  }

  clear(): void {
    localStorage.removeItem(HISTORY_KEY);
  }
}
