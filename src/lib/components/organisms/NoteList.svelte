<script lang="ts">
  import { notesStore } from '$lib/stores/notes.svelte';

  function handleSelect(id: number) {
    notesStore.selectNote(id);
  }
</script>

<div class="note-list">
  <div class="header">
    <h2>Notes</h2>
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
    margin-top: 0.5rem;
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
