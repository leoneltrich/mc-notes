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

const POLL_INTERVAL = 30000;
const saveTimeouts = new Map<number, ReturnType<typeof setTimeout>>();
let activeLoadPromise: Promise<void> | null = null;

export class NotesService {
  private static scheduleNextPoll() {
    if (pollTimeout) clearTimeout(pollTimeout);
    pollTimeout = setTimeout(() => {
      this.loadNotes(true).catch(() => {});
    }, POLL_INTERVAL);
  }

  static async loadNotes(silent = false, force = false) {
    if (!authStore.isAuthenticated) return;
    if (silent && !force && isBackingOff()) return;

    if (activeLoadPromise) return activeLoadPromise;
    if (!silent && !force && notesStore.isLoaded) return;

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
      } catch (error: any) {
        if (error.message !== 'RATE_LIMIT_EXCEEDED') {
           console.error('[Sync] loadNotes error:', error);
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
    }, 1000); 
    
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

    try {
      let rotations = 0;
      while (syncQueue.length > 0 && rotations < syncQueue.length) {
        const op = syncQueue[0];

        try {
          // 1. GREEDY CREATE
          if (op.type === 'CREATE' && op.status === 'PENDING') {
            await NotesApi.create(op.data);
            op.status = 'CREATED';
            rotations = 0;
            
            const nextOp = syncQueue[1];
            if (nextOp && nextOp.type === 'CREATE' && nextOp.status === 'PENDING') {
              syncQueue.push(syncQueue.shift()!);
              continue;
            }
          }

          // 2. BATCH RESOLUTION
          if (op.type === 'CREATE' && op.status === 'CREATED') {
            const existingIds = new Set(notesStore.notes.map(n => n.note_id).filter(id => id > 0));
            await this.loadNotes(true, true); 
            
            let resolvedCount = 0;
            for (let i = syncQueue.length - 1; i >= 0; i--) {
              const currentOp = syncQueue[i];
              if (currentOp.type === 'CREATE' && currentOp.status === 'CREATED') {
                const newestNote = notesStore.notes.find(n => n.note_id > 0 && !existingIds.has(n.note_id));
                if (newestNote) {
                  notesStore.replaceNoteId(currentOp.id, newestNote.note_id);
                  syncQueue.splice(i, 1);
                  existingIds.add(newestNote.note_id);
                  resolvedCount++;
                }
              }
            }

            if (resolvedCount > 0) {
              notesStore.isCreating = false;
              rotations = 0;
              continue;
            } else {
              syncQueue.push(syncQueue.shift()!);
              rotations++;
              continue;
            }
          }

          // 3. NORMAL OPERATIONS
          if (op.type === 'UPDATE') {
            if (op.id < 0) {
              const hasCreate = syncQueue.some(o => o.id === op.id && o.type === 'CREATE');
              if (!hasCreate) {
                syncQueue.shift();
                notesStore.setSyncing(op.id, false);
                rotations = 0;
                continue;
              }
              syncQueue.push(syncQueue.shift()!);
              rotations++;
              continue; 
            }
            await NotesApi.update({ id: op.id, ...op.data });
            notesStore.setSyncing(op.id, false);
            syncQueue.shift();
            rotations = 0;
          } else if (op.type === 'DELETE') {
            if (op.id > 0) {
              await NotesApi.delete(op.id);
            }
            syncQueue.shift();
            rotations = 0;
          }
        } catch (error: any) {
          if (error.message === 'RATE_LIMIT_EXCEEDED' || error.message === 'RETRY_LOAD_FOR_ID') {
            //ApiClient handled the wait, we just continue to let it retry next loop turn
            rotations = 0; // Reset rotations so we don't accidentally exit while retrying
            continue; 
          } else {
            console.error(`[Sync] Permanent failure for ${op.type}:`, error);
            const failedOp = syncQueue.shift();
            if (failedOp?.type === 'UPDATE') notesStore.setSyncing(failedOp.id, false);
            if (failedOp?.type === 'CREATE') notesStore.isCreating = false;
            rotations = 0;
          }
        }
      }
    } finally {
      isProcessingQueue = false;
      // If queue is still not empty (e.g. rotations hit limit), schedule a resume
      if (syncQueue.length > 0) {
        setTimeout(() => this.processQueue(), 2000);
      } else {
        // Queue is empty, final refresh to ensure consistency
        this.loadNotes(true, true).catch(() => {});
      }
    }
  }
}
