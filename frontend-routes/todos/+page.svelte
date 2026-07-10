<script>
  import { onMount } from 'svelte';
  import { JewelPage, Card, Button, Badge, Modal, toasts, EmptyState } from '@waiveo/ui';

  let todos = [];
  let stats = { total: 0, completed: 0, pending: 0 };
  let loading = true;
  let showAddModal = false;
  let showDeleteModal = false;
  let deletingTodoId = null;
  let newTodo = { title: '', description: '' };
  let adding = false;
  
  // JewelPage stats array
  $: jewelStats = [
    {
      label: 'Total Tasks',
      value: stats.total,
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'purple'
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'orange'
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'green'
    }
  ];
  
  // JewelPage actions array
  $: actions = [
    {
      label: 'Add Task',
      onClick: () => showAddModal = true,
      gradient: 'purple',
      icon: 'M12 4v16m8-8H4'
    }
  ];

  onMount(async () => {
    await loadTodos();
    await loadStats();
  });

  async function loadTodos() {
    loading = true;
    try {
      const response = await fetch('/api/extensions/todo-extension/todos');
      const data = await response.json();
      todos = data.todos || [];
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      loading = false;
    }
  }

  async function loadStats() {
    try {
      const response = await fetch('/api/extensions/todo-extension/stats');
      stats = await response.json();
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function addTodo() {
    if (!newTodo.title.trim()) return;

    adding = true;
    try {
      const response = await fetch('/api/extensions/todo-extension/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo)
      });

      if (response.ok) {
        newTodo = { title: '', description: '' };
        showAddModal = false;
        await loadTodos();
        await loadStats();
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    } finally {
      adding = false;
    }
  }

  async function toggleTodo(todo) {
    try {
      const response = await fetch(`/api/extensions/todo-extension/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed })
      });

      if (response.ok) {
        await loadTodos();
        await loadStats();
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  }

  function confirmDeleteTodo(id) {
    deletingTodoId = id;
    showDeleteModal = true;
  }

  async function deleteTodo() {
    if (!deletingTodoId) return;
    
    const id = deletingTodoId;
    showDeleteModal = false;
    deletingTodoId = null;

    try {
      const response = await fetch(`/api/extensions/todo-extension/todos/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toasts.success('Task deleted successfully');
        await loadTodos();
        await loadStats();
      } else {
        toasts.error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      toasts.error('Failed to delete task');
    }
  }
</script>

<svelte:head>
  <title>My Tasks - TODO Extension</title>
</svelte:head>

<JewelPage
  title="My Tasks"
  subtitle="Organize your tasks and boost productivity"
  icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
  iconGradient="purple"
  stats={jewelStats}
  {actions}
>

<!-- Todos List -->
<div class="jewel-mt-lg">
  {#if loading}
    <Card padding="lg">
      <div class="skeleton" style="height: 4rem; margin-bottom: 1rem;"></div>
      <div class="skeleton" style="height: 4rem; margin-bottom: 1rem;"></div>
      <div class="skeleton" style="height: 4rem;"></div>
    </Card>
  {:else if todos.length === 0}
    <EmptyState
      icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      title="No tasks yet"
      description="Click 'Add Task' to create your first todo"
    />
  {:else}
    <div class="todos-list">
      {#each todos as todo (todo.id)}
        <Card padding="lg" hover className="todo-card">
          <div class="todo-content">
            <button
              class="todo-checkbox"
              class:checked={todo.completed}
              aria-label={todo.completed ? 'Mark as pending' : 'Mark as done'}
              on:click={() => toggleTodo(todo)}
            >
              {#if todo.completed}
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              {/if}
            </button>

            <div class="todo-text" class:completed={todo.completed}>
              <h3 class="todo-title">{todo.title}</h3>
              {#if todo.description}
                <p class="todo-description">{todo.description}</p>
              {/if}
            </div>

            <div class="todo-actions">
              {#if todo.completed}
                <Badge variant="success" size="sm">Done</Badge>
              {:else}
                <Badge variant="warning" size="sm">Pending</Badge>
              {/if}
              <button class="delete-btn" aria-label="Delete task" on:click={() => confirmDeleteTodo(todo.id)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

</JewelPage>

<!-- Add Task Modal -->
<Modal bind:open={showAddModal} title="Add New Task" size="md">
  <div class="modal-form">
    <div class="form-group">
      <label for="title">Task Title</label>
      <input
        id="title"
        type="text"
        bind:value={newTodo.title}
        placeholder="Enter task title"
        class="input"
        on:keydown={(e) => e.key === 'Enter' && addTodo()}
      />
    </div>

    <div class="form-group">
      <label for="description">Description (optional)</label>
      <textarea
        id="description"
        bind:value={newTodo.description}
        placeholder="Add details..."
        rows="3"
        class="input"
      ></textarea>
    </div>
  </div>

  <svelte:fragment slot="footer">
    <Button variant="ghost" on:click={() => showAddModal = false}>Cancel</Button>
    <Button variant="primary" loading={adding} on:click={addTodo}>
      Add Task
    </Button>
  </svelte:fragment>
</Modal>

<!-- Delete Confirmation Modal -->
<Modal bind:open={showDeleteModal} title="Delete Task?" size="sm">
  <p>Are you sure you want to delete this task?</p>
  <p style="margin-top: 0.5rem; color: rgb(var(--color-text-secondary));">
    This action cannot be undone.
  </p>
  
  <svelte:fragment slot="footer">
    <Button variant="ghost" on:click={() => showDeleteModal = false}>
      Cancel
    </Button>
    <Button variant="danger" on:click={deleteTodo}>
      Delete Task
    </Button>
  </svelte:fragment>
</Modal>

<style>
  /* Minimal custom CSS - only todo-specific interactive elements */
  
  .todos-list {
    display: flex;
    flex-direction: column;
    gap: var(--jewel-space-md);
  }

  .todo-content {
    display: flex;
    align-items: flex-start;
    gap: var(--jewel-space-md);
  }

  .todo-checkbox {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    border: 2px solid rgb(var(--color-border));
    border-radius: var(--jewel-radius-md);
    background: rgb(var(--color-surface));
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .todo-checkbox:hover {
    border-color: rgb(var(--color-primary));
  }

  .todo-checkbox.checked {
    background: rgb(var(--color-success));
    border-color: rgb(var(--color-success));
  }

  .todo-checkbox svg {
    width: 1rem;
    height: 1rem;
    color: white;
  }

  .todo-text {
    flex: 1;
  }

  .todo-text.completed {
    opacity: 0.5;
  }

  .todo-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
    color: rgb(var(--color-text));
  }

  .todo-text.completed .todo-title {
    text-decoration: line-through;
  }

  .todo-description {
    font-size: 0.875rem;
    color: rgb(var(--color-text-secondary));
    margin: 0;
  }

  .todo-actions {
    display: flex;
    align-items: center;
    gap: var(--jewel-space-sm);
  }

  .delete-btn {
    padding: var(--jewel-space-xs);
    background: none;
    border: none;
    color: rgb(var(--color-text-tertiary));
    cursor: pointer;
    border-radius: var(--jewel-radius-md);
    transition: all 0.15s ease;
  }

  .delete-btn:hover {
    background: rgb(var(--color-error) / 0.1);
    color: rgb(var(--color-error));
  }

  .delete-btn svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: var(--jewel-space-lg);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--jewel-space-xs);
  }

  .form-group label {
    font-weight: 500;
    color: rgb(var(--color-text));
  }

  .input,
  textarea {
    padding: var(--jewel-space-md);
    border: 1px solid rgb(var(--color-border));
    border-radius: var(--jewel-radius-lg);
    background: rgb(var(--color-surface));
    color: rgb(var(--color-text));
    font-size: 1rem;
    font-family: inherit;
    transition: all 0.2s ease;
    resize: vertical;
  }

  .input:focus,
  textarea:focus {
    outline: none;
    border-color: rgb(var(--color-primary));
    box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.1);
  }

  .skeleton {
    background: rgb(var(--color-border));
    border-radius: var(--jewel-radius-lg);
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>

