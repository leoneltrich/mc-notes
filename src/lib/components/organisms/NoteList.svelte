<script lang="ts">
  import { notesStore } from '$lib/stores/notes.svelte';
  import { NotesService } from '$lib/services/notes.service';

  function handleSelect(id: number) {
    NotesService.selectNote(id);
  }

  function handleCreate() {
    NotesService.createNote();
  }

  function formatRelativeTime(timestamp: number) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = Math.floor(timestamp - Date.now() / 1000);
    
    if (Math.abs(diff) < 60) return 'Just now';
    if (Math.abs(diff) < 3600) return rtf.format(Math.floor(diff / 60), 'minute');
    if (Math.abs(diff) < 86400) return rtf.format(Math.floor(diff / 3600), 'hour');
    return new Date(timestamp * 1000).toLocaleDateString();
  }
</script>

<div class="note-list-container">
  <header class="header">
    <div class="top-row">
      <h1>Notes</h1>
      <button class="create-btn" onclick={handleCreate} aria-label="Create new note">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
    </div>
    
    <div class="filter-tabs">
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
      <div class="active-indicator" style="left: {notesStore.filterMode === 'mine' ? '0' : '50%'}"></div>
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
              <div class="note-header">
                <span class="title">
                  {note.title || 'Untitled Note'}
                  {#if note.is_public_read}
                    <span class="public-badge" title="Public Note">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </span>
                  {/if}
                </span>
                <span class="time">{formatRelativeTime(note.timestamp_modified || note.timestamp_created)}</span>
              </div>
              <p class="preview">{note.content || 'No content'}</p>
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
    padding: 1.5rem 1.25rem 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
  }

  .create-btn {
    background: var(--accent-primary);
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  }

  .create-btn:hover {
    background: var(--accent-secondary);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(59, 130, 246, 0.4);
  }

  .filter-tabs {
    display: flex;
    position: relative;
    background: var(--bg-tertiary);
    border-radius: 8px;
    padding: 2px;
    margin-bottom: 0.5rem;
  }

  .filter-tabs button {
    flex: 1;
    padding: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    z-index: 1;
    border-radius: 6px;
  }

  .filter-tabs button.active {
    color: var(--text-primary);
  }

  .active-indicator {
    position: absolute;
    top: 2px;
    bottom: 2px;
    width: calc(50% - 2px);
    background: var(--bg-primary);
    border-radius: 6px;
    box-shadow: var(--shadow-sm);
    transition: left 0.2s ease;
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
    margin-bottom: 4px;
  }

  .note-item {
    width: 100%;
    text-align: left;
    padding: 1rem;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .note-item:hover {
    background-color: var(--bg-tertiary);
  }

  .note-item.selected {
    background-color: var(--accent-soft);
  }

  .note-item.selected .title {
    color: var(--accent-primary);
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
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .public-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  .time {
    color: var(--text-tertiary);
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .preview {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
  }

  .empty-state {
    padding: 3rem 1rem;
    text-align: center;
    color: var(--text-tertiary);
  }
</style>
