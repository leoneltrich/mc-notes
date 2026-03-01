<script lang="ts">
  import { notesStore } from '$lib/stores/notes.svelte';
  import { NotesService } from '$lib/services/notes.service';

  let note = $derived(notesStore.selectedNote);
  let timeout: ReturnType<typeof setTimeout>;

  function handleInput(type: 'title' | 'content', event: Event) {
    if (!note) return;
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    
    // Update store immediately for UI responsiveness (handled by service optimistic update)
    NotesService.updateNote(note.note_id, { [type]: value });
  }
</script>

<div class="editor">
  {#if note}
    <div class="toolbar">
      <input 
        class="title-input" 
        value={note.title} 
        placeholder="Title" 
        oninput={(e) => handleInput('title', e)} 
      />
      <span class="meta">Created: {new Date(note.timestamp_created * 1000).toLocaleDateString()}</span>
    </div>
    <textarea 
      class="content-input" 
      value={note.content} 
      oninput={(e) => handleInput('content', e)}
    ></textarea>
  {:else}
    <div class="placeholder">
      <p>Select a note to view</p>
    </div>
  {/if}
</div>

<style>
  .editor {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .toolbar {
    padding-bottom: 1rem;
    border-bottom: 1px solid #eee;
    margin-bottom: 1rem;
  }
  .title-input {
    font-size: 1.5rem;
    font-weight: bold;
    width: 100%;
    border: none;
    outline: none;
  }
  .content-input {
    flex: 1;
    width: 100%;
    resize: none;
    border: none;
    outline: none;
    font-size: 1rem;
    line-height: 1.5;
  }
  .placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
  }
</style>
