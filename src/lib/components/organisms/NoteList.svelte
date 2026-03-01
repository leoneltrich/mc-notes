<script lang="ts">
  import { notesStore } from '$lib/stores/notes.svelte';
  import { NotesService } from '$lib/services/notes.service';

  function handleSelect(id: number) {
    NotesService.selectNote(id);
  }

  function handleCreate() {
    NotesService.createNote();
  }
</script>

<div class="note-list">
  <div class="header">
    <div class="top-row">
      <h2>Notes</h2>
      <button class="create-btn" onclick={handleCreate}>+</button>
    </div>
    <div class="toggles">
      <button 
        class:active={notesStore.filterMode === 'mine'} 
        onclick={() => notesStore.filterMode = 'mine'}>
        My Notes
      </button>
      <button 
        class:active={notesStore.filterMode === 'public'} 
        onclick={() => notesStore.filterMode = 'public'}>
        Public
      </button>
    </div>
  </div>

  <ul>
    {#each notesStore.filteredNotes as note (note.note_id)}
      <li>
        <button 
          class="note-item" 
          class:selected={notesStore.selectedNoteId === note.note_id}
          onclick={() => handleSelect(note.note_id)}>
          <span class="title">{note.title || 'Untitled Note'}</span>
          <span class="preview">{note.content.slice(0, 50)}...</span>
        </button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .note-list {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .header {
    padding: 1rem;
    border-bottom: 1px solid #eee;
  }
  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .create-btn {
    padding: 0.25rem 0.75rem;
    font-size: 1.2rem;
    line-height: 1;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    flex: 1;
    overflow-y: auto;
  }
  .note-item {
    width: 100%;
    text-align: left;
    padding: 1rem;
    background: none;
    border: none;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
  }
  .note-item:hover {
    background-color: #fafafa;
  }
  .note-item.selected {
    background-color: #e6f7ff;
    border-left: 4px solid #1890ff;
  }
  .title {
    display: block;
    font-weight: bold;
    margin-bottom: 0.25rem;
  }
  .preview {
    color: #666;
    font-size: 0.9em;
  }
  .toggles {
    display: flex;
    gap: 0.5rem;
  }
  .toggles button {
    flex: 1;
    padding: 0.5rem;
    cursor: pointer;
  }
  .toggles button.active {
    background-color: #1890ff;
    color: white;
  }
</style>
