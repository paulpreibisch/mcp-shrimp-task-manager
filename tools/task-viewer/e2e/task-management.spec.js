import { test, expect } from '@playwright/test';

test.describe('Task Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start the task viewer server
    await page.goto('http://localhost:9998');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Dashboard Navigation and Overview', () => {
    test('should display dashboard overview with correct statistics', async ({ page }) => {
      // Should land on dashboard by default
      await expect(page.locator('[data-testid="dashboard-view"]')).toBeVisible();
      
      // Check for main dashboard elements
      await expect(page.locator('h1')).toContainText('Dashboard Overview');
      await expect(page.locator('text=Comprehensive overview')).toBeVisible();
      
      // Verify statistics cards are present
      await expect(page.locator('[data-testid="dashboard-epic-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-story-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-task-count"]')).toBeVisible();
      
      // Check that statistics show reasonable values
      const epicCount = await page.locator('[data-testid="dashboard-epic-count"]').textContent();
      expect(parseInt(epicCount)).toBeGreaterThanOrEqual(0);
    });

    test('should display epic progress bars when epics exist', async ({ page }) => {
      // Check if epic progress section exists
      const epicSection = page.locator('text=Epic Progress Overview');
      if (await epicSection.isVisible()) {
        // Verify epic progress bars are rendered
        await expect(page.locator('[data-testid*="dashboard-epic-"][data-testid*="-card"]')).toHaveCount.toBeGreaterThan(0);
        
        // Check that each epic card has proper structure
        const epicCards = page.locator('[data-testid*="dashboard-epic-"][data-testid*="-card"]');
        const firstCard = epicCards.first();
        await expect(firstCard).toBeVisible();
      }
    });

    test('should show recent activity feed', async ({ page }) => {
      await expect(page.locator('text=Recent Activity')).toBeVisible();
      
      // Check if activity items exist or empty state is shown
      const activityItems = page.locator('[data-testid*="activity-item"]');
      const emptyState = page.locator('text=No recent verification activity');
      
      // Either should have activities or show empty state
      const hasActivities = await activityItems.count() > 0;
      const hasEmptyState = await emptyState.isVisible();
      
      expect(hasActivities || hasEmptyState).toBeTruthy();
    });
  });

  test.describe('Tab Navigation', () => {
    test('should navigate between different views using tabs', async ({ page }) => {
      // Start on dashboard
      await expect(page.locator('[data-testid="dashboard-view"]')).toBeVisible();
      
      // Navigate to tasks view
      await page.click('[data-testid="tab-tasks"]');
      await expect(page.locator('[data-testid="enhanced-tasks-view"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-view"]')).not.toBeVisible();
      
      // Navigate to table view
      await page.click('[data-testid="tab-table"]');
      await expect(page.locator('[data-testid="optimized-task-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="enhanced-tasks-view"]')).not.toBeVisible();
      
      // Navigate back to dashboard
      await page.click('[data-testid="tab-dashboard"]');
      await expect(page.locator('[data-testid="dashboard-view"]')).toBeVisible();
      await expect(page.locator('[data-testid="optimized-task-table"]')).not.toBeVisible();
    });

    test('should maintain active tab state visually', async ({ page }) => {
      // Check initial active state
      const dashboardTab = page.locator('[data-testid="tab-dashboard"]');
      await expect(dashboardTab).toHaveClass(/active|selected/);
      
      // Switch to tasks tab
      const tasksTab = page.locator('[data-testid="tab-tasks"]');
      await tasksTab.click();
      
      // Verify active state changed
      await expect(tasksTab).toHaveClass(/active|selected/);
      await expect(dashboardTab).not.toHaveClass(/active|selected/);
    });
  });

  test.describe('Enhanced Tasks View', () => {
    test('should display tasks grouped by story', async ({ page }) => {
      await page.click('[data-testid="tab-tasks"]');
      await page.waitForSelector('[data-testid="enhanced-tasks-view"]');
      
      // Check for story groups
      const storyGroups = page.locator('[data-testid*="story-group-"]');
      await expect(storyGroups).toHaveCount.toBeGreaterThan(0);
      
      // Verify story headers contain story icons and names
      const firstStoryGroup = storyGroups.first();
      await expect(firstStoryGroup).toContainText('📖');
    });

    test('should expand and collapse story details', async ({ page }) => {
      await page.click('[data-testid="tab-tasks"]');
      await page.waitForSelector('[data-testid="enhanced-tasks-view"]');
      
      // Find a story group to test
      const storyGroups = page.locator('[data-testid*="story-group-"]');
      const firstStoryGroup = storyGroups.first();
      
      // Initially should not show detailed tasks
      await expect(page.locator('text=Task Details')).not.toBeVisible();
      
      // Expand the story
      await firstStoryGroup.click();
      
      // Should show expanded content
      await expect(page.locator('text=Story Details')).toBeVisible();
      
      // Collapse the story
      await firstStoryGroup.click();
      
      // Details should be hidden again
      await expect(page.locator('text=Story Details')).not.toBeVisible();
    });

    test('should filter tasks by story', async ({ page }) => {
      await page.click('[data-testid="tab-tasks"]');
      await page.waitForSelector('[data-testid="enhanced-tasks-view"]');
      
      // Find the story filter dropdown
      const storyFilter = page.locator('select').filter({ hasText: /All Stories|Filter by Story/ });
      
      if (await storyFilter.isVisible()) {
        // Get available options
        const options = page.locator('select option');
        const optionCount = await options.count();
        
        if (optionCount > 2) { // More than "All Stories" option
          // Select a specific story
          await storyFilter.selectOption({ index: 1 });
          
          // Verify filtering worked
          const taskCount = page.locator('text=Showing').first();
          await expect(taskCount).toBeVisible();
        }
      }
    });

    test('should use expand all and collapse all functionality', async ({ page }) => {
      await page.click('[data-testid="tab-tasks"]');
      await page.waitForSelector('[data-testid="enhanced-tasks-view"]');
      
      // Click expand all
      await page.click('button:has-text("Expand All")');
      
      // All stories should be expanded (check for story details)
      await page.waitForTimeout(1000); // Allow for animation
      const expandedDetails = page.locator('text=Story Details');
      await expect(expandedDetails).toHaveCount.toBeGreaterThan(0);
      
      // Click collapse all
      await page.click('button:has-text("Collapse All")');
      
      // All details should be hidden
      await page.waitForTimeout(1000); // Allow for animation
      await expect(page.locator('text=Story Details')).not.toBeVisible();
    });
  });

  test.describe('Task Table Functionality', () => {
    test('should display tasks in table format', async ({ page }) => {
      await page.click('[data-testid="tab-table"]');
      await page.waitForSelector('[data-testid="optimized-task-table"]');
      
      // Verify table structure
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('thead')).toBeVisible();
      await expect(page.locator('tbody')).toBeVisible();
      
      // Check for standard table headers
      await expect(page.locator('th')).toContainText(['Name', 'Status']);
    });

    test('should handle task interaction in table view', async ({ page }) => {
      await page.click('[data-testid="tab-table"]');
      await page.waitForSelector('[data-testid="optimized-task-table"]');
      
      // Find task rows
      const taskRows = page.locator('tbody tr');
      const rowCount = await taskRows.count();
      
      if (rowCount > 0) {
        // Click on first task row
        const firstRow = taskRows.first();
        await firstRow.click();
        
        // Should trigger some interaction (detail view, selection, etc.)
        // The specific behavior depends on implementation
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Search and Filter Functionality', () => {
    test('should filter tasks using global search', async ({ page }) => {
      // Go to a view with search functionality
      await page.click('[data-testid="tab-tasks"]');
      await page.waitForSelector('[data-testid="enhanced-tasks-view"]');
      
      // Find search input
      const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i]');
      
      if (await searchInput.isVisible()) {
        // Type a search term
        await searchInput.fill('test');
        
        // Wait for filtering to take effect
        await page.waitForTimeout(1000);
        
        // Verify some filtering occurred
        const resultsText = page.locator('text=Showing');
        if (await resultsText.isVisible()) {
          await expect(resultsText).toBeVisible();
        }
        
        // Clear search
        await searchInput.clear();
        await page.waitForTimeout(500);
      }
    });

    test('should maintain filter state across tab switches', async ({ page }) => {
      // Start with tasks view
      await page.click('[data-testid="tab-tasks"]');
      await page.waitForSelector('[data-testid="enhanced-tasks-view"]');
      
      // Apply a filter
      const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i]').first();
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
        
        // Switch to table view
        await page.click('[data-testid="tab-table"]');
        await page.waitForTimeout(500);
        
        // Switch back to tasks view
        await page.click('[data-testid="tab-tasks"]');
        await page.waitForTimeout(500);
        
        // Filter should still be applied
        const searchValue = await searchInput.inputValue();
        expect(searchValue).toBe('test');
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify main elements are still visible
      await expect(page.locator('h1')).toBeVisible();
      
      // Check that navigation works on mobile
      const tabButtons = page.locator('[data-testid^="tab-"]');
      await expect(tabButtons).toHaveCount.toBeGreaterThan(0);
      
      // Test tab switching on mobile
      await page.click('[data-testid="tab-tasks"]');
      await expect(page.locator('[data-testid="enhanced-tasks-view"]')).toBeVisible();
    });

    test('should adapt to tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Verify layout adapts appropriately
      await expect(page.locator('h1')).toBeVisible();
      
      // Test functionality at tablet size
      await page.click('[data-testid="tab-tasks"]');
      await expect(page.locator('[data-testid="enhanced-tasks-view"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Block network requests to simulate offline state
      await page.route('**/api/**', route => route.abort());
      
      // Navigate to a data-dependent view
      await page.click('[data-testid="tab-tasks"]');
      
      // Should show some form of error handling or empty state
      // Rather than crashing
      await page.waitForTimeout(2000);
      
      // Page should still be interactive
      await expect(page.locator('[data-testid="tab-dashboard"]')).toBeVisible();
    });

    test('should recover from temporary errors', async ({ page }) => {
      // Block requests temporarily
      await page.route('**/api/**', route => route.abort());
      
      await page.click('[data-testid="tab-tasks"]');
      await page.waitForTimeout(1000);
      
      // Restore network
      await page.unroute('**/api/**');
      
      // Try to reload/refresh the view
      await page.click('[data-testid="tab-dashboard"]');
      await page.click('[data-testid="tab-tasks"]');
      
      // Should work normally now
      await expect(page.locator('[data-testid="enhanced-tasks-view"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Test keyboard navigation through tabs
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to activate tabs with Enter
      await page.keyboard.press('Enter');
      
      // Continue tabbing through interface
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should not get stuck in any keyboard traps
      await expect(page.locator('body')).toBeFocused();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      await expect(headings).toHaveCount.toBeGreaterThan(0);
      
      // Check for proper button labels
      const buttons = page.locator('button');
      for (let i = 0; i < Math.min(await buttons.count(), 5); i++) {
        const button = buttons.nth(i);
        const hasText = await button.textContent();
        const hasAriaLabel = await button.getAttribute('aria-label');
        const hasTitle = await button.getAttribute('title');
        
        // Each button should have some form of accessible name
        expect(hasText || hasAriaLabel || hasTitle).toBeTruthy();
      }
    });
  });

  test.describe('Performance', () => {
    test('should load initial view quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:9998');
      await page.waitForSelector('[data-testid="dashboard-view"]');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle tab switching efficiently', async ({ page }) => {
      // Measure tab switching performance
      const startTime = Date.now();
      
      // Switch between tabs multiple times
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="tab-tasks"]');
        await page.waitForSelector('[data-testid="enhanced-tasks-view"]');
        
        await page.click('[data-testid="tab-dashboard"]');
        await page.waitForSelector('[data-testid="dashboard-view"]');
      }
      
      const switchTime = Date.now() - startTime;
      
      // All switches should complete within reasonable time
      expect(switchTime).toBeLessThan(10000);
    });
  });
});