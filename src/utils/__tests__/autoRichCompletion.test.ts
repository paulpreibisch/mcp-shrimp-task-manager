/**
 * Tests for automatic rich completion functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractRichCompletionDetails,
  autoApplyRichCompletion,
  shouldApplyRichCompletion,
  TaskVerificationContext
} from '../autoRichCompletion';
import { Task, TaskStatus } from '../../types';

describe('Automatic Rich Completion', () => {
  const mockTask: Task = {
    id: 'test-task-123',
    name: 'Implement user authentication API',
    description: 'Create REST endpoints for user login, registration, and JWT token management',
    status: TaskStatus.IN_PROGRESS,
    priority: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: 'Consider using bcrypt for password hashing. Implement rate limiting.',
    implementationGuide: 'Use Express.js with TypeScript. Follow REST API conventions.',
    dependencies: [],
    agent: 'backend-specialist'
  };

  describe('shouldApplyRichCompletion', () => {
    it('should apply rich completion for high scores', () => {
      expect(shouldApplyRichCompletion('Task completed successfully', 95)).toBe(true);
    });

    it('should apply rich completion for completed tasks with detailed summaries', () => {
      const detailedSummary = 'Implemented complete authentication system with JWT tokens, bcrypt hashing, and rate limiting middleware';
      expect(shouldApplyRichCompletion(detailedSummary, 85)).toBe(true);
    });

    it('should not apply for short summaries or low scores', () => {
      expect(shouldApplyRichCompletion('Done', 60)).toBe(false);
      expect(shouldApplyRichCompletion('Task finished', 75)).toBe(false);
    });
  });

  describe('extractRichCompletionDetails', () => {
    it('should extract details from basic context', () => {
      const context: TaskVerificationContext = {
        task: mockTask,
        summary: 'Implemented JWT authentication with bcrypt password hashing and rate limiting',
        score: 90
      };

      const details = extractRichCompletionDetails(context);

      expect(details.accomplishments).toContain('Completed implement user authentication api');
      expect(details.solutionFeatures.length).toBeGreaterThan(0);
      expect(details.technicalApproach).toContain('server-side');
      expect(details.keyDecisions).toContain('backend');
    });

    it('should use execution context when available', () => {
      const context: TaskVerificationContext = {
        task: mockTask,
        summary: 'Successfully implemented authentication endpoints',
        score: 95,
        executionContext: {
          filesModified: ['src/auth.ts', 'src/middleware/auth.ts', 'tests/auth.test.ts'],
          linesChanged: 250,
          testsAdded: 12,
          tools: ['Express.js', 'TypeScript', 'bcrypt', 'jsonwebtoken'],
          dependencies: ['bcrypt', 'jsonwebtoken', 'express-rate-limit']
        }
      };

      const details = extractRichCompletionDetails(context);

      expect(details.accomplishments).toContain('Modified 3 files');
      expect(details.accomplishments).toContain('Added 12 tests');
      expect(details.accomplishments).toContain('Added/modified 250 lines of code');
    });

    it('should detect task type correctly', () => {
      const uiTask: Task = {
        ...mockTask,
        name: 'Create responsive dashboard component',
        description: 'Build interactive React dashboard with charts and real-time updates',
        agent: 'ui-specialist'
      };

      const context: TaskVerificationContext = {
        task: uiTask,
        summary: 'Created responsive dashboard with D3.js charts',
        score: 90
      };

      const details = extractRichCompletionDetails(context);
      
      // Should use UI template
      expect(details.solutionFeatures.some(f => 
        f.includes('User Experience') || f.includes('Responsive')
      )).toBe(true);
    });
  });

  describe('autoApplyRichCompletion', () => {
    it('should generate formatted markdown notes', async () => {
      const context: TaskVerificationContext = {
        task: mockTask,
        summary: 'Implemented authentication system with JWT and bcrypt',
        score: 95,
        executionContext: {
          filesModified: ['src/auth.ts'],
          tools: ['Express.js', 'bcrypt']
        }
      };

      const result = await autoApplyRichCompletion(context);

      expect(result).toContain('## Implementation Notes');
      expect(result).toContain('Consider using bcrypt for password hashing');
      expect(result).toContain('## 📋 Accomplishments');
      expect(result).toContain('## 🔧 Solution Features');
      expect(result).toContain('## 🛠️ Technical Approach');
      expect(result).toContain('## 🧠 Key Decisions');
    });

    it('should preserve original implementation notes', async () => {
      const taskWithNotes: Task = {
        ...mockTask,
        notes: 'Original implementation hints:\n- Use JWT for tokens\n- Add rate limiting'
      };

      const context: TaskVerificationContext = {
        task: taskWithNotes,
        summary: 'Authentication system completed',
        score: 90
      };

      const result = await autoApplyRichCompletion(context);

      expect(result).toContain('## Implementation Notes');
      expect(result).toContain('Original implementation hints:');
      expect(result).toContain('- Use JWT for tokens');
      expect(result).toContain('---'); // Separator
    });
  });

  describe('Task type detection', () => {
    it('should detect UI tasks', () => {
      const uiContext: TaskVerificationContext = {
        task: {
          ...mockTask,
          name: 'Build React component',
          description: 'Create responsive UI with accessibility features'
        },
        summary: 'Component created with responsive design',
        score: 85
      };

      const details = extractRichCompletionDetails(uiContext);
      expect(details.solutionFeatures.some(f => f.includes('responsive'))).toBe(true);
    });

    it('should detect DevOps tasks', () => {
      const devopsContext: TaskVerificationContext = {
        task: {
          ...mockTask,
          name: 'Setup CI/CD pipeline',
          description: 'Configure GitHub Actions for automated deployment'
        },
        summary: 'Pipeline configured with automated testing',
        score: 90
      };

      const details = extractRichCompletionDetails(devopsContext);
      expect(details.solutionFeatures.some(f => f.includes('Automation'))).toBe(true);
    });
  });
});

describe('Integration test scenarios', () => {
  it('should handle minimal task information gracefully', () => {
    const minimalTask: Task = {
      id: 'minimal-task',
      name: 'Fix bug',
      status: TaskStatus.IN_PROGRESS,
      priority: 'high',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dependencies: []
    };

    const context: TaskVerificationContext = {
      task: minimalTask,
      summary: 'Bug fixed successfully',
      score: 85
    };

    const details = extractRichCompletionDetails(context);
    
    expect(details.accomplishments.length).toBeGreaterThan(0);
    expect(details.solutionFeatures.length).toBeGreaterThan(0);
    expect(details.technicalApproach.length).toBeGreaterThan(0);
    expect(details.keyDecisions.length).toBeGreaterThan(0);
  });

  it('should handle complex task with full context', async () => {
    const complexTask: Task = {
      id: 'complex-task',
      name: 'Implement microservices architecture',
      description: 'Design and implement distributed system with service discovery, load balancing, and monitoring',
      status: TaskStatus.IN_PROGRESS,
      priority: 'high',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Consider using Kubernetes for orchestration. Implement circuit breaker pattern.',
      implementationGuide: 'Use Docker containers, Kubernetes deployment, Prometheus monitoring',
      dependencies: ['setup-infrastructure', 'design-api-gateway'],
      agent: 'architect'
    };

    const context: TaskVerificationContext = {
      task: complexTask,
      summary: 'Implemented complete microservices architecture with 5 services, API gateway, service mesh, and comprehensive monitoring',
      score: 98,
      executionContext: {
        filesModified: [
          'k8s/deployments.yaml',
          'docker-compose.yml',
          'src/api-gateway.ts',
          'src/services/user-service.ts',
          'src/services/order-service.ts'
        ],
        linesChanged: 1500,
        testsAdded: 45,
        tools: ['Kubernetes', 'Docker', 'Express.js', 'Prometheus', 'Istio'],
        dependencies: ['express', 'kubernetes-client', 'prometheus-client']
      }
    };

    const result = await autoApplyRichCompletion(context);
    
    expect(result).toContain('Modified 5 files');
    expect(result).toContain('Added 45 tests');
    expect(result).toContain('Added/modified 1500 lines of code');
    expect(result).toContain('Kubernetes');
    expect(result).toContain('microservices architecture');
  });
});