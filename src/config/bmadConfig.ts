/**
 * BMAD Integration Configuration
 * Manages settings for BMAD system integration
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface BMADConfig {
  enabled: boolean;
  autoDetect: boolean;
  preferBMAD: boolean;
  agentMappings: Record<string, string>;
  storyFileLocation: string;
}

const DEFAULT_CONFIG: BMADConfig = {
  enabled: true,
  autoDetect: true,
  preferBMAD: true,
  agentMappings: {
    'development': 'dev',
    'testing': 'qa',
    'architecture': 'architect',
    'product': 'pm',
    'analysis': 'analyst',
    'ux': 'ux-expert',
    'scrum': 'sm',
    'product-owner': 'po'
  },
  storyFileLocation: 'stories'
};

let cachedConfig: BMADConfig | null = null;

/**
 * Load BMAD configuration from file or use defaults
 */
export async function loadBMADConfig(): Promise<BMADConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  try {
    const configPath = path.join(process.cwd(), '.shrimp-bmad.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    const loadedConfig = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
    cachedConfig = loadedConfig;
    return loadedConfig;
  } catch (error) {
    // Config file doesn't exist, use defaults
    cachedConfig = DEFAULT_CONFIG;
    return DEFAULT_CONFIG;
  }
}

/**
 * Save BMAD configuration to file
 */
export async function saveBMADConfig(config: Partial<BMADConfig>): Promise<void> {
  const currentConfig = await loadBMADConfig();
  const newConfig = { ...currentConfig, ...config };
  
  const configPath = path.join(process.cwd(), '.shrimp-bmad.json');
  await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
  
  // Update cache
  cachedConfig = newConfig;
}

/**
 * Check if BMAD integration is enabled
 */
export async function isBMADEnabled(): Promise<boolean> {
  const config = await loadBMADConfig();
  return config.enabled;
}

/**
 * Get agent mapping for a task type
 */
export async function getAgentMapping(taskType: string): Promise<string | null> {
  const config = await loadBMADConfig();
  return config.agentMappings[taskType] || null;
}