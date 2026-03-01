import type { Note } from '$lib/types/api';

class NotesStore {
  notes = $state<Note[]>([]);
  selectedNoteId = $state<number | null>(null);
  filterMode = $state<'mine' | 'public'>('mine');
  isLoading = $state(false);
  
  filteredNotes = $derived(
    this.notes.filter(n => {
      return true; 
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

  selectNote(id: number) {
    this.selectedNoteId = id;
  }

  updateNoteInList(id: number, updates: Partial<Note>) {
    const index = this.notes.findIndex(n => n.note_id === id);
    if (index !== -1) {
      // Create a new object to trigger reactivity if needed, 
      // though Svelte 5 fine-grained reactivity handles mutations well.
      Object.assign(this.notes[index], updates);
    }
  }
}

export const notesStore = new NotesStore();
