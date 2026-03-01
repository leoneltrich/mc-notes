import { NotesApi } from '$lib/api/notes';
import { notesStore } from '$lib/stores/notes.svelte';
import { authStore } from '$lib/stores/auth.svelte';
import type { UpdateNoteRequest } from '$lib/types/api';

let saveTimeout: ReturnType<typeof setTimeout>;

export class NotesService {
  static async loadNotes() {
    if (!authStore.isAuthenticated) return;
    
    notesStore.setLoading(true);
    try {
      const response = await NotesApi.getAll();
      notesStore.setNotes(response.data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      notesStore.setLoading(false);
    }
  }

  static async selectNote(id: number) {
    notesStore.selectNote(id);
  }

  static async createNote() {
    if (!authStore.isAuthenticated) return;

    try {
      await NotesApi.create({
        title: 'New Note',
        content: '',
        is_public_read: false,
        is_public_write: false
      });
      await this.loadNotes();
      
      if (notesStore.notes.length > 0) {
        const newestNote = notesStore.notes.reduce((prev, current) => 
          (prev.note_id > current.note_id) ? prev : current
        );
        await this.selectNote(newestNote.note_id);
      }

    } catch (error) {
      console.error('Failed to create note:', error);
    }
  }

  static async updateNote(id: number, data: Partial<UpdateNoteRequest>) {
    // 1. Optimistic update (Immediate)
    notesStore.updateNoteInList(id, data);

    // 2. Debounced API Call
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        const currentNote = notesStore.notes.find(n => n.note_id === id);
        if (!currentNote) return;

        console.log('Saving note...', id);
        await NotesApi.update({
          id,
          content: currentNote.content,
          title: currentNote.title,
          is_public_read: currentNote.is_public_read,
          is_public_write: currentNote.is_public_write
        });
        console.log('Note saved.');
      } catch (error) {
        console.error('Failed to update note:', error);
        // Ideally revert the optimistic update here or show an error status
      }
    }, 500); // 500ms debounce
  }
}
