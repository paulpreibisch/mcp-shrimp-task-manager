import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import TaskDetailView from './TaskDetailView';
import { useTranslation } from 'react-i18next';
import MDEditor from '@uiw/react-md-editor';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure,
} from '@chakra-ui/react';

function HistoryTasksView({ 
  tasks = [], 
  historyEntry,
  loading = false, 
  error = '',
  onBack,
  initialRequest = '',
  summary = '',
  generatedInitialRequest = false
}) {
  const { t } = useTranslation();
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Modal controls for Initial Request
  const {
    isOpen: isInitialRequestOpen,
    onOpen: onInitialRequestOpen,
    onClose: onInitialRequestClose
  } = useDisclosure();
  
  // Modal controls for Summary
  const {
    isOpen: isSummaryOpen,
    onOpen: onSummaryOpen,
    onClose: onSummaryClose
  } = useDisclosure();

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: t('taskName'),
      cell: ({ row }) => (
        <div>
          <div className="task-name">
            <span className="task-icon">📋</span>
            {row.original.name}
          </div>
          <div className="task-meta">
            <span className="task-id">{row.original.id.slice(0, 8)}</span>
          </div>
        </div>
      ),
      size: 300,
    },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: ({ getValue }) => {
        const status = getValue() || 'pending';
        let statusText = status;
        let statusClass = `status-badge status-${status.toLowerCase()}`;
        
        switch (status.toLowerCase()) {
          case 'completed':
            statusText = t('completed');
            statusClass = 'status-badge status-completed';
            break;
          case 'in_progress':
            statusText = t('inProgress');
            statusClass = 'status-badge status-in_progress';
            break;
          case 'pending':
          default:
            statusText = t('pending');
            statusClass = 'status-badge status-pending';
            break;
        }
        
        return (
          <span className={statusClass}>
            {statusText}
          </span>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'description',
      header: t('description'),
      cell: ({ getValue }) => {
        const description = getValue() || '';
        return (
          <div className="task-description" title={description}>
            {description.slice(0, 100)}
            {description.length > 100 ? '...' : ''}
          </div>
        );
      },
      size: 400,
    },
    {
      accessorKey: 'dependencies',
      header: t('dependencies'),
      cell: ({ getValue }) => {
        const deps = getValue() || [];
        return (
          <div className="dependencies">
            {deps.length > 0 ? `${deps.length} ${t('dependencies')}` : t('noDependencies')}
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'createdAt',
      header: t('created'),
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? new Date(date).toLocaleDateString() : '';
      },
      size: 120,
    }
  ], [t]);

  const table = useReactTable({
    data: tasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 15 },
      sorting: [{ id: 'createdAt', desc: true }]
    },
  });

  if (loading) {
    return <div className="loading">{t('loading')} ⏳</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  // If a task is selected, show the detail view
  if (selectedTask) {
    const taskIndex = tasks.findIndex(t => t.id === selectedTask.id);
    return (
      <TaskDetailView 
        task={selectedTask}
        taskIndex={taskIndex}
        allTasks={tasks}
        onBack={() => setSelectedTask(null)}
        projectRoot={null} // History doesn't have project root context
        isHistorical={true} // Indicate this is from history
      />
    );
  }

  return (
    <div className="history-tasks-view">
      <div className="history-tasks-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2>📋 {t('tasksFrom')} {historyEntry ? new Date(historyEntry.timestamp).toLocaleString() : ''}</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Initial Request Button */}
            {initialRequest && (
              <button
                id="initial-request-button"
                data-testid="initial-request-button"
                className="action-button"
                onClick={onInitialRequestOpen}
                title={t('viewInitialRequest', 'View Initial Request')}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                📝 {t('initialRequest', 'Initial Request')}
                {generatedInitialRequest && (
                  <span style={{ fontSize: '11px' }}>⚡</span>
                )}
              </button>
            )}
            
            {/* Summary Button */}
            {summary && (
              <button
                id="summary-button"
                data-testid="summary-button"
                className="action-button"
                onClick={onSummaryOpen}
                title={t('viewSummary', 'View Summary')}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
              >
                📊 {t('summary', 'Summary')}
              </button>
            )}
            
            {/* Back Button */}
            <button 
              className="back-button" 
              onClick={onBack} 
              title={t('backToHistory')}
              style={{ 
                backgroundColor: '#8b5cf6', 
                color: 'white', 
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#7c3aed'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#8b5cf6'}
            >
              ← {t('backToHistory')}
            </button>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: '20px', marginBottom: '20px' }}>
        {historyEntry && (
          <>
            <div className="stat-card">
              <h3>{t('totalTasks')}</h3>
              <div className="value">{historyEntry.taskCount}</div>
            </div>
            <div className="stat-card">
              <h3>{t('completed')}</h3>
              <div className="value">{historyEntry.stats.completed}</div>
            </div>
            <div className="stat-card">
              <h3>{t('inProgress')}</h3>
              <div className="value">{historyEntry.stats.inProgress}</div>
            </div>
            <div className="stat-card">
              <h3>{t('pending')}</h3>
              <div className="value">{historyEntry.stats.pending}</div>
            </div>
          </>
        )}
      </div>


      {tasks.length === 0 ? (
        <div className="empty-tasks">
          <div className="empty-message">
            <h3>{t('noTasksFound')}</h3>
            <p>{t('noTasksInHistory')}</p>
          </div>
        </div>
      ) : (
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
                  className="clickable-row task-row"
                  onClick={() => setSelectedTask(row.original)}
                  style={{ cursor: 'pointer' }}
                  title={t('clickToViewDetails')}
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
            </div>
            
            <div className="pagination-controls">
              <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                {'<<'}
              </button>
              <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                {'<'}
              </button>
              <span>
                {t('page')} {table.getState().pagination.pageIndex + 1} {t('of')}{' '}
                {table.getPageCount()}
              </span>
              <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                {'>'}
              </button>
              <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                {'>>'}
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Initial Request Modal */}
      <Modal 
        isOpen={isInitialRequestOpen} 
        onClose={onInitialRequestClose}
        size="xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent bg="#1a1f3a" color="#e5e5e5">
          <ModalHeader display="flex" alignItems="center" gap={2}>
            📝 {t('initialRequest', 'Initial Request')}
            {generatedInitialRequest && (
              <span style={{ 
                marginLeft: '10px', 
                fontSize: '12px', 
                color: '#facc15',
                fontWeight: 'normal',
                backgroundColor: 'rgba(250, 204, 21, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(250, 204, 21, 0.3)'
              }}>
                ⚡ Auto-generated
              </span>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <div style={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.6',
              padding: '16px',
              backgroundColor: '#0f1626',
              borderRadius: '8px'
            }}>
              {initialRequest.replace(/\n要求:/g, '\nRequirements:').replace(/\n需求:/g, '\nRequirements:')}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="purple" onClick={onInitialRequestClose}>
              {t('close', 'Close')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Summary Modal */}
      <Modal 
        isOpen={isSummaryOpen} 
        onClose={onSummaryClose}
        size="xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent bg="#1a1f3a" color="#e5e5e5">
          <ModalHeader display="flex" alignItems="center" gap={2}>
            📊 {t('summary', 'Summary')}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <div style={{
              padding: '16px',
              backgroundColor: '#0f1626',
              borderRadius: '8px'
            }}>
              <MDEditor.Markdown 
                source={summary}
                style={{
                  backgroundColor: 'transparent',
                  color: 'inherit'
                }}
                data-color-mode="dark"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="green" onClick={onSummaryClose}>
              {t('close', 'Close')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default HistoryTasksView;