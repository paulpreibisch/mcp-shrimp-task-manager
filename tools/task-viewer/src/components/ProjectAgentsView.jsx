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
import AgentViewer from './AgentViewer';
import AgentEditor from './AgentEditor';

function ProjectAgentsView({ profileId, projectRoot, showToast, refreshTrigger, onAgentViewChange }) {
  const { t } = useLanguage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');
  const [viewingAgent, setViewingAgent] = useState(null);
  const [editingAgent, setEditingAgent] = useState(null);

  // Load agents on mount and when profileId changes
  useEffect(() => {
    if (profileId) {
      loadAgents();
    }
  }, [profileId]);

  // Reset viewing/editing states when tab is clicked (refreshTrigger changes)
  useEffect(() => {
    if (refreshTrigger) {
      setViewingAgent(null);
      setEditingAgent(null);
    }
  }, [refreshTrigger]);

  const loadAgents = async () => {
    if (!profileId) {
      setError('No profile selected');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/agents/project/${profileId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('📁 No .claude/agents directory found in this project');
        } else {
          throw new Error(`Failed to load agents: ${response.status}`);
        }
        setData([]);
        return;
      }
      
      const agents = await response.json();
      setData(agents || []);
    } catch (err) {
      setError('❌ Error loading project agents: ' + err.message);
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
      header: t('agentName') || 'Agent Name',
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
      header: t('description') || 'Description',
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
      header: t('type') || 'Type',
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
      header: t('actions') || 'Actions',
      cell: ({ row }) => (
        <div className="actions-cell">
          <button
            className="action-button preview-button"
            onClick={(e) => {
              e.stopPropagation();
              setViewingAgent(row.original);
              onAgentViewChange?.('view', row.original.name);
            }}
            title={t('viewAgent') || 'View agent'}
          >
            👁️
          </button>
          <button
            className="action-button edit-button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingAgent(row.original);
              onAgentViewChange?.('edit', row.original.name);
            }}
            title={t('editAgent') || 'Edit agent'}
          >
            ✏️
          </button>
        </div>
      ),
      size: 120,
    },
  ], [t]);

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

  // Handle viewing agent with AgentViewer component
  if (viewingAgent) {
    return (
      <AgentViewer
        agent={viewingAgent}
        onBack={() => {
          setViewingAgent(null);
          onAgentViewChange?.(null, null);
        }}
        onEdit={(agent) => {
          setViewingAgent(null);
          setEditingAgent(agent);
          onAgentViewChange?.('edit', agent.name);
        }}
        isGlobal={false}
        profileId={profileId}
      />
    );
  }

  // Handle editing agent with AgentEditor component
  if (editingAgent) {
    return (
      <AgentEditor
        agent={editingAgent}
        onBack={() => {
          setEditingAgent(null);
          onAgentViewChange?.(null, null);
        }}
        onSave={() => {
          loadAgents(); // Refresh the list after save
        }}
        isGlobal={false}
        profileId={profileId}
        showToast={showToast}
      />
    );
  }

  if (!profileId) {
    return (
      <div className="template-management-view">
        <div className="template-management-header">
          <div className="header-content">
            <div className="header-text">
              <h2>🤖 Project Agents</h2>
              <p>Select a project to view its agents</p>
            </div>
          </div>
        </div>
        <div className="loading">
          {t('selectProfileToViewTasks') || 'Select a project to view tasks'}
        </div>
      </div>
    );
  }

  if (loading) {
    const agentsPath = projectRoot ? `${projectRoot}/.claude/agents` : 'project/.claude/agents';
    return (
      <div className="template-management-view">
        <div className="template-management-header">
          <div className="header-content">
            <div className="header-text">
              <h2>🤖 Project Agents</h2>
              <p>Loading project-specific agents...</p>
            </div>
          </div>
        </div>
        <div className="loading">
          Loading agents from {agentsPath}... ⏳
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="template-management-view">
        <div className="template-management-header">
          <div className="header-content">
            <div className="header-text">
              <h2>🤖 Project Agents</h2>
              <p>Manage agents from .claude/agents directory</p>
            </div>
          </div>
        </div>
        <div className="error">
          {error}
          {error.includes('.claude/agents') && (
            <div style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
              <p>To use project agents, create a .claude/agents directory in your project root and add .md or .yaml agent files.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    const agentsPath = projectRoot ? `${projectRoot}/.claude/agents` : 'project/.claude/agents';
    return (
      <div className="template-management-view">
        <div className="template-management-header">
          <div className="header-content">
            <div className="header-text">
              <h2>🤖 Project Agents</h2>
              <p>Manage agents from .claude/agents directory</p>
            </div>
          </div>
        </div>
        <div className="loading">
          No agents found in {agentsPath}. Create a .claude/agents directory in your project root and add .md or .yaml agent files.
        </div>
      </div>
    );
  }

  return (
    <div className="template-management-view">
      <div className="template-management-header">
        <div className="header-content">
          <div className="header-text">
            <h2>🤖 Project Agents</h2>
            <p>Manage agents from .claude/agents directory</p>
          </div>
        </div>
      </div>

      <div className="stats-and-search-container">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder={t('searchTemplatesPlaceholder') || '🔍 Search agents...'}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            title="Search and filter agents by name or content"
          />
        </div>

        <div className="stats-grid">
          <div className="stat-card" title="Total number of project agents">
            <h3>{t('totalTemplates') || 'Total Agents'}</h3>
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
            onClick={() => loadAgents()}
            disabled={loading}
            title="Refresh agent data"
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
              onClick={() => {
                setViewingAgent(row.original);
                onAgentViewChange?.('view', row.original.name);
              }}
              title="Click to view agent details"
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
          {t('showing') || 'Showing'} {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} {t('to') || 'to'}{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          {t('of') || 'of'} {table.getFilteredRowModel().rows.length} {t('agents') || 'agents'}
          {globalFilter && ` (${t('filteredFrom') || 'filtered from'} ${data.length} ${t('total') || 'total'})`}
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
            {t('page') || 'Page'} {table.getState().pagination.pageIndex + 1} {t('of') || 'of'}{' '}
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
    </div>
  );
}

export default ProjectAgentsView;