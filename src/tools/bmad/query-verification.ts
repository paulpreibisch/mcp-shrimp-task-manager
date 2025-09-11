import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as fs from 'fs';
import * as path from 'path';
import { VerificationResult, VerificationQuery, Epic } from '../../types/bmad.js';

// Schema for verification queries
const QueryVerificationSchema = z.object({
  query: z.string().describe("Natural language query (e.g., 'Show verification for story 1.2')"),
  storyId: z.string().optional().describe("Specific story ID to query"),
  epicId: z.string().optional().describe("Specific epic ID to query"),
  scoreThreshold: z.number().min(0).max(100).optional().describe("Minimum score threshold")
});

/**
 * Query verification MCP tool for conversational access to verification data
 */
export class QueryVerificationTool {
  private verificationDir: string;
  
  constructor(private projectRoot: string) {
    this.verificationDir = path.join(projectRoot, '.ai', 'verification');
  }

  /**
   * Get tool definition for MCP registration
   */
  public static getToolDefinition(): Tool {
    return {
      name: 'mcp__shrimp-task-manager__query_verification',
      description: 'Query verification results for BMAD stories with natural language',
      inputSchema: zodToJsonSchema(QueryVerificationSchema) as any
    };
  }

  /**
   * Handle verification query tool calls
   */
  public async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    try {
      const args = QueryVerificationSchema.parse(request.params.arguments);
      const results = await this.processQuery(args);
      
      return {
        content: [{
          type: 'text',
          text: this.formatQueryResults(results, args.query)
        }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Query error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Process verification query
   */
  private async processQuery(args: any): Promise<any> {
    const queryLower = args.query.toLowerCase();
    
    // Parse query intent
    if (queryLower.includes('verification') && queryLower.includes('story')) {
      return await this.handleStoryVerificationQuery(args);
    }
    
    if (queryLower.includes('epic') && queryLower.includes('progress')) {
      return await this.handleEpicProgressQuery(args);
    }
    
    if (queryLower.includes('low score') || queryLower.includes('need attention')) {
      return await this.handleLowScoreQuery(args);
    }
    
    if (queryLower.includes('technical challenge')) {
      return await this.handleTechnicalChallengesQuery(args);
    }
    
    if (queryLower.includes('complete') && queryLower.includes('epic')) {
      return await this.handleCompletedStoriesQuery(args);
    }
    
    // Default: show latest verifications
    return await this.handleGeneralQuery(args);
  }

  /**
   * Handle story verification queries
   */
  private async handleStoryVerificationQuery(args: any): Promise<{ type: 'story_verification', data: VerificationResult | null, storyId: string }> {
    let storyId = args.storyId;
    
    // Extract story ID from query if not provided
    if (!storyId) {
      const storyMatch = args.query.match(/story\s+(\d+\.\d+)/i);
      if (storyMatch) {
        storyId = storyMatch[1];
      }
    }
    
    if (!storyId) {
      throw new Error("Story ID not found in query. Please specify a story ID like '1.2'");
    }
    
    const verification = await this.getLatestVerification(storyId);
    return {
      type: 'story_verification',
      data: verification,
      storyId
    };
  }

  /**
   * Handle epic progress queries  
   */
  private async handleEpicProgressQuery(args: any): Promise<{ type: 'epic_progress', data: any }> {
    let epicId = args.epicId;
    
    // Extract epic ID from query
    if (!epicId) {
      const epicMatch = args.query.match(/epic\s+(\d+)/i);
      if (epicMatch) {
        epicId = epicMatch[1];
      }
    }
    
    if (!epicId) {
      throw new Error("Epic ID not found in query. Please specify an epic ID like 'Epic 1'");
    }
    
    const progress = await this.getEpicProgress(epicId);
    return {
      type: 'epic_progress',
      data: progress
    };
  }

  /**
   * Handle low score queries
   */
  private async handleLowScoreQuery(args: any): Promise<{ type: 'low_scores', data: VerificationResult[] }> {
    const threshold = args.scoreThreshold || 80;
    const lowScoreVerifications = await this.getVerificationsBelowScore(threshold);
    
    return {
      type: 'low_scores',
      data: lowScoreVerifications
    };
  }

  /**
   * Handle technical challenges queries
   */
  private async handleTechnicalChallengesQuery(args: any): Promise<{ type: 'technical_challenges', data: any[] }> {
    const verifications = await this.getAllVerifications();
    const challenges: any[] = [];
    
    for (const verification of verifications) {
      if (verification.technicalChallenges && verification.technicalChallenges.length > 0) {
        challenges.push({
          storyId: verification.storyId,
          challenges: verification.technicalChallenges,
          score: verification.score,
          timestamp: verification.timestamp
        });
      }
    }
    
    return {
      type: 'technical_challenges',
      data: challenges
    };
  }

  /**
   * Handle completed stories queries
   */
  private async handleCompletedStoriesQuery(args: any): Promise<{ type: 'completed_stories', data: any }> {
    let epicId = args.epicId;
    
    // Extract epic ID from query
    if (!epicId) {
      const epicMatch = args.query.match(/epic\s+(\d+)/i);
      if (epicMatch) {
        epicId = epicMatch[1];
      }
    }
    
    const completedStories = await this.getCompletedStoriesInEpic(epicId);
    return {
      type: 'completed_stories',
      data: completedStories
    };
  }

  /**
   * Handle general queries
   */
  private async handleGeneralQuery(args: any): Promise<{ type: 'general', data: VerificationResult[] }> {
    const recentVerifications = await this.getRecentVerifications(5);
    return {
      type: 'general',
      data: recentVerifications
    };
  }

  /**
   * Get latest verification for a story
   */
  private async getLatestVerification(storyId: string): Promise<VerificationResult | null> {
    try {
      const files = await fs.promises.readdir(this.verificationDir);
      const storyFiles = files.filter(f => f.startsWith(`${storyId}_`) && f.endsWith('.json') && !f.includes('failed'));
      
      if (storyFiles.length === 0) {
        return null;
      }
      
      // Sort by timestamp (newest first)
      storyFiles.sort((a, b) => {
        const timestampA = parseInt(a.split('_')[1]);
        const timestampB = parseInt(b.split('_')[1]);
        return timestampB - timestampA;
      });
      
      const latestFile = storyFiles[0];
      const filePath = path.join(this.verificationDir, latestFile);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      return JSON.parse(content) as VerificationResult;
    } catch (error) {
      console.error(`Error loading verification for story ${storyId}:`, error);
      return null;
    }
  }

  /**
   * Get all verifications
   */
  private async getAllVerifications(): Promise<VerificationResult[]> {
    try {
      const files = await fs.promises.readdir(this.verificationDir);
      const verificationFiles = files.filter(f => f.endsWith('.json') && !f.includes('failed'));
      
      const verifications: VerificationResult[] = [];
      
      for (const file of verificationFiles) {
        try {
          const filePath = path.join(this.verificationDir, file);
          const content = await fs.promises.readFile(filePath, 'utf-8');
          const verification = JSON.parse(content) as VerificationResult;
          verifications.push(verification);
        } catch (error) {
          console.error(`Error reading verification file ${file}:`, error);
        }
      }
      
      return verifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error loading all verifications:', error);
      return [];
    }
  }

  /**
   * Get verifications below a score threshold
   */
  private async getVerificationsBelowScore(threshold: number): Promise<VerificationResult[]> {
    const allVerifications = await this.getAllVerifications();
    return allVerifications.filter(v => v.score < threshold);
  }

  /**
   * Get recent verifications
   */
  private async getRecentVerifications(limit: number): Promise<VerificationResult[]> {
    const allVerifications = await this.getAllVerifications();
    return allVerifications.slice(0, limit);
  }

  /**
   * Get epic progress (mock implementation - would need story parsing)
   */
  private async getEpicProgress(epicId: string): Promise<any> {
    // For now, return mock data - in real implementation, would parse story files
    const verifications = await this.getAllVerifications();
    const epicVerifications = verifications.filter(v => v.storyId.startsWith(`${epicId}.`));
    
    const totalStories = epicVerifications.length;
    const completedStories = epicVerifications.filter(v => v.score >= 80).length;
    const averageScore = totalStories > 0 ? 
      epicVerifications.reduce((sum, v) => sum + v.score, 0) / totalStories : 0;
    
    return {
      epicId,
      totalStories,
      completedStories,
      completionPercentage: totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0,
      averageScore: Math.round(averageScore),
      storiesNeedingAttention: epicVerifications
        .filter(v => v.score < 80)
        .map(v => v.storyId)
    };
  }

  /**
   * Get completed stories in an epic
   */
  private async getCompletedStoriesInEpic(epicId?: string): Promise<any> {
    const verifications = await this.getAllVerifications();
    let filteredVerifications = verifications;
    
    if (epicId) {
      filteredVerifications = verifications.filter(v => v.storyId.startsWith(`${epicId}.`));
    }
    
    const completed = filteredVerifications.filter(v => v.score >= 80);
    
    return {
      epicId: epicId || 'All',
      completedStories: completed.map(v => ({
        storyId: v.storyId,
        score: v.score,
        timestamp: v.timestamp
      }))
    };
  }

  /**
   * Format query results for conversational display
   */
  private formatQueryResults(results: any, originalQuery: string): string {
    switch (results.type) {
      case 'story_verification':
        return this.formatStoryVerificationResult(results.data, results.storyId);
      
      case 'epic_progress':
        return this.formatEpicProgressResult(results.data);
      
      case 'low_scores':
        return this.formatLowScoresResult(results.data);
      
      case 'technical_challenges':
        return this.formatTechnicalChallengesResult(results.data);
      
      case 'completed_stories':
        return this.formatCompletedStoriesResult(results.data);
      
      case 'general':
        return this.formatGeneralResult(results.data);
      
      default:
        return `Query processed: ${originalQuery}\nResults: ${JSON.stringify(results, null, 2)}`;
    }
  }

  /**
   * Format story verification result
   */
  private formatStoryVerificationResult(verification: VerificationResult | null, storyId: string): string {
    if (!verification) {
      return `John (PM): I don't have verification data for Story ${storyId} yet. The story may not be completed or auto-verification hasn't run.`;
    }

    const timestamp = new Date(verification.timestamp).toLocaleString();
    
    let response = `John (PM): Let me check the verification details for Story ${storyId}...\n\n`;
    response += `✅ Story ${verification.storyId}\n`;
    response += `Score: ${verification.score}/100\n`;
    response += `Verified: ${timestamp}\n\n`;
    
    if (verification.keyAccomplishments.length > 0) {
      response += `Key Accomplishments:\n`;
      verification.keyAccomplishments.forEach(acc => {
        response += `• ${acc}\n`;
      });
      response += `\n`;
    }
    
    if (verification.technicalChallenges.length > 0) {
      response += `Technical Challenges Encountered:\n`;
      verification.technicalChallenges.forEach(challenge => {
        response += `• ${challenge}\n`;
      });
      response += `\n`;
    }
    
    if (verification.implementationDetails.length > 0) {
      response += `Implementation Details:\n`;
      verification.implementationDetails.forEach(detail => {
        response += `• ${detail}\n`;
      });
      response += `\n`;
    }
    
    if (verification.score >= 80) {
      response += `The story is performing well with strong implementation quality.`;
    } else if (verification.score >= 60) {
      response += `The story has some areas that could use improvement.`;
    } else {
      response += `The story needs significant attention before it meets our quality standards.`;
    }
    
    return response;
  }

  /**
   * Format epic progress result
   */
  private formatEpicProgressResult(progress: any): string {
    let response = `John (PM): Here's the progress summary for Epic ${progress.epicId}:\n\n`;
    response += `📊 Epic ${progress.epicId} Progress:\n`;
    response += `• Total Stories: ${progress.totalStories}\n`;
    response += `• Completed: ${progress.completedStories} (${progress.completionPercentage}%)\n`;
    response += `• Average Score: ${progress.averageScore}/100\n\n`;
    
    if (progress.storiesNeedingAttention.length > 0) {
      response += `⚠️ Stories needing attention:\n`;
      progress.storiesNeedingAttention.forEach((storyId: string) => {
        response += `• Story ${storyId}\n`;
      });
    } else {
      response += `✅ All stories in this epic are meeting quality standards.`;
    }
    
    return response;
  }

  /**
   * Format low scores result
   */
  private formatLowScoresResult(verifications: VerificationResult[]): string {
    if (verifications.length === 0) {
      return `John (PM): Good news! All verified stories are meeting our quality standards (score ≥ 80).`;
    }
    
    let response = `John (PM): I found ${verifications.length} stories that need attention:\n\n`;
    
    verifications.forEach(v => {
      response += `⚠️ Story ${v.storyId}: ${v.score}/100\n`;
      response += `   ${v.summary}\n\n`;
    });
    
    response += `I recommend reviewing these stories to address any gaps before proceeding.`;
    
    return response;
  }

  /**
   * Format technical challenges result
   */
  private formatTechnicalChallengesResult(challenges: any[]): string {
    if (challenges.length === 0) {
      return `John (PM): No significant technical challenges have been documented in recent implementations.`;
    }
    
    let response = `John (PM): Here are the technical challenges encountered in recent implementations:\n\n`;
    
    challenges.forEach(challenge => {
      response += `🔧 Story ${challenge.storyId} (Score: ${challenge.score}/100):\n`;
      challenge.challenges.forEach((ch: string) => {
        response += `   • ${ch}\n`;
      });
      response += `\n`;
    });
    
    response += `These insights can help us plan similar work in the future and anticipate potential blockers.`;
    
    return response;
  }

  /**
   * Format completed stories result
   */
  private formatCompletedStoriesResult(data: any): string {
    if (data.completedStories.length === 0) {
      const epicText = data.epicId === 'All' ? '' : ` in Epic ${data.epicId}`;
      return `John (PM): No completed stories found${epicText} yet.`;
    }
    
    const epicText = data.epicId === 'All' ? '' : ` in Epic ${data.epicId}`;
    let response = `John (PM): Here are the completed stories${epicText}:\n\n`;
    
    data.completedStories.forEach((story: any) => {
      const timestamp = new Date(story.timestamp).toLocaleDateString();
      response += `✅ Story ${story.storyId}: ${story.score}/100 (${timestamp})\n`;
    });
    
    return response;
  }

  /**
   * Format general result
   */
  private formatGeneralResult(verifications: VerificationResult[]): string {
    if (verifications.length === 0) {
      return `John (PM): No verification data available yet. Stories need to be completed and auto-verified first.`;
    }
    
    let response = `John (PM): Here's a summary of recent verification results:\n\n`;
    
    verifications.forEach(v => {
      const timestamp = new Date(v.timestamp).toLocaleDateString();
      const status = v.score >= 80 ? '✅' : v.score >= 60 ? '⚠️' : '❌';
      response += `${status} Story ${v.storyId}: ${v.score}/100 (${timestamp})\n`;
    });
    
    return response;
  }
}