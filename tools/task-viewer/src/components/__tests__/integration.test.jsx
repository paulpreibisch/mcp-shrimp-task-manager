import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import NestedTabs from '../NestedTabs.jsx';
import DashboardView from '../DashboardView.jsx';
import EnhancedTasksView from '../EnhancedTasksView.jsx';
import chakraTheme from '../../theme/chakra-theme';

// Mock components that are passed as children
vi.mock('../DashboardView.jsx', () => ({
  default: ({ tasks, stats, loading, error }) => (
    <div data-testid="dashboard-content">
      <div data-testid="dashboard-tasks-count">{tasks?.length || 0}</div>
      <div data-testid="dashboard-loading">{loading?.toString()}</div>
      <div data-testid="dashboard-error">{error || 'none'}</div>
      {stats && <div data-testid="dashboard-stats">{JSON.stringify(stats)}</div>}
    </div>
  )
}));

vi.mock('../EnhancedTasksView.jsx', () => ({
  default: ({ data, statusFilter, globalFilter, onTaskClick }) => (
    <div data-testid="enhanced-tasks-content">
      <div data-testid="tasks-count">{data?.length || 0}</div>
      <div data-testid="tasks-status-filter">{statusFilter || 'all'}</div>
      <div data-testid="tasks-global-filter">{globalFilter || ''}</div>
      {data?.map(task => (
        <div 
          key={task.id} 
          data-testid={`task-item-${task.id}`}
          onClick={() => onTaskClick && onTaskClick(task)}
        >
          {task.name}
        </div>
      ))}
    </div>
  )
}));

// Mock other child components
const mockChildren = {
  dashboard: <DashboardView 
    tasks={[{ id: 'task-1', name: 'Test Task' }]} 
    stats={{ total: 1 }}
    loading={false}
    error={null}
  />,
  tasks: <EnhancedTasksView 
    data={[
      { id: 'task-1', name: 'Test Task 1', status: 'pending' },
      { id: 'task-2', name: 'Test Task 2', status: 'completed' }
    ]}
    statusFilter="all"
    globalFilter=""
    onTaskClick={vi.fn()}
  />,
  history: <div data-testid="history-content">History Content</div>,
  bmad: <div data-testid="bmad-content">BMAD Content</div>,
  agents: <div data-testid="agents-content">Agents Content</div>,
  settings: <div data-testid="settings-content">Settings Content</div>,
  archive: <div data-testid="archive-content">Archive Content</div>
};

// Mock react-i18next
const mockUseTranslation = {
  t: (key) => {
    const translations = {
      projects: 'Projects',
      releaseNotes: 'Release Notes',
      readme: 'README',
      templates: 'Templates',
      subAgents: 'Sub Agents',
      settings: 'Settings',
      tasks: 'Tasks',
      history: 'History',
      agents: 'Agents',
      archive: 'Archive'
    };
    return translations[key] || key;
  }
};

vi.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation
}));

const renderWithChakra = (component) => {
  return render(
    <ChakraProvider theme={chakraTheme}>
      {component}
    </ChakraProvider>
  );
};

describe('Tab Navigation Integration Tests', () => {
  const mockProfiles = [
    {
      id: 'profile-1',
      name: 'Test Profile 1',
      path: '/test/path1'
    },
    {
      id: 'profile-2', 
      name: 'Test Profile 2',
      path: '/test/path2'
    }
  ];

  const defaultProps = {
    profiles: mockProfiles,
    selectedProfile: 'profile-1',
    handleProfileChange: vi.fn(),
    handleRemoveProfile: vi.fn(),
    setShowAddProfile: vi.fn(),
    projectInnerTab: 'dashboard',
    setProjectInnerTab: vi.fn(),
    children: mockChildren,
    selectedOuterTab: 'projects',
    onOuterTabChange: vi.fn(),
    draggedTabIndex: null,
    dragOverIndex: null,
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(), 
    handleDragEnd: vi.fn(),
    handleDrop: vi.fn(),
    claudeFolderPath: '/claude/folder',
    tasks: [
      { id: 'task-1', name: 'Test Task 1', status: 'pending' },
      { id: 'task-2', name: 'Test Task 2', status: 'completed' }
    ],
    bmadStatus: { detected: true, enabled: true }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Outer Tab Navigation', () => {
    it('renders all outer tabs correctly', () => {
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      expect(screen.getByText('📁 Projects')).toBeInTheDocument();
      expect(screen.getByText('📋 Release Notes')).toBeInTheDocument();
      expect(screen.getByText('ℹ️ README')).toBeInTheDocument();
      expect(screen.getByText('🎨 Templates')).toBeInTheDocument();
      expect(screen.getByText('🤖 Sub Agents')).toBeInTheDocument();
      expect(screen.getByText('⚙️ Settings')).toBeInTheDocument();
    });

    it('switches outer tabs correctly', async () => {
      const user = userEvent.setup();
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const templatesTab = screen.getByText('🎨 Templates');
      await user.click(templatesTab);
      
      expect(defaultProps.onOuterTabChange).toHaveBeenCalledWith('templates');
    });

    it('conditionally renders sub-agents tab when claudeFolderPath exists', () => {
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      expect(screen.getByText('🤖 Sub Agents')).toBeInTheDocument();
    });

    it('does not render sub-agents tab when claudeFolderPath is null', () => {
      const propsWithoutClaude = { ...defaultProps, claudeFolderPath: null };
      renderWithChakra(<NestedTabs {...propsWithoutClaude} />);
      
      expect(screen.queryByText('🤖 Sub Agents')).not.toBeInTheDocument();
    });

    it('maintains active state for selected outer tab', () => {
      const propsWithTemplatesSelected = { ...defaultProps, selectedOuterTab: 'templates' };
      renderWithChakra(<NestedTabs {...propsWithTemplatesSelected} />);
      
      const templatesTab = screen.getByText('🎨 Templates').closest('.tab');
      expect(templatesTab).toHaveClass('active');
    });
  });

  describe('Inner Tab Navigation (Project Tabs)', () => {
    it('renders all inner project tabs correctly with BMAD detected', () => {
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      expect(screen.getByTestId('project-dashboard-tab')).toBeInTheDocument();
      expect(screen.getByText('📋 Tasks')).toBeInTheDocument();
      expect(screen.getByText('📊 History')).toBeInTheDocument();
      expect(screen.getByText('🤖 BMAD')).toBeInTheDocument();
      expect(screen.getByText('🤖 Agents')).toBeInTheDocument();
      expect(screen.getByText('⚙️ Settings')).toBeInTheDocument();
      expect(screen.getByText('📦 Archive')).toBeInTheDocument();
    });

    it('renders inner tabs without BMAD when not detected', () => {
      const propsWithoutBMAD = { 
        ...defaultProps, 
        bmadStatus: { detected: false, enabled: false }
      };
      renderWithChakra(<NestedTabs {...propsWithoutBMAD} />);
      
      expect(screen.getByTestId('project-dashboard-tab')).toBeInTheDocument();
      expect(screen.getByText('📋 Tasks')).toBeInTheDocument();
      expect(screen.getByText('📊 History')).toBeInTheDocument();
      expect(screen.queryByText('🤖 BMAD')).not.toBeInTheDocument();
      expect(screen.getByText('🤖 Agents')).toBeInTheDocument();
      expect(screen.getByText('⚙️ Settings')).toBeInTheDocument();
      expect(screen.getByText('📦 Archive')).toBeInTheDocument();
    });

    it('switches inner tabs correctly', async () => {
      const user = userEvent.setup();
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const tasksTab = screen.getByText('📋 Tasks');
      await user.click(tasksTab);
      
      expect(defaultProps.setProjectInnerTab).toHaveBeenCalledWith('tasks');
    });

    it('maintains active state for selected inner tab', () => {
      const propsWithTasksSelected = { ...defaultProps, projectInnerTab: 'tasks' };
      renderWithChakra(<NestedTabs {...propsWithTasksSelected} />);
      
      const tasksTab = screen.getByText('📋 Tasks').closest('.inner-tab');
      expect(tasksTab).toHaveClass('active');
    });

    it('defaults to dashboard tab when invalid inner tab is selected', () => {
      const propsWithInvalidTab = { ...defaultProps, projectInnerTab: 'invalid-tab' };
      renderWithChakra(<NestedTabs {...propsWithInvalidTab} />);
      
      const dashboardTab = screen.getByTestId('project-dashboard-tab');
      expect(dashboardTab).toHaveClass('active');
    });
  });

  describe('Profile Tab Navigation', () => {
    it('renders profile tabs for each profile', () => {
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      expect(screen.getByText('Test Profile 1')).toBeInTheDocument();
      expect(screen.getByText('Test Profile 2')).toBeInTheDocument();
    });

    it('switches profiles correctly', async () => {
      const user = userEvent.setup();
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const profile2Tab = screen.getByText('Test Profile 2');
      await user.click(profile2Tab);
      
      expect(defaultProps.handleProfileChange).toHaveBeenCalledWith('profile-2');
    });

    it('renders add project button', () => {
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      expect(screen.getByText('+ Add Project')).toBeInTheDocument();
    });

    it('handles add project button click', async () => {
      const user = userEvent.setup();
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const addButton = screen.getByText('+ Add Project');
      await user.click(addButton);
      
      expect(defaultProps.setShowAddProfile).toHaveBeenCalledWith(true);
    });

    it('renders remove profile buttons', () => {
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const removeButtons = screen.getAllByText('×');
      expect(removeButtons).toHaveLength(2); // One for each profile
    });

    it('handles profile removal', async () => {
      const user = userEvent.setup();
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const removeButtons = screen.getAllByText('×');
      await user.click(removeButtons[0]);
      
      expect(defaultProps.handleRemoveProfile).toHaveBeenCalledWith('profile-1');
    });
  });

  describe('Dashboard Tab Content Integration', () => {
    it('renders dashboard content in dashboard tab', () => {
      renderWithChakra(<NestedTabs {...defaultProps} projectInnerTab="dashboard" />);
      
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-tasks-count')).toHaveTextContent('1');
      expect(screen.getByTestId('dashboard-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('dashboard-error')).toHaveTextContent('none');
    });

    it('passes correct props to dashboard component', () => {
      const customChildren = {
        ...mockChildren,
        dashboard: <DashboardView 
          tasks={defaultProps.tasks}
          stats={{ total: 2, completed: 1 }}
          loading={true}
          error="Test error"
        />
      };
      
      renderWithChakra(
        <NestedTabs 
          {...defaultProps} 
          children={customChildren}
          projectInnerTab="dashboard" 
        />
      );
      
      expect(screen.getByTestId('dashboard-tasks-count')).toHaveTextContent('2');
      expect(screen.getByTestId('dashboard-loading')).toHaveTextContent('true');
      expect(screen.getByTestId('dashboard-error')).toHaveTextContent('Test error');
    });

    it('shows dashboard as default when no inner tab is specified', () => {
      renderWithChakra(<NestedTabs {...defaultProps} projectInnerTab="" />);
      
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    });
  });

  describe('Tasks Tab Content Integration', () => {
    it('renders enhanced tasks view in tasks tab', async () => {
      const user = userEvent.setup();
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const tasksTab = screen.getByText('📋 Tasks');
      await user.click(tasksTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-tasks-content')).toBeInTheDocument();
        expect(screen.getByTestId('tasks-count')).toHaveTextContent('2');
        expect(screen.getByTestId('tasks-status-filter')).toHaveTextContent('all');
      });
    });

    it('displays task items from enhanced tasks view', async () => {
      const user = userEvent.setup();
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const tasksTab = screen.getByText('📋 Tasks');
      await user.click(tasksTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('task-item-task-1')).toBeInTheDocument();
        expect(screen.getByTestId('task-item-task-2')).toBeInTheDocument();
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
        expect(screen.getByText('Test Task 2')).toBeInTheDocument();
      });
    });

    it('handles task refresh when clicking tasks tab while already selected', async () => {
      const user = userEvent.setup();
      renderWithChakra(<NestedTabs {...defaultProps} projectInnerTab="tasks" />);
      
      const tasksTab = screen.getByText('📋 Tasks');
      await user.click(tasksTab);
      
      // Should call setProjectInnerTab even when already on tasks tab (force refresh)
      expect(defaultProps.setProjectInnerTab).toHaveBeenCalledWith('tasks');
    });
  });

  describe('Tab Content Switching', () => {
    it('switches between dashboard and tasks content correctly', async () => {
      const user = userEvent.setup();
      renderWithChakra(<NestedTabs {...defaultProps} projectInnerTab="dashboard" />);
      
      // Initially shows dashboard
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      expect(screen.queryByTestId('enhanced-tasks-content')).not.toBeInTheDocument();
      
      // Switch to tasks
      const tasksTab = screen.getByText('📋 Tasks');
      await user.click(tasksTab);
      
      // Should call the handler to switch tabs
      expect(defaultProps.setProjectInnerTab).toHaveBeenCalledWith('tasks');
    });

    it('shows history content when history tab is selected', () => {
      renderWithChakra(<NestedTabs {...defaultProps} projectInnerTab="history" />);
      
      expect(screen.getByTestId('history-content')).toBeInTheDocument();
      expect(screen.getByText('History Content')).toBeInTheDocument();
    });

    it('shows BMAD content when BMAD tab is selected and BMAD is detected', () => {
      renderWithChakra(<NestedTabs {...defaultProps} projectInnerTab="bmad" />);
      
      expect(screen.getByTestId('bmad-content')).toBeInTheDocument();
      expect(screen.getByText('BMAD Content')).toBeInTheDocument();
    });

    it('shows agents content when agents tab is selected', () => {
      renderWithChakra(<NestedTabs {...defaultProps} projectInnerTab="agents" />);
      
      expect(screen.getByTestId('agents-content')).toBeInTheDocument();
      expect(screen.getByText('Agents Content')).toBeInTheDocument();
    });

    it('shows settings content when settings tab is selected', () => {
      renderWithChakra(<NestedTabs {...defaultProps} projectInnerTab="settings" />);
      
      expect(screen.getByTestId('settings-content')).toBeInTheDocument();
      expect(screen.getByText('Settings Content')).toBeInTheDocument();
    });

    it('shows archive content when archive tab is selected', () => {
      renderWithChakra(<NestedTabs {...defaultProps} projectInnerTab="archive" />);
      
      expect(screen.getByTestId('archive-content')).toBeInTheDocument();
      expect(screen.getByText('Archive Content')).toBeInTheDocument();
    });
  });

  describe('Drag and Drop Functionality', () => {
    it('applies drag classes correctly during drag operation', () => {
      const propsWithDrag = { 
        ...defaultProps, 
        draggedTabIndex: 0, 
        dragOverIndex: 1 
      };
      renderWithChakra(<NestedTabs {...propsWithDrag} />);
      
      const profile1Tab = screen.getByText('Test Profile 1').closest('.tab');
      const profile2Tab = screen.getByText('Test Profile 2').closest('.tab');
      
      expect(profile1Tab).toHaveClass('dragging');
      expect(profile2Tab).toHaveClass('drag-over');
    });

    it('handles drag start correctly', () => {
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const profile1Tab = screen.getByText('Test Profile 1').closest('.tab');
      const dragEvent = { dataTransfer: { setData: vi.fn() } };
      
      fireEvent.dragStart(profile1Tab, dragEvent);
      
      expect(defaultProps.handleDragStart).toHaveBeenCalledWith(dragEvent, 0);
    });

    it('handles drag over correctly', () => {
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const profile2Tab = screen.getByText('Test Profile 2').closest('.tab');
      const dragEvent = { preventDefault: vi.fn() };
      
      fireEvent.dragOver(profile2Tab, dragEvent);
      
      expect(defaultProps.handleDragOver).toHaveBeenCalledWith(dragEvent, 1);
    });

    it('handles drag end correctly', () => {
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const profile1Tab = screen.getByText('Test Profile 1').closest('.tab');
      const dragEvent = { preventDefault: vi.fn() };
      
      fireEvent.dragEnd(profile1Tab, dragEvent);
      
      expect(defaultProps.handleDragEnd).toHaveBeenCalledWith(dragEvent);
    });
  });

  describe('Tab Index Calculations', () => {
    it('calculates correct tab indices with BMAD detected', () => {
      // Test with BMAD detected - should have 7 inner tabs
      renderWithChakra(<NestedTabs {...defaultProps} projectInnerTab="agents" />);
      
      const agentsTab = screen.getByText('🤖 Agents').closest('.inner-tab');
      expect(agentsTab).toHaveClass('active');
    });

    it('calculates correct tab indices without BMAD detected', () => {
      const propsWithoutBMAD = { 
        ...defaultProps, 
        bmadStatus: { detected: false, enabled: false },
        projectInnerTab: 'agents'
      };
      renderWithChakra(<NestedTabs {...propsWithoutBMAD} />);
      
      const agentsTab = screen.getByText('🤖 Agents').closest('.inner-tab');
      expect(agentsTab).toHaveClass('active');
    });

    it('handles tab switching with dynamic tab array', async () => {
      const user = userEvent.setup();
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      // Click on archive tab (last tab)
      const archiveTab = screen.getByText('📦 Archive');
      await user.click(archiveTab);
      
      expect(defaultProps.setProjectInnerTab).toHaveBeenCalledWith('archive');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles empty profiles array gracefully', () => {
      const propsWithoutProfiles = { ...defaultProps, profiles: [] };
      renderWithChakra(<NestedTabs {...propsWithoutProfiles} />);
      
      expect(screen.getByText('+ Add Project')).toBeInTheDocument();
      expect(screen.queryByText('Test Profile 1')).not.toBeInTheDocument();
    });

    it('handles missing selectedProfile gracefully', () => {
      const propsWithoutSelected = { ...defaultProps, selectedProfile: null };
      renderWithChakra(<NestedTabs {...propsWithoutSelected} />);
      
      // Should not crash and should still render tabs
      expect(screen.getByText('📁 Projects')).toBeInTheDocument();
    });

    it('handles invalid outer tab selection', () => {
      const propsWithInvalidTab = { ...defaultProps, selectedOuterTab: 'invalid-tab' };
      renderWithChakra(<NestedTabs {...propsWithInvalidTab} />);
      
      // Should default to first tab (projects)
      const projectsTab = screen.getByText('📁 Projects').closest('.tab');
      expect(projectsTab).toHaveClass('active');
    });

    it('handles missing children gracefully', () => {
      const propsWithoutChildren = { ...defaultProps, children: {} };
      renderWithChakra(<NestedTabs {...propsWithoutChildren} />);
      
      // Should not crash
      expect(screen.getByText('📁 Projects')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA roles for tab navigation', () => {
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const tabLists = screen.getAllByRole('tablist');
      expect(tabLists.length).toBeGreaterThan(0);
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
      
      const tabPanels = screen.getAllByRole('tabpanel');
      expect(tabPanels.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const tasksTab = screen.getByText('📋 Tasks');
      tasksTab.focus();
      
      await user.keyboard('{Enter}');
      
      expect(defaultProps.setProjectInnerTab).toHaveBeenCalledWith('tasks');
    });
  });

  describe('Performance Considerations', () => {
    it('efficiently handles multiple profile tabs', () => {
      const manyProfiles = Array.from({ length: 10 }, (_, i) => ({
        id: `profile-${i}`,
        name: `Profile ${i}`,
        path: `/test/path${i}`
      }));
      
      const propsWithManyProfiles = { ...defaultProps, profiles: manyProfiles };
      renderWithChakra(<NestedTabs {...propsWithManyProfiles} />);
      
      expect(screen.getByText('Profile 0')).toBeInTheDocument();
      expect(screen.getByText('Profile 9')).toBeInTheDocument();
    });

    it('efficiently updates active states without re-rendering all tabs', async () => {
      const user = userEvent.setup();
      renderWithChakra(<NestedTabs {...defaultProps} />);
      
      const tasksTab = screen.getByText('📋 Tasks');
      await user.click(tasksTab);
      
      // Should only call setProjectInnerTab once
      expect(defaultProps.setProjectInnerTab).toHaveBeenCalledTimes(1);
    });
  });
});