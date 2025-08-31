import React, { useMemo, useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import TaskDetailView from './TaskDetailView';
import Tooltip from './Tooltip';
import AgentInfoModal from './AgentInfoModal';
import { useTranslation } from 'react-i18next';
import { generateTaskNumbers, getTaskNumber, convertDependenciesToNumbers, getTaskByNumber } from '../utils/taskNumbering';

function TaskTable({ data, globalFilter, onGlobalFilterChange, projectRoot, onDetailViewChange, resetDetailView, profileId, onTaskSaved, onDeleteTask, showToast }) {
  const { t } = useTranslation();
  const [selectedTask, setSelectedTask] = useState(null);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [savingAgents, setSavingAgents] = useState({});
  const [agentModalInfo, setAgentModalInfo] = useState({ isOpen: false, agent: null, taskId: null });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localTaskUpdates, setLocalTaskUpdates] = useState({});
  
  // Merge server data with local updates
  const mergedData = useMemo(() => {
    return data.map(task => {
      const localUpdate = localTaskUpdates[task.id];
      return localUpdate ? { ...task, ...localUpdate } : task;
    });
  }, [data, localTaskUpdates]);

  // Generate task number mapping
  const taskNumberMap = useMemo(() => generateTaskNumbers(mergedData), [mergedData]);
  
  /**
   * Maps agent assignment values to display names for the dropdown UI.
   * 
   * This function handles the mapping between different agent formats:
   * - AI assignments: Uses raw filenames like 'test-expert.md'
   * - UI assignments: Uses processed display names like 'Test Expert'
   * 
   * @param {string} agentValue - The agent value from task data (could be filename or display name)
   * @param {Array} availableAgents - Array of available agents with id/name mappings
   * @returns {string} The display name for the dropdown, or original value if no match
   */
  const mapAgentToDisplayName = (agentValue, availableAgents) => {
    // Handle empty or invalid inputs
    if (!agentValue || typeof agentValue !== 'string' || availableAgents.length === 0) {
      return '';
    }
    
    // Strategy 1: Check if it's already a display name (UI format)
    const exactMatch = availableAgents.find(agent => agent.name === agentValue);
    if (exactMatch) {
      return agentValue; // Already in correct format
    }
    
    // Strategy 2: Handle AI assignment format (filename with extension)
    // Remove file extension for comparison with agent IDs
    const normalizedValue = agentValue.replace(/\.(md|yaml|yml)$/i, '');
    const idMatch = availableAgents.find(agent => agent.id === normalizedValue);
    
    if (idMatch) {
      return idMatch.name; // Return the processed display name
    }
    
    // Strategy 3: If no match found, return original value
    // This maintains backward compatibility and handles edge cases
    return agentValue;
  };

  // Load available agents on mount
  useEffect(() => {
    const loadAgents = async () => {
      if (!profileId) return;
      
      try {
        const response = await fetch(`/api/agents/combined/${profileId}`);
        if (response.ok) {
          const agents = await response.json();
          
          // Transform agent data for TaskTable use
          // This creates the mapping between AI assignment format (filenames) and UI display format
          const formattedAgents = agents.map(agent => {
            const filename = agent.name || '';
            const baseFilename = filename.replace(/\.(md|yaml|yml)$/, '');
            
            return {
              // id: Used to match against AI assignments (filename without extension)
              id: baseFilename || `agent-${Math.random()}`,
              
              // name: Display name shown in dropdown (processed from metadata or filename)
              name: agent.metadata?.name || 
                    baseFilename.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 
                    'Unknown Agent',
              
              description: agent.metadata?.description || '',
              color: agent.metadata?.color || null,
              type: agent.type,
              tools: agent.metadata?.tools || []
            };
          });
          
          setAvailableAgents(formattedAgents);
        }
      } catch (err) {
        console.error('Error loading agents:', err);
        setAvailableAgents([]); // Ensure it's always an array
      }
    };
    
    loadAgents();
  }, [profileId]);
  
  // Notify parent when entering/exiting edit mode
  useEffect(() => {
    if (selectedTask) {
      if (selectedTask.editMode) {
        // Entering edit mode
        if (onDetailViewChange) {
          onDetailViewChange(true, true, selectedTask?.id);
        }
      } else {
        // In detail view but not edit mode
        if (onDetailViewChange) {
          onDetailViewChange(true, false, selectedTask?.id);
        }
      }
    } else {
      // Not in any detail view
      if (onDetailViewChange) {
        onDetailViewChange(false, false, null);
      }
    }
  }, [selectedTask, onDetailViewChange]);
  
  // Reset selected task when parent requests it
  useEffect(() => {
    console.log('TaskTable: resetDetailView changed to:', resetDetailView);
    if (resetDetailView && resetDetailView > 0) {
      console.log('TaskTable: Resetting selected task to null');
      setSelectedTask(null);
    }
  }, [resetDetailView]);
  
  // Notify parent when detail view changes
  useEffect(() => {
    if (onDetailViewChange) {
      onDetailViewChange(!!selectedTask, selectedTask?.editMode || false, selectedTask?.id || null);
    }
  }, [selectedTask, onDetailViewChange]);
  // Define table columns configuration with custom cell renderers
  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => {
        const isIndeterminate = selectedRows.size > 0 && selectedRows.size < mergedData.length;
        const checkboxRef = React.useRef(null);
        
        React.useEffect(() => {
          if (checkboxRef.current) {
            checkboxRef.current.indeterminate = isIndeterminate;
          }
        }, [isIndeterminate]);
        
        return (
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={selectedRows.size === mergedData.length && mergedData.length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRows(new Set(mergedData.map(task => task.id)));
              } else {
                setSelectedRows(new Set());
              }
              setShowBulkActions(e.target.checked);
            }}
          />
        );
      },
      cell: ({ row }) => {
        const isChecked = selectedRows.has(row.original.id);
        return (
          <input
            key={`checkbox-${row.original.id}`}
            type="checkbox"
            checked={isChecked}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onChange={(e) => {
              e.stopPropagation();
              const newSelectedRows = new Set(selectedRows);
              if (e.target.checked) {
                newSelectedRows.add(row.original.id);
              } else {
                newSelectedRows.delete(row.original.id);
              }
              setSelectedRows(newSelectedRows);
              setShowBulkActions(newSelectedRows.size > 0);
            }}
          />
        );
      },
      size: 40,
    },
    {
      accessorKey: 'taskNumber',
      header: 'Task',
      cell: ({ row }) => {
        const taskNumber = taskNumberMap[row.original.id] || row.index + 1;
        return (
          <span 
            className="task-number clickable"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(row.original.id);
              const element = e.target;
              element.classList.add('copied');
              setTimeout(() => {
                element.classList.remove('copied');
              }, 2000);
            }}
            title={`${t('clickToCopyUuid')}: ${row.original.id}`}
          >
            Task {taskNumber}
          </span>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'name',
      header: t('task.name'),
      cell: ({ row }) => (
        <div>
          <div className="task-name">{row.original.name}</div>
          <div className="task-meta">
            <span 
              className="task-id task-id-clickable"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(row.original.id);
                const element = e.target;
                element.classList.add('copied');
                setTimeout(() => {
                  element.classList.remove('copied');
                }, 2000);
              }}
              title={t('clickToCopyUuid')}
            >
              ID: {row.original.id.slice(0, 8)}...
            </span>
          </div>
        </div>
      ),
      size: 300,
    },
    {
      accessorKey: 'description',
      header: t('description'),
      cell: ({ getValue }) => (
        <div className="task-description">
          {getValue()?.slice(0, 150)}
          {getValue()?.length > 150 ? '...' : ''}
        </div>
      ),
      size: 300,
    },
    {
      accessorKey: 'status',
      header: t('task.status'),
      cell: ({ getValue }) => (
        <span className={`status-badge status-${getValue()}`}>
          {getValue()?.replace('_', ' ')}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: 'agent',
      header: 'Agent',
      cell: ({ row }) => {
        const rawAgent = row.original.agent || '';
        const currentAgent = mapAgentToDisplayName(rawAgent, availableAgents);
        const taskId = row.original.id;
        const isSaving = savingAgents[taskId] || false;
        
        return (
          <div className="agent-cell-wrapper">
            <select
              className="agent-table-select"
              value={currentAgent}
              style={(() => {
                // Find the selected agent's color
                const selectedAgent = availableAgents.find(a => a.name === currentAgent);
                if (selectedAgent?.color) {
                  return {
                    backgroundColor: selectedAgent.color,
                    color: '#ffffff', // White text for better contrast
                    borderColor: selectedAgent.color
                  };
                }
                return {};
              })()}
              onChange={async (e) => {
                e.stopPropagation();
                const newAgent = e.target.value;
                
                // Update saving state
                setSavingAgents(prev => ({ ...prev, [taskId]: true }));
                
                // Immediately update local state for responsive UI
                setLocalTaskUpdates(prev => ({
                  ...prev,
                  [taskId]: { ...prev[taskId], agent: newAgent }
                }));
                
                try {
                  const response = await fetch(`/api/tasks/${profileId}/update`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      taskId: taskId,
                      updates: { agent: newAgent }
                    })
                  });
                  
                  if (response.ok) {
                    // Success! No need to refresh - local state is already updated
                    if (showToast) {
                      showToast('success', `Agent assigned to task`);
                    }
                  } else {
                    // Revert local state on error
                    setLocalTaskUpdates(prev => {
                      const newState = { ...prev };
                      if (newState[taskId]) {
                        delete newState[taskId].agent;
                        if (Object.keys(newState[taskId]).length === 0) {
                          delete newState[taskId];
                        }
                      }
                      return newState;
                    });
                    console.error('Failed to update agent');
                    if (showToast) {
                      showToast('error', 'Failed to update agent');
                    }
                  }
                } catch (err) {
                  // Revert local state on error
                  setLocalTaskUpdates(prev => {
                    const newState = { ...prev };
                    if (newState[taskId]) {
                      delete newState[taskId].agent;
                      if (Object.keys(newState[taskId]).length === 0) {
                        delete newState[taskId];
                      }
                    }
                    return newState;
                  });
                  console.error('Error updating agent:', err);
                  if (showToast) {
                    showToast('error', 'Network error while updating agent');
                  }
                } finally {
                  // Clear saving state
                  setSavingAgents(prev => {
                    const newState = { ...prev };
                    delete newState[taskId];
                    return newState;
                  });
                }
              }}
              onClick={(e) => e.stopPropagation()}
              disabled={isSaving}
            >
              <option value="">No agent</option>
              {availableAgents.map((agent) => (
                <option 
                  key={agent.name} 
                  value={agent.name}
                  style={agent.color ? { backgroundColor: agent.color, color: '#ffffff' } : {}}
                >
                  {agent.name}
                </option>
              ))}
            </select>
            <button
              className="agent-info-button"
              onClick={(e) => {
                e.stopPropagation();
                if (currentAgent && currentAgent !== '') {
                  // Pass the full agent object if available, otherwise just the name
                  const agentData = availableAgents.find(a => a.name === currentAgent) || currentAgent;
                  setAgentModalInfo({ isOpen: true, agent: agentData, taskId: taskId });
                }
              }}
              disabled={!currentAgent || currentAgent === ''}
              title={currentAgent ? `View info for ${currentAgent}` : 'Select an agent first'}
            >
              👁️
            </button>
            {isSaving && <span className="saving-indicator">💾</span>}
          </div>
        );
      },
      size: 200, // Increased from 150 to give more room for agents
    },
    {
      accessorKey: 'createdAt',
      header: t('created') + '/' + t('updated'),
      cell: ({ row }) => {
        const createdDate = new Date(row.original.createdAt);
        const updatedDate = new Date(row.original.updatedAt);
        return (
          <div className="task-dates">
            <div className="date-created">
              <small style={{ color: '#666', fontSize: '10px' }}>{t('created')}:</small><br />
              {createdDate.toLocaleDateString(undefined, {
                year: '2-digit',
                month: '2-digit',
                day: '2-digit'
              })}{' '}
              {createdDate.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </div>
            <div className="date-updated" style={{ marginTop: '4px' }}>
              <small style={{ color: '#666', fontSize: '10px' }}>{t('updated')}:</small><br />
              {updatedDate.toLocaleDateString(undefined, {
                year: '2-digit',
                month: '2-digit',
                day: '2-digit'
              })}{' '}
              {updatedDate.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </div>
          </div>
        );
      },
      size: 140,
    },
    {
      accessorKey: 'dependencies',
      header: t('task.dependencies'),
      cell: ({ row }) => {
        const dependencies = row.original.dependencies;
        if (!dependencies || !Array.isArray(dependencies) || dependencies.length === 0) {
          return <span style={{ color: '#666' }}>—</span>;
        }
        return (
          <div className="dependencies-list">
            {dependencies.map((dep, index) => {
              // Handle both string IDs and object dependencies
              let depId;
              if (typeof dep === 'string') {
                depId = dep;
              } else if (dep && typeof dep === 'object' && dep.id) {
                depId = dep.id;
              } else if (dep && typeof dep === 'object' && dep.taskId) {
                depId = dep.taskId;
              } else {
                // Skip invalid dependencies
                return null;
              }
              
              // Get task number for display
              const taskNumber = getTaskNumber(depId, taskNumberMap);
              const depTask = mergedData.find(t => t.id === depId);
              const depTaskName = depTask ? depTask.name : 'Unknown Task';
              
              return (
                <Tooltip key={depId} content={`UUID: ${depId}`}>
                  <span
                    className="dependency-badge"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Find the task with this ID
                      if (depTask) {
                        setSelectedTask(depTask);
                      }
                    }}
                  >
                    Task {taskNumberMap[depId] || 'Unknown'}
                  </span>
                </Tooltip>
              );
            }).filter(Boolean)}
          </div>
        );
      },
      size: 120, // Reduced from 200 to make more room for agents
    },
    {
      accessorKey: 'actions',
      header: t('actions'),
      cell: ({ row }) => (
        <div className="actions-cell">
          <button
            className="copy-button action-button"
            style={{ border: '2px solid #FFD700', borderRadius: '4px', padding: '2px 6px' }}
            data-testid={`copy-agent-instruction-${row.original.id}`}
            onClick={(e) => {
              e.stopPropagation();
              const agentName = row.original.agent || 'task manager';
              const agentPath = projectRoot && projectRoot.trim() 
                ? `${projectRoot}/.claude/agents/${agentName}`
                : `./.claude/agents/${agentName}`;
              const instruction = agentName === 'task manager' 
                ? `Use task manager to complete this shrimp task: ${row.original.id} please when u start working mark the shrimp task as in progress`
                : `use the built in subagent located in ${agentPath} to complete this shrimp task: ${row.original.id} please when u start working mark the shrimp task as in progress`;
              navigator.clipboard.writeText(instruction);
              const button = e.target;
              button.textContent = '✓';
              setTimeout(() => {
                button.textContent = '🤖';
              }, 2000);
            }}
            title={(() => {
              const agentName = row.original.agent || 'task manager';
              const agentPath = projectRoot && projectRoot.trim() 
                ? `${projectRoot}/.claude/agents/${agentName}`
                : `./.claude/agents/${agentName}`;
              return agentName === 'task manager'
                ? `Use task manager to complete this shrimp task: ${row.original.id} please when u start working mark the shrimp task as in progress`
                : `use the built in subagent located in ${agentPath} to complete this shrimp task: ${row.original.id} please when u start working mark the shrimp task as in progress`;
            })()}
          >
            🤖
          </button>
          <button
            className="copy-button action-button direct-exec-button"
            style={{ color: '#4CAF50', border: '2px solid #4CAF50', borderRadius: '4px', padding: '2px 6px' }}
            data-testid={`copy-direct-instruction-${row.original.id}`}
            onClick={(e) => {
              e.stopPropagation();
              const agentName = row.original.agent || 'task manager';
              const agentPath = projectRoot && projectRoot.trim() 
                ? `${projectRoot}/.claude/agents/${agentName}`
                : `./.claude/agents/${agentName}`;
              const instruction = agentName === 'task manager' 
                ? `Use task planner to execute this task: ${row.original.id}. Please mark the task as in progress when you start working.`
                : `Use task planner to execute this task: ${row.original.id} using the role of ${agentName} agent. Apply the ${agentName} agent's specialized knowledge and approach, but execute the task yourself without launching a sub-agent. Please mark the task as in progress when you start working.`;
              navigator.clipboard.writeText(instruction);
              const button = e.target;
              button.textContent = '✓';
              setTimeout(() => {
                button.textContent = '🦾';
              }, 2000);
            }}
            title={(() => {
              const agentName = row.original.agent || 'task manager';
              return agentName === 'task manager'
                ? `Use task planner to execute this task: ${row.original.id}`
                : `Use task planner to execute task ${row.original.id} using the role of ${agentName} agent`;
            })()}
          >
            🦾
          </button>
          <button
            className={`edit-button action-button ${row.original.status === 'completed' ? 'disabled' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (row.original.status !== 'completed') {
                setSelectedTask({ ...row.original, editMode: true });
              }
            }}
            disabled={row.original.status === 'completed'}
            title={row.original.status === 'completed' ? 'Cannot edit completed task' : `Edit task: ${row.original.id}`}
          >
            ✏️
          </button>
          <button
            className="delete-button action-button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(t('confirmDeleteTask'))) {
                onDeleteTask(row.original.id);
              }
            }}
            title={`Delete task: ${row.original.id}`}
          >
            🗑️
          </button>
        </div>
      ),
      size: 130,
    },
  ], [mergedData, setSelectedTask, t, taskNumberMap, onDeleteTask, availableAgents, savingAgents, profileId, showToast, selectedRows, localTaskUpdates]);

  const table = useReactTable({
    data: mergedData,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  if (mergedData.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-title">{t('empty.noTasksFound')}</div>
        <div className="empty-state-message">
          {t('noTasksMessage')}
        </div>
      </div>
    );
  }

  // If a task is selected, show the detail view or edit view
  if (selectedTask) {
    if (selectedTask.editMode) {
      // Import will be added at the top
      const TaskEditView = React.lazy(() => import('./TaskEditView'));
      return (
        <React.Suspense fallback={<div className="loading">Loading...</div>}>
          <TaskEditView 
            task={selectedTask} 
            onBack={() => setSelectedTask(null)}
            projectRoot={projectRoot}
            profileId={profileId}
            onNavigateToTask={(taskId) => {
              const targetTask = mergedData.find(t => t.id === taskId);
              if (targetTask) {
                setSelectedTask(targetTask);
              }
            }}
            taskIndex={mergedData.findIndex(t => t.id === selectedTask.id)}
            allTasks={mergedData}
            onSave={async (updatedTask) => {
              // Close the edit view immediately
              setSelectedTask(null);
              // Notify parent to refresh data
              if (onDetailViewChange) {
                onDetailViewChange(false, false, null);
              }
              // Trigger refresh from parent
              if (onTaskSaved) {
                await onTaskSaved();
              }
            }}
          />
        </React.Suspense>
      );
    } else {
      return (
        <TaskDetailView 
          task={selectedTask} 
          onBack={() => setSelectedTask(null)}
          projectRoot={projectRoot}
          onNavigateToTask={(taskId) => {
            const targetTask = mergedData.find(t => t.id === taskId);
            if (targetTask) {
              setSelectedTask(targetTask);
            }
          }}
          taskIndex={mergedData.findIndex(t => t.id === selectedTask.id)}
          allTasks={mergedData}
          onEdit={() => {
            setSelectedTask({ ...selectedTask, editMode: true });
          }}
        />
      );
    }
  }

  // Bulk assign agents function (AI-powered)
  const handleBulkAssignAgents = async () => {
    const selectedTaskIds = Array.from(selectedRows);
    if (selectedTaskIds.length === 0) return;

    // Show loading state
    setLoading(true);
    
    try {
      // Call API to assign agents using AI
      const response = await fetch('/api/ai-assign-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: profileId,
          taskIds: selectedTaskIds
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response');
      }

      const result = await response.json();
      
      if (response.ok) {
        // Success! Show success message
        if (showToast) {
          showToast('success', `Successfully assigned agents to ${result.updatedCount} tasks using AI`);
        }
        
        // Refresh the task data to show updated agents
        if (onTaskSaved) {
          onTaskSaved();
        }
        
        // Clear selection
        setSelectedRows(new Set());
        setShowBulkActions(false);
      } else {
        // Handle error response
        if (result.error === 'OpenAI API key not configured') {
          // Show modal with setup instructions
          const modal = document.createElement('div');
          modal.className = 'modal-overlay';
          modal.innerHTML = `
            <div class="modal-content error-modal">
              <h2>❌ OpenAI API Key Required</h2>
              <p>${result.message}</p>
              <div class="instructions">
                ${result.instructions.map(instruction => {
                  // Check if this is a path line and style it differently
                  if (instruction.includes('/home/') || instruction.includes('C:\\\\')) {
                    return `<p class="file-path">${instruction}</p>`;
                  }
                  return `<p>${instruction}</p>`;
                }).join('')}
              </div>
              <button class="primary-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
          `;
          document.body.appendChild(modal);
        } else {
          // Show general error
          if (showToast) {
            showToast('error', result.error || 'Failed to assign agents');
          }
        }
      }
    } catch (error) {
      console.error('Error assigning agents:', error);
      if (showToast) {
        showToast('error', 'Network error while assigning agents');
      }
    } finally {
      setLoading(false);
    }
  };

  // Manual bulk assign agent function
  const handleManualBulkAssignAgent = async (agentName) => {
    const selectedTaskIds = Array.from(selectedRows);
    if (selectedTaskIds.length === 0) return;

    setLoading(true);
    
    try {
      // Update each selected task with the chosen agent
      const updatePromises = selectedTaskIds.map(taskId => 
        fetch(`/api/tasks/${profileId}/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: taskId,
            updates: { agent: agentName }
          })
        })
      );

      const responses = await Promise.all(updatePromises);
      const successfulUpdates = responses.filter(response => response.ok).length;
      
      if (successfulUpdates > 0) {
        if (showToast) {
          showToast('success', `Successfully assigned ${agentName || 'No agent'} to ${successfulUpdates} tasks`);
        }
        
        // Update local state immediately for responsive UI
        setLocalTaskUpdates(prev => {
          const newUpdates = { ...prev };
          selectedTaskIds.forEach(taskId => {
            newUpdates[taskId] = { ...newUpdates[taskId], agent: agentName };
          });
          return newUpdates;
        });
        
        // Clear selection
        setSelectedRows(new Set());
        setShowBulkActions(false);
      } else {
        if (showToast) {
          showToast('error', 'Failed to update tasks');
        }
      }
    } catch (error) {
      console.error('Error bulk assigning agent:', error);
      if (showToast) {
        showToast('error', 'Network error while assigning agents');
      }
    } finally {
      setLoading(false);
    }
  };

  // Otherwise, show the table
  return (
    <>
      {showBulkActions && (
        <div className="bulk-actions-bar">
          <div className="bulk-actions-left">
            <span className="bulk-actions-label">
              {selectedRows.size} tasks selected:
            </span>
            <select 
              className="bulk-agent-select"
              onChange={(e) => {
                const selectedAgent = e.target.value;
                if (selectedAgent !== '') {
                  handleManualBulkAssignAgent(selectedAgent);
                  e.target.value = ''; // Reset dropdown
                }
              }}
              disabled={loading}
            >
              <option value="">Assign Agent...</option>
              <option value="">No agent</option>
              {availableAgents.map((agent) => (
                <option key={agent.name} value={agent.name}>
                  {agent.name}
                </option>
              ))}
            </select>
            <button 
              className="bulk-action-button ai-assign"
              data-testid="ai-assign-agents-button"
              onClick={handleBulkAssignAgents}
              disabled={loading}
            >
              {loading ? '⏳ Processing...' : `🤖 AI Assign Agents`}
            </button>
          </div>
        </div>
      )}
      <table className="table">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th 
                  key={header.id}
                  style={{ width: header.getSize() }}
                  onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  className={header.column.getCanSort() ? 'sortable' : ''}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() && (
                    <span style={{ marginLeft: '8px' }}>
                      {header.column.getIsSorted() === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr 
              key={row.id}
              className={`clickable-row ${row.original.status === 'in_progress' ? 'task-in-progress' : ''}`}
              onClick={() => setSelectedTask(row.original)}
              title={t('clickToViewTaskDetails')}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <div className="pagination-info">
          {t('showing')} {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} {t('to')}{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          {t('of')} {table.getFilteredRowModel().rows.length} {t('tasks')}
          {globalFilter && ` (${t('filteredFrom')} ${mergedData.length} ${t('total')})`}
        </div>
        
        <div className="pagination-controls">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {'<<'}
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {'<'}
          </button>
          <span>
            {t('page')} {table.getState().pagination.pageIndex + 1} {t('of')}{' '}
            {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {'>'}
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            {'>>'}
          </button>
        </div>
      </div>
      
      <AgentInfoModal
        agent={agentModalInfo.agent}
        isOpen={agentModalInfo.isOpen}
        onClose={() => setAgentModalInfo({ isOpen: false, agent: null, taskId: null })}
        availableAgents={availableAgents}
        onSelectAgent={async (agentName) => {
          // Find the task that triggered the modal
          if (agentModalInfo.taskId) {
            // Update saving state
            setSavingAgents(prev => ({ ...prev, [agentModalInfo.taskId]: true }));
            
            try {
              const response = await fetch(`/api/tasks/${profileId}/update`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  taskId: agentModalInfo.taskId,
                  updates: { agent: agentName }
                })
              });
              
              if (response.ok) {
                // Refresh task data
                if (onTaskSaved) {
                  await onTaskSaved();
                }
              } else {
                console.error('Failed to update agent');
              }
            } catch (err) {
              console.error('Error updating agent:', err);
            } finally {
              // Clear saving state
              setSavingAgents(prev => {
                const newState = { ...prev };
                delete newState[agentModalInfo.taskId];
                return newState;
              });
            }
          }
        }}
      />
    </>
  );
}

export default TaskTable;