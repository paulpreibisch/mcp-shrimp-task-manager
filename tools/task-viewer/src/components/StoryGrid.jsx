import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender
} from '@tanstack/react-table';
import ParallelIndicator from './ParallelIndicator.jsx';

/**
 * StoryGrid component displays all stories in a sortable, filterable table
 */
const StoryGrid = ({ 
  stories = [], 
  verifications = {},
  onEditStory = null,
  onViewStory = null
}) => {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columnHelper = createColumnHelper();

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done': return '#28a745';
      case 'In Progress': return '#007bff';
      case 'Ready for Review': return '#ffc107';
      case 'Ready': return '#17a2b8';
      case 'Draft': 
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Done': return '✅';
      case 'In Progress': return '🔄';
      case 'Ready for Review': return '👀';
      case 'Ready': return '📋';
      case 'Draft': 
      default: return '📝';
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('epicId', {
        header: 'Epic',
        cell: (info) => (
          <span className="font-medium text-blue-600">
            Epic {info.getValue() || '1'}
          </span>
        ),
        size: 80
      }),
      columnHelper.accessor('id', {
        header: 'Story',
        cell: (info) => (
          <span className="font-semibold text-gray-900">
            Story {info.getValue()}
          </span>
        ),
        size: 100
      }),
      columnHelper.accessor('title', {
        header: 'Title',
        cell: (info) => (
          <div className="max-w-xs">
            <div 
              className="font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
              title={info.getValue()}
              onClick={() => onViewStory?.(info.row.original)}
            >
              {info.getValue()}
            </div>
            <div className="text-sm text-gray-500 truncate mt-1">
              {info.row.original.description || 'No description'}
            </div>
          </div>
        ),
        size: 300
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {getStatusIcon(info.getValue())}
            </span>
            <span 
              className="px-2 py-1 text-xs font-medium rounded-full"
              style={{
                color: getStatusColor(info.getValue()),
                backgroundColor: `${getStatusColor(info.getValue())}20`,
                border: `1px solid ${getStatusColor(info.getValue())}40`
              }}
            >
              {info.getValue()}
            </span>
          </div>
        ),
        size: 150
      }),
      columnHelper.accessor('parallelWork', {
        header: 'Parallel',
        cell: (info) => (
          <ParallelIndicator
            multiDevOK={info.getValue()?.multiDevOK || false}
            reason={info.getValue()?.reason || 'Not analyzed'}
            storyId={info.row.original.id}
            size="normal"
          />
        ),
        size: 80
      }),
      columnHelper.accessor((row) => verifications[row.id]?.score, {
        id: 'verificationScore',
        header: 'Score',
        cell: (info) => {
          const score = info.getValue();
          if (score === null || score === undefined) {
            return (
              <span className="text-gray-400 text-sm">
                N/A
              </span>
            );
          }
          
          const color = score >= 80 ? '#28a745' : 
                       score >= 60 ? '#ffc107' : '#dc3545';
          const icon = score >= 80 ? '✅' : 
                      score >= 60 ? '⚠️' : '❌';
          
          return (
            <div className="flex items-center gap-2">
              <span>{icon}</span>
              <span 
                className="font-bold"
                style={{ color }}
              >
                {score}/100
              </span>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a = verifications[rowA.original.id]?.score || 0;
          const b = verifications[rowB.original.id]?.score || 0;
          return a - b;
        },
        size: 100
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex items-center gap-2">
            {onViewStory && (
              <button
                onClick={() => onViewStory(info.row.original)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                data-testid={`story-${info.row.original.id}-view-button`}
              >
                View
              </button>
            )}
            {onEditStory && (
              <button
                onClick={() => onEditStory(info.row.original)}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
                data-testid={`story-${info.row.original.id}-edit-button`}
              >
                Edit
              </button>
            )}
          </div>
        ),
        size: 120
      })
    ],
    [verifications, onEditStory, onViewStory, columnHelper]
  );

  const table = useReactTable({
    data: stories,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (stories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Stories Found
        </h3>
        <p className="text-gray-600">
          Create stories using the MadShrimp agent to see them listed here.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="stories-grid-container">
      {/* Header with Search */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">All Stories</h3>
          <p className="text-sm text-gray-600 mt-1">
            {stories.length} stories across all epics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search stories..."
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            data-testid="story-search-input"
          />
          <div className="text-sm text-gray-500">
            Showing {table.getRowModel().rows.length} of {stories.length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        header.column.getCanSort() ? 'cursor-pointer hover:bg-gray-100' : ''
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: header.getSize() }}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="text-gray-400">
                            {{
                              asc: '↑',
                              desc: '↓',
                            }[header.column.getIsSorted()] ?? '↕️'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row) => (
                <tr 
                  key={row.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  data-testid={`story-${row.original.id}-row`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td 
                      key={cell.id} 
                      className="px-6 py-4 whitespace-nowrap text-sm"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {table.getRowModel().rows.length === 0 && globalFilter && (
        <div className="text-center py-8 text-gray-500">
          No stories found matching "{globalFilter}"
        </div>
      )}
    </div>
  );
};

StoryGrid.propTypes = {
  stories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      description: PropTypes.string,
      acceptanceCriteria: PropTypes.arrayOf(PropTypes.string),
      filePath: PropTypes.string.isRequired,
      lastModified: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      epicId: PropTypes.string,
      parallelWork: PropTypes.shape({
        multiDevOK: PropTypes.bool.isRequired,
        reason: PropTypes.string.isRequired
      })
    })
  ),
  verifications: PropTypes.object,
  onEditStory: PropTypes.func,
  onViewStory: PropTypes.func
};

export default StoryGrid;