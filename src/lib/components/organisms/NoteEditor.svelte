<script lang="ts">
  import { notesStore } from '$lib/stores/notes.svelte';
  import { NotesService } from '$lib/services/notes.service';

  let note = $derived(notesStore.selectedNote);

  function handleInput(type: 'title' | 'content', event: Event) {
    if (!note) return;
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    
    // Update store immediately for UI responsiveness (handled by service optimistic update)
    NotesService.updateNote(note.note_id, { [type]: value });
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
          <span>Created: {formatDate(note.timestamp_created)}</span>
          {#if note.timestamp_modified}
            <span class="dot">·</span>
            <span>Modified: {formatDate(note.timestamp_modified)}</span>
          {/if}
        </div>
      </div>
      
      <div class="editor-actions">
        <button class="delete-btn" onclick={() => NotesService.deleteNote(note.note_id)} title="Delete Note">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
      </div>
      <h2>Select a note to view</h2>
      <p>Choose a note from the sidebar or create a new one to get started.</p>
      <button class="primary-btn" onclick={() => NotesService.createNote()}>
        Create New Note
      </button>
    </div>
  {/if}
</div>

<style>
  .editor-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 2.5rem 4rem;
    max-width: 900px;
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
    font-size: 2.5rem;
    font-weight: 800;
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    margin-bottom: 0.75rem;
    padding: 0;
  }

  .title-input::placeholder {
    color: var(--text-tertiary);
  }

  .note-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-tertiary);
    font-size: 0.875rem;
    font-weight: 500;
  }

  .dot {
    font-weight: bold;
    color: var(--border-color);
  }

  .editor-actions {
    display: flex;
    gap: 0.5rem;
  }

  .delete-btn {
    color: var(--text-tertiary);
    padding: 0.5rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .delete-btn:hover {
    color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
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
    font-size: 1.125rem;
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
    margin-bottom: 1.5rem;
    opacity: 0.5;
  }

  .placeholder h2 {
    margin: 0 0 0.5rem;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .placeholder p {
    margin: 0 0 1.5rem;
    max-width: 250px;
    font-size: 0.95rem;
  }

  .primary-btn {
    background: var(--accent-primary);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  }

  .primary-btn:hover {
    background: var(--accent-secondary);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(59, 130, 246, 0.4);
  }

  @media (max-width: 1024px) {
    .editor-container {
      padding: 2rem;
    }
  }
</style>
