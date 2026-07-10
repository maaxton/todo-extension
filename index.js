/**
 * TODO Extension — SDK v2
 * Task management with CRUD, stats, automation, and events.
 */

// ============================================
// Report Formatters (pure helpers, no ctx needed)
// ============================================

function formatReportAsText(report) {
  let text = `TODO Status Report - ${report.type}\n`;
  text += `Generated: ${report.generatedAt}\n`;
  text += '\n=== Statistics ===\n';
  text += `Total: ${report.stats.total}\n`;
  text += `Completed: ${report.stats.completed}\n`;
  text += `Pending: ${report.stats.pending}\n`;

  if (report.todos) {
    text += '\n=== All Todos ===\n';
    report.todos.forEach((todo) => {
      text += `- [${todo.completed ? 'x' : ' '}] ${todo.title}\n`;
    });
  }

  if (report.overdueTodos) {
    text += `\n=== Overdue Todos (${report.overdueCount}) ===\n`;
    report.overdueTodos.forEach((todo) => {
      text += `- ${todo.title} (created: ${todo.created_at})\n`;
    });
  }

  if (report.upcomingTodos) {
    text += `\n=== Upcoming Todos (${report.upcomingCount}) ===\n`;
    report.upcomingTodos.forEach((todo) => {
      text += `- ${todo.title}\n`;
    });
  }

  return text;
}

function formatReportAsHtml(report) {
  let html = '<div class="todo-report">';
  html += `<h2>TODO Status Report - ${report.type}</h2>`;
  html += `<p>Generated: ${report.generatedAt}</p>`;
  html += '<h3>Statistics</h3>';
  html += '<ul>';
  html += `<li>Total: ${report.stats.total}</li>`;
  html += `<li>Completed: ${report.stats.completed}</li>`;
  html += `<li>Pending: ${report.stats.pending}</li>`;
  html += '</ul>';

  if (report.todos) {
    html += '<h3>All Todos</h3><ul>';
    report.todos.forEach((todo) => {
      html += `<li>${todo.completed ? '\u2713' : '\u25CB'} ${todo.title}</li>`;
    });
    html += '</ul>';
  }

  if (report.overdueTodos) {
    html += `<h3>Overdue Todos (${report.overdueCount})</h3><ul>`;
    report.overdueTodos.forEach((todo) => {
      html += `<li>${todo.title} <small>(created: ${todo.created_at})</small></li>`;
    });
    html += '</ul>';
  }

  if (report.upcomingTodos) {
    html += `<h3>Upcoming Todos (${report.upcomingCount})</h3><ul>`;
    report.upcomingTodos.forEach((todo) => {
      html += `<li>${todo.title}</li>`;
    });
    html += '</ul>';
  }

  html += '</div>';
  return html;
}

// ============================================
// Extension Definition
// ============================================

export default {
  // === Identity ===
  name: 'todo-extension',
  version: '2.0.0',
  description: 'TODO list extension with task management, stats, and automation',
  provides: ['task-management', 'todo-list'],

  // === Navigation ===
  nav: [
    {
      label: 'My Tasks',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      path: '/ext/todo-extension/list',
      order: 1,
    },
  ],

  // === Database tables ===
  data: {
    todo_items: {
      table: 'todo_items', // use v1 table name (no prefix)
      fields: {
        title: 'string:required',
        description: 'text',
        completed: 'boolean:default(false)',
      },
    },
  },

  // === Automation trigger templates (spec §5.2 canonical-shape fold) ===
  // UI trigger-picker metadata, folded in from the deleted automation.json
  // sidecar — read in-memory by the automation extension's GET /triggers via
  // the platform ActionRegistry (ExtensionLoader Step 10.5b), not a file scan.
  automations: {
    triggers: [
      {
        key: 'todo_created',
        label: 'Todo created',
        description: 'Fires when a new todo item is created',
        fields: [],
        output: ['todoId', 'title', 'description'],
      },
      {
        key: 'todo_completed',
        label: 'Todo completed',
        description: 'Fires when a todo item is marked as complete',
        fields: [],
        output: ['todoId', 'title', 'completedAt'],
      },
      {
        key: 'todo_deleted',
        label: 'Todo deleted',
        description: 'Fires when a todo item is deleted',
        fields: [],
        output: ['todoId', 'title'],
      },
    ],
  },

  // === Custom events ===
  events: {
    todo_created: {
      label: 'Todo created',
      data: { todoId: 'number', title: 'string', description: 'string' },
    },
    todo_completed: {
      label: 'Todo completed',
      data: { todoId: 'number', title: 'string', completedAt: 'string' },
    },
    todo_deleted: {
      label: 'Todo deleted',
      data: { todoId: 'number', title: 'string' },
    },
  },

  // === Services (inter-extension API) ===
  services: {
    listTodos: async (ctx) => {
      return await ctx.data.todo_items.findAll({ orderBy: { created_at: 'DESC' } });
    },

    getTodo: async (ctx, { id }) => {
      return await ctx.data.todo_items.findOne({ id });
    },

    getStats: async (ctx) => {
      const total = await ctx.data.todo_items.count();
      const completed = await ctx.data.todo_items.count({ completed: 1 });
      return { total, completed, pending: total - completed };
    },

    createTodo: async (ctx, {
      title, description, priority, dueDate,
    }) => {
      if (!title || title.trim() === '') {
        throw new Error('Title is required');
      }
      const todo = await ctx.data.todo_items.create({
        title,
        description: description || '',
        completed: false,
      });
      ctx.emit('todo_created', {
        todoId: todo.id,
        title,
        description: description || '',
      });
      return {
        success: true, message: `Created todo: ${title}`, todoId: todo.id, todo,
      };
    },

    completeTodo: async (ctx, { todoId, notes }) => {
      if (!todoId) throw new Error('Todo ID is required');
      const todo = await ctx.data.todo_items.findOne({ id: todoId });
      if (!todo) throw new Error(`Todo ${todoId} not found`);
      await ctx.data.todo_items.update({ id: todoId }, { completed: true });
      ctx.emit('todo_completed', {
        todoId,
        title: todo.title,
        completedAt: new Date().toISOString(),
      });
      return {
        success: true, message: `Completed todo: ${todo.title}`, todoId, notes,
      };
    },

    deleteOldTodos: async (ctx, { daysOld, confirmDelete }) => {
      if (confirmDelete !== 'yes') {
        return { success: false, message: 'Deletion not confirmed' };
      }
      if (!daysOld || daysOld < 1) {
        throw new Error('Days old must be at least 1');
      }
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const oldTodos = await ctx.data.query('todo_items')
        .where('completed', '=', 1)
        .where('created_at', '<', cutoffDate)
        .get();
      for (const todo of oldTodos) {
        await ctx.data.todo_items.delete({ id: todo.id });
      }
      return { success: true, message: `Deleted ${oldTodos.length} old completed todos`, deletedCount: oldTodos.length };
    },

    updateTodoPriority: async (ctx, { todoId, priority }) => {
      if (!todoId) throw new Error('Todo ID is required');
      if (!priority) throw new Error('Priority is required');
      const todo = await ctx.data.todo_items.findOne({ id: todoId });
      if (!todo) throw new Error(`Todo ${todoId} not found`);
      // Strip any existing [Priority: ...] tag before prepending the new one
      const baseDesc = (todo.description || '').replace(/^\[Priority:[^\]]*\]\s*/i, '');
      const updatedDesc = `[Priority: ${priority}] ${baseDesc}`;
      await ctx.data.todo_items.update({ id: todoId }, { description: updatedDesc });
      return {
        success: true, message: `Updated priority to ${priority} for: ${todo.title}`, todoId, priority,
      };
    },

    sendTodoReport: async (ctx, { reportType, format }) => {
      const total = await ctx.data.todo_items.count();
      const completed = await ctx.data.todo_items.count({ completed: 1 });
      const pending = await ctx.data.todo_items.count({ completed: 0 });
      const stats = { total, completed, pending };

      const report = { type: reportType, generatedAt: new Date().toISOString(), stats };

      if (reportType === 'detailed') {
        report.todos = await ctx.data.todo_items.findAll({ orderBy: { created_at: 'DESC' } });
      } else if (reportType === 'overdue') {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        const overdue = await ctx.data.query('todo_items')
          .where('completed', '=', 0)
          .where('created_at', '<', cutoffDate)
          .get();
        report.overdueTodos = overdue;
        report.overdueCount = overdue.length;
      } else if (reportType === 'upcoming') {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        const upcoming = await ctx.data.query('todo_items')
          .where('completed', '=', 0)
          .where('created_at', '>', cutoffDate)
          .get();
        report.upcomingTodos = upcoming;
        report.upcomingCount = upcoming.length;
      }

      let formattedReport;
      if (format === 'text') {
        formattedReport = formatReportAsText(report);
      } else if (format === 'html') {
        formattedReport = formatReportAsHtml(report);
      } else {
        formattedReport = report;
      }

      return { success: true, message: `Generated ${reportType} report in ${format} format`, report: formattedReport };
    },
  },

  // === HTTP routes ===
  routes: {
    // List all todos (supports ?completed=true/false/1/0 query param)
    'GET /todos': async (ctx) => {
      const options = { orderBy: { created_at: 'DESC' } };
      const { completed } = ctx.query;
      if (completed !== undefined) {
        // Accept true/1 as completed, false/0 as pending
        const completedValue = completed === 'true' || completed === '1' ? 1 : 0;
        options.where = { completed: completedValue };
      }
      const todos = await ctx.data.todo_items.findAll(options);
      return { todos, count: todos.length };
    },

    // Bulk operations: complete or delete multiple todos.
    // NOTE (#1652): bulk routes MUST be registered before the '/todos/:id'
    // routes — Express matches in registration order, so '/todos/bulk' would
    // otherwise be captured by ':id' with id="bulk" and never reach these
    // handlers (the e2e saw 200 + {error:'Todo not found'} with no `deleted`).
    'POST /todos/bulk': async (ctx) => {
      const { ids, action } = ctx.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        ctx.status = 400;
        return { error: 'ids must be a non-empty array' };
      }
      if (!action || !['complete', 'incomplete'].includes(action)) {
        ctx.status = 400;
        return { error: 'action must be "complete" or "incomplete"' };
      }
      const completedValue = action === 'complete' ? 1 : 0;
      let updated = 0;
      for (const id of ids) {
        const todo = await ctx.data.todo_items.findOne({ id });
        if (todo) {
          await ctx.data.todo_items.update({ id }, { completed: completedValue });
          if (completedValue) {
            ctx.emit('todo_completed', {
              todoId: Number(id),
              title: todo.title,
              completedAt: new Date().toISOString(),
            });
          }
          updated++;
        }
      }
      return { success: true, action, updated };
    },

    // Bulk delete multiple todos (see registration-order NOTE above)
    'DELETE /todos/bulk': async (ctx) => {
      const { ids } = ctx.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        ctx.status = 400;
        return { error: 'ids must be a non-empty array' };
      }
      let deleted = 0;
      for (const id of ids) {
        const todo = await ctx.data.todo_items.findOne({ id });
        if (todo) {
          await ctx.data.todo_items.delete({ id });
          ctx.emit('todo_deleted', {
            todoId: Number(id),
            title: todo.title,
          });
          deleted++;
        }
      }
      return { success: true, deleted };
    },

    // Get specific todo
    'GET /todos/:id': async (ctx) => {
      const todo = await ctx.data.todo_items.findOne({ id: ctx.params.id });
      if (!todo) {
        ctx.status = 404;
        return { error: 'Todo not found' };
      }
      return todo;
    },

    // Create new todo
    'POST /todos': async (ctx) => {
      const { title, description } = ctx.body;
      if (!title || title.trim() === '') {
        ctx.status = 400;
        return { error: 'Title is required' };
      }
      const todo = await ctx.data.todo_items.create({
        title,
        description: description || '',
      });
      ctx.emit('todo_created', {
        todoId: todo.id,
        title,
        description: description || '',
      });
      return { success: true, todo };
    },

    // Update todo
    'PUT /todos/:id': async (ctx) => {
      const { title, description, completed } = ctx.body;
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (completed !== undefined) updateData.completed = completed;

      if (Object.keys(updateData).length === 0) {
        ctx.status = 400;
        return { error: 'No fields to update' };
      }

      const existing = await ctx.data.todo_items.findOne({ id: ctx.params.id });
      if (!existing) {
        ctx.status = 404;
        return { error: 'Todo not found' };
      }

      await ctx.data.todo_items.update({ id: ctx.params.id }, updateData);
      const todo = await ctx.data.todo_items.findOne({ id: ctx.params.id });

      if (completed === true || completed === 1) {
        ctx.emit('todo_completed', {
          todoId: Number(ctx.params.id),
          title: todo.title,
          completedAt: new Date().toISOString(),
        });
      }

      return { success: true, todo };
    },

    // Delete todo
    'DELETE /todos/:id': async (ctx) => {
      const todo = await ctx.data.todo_items.findOne({ id: ctx.params.id });
      if (!todo) {
        ctx.status = 404;
        return { error: 'Todo not found' };
      }
      await ctx.data.todo_items.delete({ id: ctx.params.id });
      ctx.emit('todo_deleted', {
        todoId: Number(ctx.params.id),
        title: todo.title,
      });
      return { success: true, deleted: todo };
    },

    // Toggle todo completed state (flips current value)
    'POST /todos/:id/toggle': async (ctx) => {
      const todo = await ctx.data.todo_items.findOne({ id: ctx.params.id });
      if (!todo) {
        ctx.status = 404;
        return { error: 'Todo not found' };
      }
      const newCompleted = todo.completed ? 0 : 1;
      await ctx.data.todo_items.update({ id: ctx.params.id }, { completed: newCompleted });
      const updated = await ctx.data.todo_items.findOne({ id: ctx.params.id });

      if (newCompleted) {
        ctx.emit('todo_completed', {
          todoId: Number(ctx.params.id),
          title: updated.title,
          completedAt: new Date().toISOString(),
        });
      }

      return { success: true, todo: updated };
    },

    // Get statistics
    'GET /stats': async (ctx) => {
      const total = await ctx.data.todo_items.count();
      const completed = await ctx.data.todo_items.count({ completed: 1 });
      return { total, completed, pending: total - completed };
    },

    // Automation: pending todos
    'GET /automation/todos/pending': async (ctx) => {
      const todos = await ctx.data.todo_items.findAll({ where: { completed: 0 } });
      return {
        items: todos.map((todo) => ({
          value: todo.id.toString(),
          label: todo.title,
        })),
      };
    },

    // Automation: all todos
    'GET /automation/todos/all': async (ctx) => {
      const todos = await ctx.data.todo_items.findAll({ orderBy: { created_at: 'DESC' } });
      return {
        items: todos.map((todo) => ({
          value: todo.id.toString(),
          label: `${todo.completed ? '[\u2713] ' : '[ ] '}${todo.title}`,
        })),
      };
    },
  },
};
