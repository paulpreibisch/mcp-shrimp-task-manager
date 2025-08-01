import React, { useMemo, useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useLanguage } from '../i18n/LanguageContext';

function SubAgentsView({ showToast, onNavigateToSettings, refreshTrigger }) {
  const { t } = useLanguage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');
  const [viewingAgent, setViewingAgent] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);
  const [claudeFolderPath, setClaudeFolderPath] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load global settings first, then agents
  useEffect(() => {
    const initializeData = async () => {
      await loadGlobalSettings();
      await loadAgents();
    };
    initializeData();
  }, []);

  // Refresh when refreshTrigger changes (when user navigates between tabs)
  useEffect(() => {
    if (refreshTrigger) {
      const refreshData = async () => {
        await loadGlobalSettings();
        await loadAgents();
      };
      refreshData();
    }
  }, [refreshTrigger]);

  const loadGlobalSettings = async () => {
    try {
      const response = await fetch('/api/global-settings');
      if (response.ok) {
        const settings = await response.json();
        setClaudeFolderPath(settings.claudeFolderPath || '');
      }
    } catch (err) {
      console.error('Error loading global settings:', err);
    } finally {
      setSettingsLoaded(true);
    }
  };

  const loadAgents = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/agents/global');
      if (!response.ok) {
        throw new Error(`Failed to load agents: ${response.status}`);
      }
      
      const agents = await response.json();
      setData(agents || []);
    } catch (err) {
      setError('❌ Error loading agents: ' + err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (filename) => {
    if (filename.endsWith('.md')) return 'Markdown';
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return 'YAML';
    return 'Unknown';
  };

  const getFileTypeIcon = (filename) => {
    if (filename.endsWith('.md')) return '📝';
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return '⚙️';
    return '📄';
  };

  // Define table columns configuration
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="task-name">
            <span className="template-icon">{getFileTypeIcon(row.original.name)}</span>
            {row.original.name.replace(/\.(md|yaml|yml)$/, '')}
          </div>
          <div className="task-meta">
            <span className="task-id">
              {getFileType(row.original.name)}
            </span>
          </div>
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue, row }) => {
        const description = getValue() || row.original.content?.slice(0, 120) || 'No description available';
        return (
          <div className="task-description">
            {description.slice(0, 120)}
            {description.length > 120 ? '...' : ''}
          </div>
        );
      },
      size: 300,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = getFileType(row.original.name);
        let statusClass = 'status-badge';
        
        switch (type.toLowerCase()) {
          case 'markdown':
            statusClass += ' status-markdown';
            break;
          case 'yaml':
            statusClass += ' status-yaml';
            break;
          default:
            statusClass += ' status-default';
            break;
        }
        
        return (
          <span className={statusClass}>
            {type}
          </span>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="actions-cell">
          <button
            className="action-button preview-button"
            onClick={(e) => {
              e.stopPropagation();
              setViewingAgent(row.original);
            }}
            title="View agent"
          >
            👁️
          </button>
          <button
            className="action-button edit-button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingAgent(row.original);
            }}
            title="Edit agent"
          >
            ✏️
          </button>
        </div>
      ),
      size: 120,
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  // Handle viewing agent
  if (viewingAgent) {
    return (
      <div className="agent-viewer">
        <div className="viewer-header">
          <button 
            className="back-button"
            onClick={() => setViewingAgent(null)}
          >
            ← Back to Agents
          </button>
          <h2>📄 {viewingAgent.name.replace(/\.(md|yaml|yml)$/, '')}</h2>
        </div>
        <div className="content-viewer">
          <pre>{viewingAgent.content || 'No content available'}</pre>
        </div>
      </div>
    );
  }

  // Handle editing agent
  if (editingAgent) {
    return (
      <div className="agent-editor">
        <div className="editor-header">
          <button 
            className="back-button"
            onClick={() => setEditingAgent(null)}
          >
            ← Back to Agents
          </button>
          <h2>✏️ Edit {editingAgent.name.replace(/\.(md|yaml|yml)$/, '')}</h2>
        </div>
        <div className="editor-content">
          <textarea
            className="content-editor"
            defaultValue={editingAgent.content || ''}
            placeholder="Enter agent content..."
            rows={20}
            style={{ width: '100%', fontFamily: 'monospace' }}
          />
          <div className="editor-actions">
            <button 
              className="primary-btn"
              onClick={() => {
                // TODO: Implement save functionality
                showToast && showToast('Save functionality not implemented yet', 'info');
              }}
            >
              Save
            </button>
            <button 
              className="secondary-btn"
              onClick={() => setEditingAgent(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !settingsLoaded) {
    if (!settingsLoaded) {
      return (
        <div className="loading">
          Loading settings... ⏳
        </div>
      );
    }
    const agentsPath = claudeFolderPath ? `${claudeFolderPath}/agents` : 'Claude folder/agents';
    return (
      <div className="loading">
        Loading agents from {agentsPath}... ⏳
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        {error}
      </div>
    );
  }

  if (data.length === 0) {
    if (!claudeFolderPath) {
      return (
        <div className="loading">
          Claude folder path is not configured. Please configure it in{' '}
          <span 
            className="settings-link"
            onClick={onNavigateToSettings}
            style={{ 
              color: '#3498db', 
              cursor: 'pointer', 
              textDecoration: 'underline',
              fontWeight: 'bold'
            }}
            title="Click to go to settings"
          >
            settings
          </span>.
        </div>
      );
    }
    
    const agentsPath = `${claudeFolderPath}/agents`;
    return (
      <div className="loading">
        No agents found in {agentsPath}. Make sure this directory exists and contains .md or .yaml agent files, or update the Claude folder path in{' '}
        <span 
          className="settings-link"
          onClick={onNavigateToSettings}
          style={{ 
            color: '#3498db', 
            cursor: 'pointer', 
            textDecoration: 'underline',
            fontWeight: 'bold'
          }}
          title="Click to go to settings"
        >
          settings
        </span>.
      </div>
    );
  }

  return (
    <>
      <div className="template-management-header">
        <div className="header-content">
          <div className="header-text">
            <h2>🤖 Global Sub-Agents</h2>
            <p>Manage sub-agents from your Claude folder configuration</p>
          </div>
        </div>
      </div>

      <div className="stats-and-search-container">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search agents..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            title="Search and filter agents by name or content"
          />
        </div>

        <div className="stats-grid">
          <div className="stat-card" title="Total number of agents">
            <h3>Total Agents</h3>
            <div className="value">{data.length}</div>
          </div>
          <div className="stat-card" title="Number of Markdown agents">
            <h3>Markdown</h3>
            <div className="value">{data.filter(a => a.name.endsWith('.md')).length}</div>
          </div>
          <div className="stat-card" title="Number of YAML agents">
            <h3>YAML</h3>
            <div className="value">{data.filter(a => a.name.endsWith('.yaml') || a.name.endsWith('.yml')).length}</div>
          </div>
        </div>

        <div className="controls-right">
          <button 
            className="refresh-button"
            onClick={async () => {
              await loadGlobalSettings();
              await loadAgents();
            }}
            disabled={loading}
            title="Refresh settings and agent data"
          >
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

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
              className="clickable-row template-row"
              title="Agent row - use action buttons to view or edit"
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
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} agents
          {globalFilter && ` (filtered from ${data.length} total)`}
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
            Page {table.getState().pagination.pageIndex + 1} of{' '}
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

export default SubAgentsView;