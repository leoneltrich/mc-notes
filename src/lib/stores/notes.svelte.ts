import { NotesApi } from '$lib/api/notes';
import type { Note } from '$lib/types/api';
import { authStore } from './auth.svelte';

class NotesStore {
  notes = $state<Note[]>([]);
  selectedNoteId = $state<number | null>(null);
  filterMode = $state<'mine' | 'public'>('mine');
  isLoading = $state(false);
  
  // Derived state for the list view
  filteredNotes = $derived(
    this.notes.filter(n => {
      // Assuming we can identify "my" notes vs "public" via owner_id or just by the list logic.
      // Since the API returns "all notes available to the user", we might need logic here.
      // For now, let's assume the backend returns everything mixed and we filter client-side?
      // Or if the backend only returns MY notes, then "public" might need a different endpoint?
      // Based on spec: GET /notes returns "List of all notes available to the user".
      // We need a way to know "my" user ID to filter.
      // For now, let's just return all notes for both modes until we have user info.
      return true; 
    })
  );

  selectedNote = $derived(
    this.notes.find(n => n.note_id === this.selectedNoteId) || null
  );

  async fetchNotes() {
    if (!authStore.isAuthenticated) return;
    this.isLoading = true;
    try {
      const res = await NotesApi.getAll();
      this.notes = res.data;
    } catch (e) {
      console.error('Failed to fetch notes', e);
    } finally {
      this.isLoading = false;
    }
  }

  selectNote(id: number) {
    this.selectedNoteId = id;
  }
}

export const notesStore = new NotesStore();
