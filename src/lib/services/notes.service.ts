import { NotesApi } from '$lib/api/notes';
import { notesStore } from '$lib/stores/notes.svelte';
import { authStore } from '$lib/stores/auth.svelte';
import type { UpdateNoteRequest, Note } from '$lib/types/api';
import { isBackingOff } from '$lib/api/client';

type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';
type OperationStatus = 'PENDING' | 'CREATED';

interface SyncOperation {
  id: number;
  type: OperationType;
  data?: any;
  retryCount: number;
  timestamp: number;
  status: OperationStatus;
}

const syncQueue: SyncOperation[] = [];
let isProcessingQueue = false;
let pollTimeout: ReturnType<typeof setTimeout> | null = null;
let tempIdCounter = -1;

const POLL_INTERVAL = 15000;
const saveTimeouts = new Map<number, ReturnType<typeof setTimeout>>();
let activeLoadPromise: Promise<void> | null = null;

export class NotesService {
  private static scheduleNextPoll() {
    if (pollTimeout) clearTimeout(pollTimeout);
    pollTimeout = setTimeout(() => {
      this.loadNotes(true).catch(() => {});
    }, POLL_INTERVAL);
  }

  static async loadNotes(silent = false) {
    if (!authStore.isAuthenticated || isBackingOff()) return;
    if (!silent && notesStore.isLoaded) return;

    if (activeLoadPromise) return activeLoadPromise;

    activeLoadPromise = (async () => {
      if (!silent) notesStore.setLoading(true);
      try {
        const response = await NotesApi.getAll();
        const serverNotes = response.data;
        if (!silent) notesStore.isLoaded = true;

        const currentNotes = [...notesStore.notes];
        const pendingIds = new Set(syncQueue.map(op => op.id));
        
        const mergedNotes = serverNotes.map(sn => {
          const localNote = currentNotes.find(ln => ln.note_id === sn.note_id);
          if (localNote && (pendingIds.has(sn.note_id) || notesStore.pendingSyncIds.has(sn.note_id))) {
            return { ...sn, ...localNote };
          }
          return sn;
        });

        const localOnlyNotes = currentNotes.filter(ln => ln.note_id < 0 && pendingIds.has(ln.note_id));
        notesStore.setNotes([...mergedNotes, ...localOnlyNotes]);
        
        // Success: Backoff is reset inside apiClient.ts
      } catch (error: any) {
        if (error.message !== 'RATE_LIMIT_EXCEEDED') {
           console.error('[Sync] loadNotes failure:', error);
        }
        throw error;
      } finally {
        if (!silent) notesStore.setLoading(false);
        activeLoadPromise = null;
        this.scheduleNextPoll();
      }
    })();

    return activeLoadPromise;
  }

  static startPolling() {
    this.scheduleNextPoll();
  }

  static stopPolling() {
    if (pollTimeout) {
      clearTimeout(pollTimeout);
      pollTimeout = null;
    }
  }

  static async selectNote(id: number | null) {
    notesStore.selectNote(id);
  }

  static async createNote(isPublic = false) {
    if (!authStore.isAuthenticated || notesStore.isCreating) return;

    notesStore.isCreating = true;
    const tempId = tempIdCounter--;
    const newNote: Note = {
      note_id: tempId,
      owner_id: authStore.userId || '',
      title: isPublic ? 'New Public Note' : 'New Note',
      content: '',
      is_public_read: isPublic,
      is_public_write: false,
      timestamp_created: Math.floor(Date.now() / 1000),
      timestamp_modified: Math.floor(Date.now() / 1000)
    };

    notesStore.setNotes([newNote, ...notesStore.notes]);
    notesStore.selectNote(tempId);

    this.enqueueOperation({
      id: tempId,
      type: 'CREATE',
      status: 'PENDING',
      data: {
        title: newNote.title,
        content: newNote.content,
        is_public_read: newNote.is_public_read,
        is_public_write: newNote.is_public_write
      },
      retryCount: 0,
      timestamp: Date.now()
    });
  }

  static async updateNote(id: number, data: Partial<UpdateNoteRequest>) {
    const now = Math.floor(Date.now() / 1000);
    notesStore.updateNoteInList(id, { ...data, timestamp_modified: now });
    notesStore.setSyncing(id, true);

    const existingTimeout = saveTimeouts.get(id);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeout = setTimeout(() => {
      const currentNote = notesStore.notes.find(n => n.note_id === id);
      if (!currentNote) return;

      this.enqueueOperation({
        id,
        type: 'UPDATE',
        status: 'PENDING',
        data: {
          content: currentNote.content,
          title: currentNote.title,
          is_public_read: currentNote.is_public_read,
          is_public_write: currentNote.is_public_write
        },
        retryCount: 0,
        timestamp: Date.now()
      });
    }, 1500);
    
    saveTimeouts.set(id, timeout);
  }

  static async deleteNote(id: number) {
    notesStore.removeNoteFromList(id);
    for (let i = syncQueue.length - 1; i >= 0; i--) {
      if (syncQueue[i].id === id && syncQueue[i].type === 'UPDATE') {
        syncQueue.splice(i, 1);
      }
    }
    this.enqueueOperation({
      id,
      type: 'DELETE',
      status: 'PENDING',
      retryCount: 0,
      timestamp: Date.now()
    });
  }

  private static enqueueOperation(op: SyncOperation) {
    if (op.type === 'UPDATE') {
      const existingOp = syncQueue.find(o => o.id === op.id && o.type === 'UPDATE');
      if (existingOp) {
        existingOp.data = op.data;
        existingOp.timestamp = op.timestamp;
        return;
      }
    }
    syncQueue.push(op);
    this.processQueue();
  }

  private static async processQueue() {
    if (isProcessingQueue || syncQueue.length === 0) return;
    isProcessingQueue = true;

    while (syncQueue.length > 0) {
      // apiClient will internally wait for backoff and enforce 1s gap
      const op = syncQueue[0];
      try {
        if (op.type === 'CREATE') {
          if (op.status === 'PENDING') {
            await NotesApi.create(op.data);
            op.status = 'CREATED';
          }
          
          const existingIds = new Set(notesStore.notes.map(n => n.note_id).filter(id => id > 0));
          await this.loadNotes(true);
          
          let resolvedAny = false;
          for (let i = 0; i < syncQueue.length; i++) {
            const currentOp = syncQueue[i];
            if (currentOp.type === 'CREATE' && currentOp.status === 'CREATED') {
              const newestNote = notesStore.notes.find(n => n.note_id > 0 && !existingIds.has(n.note_id));
              if (newestNote) {
                const oldId = currentOp.id;
                const newId = newestNote.note_id;
                notesStore.replaceNoteId(oldId, newId);
                (currentOp as any).resolved = true;
                resolvedAny = true;
                existingIds.add(newId);
              }
            }
          }

          if (resolvedAny) {
            for (let i = syncQueue.length - 1; i >= 0; i--) {
              if ((syncQueue[i] as any).resolved) {
                syncQueue.splice(i, 1);
                notesStore.isCreating = false;
              }
            }
          } else {
            throw new Error('RETRY_LOAD_FOR_ID');
          }
        } else if (op.type === 'UPDATE') {
          if (op.id < 0) {
            syncQueue.shift();
            syncQueue.push(op);
            break; 
          }
          await NotesApi.update({ id: op.id, ...op.data });
          notesStore.setSyncing(op.id, false);
          syncQueue.shift();
        } else if (op.type === 'DELETE') {
          if (op.id > 0) {
            await NotesApi.delete(op.id);
          }
          syncQueue.shift();
        }
      } catch (error: any) {
        if (error.message === 'RATE_LIMIT_EXCEEDED' || error.message === 'RETRY_LOAD_FOR_ID') {
          // No need to call handleRateLimit here, apiClient.ts already did it
          op.retryCount++;
          if (op.retryCount > 20) {
             syncQueue.shift();
             notesStore.isCreating = false;
          }
          // The while loop in processQueue will re-run, 
          // and apiClient will block on the new backoff delay.
          continue; 
        } else {
          syncQueue.shift();
          notesStore.isCreating = false;
          if (op.type === 'UPDATE') notesStore.setSyncing(op.id, false);
        }
      }
    }

    isProcessingQueue = false;
  }
}
