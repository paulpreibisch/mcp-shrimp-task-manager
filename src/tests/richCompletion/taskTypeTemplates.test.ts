import { describe, it, expect } from 'vitest';
import {
  createUITaskTemplate,
  createBackendTaskTemplate,
  createDevOpsTaskTemplate,
  createGenericTaskTemplate,
  selectTaskType,
  RichCompletionDetails
} from '../../utils/completionTemplates.js';

describe('Task Type Templates', () => {
  describe('createUITaskTemplate', () => {
    it('should create UI template with custom values', () => {
      const template = createUITaskTemplate(
        ['Created responsive navbar', 'Added dark mode toggle'],
        ['Mobile-first design', 'Accessibility compliant'],
        'Used React with Material-UI components',
        'Chose controlled components for better state management'
      );

      expect(template.accomplishments).toEqual([
        'Created responsive navbar',
        'Added dark mode toggle'
      ]);
      expect(template.solutionFeatures).toEqual([
        'Mobile-first design',
        'Accessibility compliant'
      ]);
      expect(template.technicalApproach).toBe('Used React with Material-UI components');
      expect(template.keyDecisions).toContain('controlled components');
    });

    it('should provide defaults when arrays are empty', () => {
      const template = createUITaskTemplate([], [], '', '');

      expect(template.accomplishments).toContain('Created responsive UI component with proper accessibility');
      expect(template.solutionFeatures[0]).toContain('User Experience');
      expect(template.technicalApproach).toContain('React functional components');
      expect(template.keyDecisions).toContain('Chose controlled components');
    });

    it('should override only provided fields', () => {
      const template = createUITaskTemplate(
        ['Custom accomplishment'],
        [],
        '',
        'Custom decision'
      );

      expect(template.accomplishments).toEqual(['Custom accomplishment']);
      expect(template.solutionFeatures.length).toBeGreaterThan(0);
      expect(template.solutionFeatures[0]).toContain('User Experience');
      expect(template.keyDecisions).toBe('Custom decision');
    });

    it('should create valid RichCompletionDetails structure', () => {
      const template = createUITaskTemplate(
        ['Task 1'],
        ['Feature 1'],
        'Approach',
        'Decision'
      );

      // Verify it matches the interface
      const details: RichCompletionDetails = template;
      expect(details).toHaveProperty('accomplishments');
      expect(details).toHaveProperty('solutionFeatures');
      expect(details).toHaveProperty('technicalApproach');
      expect(details).toHaveProperty('keyDecisions');
    });
  });

  describe('createBackendTaskTemplate', () => {
    it('should create backend template with custom values', () => {
      const template = createBackendTaskTemplate(
        ['Implemented REST API', 'Added authentication'],
        ['JWT auth', 'Rate limiting'],
        'Express.js with TypeScript',
        'Chose PostgreSQL for ACID compliance'
      );

      expect(template.accomplishments).toEqual([
        'Implemented REST API',
        'Added authentication'
      ]);
      expect(template.solutionFeatures).toEqual(['JWT auth', 'Rate limiting']);
      expect(template.technicalApproach).toBe('Express.js with TypeScript');
      expect(template.keyDecisions).toContain('PostgreSQL');
    });

    it('should provide backend-specific defaults', () => {
      const template = createBackendTaskTemplate([], [], '', '');

      expect(template.accomplishments).toContain('Implemented RESTful API endpoints with proper HTTP methods');
      expect(template.solutionFeatures[0]).toContain('Security');
      expect(template.technicalApproach).toContain('Express.js');
      expect(template.keyDecisions).toContain('JWT');
    });

    it('should handle mixed custom and default values', () => {
      const template = createBackendTaskTemplate(
        [],
        ['Custom security feature'],
        'Custom approach',
        ''
      );

      expect(template.accomplishments.length).toBeGreaterThan(0);
      expect(template.accomplishments[0]).toContain('RESTful API');
      expect(template.solutionFeatures).toEqual(['Custom security feature']);
      expect(template.technicalApproach).toBe('Custom approach');
      expect(template.keyDecisions).toContain('JWT over sessions');
    });
  });

  describe('createDevOpsTaskTemplate', () => {
    it('should create DevOps template with custom values', () => {
      const template = createDevOpsTaskTemplate(
        ['Set up CI/CD pipeline', 'Configured monitoring'],
        ['Automated deployments', 'Real-time alerts'],
        'GitHub Actions with Docker',
        'Chose Kubernetes for orchestration'
      );

      expect(template.accomplishments).toContain('Set up CI/CD pipeline');
      expect(template.solutionFeatures).toContain('Automated deployments');
      expect(template.technicalApproach).toBe('GitHub Actions with Docker');
      expect(template.keyDecisions).toContain('Kubernetes');
    });

    it('should provide DevOps-specific defaults', () => {
      const template = createDevOpsTaskTemplate([], [], '', '');

      expect(template.accomplishments).toContain('Configured CI/CD pipeline with automated testing and deployment');
      expect(template.solutionFeatures[0]).toContain('Automation');
      expect(template.technicalApproach).toContain('Infrastructure as Code');
      expect(template.keyDecisions).toContain('containerization');
    });

    it('should handle partial inputs correctly', () => {
      const template = createDevOpsTaskTemplate(
        ['Pipeline setup'],
        [],
        '',
        'Docker for consistency'
      );

      expect(template.accomplishments).toEqual(['Pipeline setup']);
      expect(template.solutionFeatures.length).toBe(4); // All defaults
      expect(template.technicalApproach).toContain('Terraform');
      expect(template.keyDecisions).toBe('Docker for consistency');
    });
  });

  describe('createGenericTaskTemplate', () => {
    it('should create generic template with custom values', () => {
      const template = createGenericTaskTemplate(
        ['Implemented feature X'],
        ['Performance improvement'],
        'Refactored existing code',
        'Prioritized maintainability'
      );

      expect(template.accomplishments).toEqual(['Implemented feature X']);
      expect(template.solutionFeatures).toEqual(['Performance improvement']);
      expect(template.technicalApproach).toBe('Refactored existing code');
      expect(template.keyDecisions).toBe('Prioritized maintainability');
    });

    it('should provide generic defaults for all fields', () => {
      const template = createGenericTaskTemplate([], [], '', '');

      expect(template.accomplishments).toContain('Successfully implemented core functionality');
      expect(template.solutionFeatures[0]).toContain('Functionality');
      expect(template.technicalApproach).toContain('existing project patterns');
      expect(template.keyDecisions).toContain('maintain consistency');
    });

    it('should work as fallback for any task type', () => {
      const template = createGenericTaskTemplate(
        ['Any accomplishment'],
        ['Any feature'],
        'Any approach',
        'Any decision'
      );

      // Should accept any valid content
      expect(template.accomplishments).toEqual(['Any accomplishment']);
      expect(template.solutionFeatures).toEqual(['Any feature']);
      expect(template.technicalApproach).toBe('Any approach');
      expect(template.keyDecisions).toBe('Any decision');
    });
  });

  describe('selectTaskType', () => {
    describe('UI task detection', () => {
      it('should detect UI tasks from task name', () => {
        expect(selectTaskType('Create React component', '')).toBe('ui');
        expect(selectTaskType('Build frontend interface', '')).toBe('ui');
        expect(selectTaskType('Design responsive layout', '')).toBe('ui');
        expect(selectTaskType('Add CSS styling', '')).toBe('ui');
      });

      it('should detect UI tasks from description', () => {
        expect(selectTaskType('Task 1', 'Build a user interface with React')).toBe('ui');
        expect(selectTaskType('', 'Implement responsive design')).toBe('ui');
        expect(selectTaskType('', 'Create modal component')).toBe('ui');
      });

      it('should detect UI from agent type', () => {
        expect(selectTaskType('', '', 'frontend')).toBe('ui');
        expect(selectTaskType('', '', 'ui-developer')).toBe('ui');
      });

      it('should handle mixed UI keywords', () => {
        expect(selectTaskType(
          'Update navigation',
          'Improve accessibility and responsive design',
          'ui-agent'
        )).toBe('ui');
      });
    });

    describe('Backend task detection', () => {
      it('should detect backend tasks from task name', () => {
        expect(selectTaskType('Create API endpoint', '')).toBe('backend');
        expect(selectTaskType('Set up database schema', '')).toBe('backend');
        expect(selectTaskType('Implement authentication', '')).toBe('backend');
        expect(selectTaskType('Add middleware', '')).toBe('backend');
      });

      it('should detect backend tasks from description', () => {
        expect(selectTaskType('', 'Build REST API with Express')).toBe('backend');
        expect(selectTaskType('', 'Configure MongoDB connection')).toBe('backend');
        expect(selectTaskType('', 'Add JWT authorization')).toBe('backend');
      });

      it('should detect backend from agent type', () => {
        expect(selectTaskType('', '', 'backend')).toBe('backend');
        expect(selectTaskType('', '', 'api-developer')).toBe('backend');
      });

      it('should handle database-related keywords', () => {
        expect(selectTaskType('Migration', 'Update PostgreSQL schema', 'db')).toBe('backend');
      });
    });

    describe('DevOps task detection', () => {
      it('should detect DevOps tasks from task name', () => {
        expect(selectTaskType('Set up CI/CD pipeline', '')).toBe('devops');
        expect(selectTaskType('Configure Docker container', '')).toBe('devops');
        expect(selectTaskType('Deploy to Kubernetes', '')).toBe('devops');
        expect(selectTaskType('Set up monitoring', '')).toBe('devops');
      });

      it('should detect DevOps tasks from description', () => {
        expect(selectTaskType('', 'Configure GitHub Actions workflow')).toBe('devops');
        expect(selectTaskType('', 'Set up AWS infrastructure')).toBe('devops');
        // Use more DevOps-specific keywords
        expect(selectTaskType('', 'Configure Terraform for infrastructure deployment')).toBe('devops');
      });

      it('should detect DevOps from agent type', () => {
        expect(selectTaskType('', '', 'devops')).toBe('devops');
        expect(selectTaskType('', '', 'infrastructure')).toBe('devops');
      });

      it('should handle cloud provider keywords', () => {
        expect(selectTaskType('Cloud setup', 'Configure Azure services', '')).toBe('devops');
        expect(selectTaskType('GCP configuration', '', '')).toBe('devops');
      });
    });

    describe('Generic task detection', () => {
      it('should return generic for unrecognized tasks', () => {
        expect(selectTaskType('Update documentation', '')).toBe('generic');
        expect(selectTaskType('Refactor code', '')).toBe('generic');
        expect(selectTaskType('Fix bug', '')).toBe('generic');
      });

      it('should return generic for empty inputs', () => {
        expect(selectTaskType('', '')).toBe('generic');
        expect(selectTaskType()).toBe('generic');
      });

      it('should return generic for ambiguous tasks', () => {
        expect(selectTaskType('General improvement', 'Make things better')).toBe('generic');
      });
    });

    describe('Keyword conflict resolution', () => {
      it('should handle UI vs Backend conflicts', () => {
        // More UI keywords should win
        expect(selectTaskType(
          'React component with API',
          'Create frontend component that calls backend API'
        )).toBe('ui');

        // When keywords are balanced, first match wins (UI comes first in checks)
        // This test case has equal weight, so UI wins
        expect(selectTaskType(
          'API with simple UI',
          'Build REST API endpoints with basic HTML forms'
        )).toBe('ui');
      });

      it('should handle Backend vs DevOps conflicts', () => {
        // More backend keywords
        expect(selectTaskType(
          'API deployment',
          'Create REST endpoints and database schema'
        )).toBe('backend');

        // More DevOps keywords
        expect(selectTaskType(
          'API deployment',
          'Set up CI/CD pipeline and Docker containers for API'
        )).toBe('devops');
      });

      it('should handle three-way ties', () => {
        const result = selectTaskType(
          'react api docker',
          'component endpoint kubernetes'
        );
        // Should pick one deterministically (first match)
        expect(['ui', 'backend', 'devops']).toContain(result);
      });

      it('should be case insensitive', () => {
        expect(selectTaskType('CREATE REACT COMPONENT', '')).toBe('ui');
        expect(selectTaskType('api ENDPOINT', '')).toBe('backend');
        expect(selectTaskType('Docker KUBERNETES', '')).toBe('devops');
      });
    });

    describe('Performance tests', () => {
      it('should handle very long inputs efficiently', () => {
        const longText = 'react '.repeat(1000) + 'component';
        const startTime = performance.now();
        const result = selectTaskType(longText, longText);
        const endTime = performance.now();

        expect(result).toBe('ui');
        expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
      });

      it('should handle special characters in input', () => {
        expect(selectTaskType('React-component!', 'UI/UX @design #frontend')).toBe('ui');
        expect(selectTaskType('API_endpoint', 'REST*ful (backend)')).toBe('backend');
        expect(selectTaskType('CI/CD|pipeline', 'Docker&Kubernetes')).toBe('devops');
      });

      it('should handle unicode and emojis', () => {
        expect(selectTaskType('React 組件 🎨', 'UI design')).toBe('ui');
        expect(selectTaskType('API 端點 🔌', 'backend service')).toBe('backend');
        expect(selectTaskType('部署 🚀', 'deployment kubernetes')).toBe('devops');
      });
    });

    describe('Agent type priority', () => {
      it('should weight agent type appropriately', () => {
        // Agent type alone should influence decision
        expect(selectTaskType('generic task', 'do something', 'ui')).toBe('ui');
        expect(selectTaskType('generic task', 'do something', 'backend')).toBe('backend');
        expect(selectTaskType('generic task', 'do something', 'devops')).toBe('devops');
      });

      it('should not override strong task indicators', () => {
        // Strong UI indicators should override backend agent
        expect(selectTaskType(
          'Create React component with CSS',
          'Build responsive UI',
          'backend'
        )).toBe('ui');

        // Strong backend indicators should override UI agent
        expect(selectTaskType(
          'Create REST API',
          'Build database schema',
          'ui'
        )).toBe('backend');
      });
    });
  });

  describe('Template Integration Tests', () => {
    it('should select and create appropriate UI template', () => {
      const taskType = selectTaskType('Create React dashboard', 'Build admin UI');
      expect(taskType).toBe('ui');

      const template = createUITaskTemplate(
        ['Built dashboard'],
        ['Responsive design'],
        'React with hooks',
        'Component composition'
      );

      expect(template.accomplishments).toContain('Built dashboard');
    });

    it('should select and create appropriate backend template', () => {
      const taskType = selectTaskType('API development', 'Create REST endpoints');
      expect(taskType).toBe('backend');

      const template = createBackendTaskTemplate(
        ['Created endpoints'],
        ['RESTful design'],
        'Node.js Express',
        'Microservices architecture'
      );

      expect(template.accomplishments).toContain('Created endpoints');
    });

    it('should select and create appropriate DevOps template', () => {
      const taskType = selectTaskType('Pipeline setup', 'Configure CI/CD');
      expect(taskType).toBe('devops');

      const template = createDevOpsTaskTemplate(
        ['Configured pipeline'],
        ['Automated testing'],
        'GitHub Actions',
        'GitOps workflow'
      );

      expect(template.accomplishments).toContain('Configured pipeline');
    });

    it('should fallback to generic template appropriately', () => {
      const taskType = selectTaskType('General task', 'Do various things');
      expect(taskType).toBe('generic');

      const template = createGenericTaskTemplate(
        ['Completed task'],
        ['Working feature'],
        'Standard approach',
        'Best practices'
      );

      expect(template.accomplishments).toContain('Completed task');
    });

    it('should handle template selection dynamically', () => {
      const tasks = [
        { name: 'UI Task', type: 'ui' as const },
        { name: 'Backend Task', type: 'backend' as const },
        { name: 'DevOps Task', type: 'devops' as const },
        { name: 'Generic Task', type: 'generic' as const }
      ];

      tasks.forEach(task => {
        const detected = selectTaskType(task.name, '');
        
        // Create appropriate template based on type
        let template: RichCompletionDetails;
        switch (task.type) {
          case 'ui':
            template = createUITaskTemplate([], [], '', '');
            break;
          case 'backend':
            template = createBackendTaskTemplate([], [], '', '');
            break;
          case 'devops':
            template = createDevOpsTaskTemplate([], [], '', '');
            break;
          default:
            template = createGenericTaskTemplate([], [], '', '');
        }

        expect(template).toBeDefined();
        expect(template.accomplishments.length).toBeGreaterThan(0);
        expect(template.solutionFeatures.length).toBeGreaterThan(0);
      });
    });
  });
});