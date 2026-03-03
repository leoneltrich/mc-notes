<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { NotesService } from '$lib/services/notes.service';
  import NoteList from '$lib/components/organisms/NoteList.svelte';
  import NoteEditor from '$lib/components/organisms/NoteEditor.svelte';

  $effect(() => {
    if (authStore.isAuthenticated) {
      NotesService.loadNotes();
      NotesService.startPolling();
    } else {
      NotesService.stopPolling();
    }
  });

  onMount(() => {
    authStore.init();
  });

  onDestroy(() => {
    NotesService.stopPolling();
  });
</script>

{#if authStore.isLoading}
  <div class="loading">
    <div class="spinner"></div>
    <span>Checking session...</span>
  </div>
{:else if !authStore.isAuthenticated}
  <div class="auth-error">
    <div class="card">
      {#if authStore.isExpired}
        <h2>Session Expired</h2>
        <p>Your session has expired. Please log in again to the main application to continue.</p>
      {:else}
        <h2>Access Denied</h2>
        <p>Please log in to the main application to access your notes.</p>
      {/if}
      <div class="polling-hint">Checking for active session...</div>
    </div>
  </div>
{:else}
  <main class="app-container">
    <aside class="sidebar">
      <NoteList />
    </aside>
    <section class="main-content">
      <NoteEditor />
    </section>
  </main>
{/if}

<style>
  .loading, .auth-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background-color: var(--bg-secondary);
    color: var(--text-secondary);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .card {
    background: var(--bg-primary);
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: var(--shadow-md);
    text-align: center;
    max-width: 400px;
    border: 1px solid var(--border-color);
  }

  .card h2 {
    margin: 0 0 1rem;
    color: var(--text-primary);
    font-size: 1.5rem;
    letter-spacing: -0.02em;
  }

  .card p {
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }

  .polling-hint {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .app-container {
    display: grid;
    grid-template-columns: 320px 1fr;
    height: 100vh;
    width: 100vw;
    background-color: var(--bg-primary);
  }

  .sidebar {
    background-color: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .main-content {
    background-color: var(--bg-primary);
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .app-container {
      grid-template-columns: 1fr;
    }
    .sidebar {
      display: none;
    }
  }
</style>
