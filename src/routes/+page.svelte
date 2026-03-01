<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { notesStore } from '$lib/stores/notes.svelte';
  import NoteList from '$lib/components/organisms/NoteList.svelte';
  import NoteEditor from '$lib/components/organisms/NoteEditor.svelte';

  $effect(() => {
    authStore.init().then(() => {
      if (authStore.isAuthenticated) {
        notesStore.fetchNotes();
      }
    });
  });
</script>

{#if authStore.isLoading}
  <div class="loading">Loading...</div>
{:else if !authStore.isAuthenticated}
  <div class="auth-error">
    <h2>Access Denied</h2>
    <p>Please log in to the main application to access your notes.</p>
  </div>
{:else}
  <div class="page-container">
    <div class="left-pane">
      <NoteList />
    </div>
    <div class="right-pane">
      <NoteEditor />
    </div>
  </div>
{/if}

<style>
  .loading, .auth-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
  }
  .page-container {
    display: grid;
    grid-template-columns: 1fr 2fr;
    height: 100vh;
    width: 100vw;
  }
  .left-pane {
    border-right: 1px solid #e0e0e0;
    overflow: hidden;
  }
  .right-pane {
    padding: 2rem;
    overflow: hidden;
  }
</style>
