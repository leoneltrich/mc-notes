<script lang="ts">
  import { notesStore } from '$lib/stores/notes.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { NotesService } from '$lib/services/notes.service';

  function handleSelect(id: number) {
    NotesService.selectNote(id);
  }

  function handleCreate() {
    const isPublic = notesStore.filterMode === 'public';
    NotesService.createNote(isPublic);
  }

  function formatRelativeTime(timestamp: number) {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });
    const diff = Math.floor(timestamp - Date.now() / 1000);
    
    if (Math.abs(diff) < 60) return 'now';
    if (Math.abs(diff) < 3600) return rtf.format(Math.floor(diff / 60), 'minute');
    if (Math.abs(diff) < 86400) return rtf.format(Math.floor(diff / 3600), 'hour');
    return new Date(timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function getShortOwnerId(ownerId: string) {
    if (ownerId === authStore.userId) return 'You';
    return ownerId.length > 8 ? ownerId.slice(0, 4) + '...' + ownerId.slice(-4) : ownerId;
  }
</script>

<div class="note-list-container">
  <header class="header">
    <div class="top-row">
      <h1>Notes</h1>
      <button class="create-btn" onclick={handleCreate} aria-label="Create new note">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
    </div>
    
    <div class="filter-tabs">
      <div class="active-indicator" style="transform: translateX({notesStore.filterMode === 'mine' ? '0%' : '100%'})"></div>
      <button 
        class:active={notesStore.filterMode === 'mine'} 
        onclick={() => notesStore.filterMode = 'mine'}>
        Personal
      </button>
      <button 
        class:active={notesStore.filterMode === 'public'} 
        onclick={() => notesStore.filterMode = 'public'}>
        Shared
      </button>
    </div>
  </header>

  <div class="notes-scroll-area">
    {#if notesStore.filteredNotes.length === 0}
      <div class="empty-state">
        <p>No notes found</p>
      </div>
    {:else}
      <ul class="notes-list">
        {#each notesStore.filteredNotes as note (note.note_id)}
          <li class="note-item-wrapper">
            <button 
              class="note-item" 
              class:selected={notesStore.selectedNoteId === note.note_id}
              onclick={() => handleSelect(note.note_id)}>
              <span class="note-header">
                <span class="title">
                  {note.title || 'Untitled Note'}
                  <span class="status-indicators">
                    {#if note.is_public_read}
                      <span class="status-dot" title="Public (Read-only)">R</span>
                    {/if}
                    {#if note.is_public_write}
                      <span class="status-dot write" title="Public (Writable)">W</span>
                    {/if}
                  </span>
                </span>
                <span class="time">{formatRelativeTime(note.timestamp_modified || note.timestamp_created)}</span>
              </span>
              <span class="preview">{note.content || 'No content'}</span>
              
              {#if notesStore.filterMode === 'public'}
                <span class="owner-badge" class:is-me={note.owner_id === authStore.userId}>
                  {getShortOwnerId(note.owner_id)}
                </span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .note-list-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .header {
    padding: 1.25rem 1rem 0.75rem;
    border-bottom: 1px solid var(--border-color);
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  h1 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .create-btn {
    background: var(--text-primary);
    color: var(--bg-primary);
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .create-btn:hover {
    background: var(--accent-secondary);
  }

  .filter-tabs {
    display: flex;
    position: relative;
    background: var(--bg-tertiary);
    border-radius: 6px;
    padding: 2px;
    margin-bottom: 0.25rem;
  }

  .filter-tabs button {
    flex: 1;
    padding: 0.35rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    z-index: 1;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .filter-tabs button.active {
    color: var(--text-primary);
  }

  .active-indicator {
    position: absolute;
    top: 2px;
    left: 2px;
    bottom: 2px;
    width: calc(50% - 2px);
    background: var(--bg-primary);
    border-radius: 4px;
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .notes-scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .notes-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .note-item-wrapper {
    margin-bottom: 2px;
  }

  .note-item {
    width: 100%;
    text-align: left;
    padding: 0.85rem;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    position: relative;
    border: none;
    background: transparent;
  }

  .note-item:hover {
    background-color: var(--bg-secondary);
  }

  .note-item.selected {
    background-color: var(--accent-soft);
  }

  .note-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .title {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-indicators {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  .status-dot {
    font-size: 0.6rem;
    font-weight: 800;
    width: 12px;
    height: 12px;
    background: var(--border-color);
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    line-height: 1;
  }

  .status-dot.write {
    background: var(--text-secondary);
    color: var(--bg-primary);
  }

  .time {
    color: var(--text-tertiary);
    font-size: 0.65rem;
    font-weight: 500;
    white-space: nowrap;
    margin-top: 0.15rem;
  }

  .preview {
    color: var(--text-secondary);
    font-size: 0.8rem;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
    padding-bottom: 0.5rem; /* Space for the badge */
  }

  .owner-badge {
    position: absolute;
    bottom: 0.6rem;
    right: 0.6rem;
    font-size: 0.6rem;
    color: var(--text-tertiary);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.15rem 0.4rem;
    background: var(--bg-tertiary);
    border-radius: 4px;
    opacity: 0.8;
  }

  .owner-badge.is-me {
    background: var(--text-primary);
    color: var(--bg-primary);
    opacity: 1;
  }

  .empty-state {
    padding: 3rem 1rem;
    text-align: center;
    color: var(--text-tertiary);
    font-size: 0.875rem;
  }
</style>
