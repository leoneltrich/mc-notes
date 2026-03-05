import { NotesApi } from '$lib/api/notes';
import { notesStore } from '$lib/stores/notes.svelte';
import { authStore } from '$lib/stores/auth.svelte';
import type { UpdateNoteRequest } from '$lib/types/api';

const saveTimeouts = new Map<number, ReturnType<typeof setTimeout>>();
let pollInterval: ReturnType<typeof setInterval> | null = null;
let pendingSaveIds = new Set<number>();

export class NotesService {
  static async loadNotes(silent = false) {
    if (!authStore.isAuthenticated) return;
    
    if (!silent) notesStore.setLoading(true);
    try {
      const response = await NotesApi.getAll();
      const serverNotes = response.data;

      if (pendingSaveIds.size > 0) {
        const currentLocalNotes = notesStore.notes;
        const mergedNotes = serverNotes.map(sn => {
          if (pendingSaveIds.has(sn.note_id)) {
            const localNote = currentLocalNotes.find(ln => ln.note_id === sn.note_id);
            if (localNote) {
              return { 
                ...sn, 
                content: localNote.content, 
                title: localNote.title,
                is_public_read: localNote.is_public_read,
                is_public_write: localNote.is_public_write
              };
            }
          }
          return sn;
        });
        notesStore.setNotes(mergedNotes);
      } else {
        notesStore.setNotes(serverNotes);
      }
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        console.warn('Rate limit hit during poll. Backing off...');
      } else {
        console.error('Failed to load notes:', error);
      }
    } finally {
      if (!silent) notesStore.setLoading(false);
    }
  }

  static startPolling() {
    if (pollInterval) return;
    this.loadNotes(true);
    pollInterval = setInterval(() => {
      this.loadNotes(true);
    }, 10000); // 10s poll to be conservative
  }

  static stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  static async selectNote(id: number) {
    notesStore.selectNote(id);
  }

  static async createNote(isPublic = false) {
    if (!authStore.isAuthenticated) return;

    try {
      await NotesApi.create({
        title: isPublic ? 'New Public Note' : 'New Note',
        content: '',
        is_public_read: isPublic,
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
    pendingSaveIds.add(id);
    
    const now = Math.floor(Date.now() / 1000);
    notesStore.updateNoteInList(id, { ...data, timestamp_modified: now });

    const existingTimeout = saveTimeouts.get(id);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeout = setTimeout(async () => {
      try {
        const currentNote = notesStore.notes.find(n => n.note_id === id);
        if (!currentNote) {
          pendingSaveIds.delete(id);
          return;
        }

        await NotesApi.update({
          id,
          content: currentNote.content,
          title: currentNote.title,
          is_public_read: currentNote.is_public_read,
          is_public_write: currentNote.is_public_write
        });
        
        pendingSaveIds.delete(id);
      } catch (error: any) {
        if (error.message === 'RATE_LIMIT_EXCEEDED') {
          console.warn('Rate limit hit during save. Retrying later...');
          // Don't clear pending status, keep local version
        } else {
          console.error('Failed to update note:', error);
          pendingSaveIds.delete(id);
          await this.loadNotes();
        }
      }
    }, 1000); // 1s debounce
    
    saveTimeouts.set(id, timeout);
  }

  static async deleteNote(id: number) {
    if (!authStore.isAuthenticated) return;

    notesStore.removeNoteFromList(id);

    try {
      await NotesApi.delete(id);
    } catch (error: any) {
      if (error.message !== 'RATE_LIMIT_EXCEEDED') {
        console.error('Failed to delete note:', error);
        await this.loadNotes();
      }
    }
  }
}
