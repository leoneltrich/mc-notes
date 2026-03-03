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
      {#if !authStore.isAppRunning}
        <h2>Main App Required</h2>
        <p>Please start the <strong>ServeMe Main App</strong> to continue.</p>
      {:else if !authStore.hasSession || authStore.isExpired}
        <h2>Authentication Required</h2>
        <p>Please log in to the <strong>ServeMe Main App</strong> to access your notes.</p>
      {:else if authStore.technicalError}
        <h2>Configuration Error</h2>
        <p>There was a problem accessing your security credentials.</p>
        <div class="subtle-error">
          <code>{authStore.technicalError}</code>
        </div>
      {:else}
        <h2>Access Denied</h2>
        <p>Please log in to the main application to access your notes.</p>
      {/if}
      
      <div class="polling-status">
        <span class="pulse"></span>
        Waiting for active session...
      </div>
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
    border-top-color: var(--text-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .card {
    background: var(--bg-primary);
    padding: 3rem;
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
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .card p {
    margin-bottom: 0;
    line-height: 1.6;
    font-size: 0.95rem;
    color: var(--text-secondary);
  }

  .subtle-error {
    margin-top: 1.5rem;
    font-size: 0.7rem;
    color: var(--text-tertiary);
    opacity: 0.6;
    background: var(--bg-tertiary);
    padding: 0.5rem;
    border-radius: 4px;
    word-break: break-all;
    font-family: monospace;
  }

  .polling-status {
    margin-top: 2.5rem;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .pulse {
    width: 6px;
    height: 6px;
    background-color: var(--text-tertiary);
    border-radius: 50%;
    display: inline-block;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.95); opacity: 0.5; }
    50% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(0.95); opacity: 0.5; }
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
