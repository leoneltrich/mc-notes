import { NotesApi } from '$lib/api/notes';
import { notesStore } from '$lib/stores/notes.svelte';
import { authStore } from '$lib/stores/auth.svelte';

export class NotesService {
  static async loadNotes() {
    if (!authStore.isAuthenticated) return;
    
    notesStore.setLoading(true);
    try {
      const response = await NotesApi.getAll();
      notesStore.setNotes(response.data);
    } catch (error) {
      console.error('Failed to load notes:', error);
      // In a real app, we'd set an error state in the store here
    } finally {
      notesStore.setLoading(false);
    }
  }

  static async selectNote(id: number) {
    notesStore.selectNote(id);
    // Here we could also fetch full note details if the list only returned summaries
    // const fullNote = await NotesApi.getById(id);
    // notesStore.updateNote(fullNote);
  }
}
