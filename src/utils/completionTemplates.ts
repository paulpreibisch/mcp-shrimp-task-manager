/**
 * Rich completion templates utility module
 * 
 * This module provides structured markdown templates for capturing detailed task completion information
 * in the notes field. It enables rich documentation without requiring schema changes by leveraging
 * the existing task structure.
 */

/**
 * Interface for rich completion details
 * Captures comprehensive information about task completion
 */
export interface RichCompletionDetails {
  /** List of main accomplishments achieved during task execution */
  accomplishments: string[];
  /** Key solution features and capabilities delivered */
  solutionFeatures: string[];
  /** Technical approach and implementation methodology used */
  technicalApproach: string;
  /** Key architectural decisions and design reasoning */
  keyDecisions: string;
}

/**
 * Interface for task type-specific template options
 */
export interface TemplateOptions {
  /** Task category for specialized template selection */
  taskType?: 'ui' | 'backend' | 'devops' | 'generic';
  /** Whether to include emoji icons in section headers */
  includeEmojis?: boolean;
  /** Custom section titles to override defaults */
  customSections?: Partial<{
    accomplishments: string;
    solutionFeatures: string;
    technicalApproach: string;
    keyDecisions: string;
  }>;
}

/**
 * Interface for markdown formatting options
 */
export interface FormattingOptions {
  /** Bullet point style: '•', '-', or '*' */
  bulletStyle?: '•' | '-' | '*';
  /** Whether to add separator line between original and rich content */
  includeSeparator?: boolean;
  /** Custom separator character or string */
  separatorStyle?: string;
}

/**
 * Default template section titles with emoji icons
 */
export const DEFAULT_SECTIONS = {
  accomplishments: '📋 Accomplishments',
  solutionFeatures: '🔧 Solution Features',
  technicalApproach: '🛠️ Technical Approach',
  keyDecisions: '🧠 Key Decisions'
} as const;

/**
 * Default template section titles without emoji icons
 */
export const PLAIN_SECTIONS = {
  accomplishments: 'Accomplishments',
  solutionFeatures: 'Solution Features',  
  technicalApproach: 'Technical Approach',
  keyDecisions: 'Key Decisions'
} as const;

/**
 * Validates rich completion details for completeness and format
 * 
 * @param details - The rich completion details to validate
 * @returns Validation result with success flag and error messages
 */
export function validateRichCompletionDetails(details: RichCompletionDetails): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!details.accomplishments || details.accomplishments.length === 0) {
    errors.push('At least one accomplishment is required');
  }

  if (!details.solutionFeatures || details.solutionFeatures.length === 0) {
    errors.push('At least one solution feature is required');
  }

  if (!details.technicalApproach || details.technicalApproach.trim().length === 0) {
    errors.push('Technical approach cannot be empty');
  }

  if (!details.keyDecisions || details.keyDecisions.trim().length === 0) {
    errors.push('Key decisions cannot be empty');
  }

  // Validate array items are non-empty strings
  details.accomplishments?.forEach((item, index) => {
    if (!item || item.trim().length === 0) {
      errors.push(`Accomplishment at index ${index} cannot be empty`);
    }
  });

  details.solutionFeatures?.forEach((item, index) => {
    if (!item || item.trim().length === 0) {
      errors.push(`Solution feature at index ${index} cannot be empty`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Escapes markdown special characters to prevent formatting issues
 * 
 * @param text - Text to escape
 * @returns Escaped text safe for markdown
 */
export function escapeMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/\*/g, '\\*')   // Escape asterisks
    .replace(/_/g, '\\_')    // Escape underscores
    .replace(/`/g, '\\`')    // Escape backticks
    .replace(/~/g, '\\~')    // Escape tildes
    .replace(/\|/g, '\\|')   // Escape pipes
    .replace(/#/g, '\\#')    // Escape hashes
    .replace(/\[/g, '\\[')   // Escape left brackets
    .replace(/\]/g, '\\]')   // Escape right brackets
    .replace(/\(/g, '\\(')   // Escape left parentheses
    .replace(/\)/g, '\\)')   // Escape right parentheses
    .replace(/>/g, '\\>')    // Escape greater than
    .replace(/</g, '\\<');   // Escape less than
}

/**
 * Formats a list of items as markdown bullets
 * 
 * @param items - Array of items to format
 * @param bulletStyle - Bullet point character to use
 * @returns Formatted markdown list
 */
export function formatMarkdownList(items: string[], bulletStyle: '•' | '-' | '*' = '•'): string {
  return items
    .filter(item => item && item.trim().length > 0)
    .map(item => `${bulletStyle} ${item.trim()}`)
    .join('\n');
}

/**
 * Formats rich completion details into structured markdown
 * Combines original implementation notes with new rich completion information
 * 
 * @param originalNotes - Existing notes from the task (implementation hints, etc.)
 * @param details - Rich completion details to format
 * @param options - Template and formatting options
 * @returns Formatted markdown string for the notes field
 */
export function formatRichCompletion(
  originalNotes: string = '',
  details: RichCompletionDetails,
  options: TemplateOptions & FormattingOptions = {}
): string {
  // Validate input details
  const validation = validateRichCompletionDetails(details);
  if (!validation.isValid) {
    throw new Error(`Invalid completion details: ${validation.errors.join(', ')}`);
  }

  // Set up formatting options with defaults
  const {
    includeEmojis = true,
    customSections = {},
    bulletStyle = '•',
    includeSeparator = true,
    separatorStyle = '---'
  } = options;

  // Select section titles based on emoji preference
  const baseSections = includeEmojis ? DEFAULT_SECTIONS : PLAIN_SECTIONS;
  const sections = {
    ...baseSections,
    ...customSections
  };

  // Build the formatted content
  let formattedContent = '';

  // Add original implementation notes section if exists
  if (originalNotes && originalNotes.trim().length > 0) {
    formattedContent += `## Implementation Notes\n${originalNotes.trim()}\n\n`;
    
    // Add separator between original and rich content
    if (includeSeparator) {
      formattedContent += `${separatorStyle}\n\n`;
    }
  }

  // Add accomplishments section
  formattedContent += `## ${sections.accomplishments}\n`;
  formattedContent += `${formatMarkdownList(details.accomplishments, bulletStyle)}\n\n`;

  // Add solution features section
  formattedContent += `## ${sections.solutionFeatures}\n`;
  formattedContent += `${formatMarkdownList(details.solutionFeatures, bulletStyle)}\n\n`;

  // Add technical approach section
  formattedContent += `## ${sections.technicalApproach}\n`;
  formattedContent += `${details.technicalApproach.trim()}\n\n`;

  // Add key decisions section
  formattedContent += `## ${sections.keyDecisions}\n`;
  formattedContent += `${details.keyDecisions.trim()}`;

  return formattedContent;
}

/**
 * Creates a template for UI/Frontend tasks
 * Provides structure optimized for frontend development completions
 * 
 * @param accomplishments - UI-specific accomplishments
 * @param solutionFeatures - Frontend features delivered
 * @param technicalApproach - Frontend implementation approach
 * @param keyDecisions - UI/UX and technical decisions
 * @returns Formatted RichCompletionDetails for UI tasks
 */
export function createUITaskTemplate(
  accomplishments: string[],
  solutionFeatures: string[],
  technicalApproach: string,
  keyDecisions: string
): RichCompletionDetails {
  return {
    accomplishments: accomplishments.length > 0 ? accomplishments : [
      'Created responsive UI component with proper accessibility',
      'Implemented interactive functionality with proper state management',
      'Added comprehensive test coverage for user interactions',
      'Applied consistent styling following design system'
    ],
    solutionFeatures: solutionFeatures.length > 0 ? solutionFeatures : [
      'User Experience: Intuitive interface with clear visual feedback',
      'Performance: Optimized rendering with minimal re-renders',
      'Accessibility: WCAG compliant with screen reader support',
      'Responsiveness: Mobile-first design working on all screen sizes'
    ],
    technicalApproach: technicalApproach || 'Used React functional components with hooks, implemented responsive design with CSS-in-JS, added comprehensive testing with React Testing Library.',
    keyDecisions: keyDecisions || 'Chose controlled components for better state management, implemented CSS modules for style encapsulation, used TypeScript for type safety.'
  };
}

/**
 * Creates a template for Backend/API tasks
 * Provides structure optimized for backend development completions
 * 
 * @param accomplishments - Backend-specific accomplishments  
 * @param solutionFeatures - API features delivered
 * @param technicalApproach - Backend implementation approach
 * @param keyDecisions - Architecture and technical decisions
 * @returns Formatted RichCompletionDetails for backend tasks
 */
export function createBackendTaskTemplate(
  accomplishments: string[],
  solutionFeatures: string[],
  technicalApproach: string,
  keyDecisions: string
): RichCompletionDetails {
  return {
    accomplishments: accomplishments.length > 0 ? accomplishments : [
      'Implemented RESTful API endpoints with proper HTTP methods',
      'Added authentication and authorization middleware',
      'Created database schema with proper indexing',
      'Added comprehensive error handling and logging'
    ],
    solutionFeatures: solutionFeatures.length > 0 ? solutionFeatures : [
      'Security: JWT authentication with role-based access control',
      'Performance: Database query optimization and connection pooling',
      'Scalability: Stateless architecture ready for horizontal scaling',
      'Reliability: Comprehensive error handling with proper HTTP status codes'
    ],
    technicalApproach: technicalApproach || 'Used Express.js with TypeScript, implemented repository pattern for data access, added comprehensive input validation with Zod schemas.',
    keyDecisions: keyDecisions || 'Chose JWT over sessions for better scalability, implemented repository pattern for testability, used Zod for runtime type checking.'
  };
}

/**
 * Creates a template for DevOps/Infrastructure tasks
 * Provides structure optimized for infrastructure and deployment completions
 * 
 * @param accomplishments - DevOps-specific accomplishments
 * @param solutionFeatures - Infrastructure features delivered
 * @param technicalApproach - DevOps implementation approach
 * @param keyDecisions - Infrastructure and deployment decisions
 * @returns Formatted RichCompletionDetails for DevOps tasks
 */
export function createDevOpsTaskTemplate(
  accomplishments: string[],
  solutionFeatures: string[],
  technicalApproach: string,
  keyDecisions: string
): RichCompletionDetails {
  return {
    accomplishments: accomplishments.length > 0 ? accomplishments : [
      'Configured CI/CD pipeline with automated testing and deployment',
      'Set up monitoring and logging infrastructure',
      'Implemented security measures and access controls',
      'Created infrastructure as code with proper versioning'
    ],
    solutionFeatures: solutionFeatures.length > 0 ? solutionFeatures : [
      'Automation: Fully automated deployment pipeline with rollback capability',
      'Monitoring: Comprehensive observability with metrics, logs, and alerts',
      'Security: Infrastructure hardening with least-privilege access',
      'Scalability: Auto-scaling configuration with cost optimization'
    ],
    technicalApproach: technicalApproach || 'Used Infrastructure as Code (Terraform/CloudFormation), implemented GitOps workflow, configured comprehensive monitoring stack.',
    keyDecisions: keyDecisions || 'Chose containerization for consistency, implemented blue-green deployment for zero downtime, used managed services for reduced operational overhead.'
  };
}

/**
 * Creates a generic template suitable for any task type
 * Provides flexible structure for general task completions
 * 
 * @param accomplishments - General accomplishments
 * @param solutionFeatures - General features delivered
 * @param technicalApproach - General implementation approach
 * @param keyDecisions - General technical decisions
 * @returns Formatted RichCompletionDetails for generic tasks
 */
export function createGenericTaskTemplate(
  accomplishments: string[],
  solutionFeatures: string[],
  technicalApproach: string,
  keyDecisions: string
): RichCompletionDetails {
  return {
    accomplishments: accomplishments.length > 0 ? accomplishments : [
      'Successfully implemented core functionality',
      'Added comprehensive testing and validation',
      'Created proper documentation and examples',
      'Ensured integration with existing systems'
    ],
    solutionFeatures: solutionFeatures.length > 0 ? solutionFeatures : [
      'Functionality: Core requirements implemented with proper validation',
      'Quality: Comprehensive testing and error handling',
      'Integration: Seamless integration with existing codebase',
      'Maintainability: Clean, documented code following project patterns'
    ],
    technicalApproach: technicalApproach || 'Followed existing project patterns and conventions, implemented comprehensive testing, ensured backward compatibility.',
    keyDecisions: keyDecisions || 'Chose to maintain consistency with existing codebase, prioritized backward compatibility, implemented proper error handling patterns.'
  };
}

/**
 * Auto-selects appropriate template based on task characteristics
 * 
 * @param taskName - Name of the task to analyze
 * @param taskDescription - Description of the task to analyze  
 * @param agentType - Type of agent handling the task (if available)
 * @returns Recommended task type for template selection
 */
export function selectTaskType(
  taskName: string = '',
  taskDescription: string = '',
  agentType?: string
): 'ui' | 'backend' | 'devops' | 'generic' {
  const combinedText = `${taskName} ${taskDescription} ${agentType || ''}`.toLowerCase();

  // UI/Frontend indicators
  const uiKeywords = [
    'ui', 'frontend', 'component', 'react', 'vue', 'angular', 'css', 'html',
    'styling', 'responsive', 'accessibility', 'user interface', 'user experience',
    'ux', 'design', 'layout', 'form', 'button', 'modal', 'navigation'
  ];

  // Backend/API indicators  
  const backendKeywords = [
    'api', 'backend', 'server', 'database', 'endpoint', 'middleware',
    'authentication', 'authorization', 'jwt', 'rest', 'graphql', 'sql',
    'mongodb', 'postgresql', 'express', 'node', 'python', 'java'
  ];

  // DevOps/Infrastructure indicators
  const devopsKeywords = [
    'devops', 'infrastructure', 'deployment', 'ci/cd', 'docker', 'kubernetes',
    'aws', 'azure', 'gcp', 'terraform', 'ansible', 'jenkins', 'github actions',
    'monitoring', 'logging', 'security', 'pipeline', 'automation'
  ];

  const uiMatches = uiKeywords.filter(keyword => combinedText.includes(keyword)).length;
  const backendMatches = backendKeywords.filter(keyword => combinedText.includes(keyword)).length;
  const devopsMatches = devopsKeywords.filter(keyword => combinedText.includes(keyword)).length;

  // Return the category with the most matches
  const maxMatches = Math.max(uiMatches, backendMatches, devopsMatches);
  
  if (maxMatches === 0) {
    return 'generic';
  }

  if (uiMatches === maxMatches) {
    return 'ui';
  } else if (backendMatches === maxMatches) {
    return 'backend';
  } else if (devopsMatches === maxMatches) {
    return 'devops';
  }

  return 'generic';
}

/**
 * Helper function to extract existing implementation notes from current notes field
 * Preserves original implementation hints while preparing for rich completion enhancement
 * 
 * @param currentNotes - Current content of the task notes field
 * @returns Extracted implementation notes or empty string
 */
export function extractImplementationNotes(currentNotes: string = ''): string {
  if (!currentNotes || currentNotes.trim().length === 0) {
    return '';
  }

  // If notes already contain rich completion format, extract only implementation notes
  const implementationMatch = currentNotes.match(/## Implementation Notes\n([\s\S]*?)\n\n---/);
  if (implementationMatch) {
    return implementationMatch[1].trim();
  }

  // If no rich format detected, treat entire content as implementation notes
  return currentNotes.trim();
}