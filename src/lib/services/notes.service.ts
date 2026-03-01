import { NotesApi } from '$lib/api/notes';
import { notesStore } from '$lib/stores/notes.svelte';
import { authStore } from '$lib/stores/auth.svelte';
import type { UpdateNoteRequest } from '$lib/types/api';

let saveTimeout: ReturnType<typeof setTimeout>;
let pollInterval: ReturnType<typeof setInterval>;

export class NotesService {
  static async loadNotes(silent = false) {
    if (!authStore.isAuthenticated) return;
    
    if (!silent) notesStore.setLoading(true);
    try {
      const response = await NotesApi.getAll();

      notesStore.setNotes(response.data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      if (!silent) notesStore.setLoading(false);
    }
  }

  static startPolling() {
    this.stopPolling();
    pollInterval = setInterval(() => {
      this.loadNotes(true);
    }, 5000);
  }

  static stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
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
        await this.loadNotes();
        console.error('Failed to update note:', error);
      }
    }, 500);
  }

  static async deleteNote(id: number) {
    if (!authStore.isAuthenticated) return;

    const previousNotes = [...notesStore.notes];
    notesStore.removeNoteFromList(id);

    try {
      console.log('Deleting note...', id);
      await NotesApi.delete(id);
      console.log('Note deleted.');
    } catch (error) {
      console.error('Failed to delete note:', error);
      await this.loadNotes();
    }
  }
}
