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
import { useLanguage } from '../i18n/LanguageContext';
import { generateTaskNumbers, getTaskNumber, convertDependenciesToNumbers, getTaskByNumber } from '../utils/taskNumbering';

function TaskTable({ data, globalFilter, onGlobalFilterChange, projectRoot, onDetailViewChange, resetDetailView, profileId, onTaskSaved, onDeleteTask }) {
  const { t } = useLanguage();
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Generate task number mapping
  const taskNumberMap = useMemo(() => generateTaskNumbers(data), [data]);
  
  // Notify parent when entering/exiting edit mode
  useEffect(() => {
    if (selectedTask) {
      if (selectedTask.editMode) {
        // Entering edit mode
        if (onDetailViewChange) {
          onDetailViewChange(true, true);
        }
      } else {
        // In detail view but not edit mode
        if (onDetailViewChange) {
          onDetailViewChange(true, false);
        }
      }
    } else {
      // Not in any detail view
      if (onDetailViewChange) {
        onDetailViewChange(false, false);
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
      onDetailViewChange(!!selectedTask, selectedTask?.editMode || false);
    }
  }, [selectedTask, onDetailViewChange]);
  // Define table columns configuration with custom cell renderers
  const columns = useMemo(() => [
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
      header: t('taskName'),
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
      header: t('status'),
      cell: ({ getValue }) => (
        <span className={`status-badge status-${getValue()}`}>
          {getValue()?.replace('_', ' ')}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: 'createdAt',
      header: t('created'),
      cell: ({ getValue }) => {
        const date = new Date(getValue());
        return (
          <div className="task-meta">
            {date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}<br />
            {date.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            })}
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'updatedAt',
      header: t('updated'),
      cell: ({ getValue }) => {
        const date = new Date(getValue());
        return (
          <div className="task-meta">
            {date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}<br />
            {date.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            })}
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'dependencies',
      header: t('dependencies'),
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
              const depTask = data.find(t => t.id === depId);
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
      size: 200,
    },
    {
      accessorKey: 'actions',
      header: t('actions'),
      cell: ({ row }) => (
        <div className="actions-cell">
          <button
            className="copy-button action-button"
            onClick={(e) => {
              e.stopPropagation();
              const instruction = `Use task manager to complete this shrimp task: ${row.original.id}`;
              navigator.clipboard.writeText(instruction);
              const button = e.target;
              button.textContent = '✓';
              setTimeout(() => {
                button.textContent = '🤖';
              }, 2000);
            }}
            title={`${t('copyTaskInstruction')}: ${row.original.id}`}
          >
            🤖
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
      size: 100,
    },
  ], [data, setSelectedTask, t, taskNumberMap, onDeleteTask]);

  const table = useReactTable({
    data,
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

  if (data.length === 0) {
    return (
      <div className="loading">
        {t('noTasksFound')}
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
              const targetTask = data.find(t => t.id === taskId);
              if (targetTask) {
                setSelectedTask(targetTask);
              }
            }}
            taskIndex={data.findIndex(t => t.id === selectedTask.id)}
            allTasks={data}
            onSave={async (updatedTask) => {
              // Close the edit view immediately
              setSelectedTask(null);
              // Notify parent to refresh data
              if (onDetailViewChange) {
                onDetailViewChange(false, false);
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
            const targetTask = data.find(t => t.id === taskId);
            if (targetTask) {
              setSelectedTask(targetTask);
            }
          }}
          taskIndex={data.findIndex(t => t.id === selectedTask.id)}
          allTasks={data}
          onEdit={() => {
            setSelectedTask({ ...selectedTask, editMode: true });
          }}
        />
      );
    }
  }

  // Otherwise, show the table
  return (
    <>
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
          {globalFilter && ` (${t('filteredFrom')} ${data.length} ${t('total')})`}
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
    </>
  );
}

export default TaskTable;