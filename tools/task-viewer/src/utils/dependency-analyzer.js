/**
 * Dependency analyzer for determining parallel work capability
 */

/**
 * Analyze story dependencies to determine parallel work capability
 */
export class DependencyAnalyzer {
  constructor() {
    this.sharedFiles = new Set();
    this.independentModules = new Set();
  }

  /**
   * Analyze a story's file list to determine parallel work capability
   */
  analyzeStory(story) {
    const fileList = this.extractFileList(story);
    
    const analysis = {
      multiDevOK: true,
      reason: '',
      confidence: 100,
      riskFactors: [],
      recommendations: []
    };

    // Check each rule
    const rules = [
      this.checkNewFilesOnly.bind(this),
      this.checkIndependentModules.bind(this),
      this.checkNoDatabaseChanges.bind(this),
      this.checkNoSharedComponents.bind(this),
      this.checkNoConfigChanges.bind(this),
      this.checkNoAPIContractChanges.bind(this)
    ];

    for (const rule of rules) {
      const result = rule(fileList, story);
      if (!result.allowed) {
        analysis.multiDevOK = false;
        analysis.reason = result.reason;
        analysis.riskFactors.push(result.reason);
        break;
      }
      if (result.confidence < analysis.confidence) {
        analysis.confidence = result.confidence;
      }
      if (result.warnings) {
        analysis.riskFactors.push(...result.warnings);
      }
      if (result.recommendations) {
        analysis.recommendations.push(...result.recommendations);
      }
    }

    // If still allowing parallel work, provide positive reason
    if (analysis.multiDevOK) {
      analysis.reason = this.generatePositiveReason(fileList, analysis);
    }

    return analysis;
  }

  /**
   * Extract file list from story content
   */
  extractFileList(story) {
    const files = [];
    
    // Extract from story content if available
    if (story.content || story.rawContent) {
      const content = story.content || story.rawContent;
      
      // Look for "File List" section
      const fileListMatch = content.match(/## File List\n([\s\S]*?)(?=^## |$)/m);
      if (fileListMatch) {
        const fileSection = fileListMatch[1];
        const fileMatches = fileSection.match(/^- `?([^`\n]+)`? - (NEW|MODIFY|CREATE|DEPENDENCY|OTHER)/gm);
        
        if (fileMatches) {
          fileMatches.forEach(match => {
            const [, filePath, type] = match.match(/^- `?([^`\n]+)`? - (NEW|MODIFY|CREATE|DEPENDENCY|OTHER)/);
            files.push({
              path: filePath.trim(),
              type: type.trim(),
              isNew: type === 'NEW' || type === 'CREATE',
              isModify: type === 'MODIFY'
            });
          });
        }
      }
    }

    // Also check if story has a fileList property
    if (story.fileList && Array.isArray(story.fileList)) {
      story.fileList.forEach(file => {
        files.push({
          path: file.path || file,
          type: file.type || 'UNKNOWN',
          isNew: file.type === 'NEW' || file.type === 'CREATE',
          isModify: file.type === 'MODIFY' || file.type === 'TO_MODIFY'
        });
      });
    }

    return files;
  }

  /**
   * Rule: Check if all files are new (no modifications)
   */
  checkNewFilesOnly(fileList) {
    const modifiedFiles = fileList.filter(f => f.isModify);
    
    if (modifiedFiles.length === 0) {
      return {
        allowed: true,
        confidence: 95,
        reason: 'All files are new - no modifications to existing code'
      };
    }

    // Allow if only minor modifications
    const minorModifications = modifiedFiles.filter(f => 
      f.path.includes('test') || 
      f.path.includes('spec') || 
      f.path.endsWith('.md')
    );

    if (modifiedFiles.length === minorModifications.length) {
      return {
        allowed: true,
        confidence: 85,
        warnings: ['Minor modifications to tests/docs'],
        recommendations: ['Coordinate test changes with other developers']
      };
    }

    return {
      allowed: false,
      reason: `Modifies existing files: ${modifiedFiles.map(f => f.path).join(', ')}`
    };
  }

  /**
   * Rule: Check if files are in independent modules
   */
  checkIndependentModules(fileList) {
    const modules = this.groupFilesByModule(fileList);
    
    if (modules.length === 1) {
      const module = modules[0];
      
      // Check if this module is independent
      if (this.isIndependentModule(module)) {
        return {
          allowed: true,
          confidence: 90,
          reason: `All changes contained within independent module: ${module}`
        };
      }
    }

    if (modules.length > 1) {
      return {
        allowed: false,
        reason: 'Changes span multiple modules, increasing risk of conflicts'
      };
    }

    return {
      allowed: true,
      confidence: 70,
      warnings: ['Module independence not verified']
    };
  }

  /**
   * Rule: Check for database changes
   */
  checkNoDatabaseChanges(fileList) {
    const dbFiles = fileList.filter(f => 
      f.path.includes('migration') ||
      f.path.includes('schema') ||
      f.path.includes('database') ||
      f.path.includes('model') ||
      f.path.endsWith('.sql')
    );

    if (dbFiles.length > 0) {
      return {
        allowed: false,
        reason: `Contains database changes: ${dbFiles.map(f => f.path).join(', ')}`
      };
    }

    return { allowed: true, confidence: 100 };
  }

  /**
   * Rule: Check for shared component modifications
   */
  checkNoSharedComponents(fileList) {
    const sharedPaths = [
      'src/components/shared',
      'src/utils',
      'src/lib',
      'common',
      'shared',
      'core'
    ];

    const sharedFiles = fileList.filter(f => 
      f.isModify && sharedPaths.some(path => f.path.includes(path))
    );

    if (sharedFiles.length > 0) {
      return {
        allowed: false,
        reason: `Modifies shared components: ${sharedFiles.map(f => f.path).join(', ')}`
      };
    }

    return { allowed: true, confidence: 95 };
  }

  /**
   * Rule: Check for configuration changes
   */
  checkNoConfigChanges(fileList) {
    const configFiles = fileList.filter(f =>
      f.path.includes('config') ||
      f.path.includes('.env') ||
      f.path.endsWith('.json') ||
      f.path.endsWith('.yml') ||
      f.path.endsWith('.yaml') ||
      f.path.includes('package.json')
    );

    if (configFiles.length > 0) {
      return {
        allowed: false,
        reason: `Contains configuration changes: ${configFiles.map(f => f.path).join(', ')}`
      };
    }

    return { allowed: true, confidence: 100 };
  }

  /**
   * Rule: Check for API contract changes
   */
  checkNoAPIContractChanges(fileList) {
    const apiFiles = fileList.filter(f =>
      f.isModify && (
        f.path.includes('api') ||
        f.path.includes('routes') ||
        f.path.includes('controller') ||
        f.path.includes('endpoint') ||
        f.path.includes('interface') ||
        f.path.includes('.d.ts')
      )
    );

    if (apiFiles.length > 0) {
      return {
        allowed: false,
        reason: `Modifies API contracts: ${apiFiles.map(f => f.path).join(', ')}`
      };
    }

    return { allowed: true, confidence: 95 };
  }

  /**
   * Group files by module/directory
   */
  groupFilesByModule(fileList) {
    const modules = new Set();
    
    fileList.forEach(file => {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        // Use first two path segments as module identifier
        const module = parts.slice(0, 2).join('/');
        modules.add(module);
      }
    });

    return Array.from(modules);
  }

  /**
   * Check if a module is independent
   */
  isIndependentModule(module) {
    const independentModules = [
      'src/components',
      'src/pages',
      'tools/',
      'docs/',
      'test/',
      'tests/',
      '__tests__'
    ];

    return independentModules.some(independent => 
      module.startsWith(independent)
    );
  }

  /**
   * Generate positive reason for multi-dev capability
   */
  generatePositiveReason(fileList, analysis) {
    if (fileList.length === 0) {
      return 'No files specified - safe for parallel work';
    }

    const newFiles = fileList.filter(f => f.isNew);
    if (newFiles.length === fileList.length) {
      return 'Creates new independent components with no shared dependencies';
    }

    if (analysis.confidence >= 90) {
      return 'Changes are isolated to independent modules';
    }

    if (analysis.confidence >= 80) {
      return 'Low risk of conflicts with proper coordination';
    }

    return 'Moderate risk - recommend communication between developers';
  }

  /**
   * Analyze multiple stories to find potential conflicts
   */
  analyzeStoryConflicts(stories) {
    const conflicts = [];
    const fileUsage = new Map();

    // Track file usage across stories
    stories.forEach(story => {
      const files = this.extractFileList(story);
      files.forEach(file => {
        if (!fileUsage.has(file.path)) {
          fileUsage.set(file.path, []);
        }
        fileUsage.get(file.path).push({
          storyId: story.id,
          type: file.type,
          isModify: file.isModify
        });
      });
    });

    // Find conflicts
    fileUsage.forEach((usage, filePath) => {
      if (usage.length > 1) {
        const modifyingStories = usage.filter(u => u.isModify);
        if (modifyingStories.length > 1) {
          conflicts.push({
            type: 'file_conflict',
            filePath,
            stories: modifyingStories.map(u => u.storyId),
            severity: 'high',
            reason: 'Multiple stories modify the same file'
          });
        } else if (modifyingStories.length === 1 && usage.length > 1) {
          conflicts.push({
            type: 'dependency_conflict',
            filePath,
            stories: usage.map(u => u.storyId),
            severity: 'medium',
            reason: 'One story modifies file that others depend on'
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Generate parallel work recommendations for a set of stories
   */
  generateWorkPlan(stories) {
    const analyses = stories.map(story => ({
      story,
      analysis: this.analyzeStory(story)
    }));

    const conflicts = this.analyzeStoryConflicts(stories);

    const plan = {
      parallelGroups: [],
      sequentialWork: [],
      conflicts,
      recommendations: []
    };

    // Group stories by parallel capability
    const canWorkInParallel = analyses.filter(a => a.analysis.multiDevOK);
    const mustWorkSequentially = analyses.filter(a => !a.analysis.multiDevOK);

    // Create parallel groups
    if (canWorkInParallel.length > 1) {
      plan.parallelGroups.push({
        stories: canWorkInParallel.map(a => a.story.id),
        maxDevelopers: canWorkInParallel.length,
        confidence: Math.min(...canWorkInParallel.map(a => a.analysis.confidence))
      });
    }

    // Sequential work
    plan.sequentialWork = mustWorkSequentially.map(a => ({
      storyId: a.story.id,
      reason: a.analysis.reason,
      blockers: []
    }));

    // Generate recommendations
    if (conflicts.length > 0) {
      plan.recommendations.push(
        'Resolve file conflicts before starting parallel development'
      );
    }

    if (canWorkInParallel.length > 0) {
      plan.recommendations.push(
        'Set up regular sync meetings for parallel work coordination'
      );
    }

    return plan;
  }
}

// Export singleton instance
export const dependencyAnalyzer = new DependencyAnalyzer();

// Export utility functions
export const analyzeStoryForParallelWork = (story) => {
  return dependencyAnalyzer.analyzeStory(story);
};

export const generateParallelWorkPlan = (stories) => {
  return dependencyAnalyzer.generateWorkPlan(stories);
};

export const findStoryConflicts = (stories) => {
  return dependencyAnalyzer.analyzeStoryConflicts(stories);
};