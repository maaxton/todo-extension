/**
 * TODO Extension Example
 * Demonstrates extension development with database integration
 */

export async function onInstall(api) {
  api.log('Installing TODO extension...');
  
  // Register model with schema
  await api.registerModel('todos', {
    tableName: 'todo_items',
    description: 'Stores user TODO items',
    primaryKey: 'id',
    fields: {
      id: { type: 'integer', primaryKey: true, autoIncrement: true },
      title: { type: 'string', required: true, maxLength: 255 },
      description: { type: 'text' },
      completed: { type: 'boolean', default: false },
      created_at: { type: 'datetime', default: 'CURRENT_TIMESTAMP' },
      updated_at: { type: 'datetime', default: 'CURRENT_TIMESTAMP' }
    },
    dateFields: ['created_at', 'updated_at'],
    jsonFields: [],
    indexes: [
      { fields: ['completed'], name: 'idx_todo_items_completed' },
      { fields: ['created_at'], name: 'idx_todo_items_created_at' }
    ]
  });

  // Create the table from schema
  await api.model('todos').createTable();

  api.log('TODO extension database table created and registered');
  await api.logEvent('install', { timestamp: new Date().toISOString() });
}

export default async function init(api) {
  api.log('Initializing TODO extension');

  // Register model (needed if extension was already installed before Model API migration)
  try {
    await api.registerModel('todos', {
      tableName: 'todo_items',
      description: 'Stores user TODO items',
      primaryKey: 'id',
      fields: {
        id: { type: 'integer', primaryKey: true, autoIncrement: true },
        title: { type: 'string', required: true, maxLength: 255 },
        description: { type: 'text' },
        completed: { type: 'boolean', default: false },
        created_at: { type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        updated_at: { type: 'datetime', default: 'CURRENT_TIMESTAMP' }
      },
      dateFields: ['created_at', 'updated_at'],
      jsonFields: [],
      indexes: [
        { fields: ['completed'], name: 'idx_todo_items_completed' },
        { fields: ['created_at'], name: 'idx_todo_items_created_at' }
      ]
    });
  } catch (error) {
    // Model may already be registered, ignore error
    api.log(`Model registration: ${error.message}`, 'debug');
  }

  // Register automation action handlers
  // Use regular function to preserve 'this' context
  api.executeAction = async function(actionKey, params, triggerData) {
    // 'this' refers to the extensionAPI object
    this.log(`Executing TODO action: ${actionKey}`);
    
    switch (actionKey) {
      case 'create-todo':
        return await createTodo(params, triggerData, this);
      case 'complete-todo':
        return await completeTodo(params, triggerData, this);
      case 'delete-old-todos':
        return await deleteOldTodos(params, triggerData, this);
      case 'update-todo-priority':
        return await updateTodoPriority(params, triggerData, this);
      case 'send-todo-report':
        return await sendTodoReport(params, triggerData, this);
      default:
        throw new Error(`Unknown action: ${actionKey}`);
    }
  };

  // GET /api/extensions/todo-extension/todos - List all todos
  api.registerRoute('GET', '/todos', async (ctx) => {
    try {
      const todos = await api.model('todos').findAll({
        orderBy: { created_at: 'DESC' }
      });
      return {
        todos,
        count: todos.length
      };
    } catch (error) {
      api.log(`Error fetching todos: ${error.message}`, 'error');
      throw error;
    }
  });

  // GET /api/extensions/todo-extension/todos/:id - Get specific todo
  api.registerRoute('GET', '/todos/:id', async (ctx) => {
    try {
      const id = ctx.req.path.split('/').pop();
      const todo = await api.model('todos').findById(id);
      
      if (!todo) {
        ctx.res.status(404);
        return { error: 'Todo not found' };
      }
      
      return todo;
    } catch (error) {
      api.log(`Error fetching todo: ${error.message}`, 'error');
      throw error;
    }
  });

  // POST /api/extensions/todo-extension/todos - Create new todo
  api.registerRoute('POST', '/todos', async (ctx) => {
    try {
      const { title, description } = ctx.body;
      
      if (!title || title.trim() === '') {
        ctx.res.status(400);
        return { error: 'Title is required' };
      }

      const todo = await api.model('todos').create({
        title,
        description: description || ''
      });

      await api.logEvent('todo_created', { todoId: todo.id });
      
      // Emit event for automation system
      await api.emit('todo-created', {
        todoId: todo.id,
        title,
        description: description || '',
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        todo
      };
    } catch (error) {
      api.log(`Error creating todo: ${error.message}`, 'error');
      throw error;
    }
  });

  // PUT /api/extensions/todo-extension/todos/:id - Update todo
  api.registerRoute('PUT', '/todos/:id', async (ctx) => {
    try {
      const id = ctx.req.path.split('/').pop();
      const { title, description, completed } = ctx.body;

      const updateData = {};

      if (title !== undefined) {
        updateData.title = title;
      }
      if (description !== undefined) {
        updateData.description = description;
      }
      if (completed !== undefined) {
        updateData.completed = completed;
      }

      if (Object.keys(updateData).length === 0) {
        ctx.res.status(400);
        return { error: 'No fields to update' };
      }

      // Add updated_at timestamp
      updateData.updated_at = new Date();

      const todo = await api.model('todos').update(id, updateData);

      if (!todo) {
        ctx.res.status(404);
        return { error: 'Todo not found' };
      }

      await api.logEvent('todo_updated', { todoId: id });
      
      // If marked as complete, emit event for automation
      if (completed === true || completed === 1) {
        await api.emit('todo-completed', {
          todoId: id,
          title: todo.title,
          completedAt: new Date().toISOString()
        });
      }

      return {
        success: true,
        todo
      };
    } catch (error) {
      api.log(`Error updating todo: ${error.message}`, 'error');
      throw error;
    }
  });

  // DELETE /api/extensions/todo-extension/todos/:id - Delete todo
  api.registerRoute('DELETE', '/todos/:id', async (ctx) => {
    try {
      const id = ctx.req.path.split('/').pop();
      
      // Get the todo before deleting
      const todo = await api.model('todos').findById(id);

      if (!todo) {
        ctx.res.status(404);
        return { error: 'Todo not found' };
      }

      await api.model('todos').delete(id);

      await api.logEvent('todo_deleted', { todoId: id });

      return {
        success: true,
        deleted: todo
      };
    } catch (error) {
      api.log(`Error deleting todo: ${error.message}`, 'error');
      throw error;
    }
  });

  // GET /api/extensions/todo-extension/stats - Get statistics
  api.registerRoute('GET', '/stats', async (ctx) => {
    try {
      const total = await api.model('todos').count();
      const completed = await api.model('todos').count({ completed: 1 });

      return {
        total,
        completed,
        pending: total - completed
      };
    } catch (error) {
      api.log(`Error fetching stats: ${error.message}`, 'error');
      throw error;
    }
  });
  
  // ============================================
  // Automation Endpoints
  // ============================================
  
  // GET /api/extensions/todo-extension/automation/todos/pending - Get pending todos for automation
  api.registerRoute('GET', '/automation/todos/pending', async (ctx) => {
    try {
      const todos = await api.model('todos').findWhere({ completed: 0 });
      
      return {
        items: todos.map(todo => ({
          value: todo.id.toString(),
          label: todo.title
        }))
      };
    } catch (error) {
      api.log(`Error fetching pending todos: ${error.message}`, 'error');
      throw error;
    }
  });
  
  // GET /api/extensions/todo-extension/automation/todos/all - Get all todos for automation
  api.registerRoute('GET', '/automation/todos/all', async (ctx) => {
    try {
      const todos = await api.model('todos').findAll({
        orderBy: { created_at: 'DESC' }
      });
      
      return {
        items: todos.map(todo => ({
          value: todo.id.toString(),
          label: `${todo.completed ? '[✓] ' : '[ ] '}${todo.title}`
        }))
      };
    } catch (error) {
      api.log(`Error fetching all todos: ${error.message}`, 'error');
      throw error;
    }
  });
  
  // Register automation trigger events
  api.on('todo-created', async (data) => {
    // This will be handled by the automation system
    api.log(`Todo created event: ${data.title}`, 'info');
  });
  
  api.on('todo-completed', async (data) => {
    // This will be handled by the automation system
    api.log(`Todo completed event: ${data.title}`, 'info');
  });

  api.log('TODO extension initialized successfully');
}

export async function onEnable(api) {
  api.log('TODO extension enabled');
}

export async function onDisable(api) {
  api.log('TODO extension disabled');
}

export async function onUninstall(api) {
  api.log('Uninstalling TODO extension...');
  
  // Unregister the table first
  await api.unregisterTable('todo_items');
  
  // Drop database table using Model API
  await api.model('todos').dropTable();
  
  api.log('TODO extension uninstalled');
  await api.logEvent('uninstall', { timestamp: new Date().toISOString() });
}

// ============================================
// Automation Handlers
// ============================================

/**
 * Create a new todo via automation
 */
export async function createTodo(params, triggerData, api) {
  const { title, description, priority, dueDate } = params;
  
  if (!title || title.trim() === '') {
    throw new Error('Title is required');
  }
  
  try {
    const todo = await api.model('todos').create({
      title,
      description: description || '',
      completed: false
    });
    
    // Emit event for other automations
    await api.emit('todo-created', {
      todoId: todo.id,
      title,
      description: description || '',
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      message: `Created todo: ${title}`,
      todoId: todo.id,
      todo
    };
  } catch (error) {
    throw new Error(`Failed to create todo: ${error.message}`);
  }
}

/**
 * Complete a todo via automation
 */
export async function completeTodo(params, triggerData, api) {
  const { todoId, notes } = params;
  
  if (!todoId) {
    throw new Error('Todo ID is required');
  }
  
  try {
    // Check if todo exists
    const todo = await api.model('todos').findById(todoId);
    
    if (!todo) {
      throw new Error(`Todo ${todoId} not found`);
    }
    
    // Mark as complete
    const updated = await api.model('todos').update(todoId, {
      completed: true,
      updated_at: new Date()
    });
    
    // Emit event for other automations
    await api.emit('todo-completed', {
      todoId,
      title: todo.title,
      completedAt: new Date().toISOString()
    });
    
    return {
      success: true,
      message: `Completed todo: ${todo.title}`,
      todoId,
      notes
    };
  } catch (error) {
    throw new Error(`Failed to complete todo: ${error.message}`);
  }
}

/**
 * Delete old completed todos via automation
 */
export async function deleteOldTodos(params, triggerData, api) {
  const { daysOld, confirmDelete } = params;
  
  if (confirmDelete !== 'yes') {
    return {
      success: false,
      message: 'Deletion not confirmed'
    };
  }
  
  if (!daysOld || daysOld < 1) {
    throw new Error('Days old must be at least 1');
  }
  
  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Find old completed todos using query builder
    const oldTodos = await api.model('todos')
      .query()
      .where('completed', '=', 1)
      .where('updated_at', '<', cutoffDate)
      .get();
    
    const count = oldTodos.length;
    
    if (count > 0) {
      // Delete them using query builder
      for (const todo of oldTodos) {
        await api.model('todos').delete(todo.id);
      }
    }
    
    return {
      success: true,
      message: `Deleted ${count} old completed todos`,
      deletedCount: count
    };
  } catch (error) {
    throw new Error(`Failed to delete old todos: ${error.message}`);
  }
}

/**
 * Update todo priority via automation
 */
export async function updateTodoPriority(params, triggerData, api) {
  const { todoId, priority } = params;
  
  if (!todoId) {
    throw new Error('Todo ID is required');
  }
  
  if (!priority) {
    throw new Error('Priority is required');
  }
  
  try {
    // For now, we'll store priority in the description field as JSON metadata
    // In a real implementation, you'd add a priority column to the database
    const todo = await api.model('todos').findById(todoId);
    
    if (!todo) {
      throw new Error(`Todo ${todoId} not found`);
    }
    
    // Add priority metadata to description
    const updatedDesc = `[Priority: ${priority}] ${todo.description || ''}`;
    
    await api.model('todos').update(todoId, {
      description: updatedDesc,
      updated_at: new Date()
    });
    
    return {
      success: true,
      message: `Updated priority to ${priority} for: ${todo.title}`,
      todoId,
      priority
    };
  } catch (error) {
    throw new Error(`Failed to update todo priority: ${error.message}`);
  }
}

/**
 * Send todo status report via automation
 */
export async function sendTodoReport(params, triggerData, api) {
  const { reportType, format } = params;
  
  try {
    // Get stats using Model API
    const total = await api.model('todos').count();
    const completed = await api.model('todos').count({ completed: 1 });
    const pending = await api.model('todos').count({ completed: 0 });
    
    const stats = {
      total,
      completed,
      pending
    };
    
    let report = {
      type: reportType,
      generatedAt: new Date().toISOString(),
      stats
    };
    
    // Add specific data based on report type
    if (reportType === 'detailed') {
      const todos = await api.model('todos').findAll({
        orderBy: { created_at: 'DESC' }
      });
      report.todos = todos;
    } else if (reportType === 'overdue') {
      // For demo, just get uncompleted todos older than 7 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      
      const overdue = await api.model('todos')
        .query()
        .where('completed', '=', 0)
        .where('created_at', '<', cutoffDate)
        .get();
        
      report.overdueTodos = overdue;
      report.overdueCount = overdue.length;
    } else if (reportType === 'upcoming') {
      // Get uncompleted todos from the last 7 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      
      const upcoming = await api.model('todos')
        .query()
        .where('completed', '=', 0)
        .where('created_at', '>', cutoffDate)
        .get();
        
      report.upcomingTodos = upcoming;
      report.upcomingCount = upcoming.length;
    }
    
    // Format the report
    let formattedReport;
    if (format === 'text') {
      formattedReport = formatReportAsText(report);
    } else if (format === 'html') {
      formattedReport = formatReportAsHtml(report);
    } else {
      formattedReport = report; // JSON
    }
    
    return {
      success: true,
      message: `Generated ${reportType} report in ${format} format`,
      report: formattedReport
    };
  } catch (error) {
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}

// Helper functions for formatting reports
function formatReportAsText(report) {
  let text = `TODO Status Report - ${report.type}\n`;
  text += `Generated: ${report.generatedAt}\n`;
  text += `\n=== Statistics ===\n`;
  text += `Total: ${report.stats.total}\n`;
  text += `Completed: ${report.stats.completed}\n`;
  text += `Pending: ${report.stats.pending}\n`;
  
  if (report.todos) {
    text += `\n=== All Todos ===\n`;
    report.todos.forEach(todo => {
      text += `- [${todo.completed ? 'x' : ' '}] ${todo.title}\n`;
    });
  }
  
  if (report.overdueTodos) {
    text += `\n=== Overdue Todos (${report.overdueCount}) ===\n`;
    report.overdueTodos.forEach(todo => {
      text += `- ${todo.title} (created: ${todo.created_at})\n`;
    });
  }
  
  if (report.upcomingTodos) {
    text += `\n=== Upcoming Todos (${report.upcomingCount}) ===\n`;
    report.upcomingTodos.forEach(todo => {
      text += `- ${todo.title}\n`;
    });
  }
  
  return text;
}

function formatReportAsHtml(report) {
  let html = `<div class="todo-report">`;
  html += `<h2>TODO Status Report - ${report.type}</h2>`;
  html += `<p>Generated: ${report.generatedAt}</p>`;
  html += `<h3>Statistics</h3>`;
  html += `<ul>`;
  html += `<li>Total: ${report.stats.total}</li>`;
  html += `<li>Completed: ${report.stats.completed}</li>`;
  html += `<li>Pending: ${report.stats.pending}</li>`;
  html += `</ul>`;
  
  if (report.todos) {
    html += `<h3>All Todos</h3><ul>`;
    report.todos.forEach(todo => {
      html += `<li>${todo.completed ? '✓' : '○'} ${todo.title}</li>`;
    });
    html += `</ul>`;
  }
  
  if (report.overdueTodos) {
    html += `<h3>Overdue Todos (${report.overdueCount})</h3><ul>`;
    report.overdueTodos.forEach(todo => {
      html += `<li>${todo.title} <small>(created: ${todo.created_at})</small></li>`;
    });
    html += `</ul>`;
  }
  
  if (report.upcomingTodos) {
    html += `<h3>Upcoming Todos (${report.upcomingCount})</h3><ul>`;
    report.upcomingTodos.forEach(todo => {
      html += `<li>${todo.title}</li>`;
    });
    html += `</ul>`;
  }
  
  html += `</div>`;
  return html;
}


