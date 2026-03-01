<script lang="ts">
  import { notesStore } from '$lib/stores/notes.svelte';
  import { NotesService } from '$lib/services/notes.service';

  let note = $derived(notesStore.selectedNote);

  function handleInput(type: 'title' | 'content', event: Event) {
    if (!note) return;
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    NotesService.updateNote(note.note_id, { [type]: value });
  }

  function handleToggle(field: 'is_public_read' | 'is_public_write') {
    if (!note) return;
    NotesService.updateNote(note.note_id, { [field]: !note[field] });
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="editor-container">
  {#if note}
    <header class="editor-header">
      <div class="header-content">
        <input 
          class="title-input" 
          value={note.title} 
          placeholder="Untitled Note" 
          oninput={(e) => handleInput('title', e)} 
        />
        <div class="note-meta">
          <div class="timestamps">
            <span>{formatDate(note.timestamp_created)}</span>
            {#if note.timestamp_modified}
              <span class="dot">·</span>
              <span>Edited: {formatDate(note.timestamp_modified)}</span>
            {/if}
          </div>
          <div class="share-options">
            <button 
              class="share-toggle" 
              class:active={note.is_public_read}
              onclick={() => handleToggle('is_public_read')}
              title="Public Read">
              Public Read
            </button>
            <button 
              class="share-toggle" 
              class:active={note.is_public_write}
              onclick={() => handleToggle('is_public_write')}
              title="Public Write">
              Public Write
            </button>
          </div>
        </div>
      </div>
      
      <div class="editor-actions">
        <button class="delete-btn" onclick={() => NotesService.deleteNote(note.note_id)} title="Delete Note">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    </header>

    <div class="editor-content">
      <textarea 
        class="content-input" 
        oninput={(e) => handleInput('content', e)}
        placeholder="Start writing..."
      >{note.content}</textarea>
    </div>
  {:else}
    <div class="placeholder">
      <div class="placeholder-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
      </div>
      <h2>Select a note</h2>
      <p>Choose from the sidebar or create a new one.</p>
      <button class="primary-btn" onclick={() => NotesService.createNote()}>
        New Note
      </button>
    </div>
  {/if}
</div>

<style>
  .editor-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 2rem 3rem;
    max-width: 800px;
    margin: 0 auto;
    position: relative;
  }

  .editor-header {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--divider-color);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .header-content {
    flex: 1;
  }

  .title-input {
    font-size: 2rem;
    font-weight: 700;
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    margin-bottom: 1rem;
    padding: 0;
    letter-spacing: -0.02em;
  }

  .title-input::placeholder {
    color: var(--text-tertiary);
  }

  .note-meta {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .timestamps {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--text-tertiary);
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dot {
    font-weight: bold;
    color: var(--border-color);
  }

  .share-options {
    display: flex;
    gap: 0.5rem;
  }

  .share-toggle {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.25rem 0.6rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .share-toggle.active {
    background: var(--text-primary);
    color: var(--bg-primary);
    border-color: var(--text-primary);
  }

  .editor-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .delete-btn {
    color: var(--text-tertiary);
    padding: 0.4rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-btn:hover {
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
  }

  .editor-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .content-input {
    flex: 1;
    width: 100%;
    resize: none;
    border: none;
    outline: none;
    background: transparent;
    font-size: 1rem;
    line-height: 1.6;
    color: var(--text-secondary);
    padding: 0;
  }

  .content-input::placeholder {
    color: var(--text-tertiary);
  }

  .placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
    text-align: center;
  }

  .placeholder-icon {
    margin-bottom: 1.25rem;
    opacity: 0.3;
  }

  .placeholder h2 {
    margin: 0 0 0.25rem;
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 1.25rem;
  }

  .placeholder p {
    margin: 0 0 1.5rem;
    max-width: 250px;
    font-size: 0.85rem;
  }

  .primary-btn {
    background: var(--text-primary);
    color: var(--bg-primary);
    padding: 0.6rem 1.25rem;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .primary-btn:hover {
    background: var(--accent-secondary);
  }

  @media (max-width: 1024px) {
    .editor-container {
      padding: 1.5rem;
    }
  }
</style>
