import type { Note } from '$lib/types/api';
import { authStore } from './auth.svelte';

class NotesStore {
  notes = $state<Note[]>([]);
  selectedNoteId = $state<number | null>(null);
  filterMode = $state<'mine' | 'public'>('mine');
  isLoading = $state(false);
  
  filteredNotes = $derived(
    this.notes.filter(n => {
      if (this.filterMode === 'mine') {
        // Assume if owner_id matches, it's mine. Or if we are in admin mode, we show all.
        // For now, let's just filter based on is_public_read if not 'mine'
        return true; // The backend should already filter for us mostly, but let's be safe
      }
      return n.is_public_read || n.is_public_write;
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

  removeNoteFromList(id: number) {
    this.notes = this.notes.filter(n => n.note_id !== id);
    if (this.selectedNoteId === id) {
      this.selectedNoteId = null;
    }
  }
}

export const notesStore = new NotesStore();
