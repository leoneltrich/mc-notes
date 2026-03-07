import type { Note } from '$lib/types/api';
import { authStore } from './auth.svelte';

class NotesStore {
  notes = $state<Note[]>([]);
  selectedNoteId = $state<number | null>(null);
  filterMode = $state<'mine' | 'public'>('mine');
  isLoading = $state(false);
  isLoaded = $state(false);
  isCreating = $state(false);
  pendingSyncIds = $state(new Set<number>());
  
  filteredNotes = $derived(
    this.notes
      .filter(n => {
        if (this.filterMode === 'mine') {
          return n.owner_id === authStore.userId;
        }
        return n.is_public_read || n.is_public_write;
      })
      .sort((a, b) => {
        const timeA = a.timestamp_modified || a.timestamp_created || 0;
        const timeB = b.timestamp_modified || b.timestamp_created || 0;
        return timeB - timeA;
      })
  );

  selectedNote = $derived(
    this.notes.find(n => n.note_id === this.selectedNoteId) || null
  );

  setNotes(notes: Note[]) {
    this.notes = notes;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  selectNote(id: number | null) {
    this.selectedNoteId = id;
  }

  updateNoteInList(id: number, updates: Partial<Note>) {
    const index = this.notes.findIndex(n => n.note_id === id);
    if (index !== -1) {
      Object.assign(this.notes[index], updates);
    }
  }

  replaceNoteId(oldId: number, newId: number) {
    const oldIndex = this.notes.findIndex(n => n.note_id === oldId);
    const newIndex = this.notes.findIndex(n => n.note_id === newId);

    if (oldIndex === -1) return; // Already replaced or deleted.

    if (newIndex !== -1 && oldIndex !== newIndex) {
      // Both exist and are different objects. The server note (newIndex) was likely just loaded.
      // We merge any local content from the temp note just in case, then remove temp.
      const tempNote = this.notes[oldIndex];
      this.notes[newIndex].content = tempNote.content;
      this.notes[newIndex].title = tempNote.title;
      this.notes.splice(oldIndex, 1);
    } else {
      // Only temp exists, or newIndex is already the same object as oldIndex.
      this.notes[oldIndex].note_id = newId;
    }

    if (this.selectedNoteId === oldId) {
      this.selectedNoteId = newId;
    }
    
    if (this.pendingSyncIds.has(oldId)) {
      this.pendingSyncIds.delete(oldId);
      this.pendingSyncIds.add(newId);
    }
  }

  removeNoteFromList(id: number) {
    this.notes = this.notes.filter(n => n.note_id !== id);
    if (this.selectedNoteId === id) {
      this.selectedNoteId = null;
    }
    this.pendingSyncIds.delete(id);
  }

  setSyncing(id: number, syncing: boolean) {
    if (syncing) {
      this.pendingSyncIds.add(id);
    } else {
      this.pendingSyncIds.delete(id);
    }
  }
}

export const notesStore = new NotesStore();
