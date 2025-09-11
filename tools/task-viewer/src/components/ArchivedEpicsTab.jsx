import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Button from './Button.jsx';

/**
 * ArchivedEpicsTab component displays archived epics in a table format
 * with options to view details and restore epics
 */
const ArchivedEpicsTab = ({ 
  archivedEpics = [], 
  onRestoreEpic = null,
  onViewEpic = null 
}) => {
  const [sortColumn, setSortColumn] = useState('archivedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sort epics
  const sortedEpics = [...archivedEpics].sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];
    
    if (sortColumn === 'archivedAt') {
      aVal = new Date(aVal || 0);
      bVal = new Date(bVal || 0);
    } else if (sortColumn === 'storiesCount') {
      aVal = (a.stories || []).length;
      bVal = (b.stories || []).length;
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Paginate
  const totalPages = Math.ceil(sortedEpics.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEpics = sortedEpics.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  if (archivedEpics.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#94a3b8',
        backgroundColor: 'rgba(100, 149, 210, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(100, 149, 210, 0.2)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
        <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#e2e8f0', marginBottom: '12px' }}>
          No Archived EPICs
        </h3>
        <p style={{ fontSize: '14px' }}>
          Archived EPICs will appear here. Use the archive button on any EPIC to move it here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>
          Archived EPICs
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          {archivedEpics.length} EPIC{archivedEpics.length !== 1 ? 's' : ''} archived
        </p>
      </div>

      <div className="table-container" style={{
        backgroundColor: 'rgba(26, 32, 44, 0.5)',
        borderRadius: '8px',
        border: '1px solid #2d3748'
      }}>
        <table className="table-full-width">
          <thead>
            <tr style={{
              backgroundColor: 'rgba(45, 55, 72, 0.3)',
              borderBottom: '2px solid #2d3748'
            }}>
              <th 
                onClick={() => handleSort('id')}
                style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  color: '#cbd5e1', 
                  fontSize: '13px', 
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none',
                  width: '15%'
                }}
              >
                EPIC ID {sortColumn === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('title')}
                style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  color: '#cbd5e1', 
                  fontSize: '13px', 
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none',
                  width: '40%'
                }}
              >
                Title {sortColumn === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('storiesCount')}
                style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  color: '#cbd5e1', 
                  fontSize: '13px', 
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none',
                  width: '10%'
                }}
              >
                Stories {sortColumn === 'storiesCount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('archivedAt')}
                style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  color: '#cbd5e1', 
                  fontSize: '13px', 
                  fontWeight: '600',
                  cursor: 'pointer',
                  userSelect: 'none',
                  width: '15%'
                }}
              >
                Archived Date {sortColumn === 'archivedAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'center', 
                color: '#cbd5e1', 
                fontSize: '13px', 
                fontWeight: '600',
                width: '20%' 
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedEpics.map((epic) => (
              <tr 
                key={epic.id}
                style={{
                  borderBottom: '1px solid #2d3748',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(74, 85, 104, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td style={{ 
                  padding: '12px', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#cbd5e1' 
                }}>
                  Epic {epic.id}
                </td>
                <td style={{ 
                  padding: '12px', 
                  fontSize: '13px', 
                  color: '#e2e8f0',
                  wordWrap: 'break-word'
                }}>
                  <div style={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.4',
                    maxHeight: '2.8em',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {epic.title || `Epic ${epic.id}`}
                  </div>
                  {epic.description && (
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#94a3b8',
                      marginTop: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.3',
                      maxHeight: '2.6em',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {epic.description}
                    </div>
                  )}
                </td>
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'center',
                  color: '#cbd5e1',
                  fontSize: '13px'
                }}>
                  {(epic.stories || []).length}
                </td>
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '12px'
                }}>
                  {epic.archivedAt ? new Date(epic.archivedAt).toLocaleDateString() : 'Unknown'}
                </td>
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'center' 
                }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {onViewEpic && (
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => onViewEpic(epic)}
                      >
                        View
                      </Button>
                    )}
                    {onRestoreEpic && (
                      <Button
                        variant="success"
                        size="small"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to restore Epic ${epic.id}?`)) {
                            onRestoreEpic(epic.id);
                          }
                        }}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '20px'
        }}>
          <Button
            variant={currentPage === 1 ? 'secondary' : 'primary'}
            size="small"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span style={{ color: '#cbd5e1', fontSize: '13px' }}>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant={currentPage === totalPages ? 'secondary' : 'primary'}
            size="small"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

ArchivedEpicsTab.propTypes = {
  archivedEpics: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      description: PropTypes.string,
      stories: PropTypes.array,
      archivedAt: PropTypes.string
    })
  ),
  onRestoreEpic: PropTypes.func,
  onViewEpic: PropTypes.func
};

export default ArchivedEpicsTab;