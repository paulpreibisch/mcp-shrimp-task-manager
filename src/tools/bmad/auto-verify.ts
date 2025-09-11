import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as fs from 'fs';
import * as path from 'path';
import { VerificationResult, AutoVerifyRequest, AutoVerifyResponse } from '../../types/bmad.js';
import { StoryFileWatcher } from '../../utils/file-watcher.js';

// Schema for auto-verification request
const AutoVerifySchema = z.object({
  storyId: z.string().describe("Story ID (e.g., '1.2')"),
  storyPath: z.string().optional().describe("Optional path to story file"),
  triggerReason: z.enum(['status_change', 'manual_trigger']).default('manual_trigger')
});

/**
 * Auto-verification MCP tool for BMAD story completion
 */
export class AutoVerifyTool {
  private watcher: StoryFileWatcher | null = null;
  private verificationDir: string;
  
  constructor(private projectRoot: string) {
    this.verificationDir = path.join(projectRoot, '.ai', 'verification');
    this.ensureVerificationDir();
  }

  /**
   * Get tool definition for MCP registration
   */
  public static getToolDefinition(): Tool {
    return {
      name: 'mcp__shrimp-task-manager__auto_verify_bmad_story',
      description: 'Automatically trigger verification when BMAD story completion is detected',
      inputSchema: zodToJsonSchema(AutoVerifySchema) as any
    };
  }

  /**
   * Handle auto-verification tool calls
   */
  public async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    try {
      const args = AutoVerifySchema.parse(request.params.arguments);
      const result = await this.autoVerifyStory(args as AutoVerifyRequest);
      
      return {
        content: [{
          type: 'text',
          text: this.formatVerificationResponse(result)
        }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Auto-verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Initialize file watcher for automatic verification triggers
   */
  public startAutoVerification(): void {
    if (this.watcher) {
      this.watcher.stopWatching();
    }

    this.watcher = new StoryFileWatcher(
      this.projectRoot,
      async (storyId, newStatus, filePath) => {
        console.log(`Auto-triggering verification for story ${storyId} (status: ${newStatus})`);
        await this.autoVerifyStory({
          storyId,
          storyPath: filePath,
          triggerReason: 'status_change'
        });
      }
    );

    this.watcher.startWatching();
  }

  /**
   * Stop automatic verification
   */
  public stopAutoVerification(): void {
    if (this.watcher) {
      this.watcher.stopWatching();
      this.watcher = null;
    }
  }

  /**
   * Perform auto-verification for a story
   */
  private async autoVerifyStory(request: AutoVerifyRequest): Promise<AutoVerifyResponse> {
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds

    try {
      // Start timeout timer
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Verification timeout (30 seconds)'));
        }, timeout);
      });

      // Perform verification with timeout
      const verificationPromise = this.performVerification(request);
      const verification = await Promise.race([verificationPromise, timeoutPromise]);

      // Store verification result
      await this.storeVerificationResult(verification);

      const elapsed = Date.now() - startTime;
      console.log(`Verification completed for story ${request.storyId} in ${elapsed}ms`);

      return {
        success: true,
        verificationId: `verify_${request.storyId}_${Date.now()}`,
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`Verification failed for story ${request.storyId}:`, error);
      
      // Store failed verification attempt
      await this.storeFailedVerification(request, error as Error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Perform the actual verification process
   */
  private async performVerification(request: AutoVerifyRequest): Promise<VerificationResult> {
    const storyPath = request.storyPath || await this.findStoryFile(request.storyId);
    
    if (!storyPath || !fs.existsSync(storyPath)) {
      throw new Error(`Story file not found for ${request.storyId}`);
    }

    // Parse story file
    const storyData = await this.watcher?.parseCompleteStoryFile(storyPath);
    if (!storyData) {
      throw new Error(`Failed to parse story file: ${storyPath}`);
    }

    // Extract verification data from story content
    const implementationDetails = this.extractImplementationDetails(storyData);
    const keyAccomplishments = this.extractKeyAccomplishments(storyData);
    const technicalChallenges = this.extractTechnicalChallenges(storyData);
    
    // Calculate quality score based on completion criteria
    const score = this.calculateQualityScore(storyData);

    const verification: VerificationResult = {
      storyId: request.storyId,
      score,
      summary: this.generateVerificationSummary(storyData, score),
      implementationDetails,
      keyAccomplishments,
      technicalChallenges,
      timestamp: new Date()
    };

    return verification;
  }

  /**
   * Extract implementation details from story content
   */
  private extractImplementationDetails(storyData: any): string[] {
    const details: string[] = [];
    
    // Look for completion notes in dev agent record
    if (storyData.sections.devAgentRecord) {
      details.push('Dev agent record completed');
      
      if (storyData.sections.devAgentRecord.changeLog) {
        const changes = storyData.sections.devAgentRecord.changeLog
          .filter((entry: any) => entry.change && entry.change.trim())
          .map((entry: any) => entry.change);
        details.push(...changes);
      }
    }

    // Extract from tasks/subtasks completion
    const taskMatches = storyData.rawContent.match(/- \[x\] (.+)/g);
    if (taskMatches) {
      details.push(`${taskMatches.length} tasks completed`);
    }

    return details.filter(detail => detail.length > 0);
  }

  /**
   * Extract key accomplishments from story content
   */
  private extractKeyAccomplishments(storyData: any): string[] {
    const accomplishments: string[] = [];
    
    // Check if all acceptance criteria are addressed
    if (storyData.frontmatter.acceptanceCriteria.length > 0) {
      accomplishments.push(`${storyData.frontmatter.acceptanceCriteria.length} acceptance criteria defined`);
    }

    // Check integration verification
    const ivMatches = storyData.rawContent.match(/- \[x\] IV\d+:/g);
    if (ivMatches) {
      accomplishments.push(`${ivMatches.length} integration verifications passed`);
    }

    // Check for file implementations
    const fileMatches = storyData.rawContent.match(/## File List\n([\s\S]*?)(?=^## |$)/m);
    if (fileMatches) {
      const fileCount = (fileMatches[1].match(/^- .+$/gm) || []).length;
      if (fileCount > 0) {
        accomplishments.push(`${fileCount} files planned for implementation`);
      }
    }

    return accomplishments;
  }

  /**
   * Extract technical challenges from story content
   */
  private extractTechnicalChallenges(storyData: any): string[] {
    const challenges: string[] = [];
    
    // Look for dev notes that might contain challenges
    const devNotesMatch = storyData.rawContent.match(/^## Dev Notes\n([\s\S]*?)(?=^## |$)/m);
    if (devNotesMatch) {
      const devNotes = devNotesMatch[1];
      
      // Look for technical context or integration points
      if (devNotes.includes('Technical Context')) {
        challenges.push('Complex technical integration required');
      }
      
      if (devNotes.includes('Integration Points')) {
        challenges.push('Multiple system integration points');
      }
    }

    // Check for timeout or performance requirements
    if (storyData.rawContent.includes('30 seconds') || storyData.rawContent.includes('timeout')) {
      challenges.push('Performance and timeout requirements');
    }

    return challenges;
  }

  /**
   * Calculate quality score based on story completion
   */
  private calculateQualityScore(storyData: any): number {
    let score = 0;
    const maxScore = 100;

    // Basic story structure (20 points)
    if (storyData.frontmatter.title) score += 5;
    if (storyData.frontmatter.story) score += 5;
    if (storyData.frontmatter.status === 'Done') score += 10;

    // Acceptance criteria (20 points)
    if (storyData.frontmatter.acceptanceCriteria.length > 0) {
      score += Math.min(20, storyData.frontmatter.acceptanceCriteria.length * 5);
    }

    // Task completion (25 points)
    const taskMatches = storyData.rawContent.match(/- \[(x| )\] /g);
    if (taskMatches) {
      const completedTasks = taskMatches.filter((task: string) => task.includes('[x]')).length;
      const totalTasks = taskMatches.length;
      score += Math.round((completedTasks / totalTasks) * 25);
    }

    // Integration verification (20 points)
    const ivMatches = storyData.rawContent.match(/- \[(x| )\] IV\d+:/g);
    if (ivMatches) {
      const completedIV = ivMatches.filter((iv: string) => iv.includes('[x]')).length;
      const totalIV = ivMatches.length;
      score += Math.round((completedIV / totalIV) * 20);
    }

    // Dev agent record (15 points)
    if (storyData.sections.devAgentRecord) score += 15;

    return Math.min(maxScore, Math.max(0, score));
  }

  /**
   * Generate verification summary
   */
  private generateVerificationSummary(storyData: any, score: number): string {
    const title = storyData.frontmatter.title || 'Untitled Story';
    const status = storyData.frontmatter.status;
    
    let summary = `Story verification completed: ${title}\n`;
    summary += `Status: ${status}\n`;
    summary += `Quality Score: ${score}/100\n`;
    
    if (score >= 80) {
      summary += 'Story meets quality standards for completion.';
    } else if (score >= 60) {
      summary += 'Story has minor issues that should be addressed.';
    } else {
      summary += 'Story requires significant improvements before completion.';
    }

    return summary;
  }

  /**
   * Store verification result to disk
   */
  private async storeVerificationResult(verification: VerificationResult): Promise<void> {
    const filename = `${verification.storyId}_${Date.now()}.json`;
    const filePath = path.join(this.verificationDir, filename);
    
    await fs.promises.writeFile(filePath, JSON.stringify(verification, null, 2));
    console.log(`Verification result stored: ${filePath}`);
  }

  /**
   * Store failed verification attempt
   */
  private async storeFailedVerification(request: AutoVerifyRequest, error: Error): Promise<void> {
    const failure = {
      storyId: request.storyId,
      error: error.message,
      timestamp: new Date(),
      triggerReason: request.triggerReason
    };

    const filename = `${request.storyId}_failed_${Date.now()}.json`;
    const filePath = path.join(this.verificationDir, filename);
    
    await fs.promises.writeFile(filePath, JSON.stringify(failure, null, 2));
    console.log(`Verification failure recorded: ${filePath}`);
  }

  /**
   * Find story file by ID
   */
  private async findStoryFile(storyId: string): Promise<string | null> {
    const storiesDir = path.join(this.projectRoot, 'docs', 'stories');
    const filename = `${storyId}.story.md`;
    const filePath = path.join(storiesDir, filename);
    
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    
    return null;
  }

  /**
   * Ensure verification directory exists
   */
  private ensureVerificationDir(): void {
    if (!fs.existsSync(this.verificationDir)) {
      fs.mkdirSync(this.verificationDir, { recursive: true });
    }
  }

  /**
   * Format verification response for display
   */
  private formatVerificationResponse(result: AutoVerifyResponse): string {
    if (result.success) {
      return `✅ Auto-verification completed successfully
Verification ID: ${result.verificationId}
Timestamp: ${result.timestamp.toISOString()}

The verification data has been stored and is now available for query through MadShrimp conversational commands.`;
    } else {
      return `❌ Auto-verification failed
Error: ${result.error}
Timestamp: ${result.timestamp.toISOString()}

The failure has been logged for debugging purposes.`;
    }
  }
}