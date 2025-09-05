import { describe, it, expect, beforeEach } from 'vitest';
import {
  RichCompletionDetails,
  validateRichCompletionDetails,
  escapeMarkdown,
  formatMarkdownList,
  formatRichCompletion,
  extractImplementationNotes,
  DEFAULT_SECTIONS,
  PLAIN_SECTIONS
} from '../../utils/completionTemplates.js';

describe('completionTemplates', () => {
  let validDetails: RichCompletionDetails;

  beforeEach(() => {
    validDetails = {
      accomplishments: ['First accomplishment', 'Second accomplishment'],
      solutionFeatures: ['Feature one', 'Feature two'],
      technicalApproach: 'Technical approach description',
      keyDecisions: 'Key decisions made during implementation'
    };
  });

  describe('validateRichCompletionDetails', () => {
    it('should validate correct details successfully', () => {
      const result = validateRichCompletionDetails(validDetails);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty accomplishments array', () => {
      const invalidDetails: RichCompletionDetails = {
        ...validDetails,
        accomplishments: []
      };
      const result = validateRichCompletionDetails(invalidDetails);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one accomplishment is required');
    });

    it('should reject empty solution features array', () => {
      const invalidDetails: RichCompletionDetails = {
        ...validDetails,
        solutionFeatures: []
      };
      const result = validateRichCompletionDetails(invalidDetails);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one solution feature is required');
    });

    it('should reject empty technical approach', () => {
      const invalidDetails: RichCompletionDetails = {
        ...validDetails,
        technicalApproach: ''
      };
      const result = validateRichCompletionDetails(invalidDetails);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Technical approach cannot be empty');
    });

    it('should reject empty key decisions', () => {
      const invalidDetails: RichCompletionDetails = {
        ...validDetails,
        keyDecisions: '  '
      };
      const result = validateRichCompletionDetails(invalidDetails);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Key decisions cannot be empty');
    });

    it('should reject empty string items in accomplishments', () => {
      const invalidDetails: RichCompletionDetails = {
        ...validDetails,
        accomplishments: ['Valid item', '  ', 'Another valid']
      };
      const result = validateRichCompletionDetails(invalidDetails);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Accomplishment at index 1 cannot be empty');
    });

    it('should reject empty string items in solution features', () => {
      const invalidDetails: RichCompletionDetails = {
        ...validDetails,
        solutionFeatures: ['', 'Valid feature']
      };
      const result = validateRichCompletionDetails(invalidDetails);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Solution feature at index 0 cannot be empty');
    });

    it('should collect multiple validation errors', () => {
      const invalidDetails: RichCompletionDetails = {
        accomplishments: [],
        solutionFeatures: [''],
        technicalApproach: '',
        keyDecisions: ''
      };
      const result = validateRichCompletionDetails(invalidDetails);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });

  describe('escapeMarkdown', () => {
    it('should escape all markdown special characters', () => {
      const input = '*bold* _italic_ `code` #header [link](url) >quote |table|';
      const escaped = escapeMarkdown(input);
      expect(escaped).toBe('\\*bold\\* \\_italic\\_ \\`code\\` \\#header \\[link\\]\\(url\\) \\>quote \\|table\\|');
    });

    it('should handle empty string', () => {
      expect(escapeMarkdown('')).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      expect(escapeMarkdown(null as any)).toBe('');
      expect(escapeMarkdown(undefined as any)).toBe('');
    });

    it('should escape backslashes first to prevent double escaping', () => {
      const input = '\\*already escaped\\*';
      const escaped = escapeMarkdown(input);
      expect(escaped).toBe('\\\\\\*already escaped\\\\\\*');
    });

    it('should handle complex markdown patterns', () => {
      const input = '## Header\n- List item\n**bold** and ~~strikethrough~~';
      const escaped = escapeMarkdown(input);
      expect(escaped).toContain('\\#\\#');
      expect(escaped).toContain('\\*\\*bold\\*\\*');
      expect(escaped).toContain('\\~\\~strikethrough\\~\\~');
    });
  });

  describe('formatMarkdownList', () => {
    it('should format array as bullet list with default bullet', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      const formatted = formatMarkdownList(items);
      expect(formatted).toBe('• Item 1\n• Item 2\n• Item 3');
    });

    it('should use custom bullet style', () => {
      const items = ['First', 'Second'];
      const formatted = formatMarkdownList(items, '-');
      expect(formatted).toBe('- First\n- Second');
    });

    it('should filter out empty items', () => {
      const items = ['Valid', '', '  ', 'Another valid'];
      const formatted = formatMarkdownList(items);
      expect(formatted).toBe('• Valid\n• Another valid');
    });

    it('should trim whitespace from items', () => {
      const items = ['  Spaces before', 'Spaces after  ', '  Both  '];
      const formatted = formatMarkdownList(items);
      expect(formatted).toBe('• Spaces before\n• Spaces after\n• Both');
    });

    it('should handle empty array', () => {
      const formatted = formatMarkdownList([]);
      expect(formatted).toBe('');
    });

    it('should support asterisk bullet style', () => {
      const items = ['Test'];
      const formatted = formatMarkdownList(items, '*');
      expect(formatted).toBe('* Test');
    });
  });

  describe('formatRichCompletion', () => {
    it('should format basic completion details correctly', () => {
      const formatted = formatRichCompletion('', validDetails);
      
      expect(formatted).toContain('## 📋 Accomplishments');
      expect(formatted).toContain('• First accomplishment');
      expect(formatted).toContain('• Second accomplishment');
      expect(formatted).toContain('## 🔧 Solution Features');
      expect(formatted).toContain('• Feature one');
      expect(formatted).toContain('## 🛠️ Technical Approach');
      expect(formatted).toContain('Technical approach description');
      expect(formatted).toContain('## 🧠 Key Decisions');
      expect(formatted).toContain('Key decisions made during implementation');
    });

    it('should preserve original notes', () => {
      const originalNotes = 'Original implementation notes here';
      const formatted = formatRichCompletion(originalNotes, validDetails);
      
      expect(formatted).toContain('## Implementation Notes');
      expect(formatted).toContain(originalNotes);
      expect(formatted).toContain('---'); // Separator
    });

    it('should handle empty original notes', () => {
      const formatted = formatRichCompletion('', validDetails);
      
      expect(formatted).not.toContain('## Implementation Notes');
      expect(formatted).not.toContain('---');
    });

    it('should use plain sections when emojis disabled', () => {
      const formatted = formatRichCompletion('', validDetails, { includeEmojis: false });
      
      expect(formatted).toContain('## Accomplishments');
      expect(formatted).not.toContain('📋');
      expect(formatted).toContain('## Solution Features');
      expect(formatted).not.toContain('🔧');
    });

    it('should use custom section titles', () => {
      const customSections = {
        accomplishments: 'What We Did',
        solutionFeatures: 'Delivered Features'
      };
      const formatted = formatRichCompletion('', validDetails, { customSections });
      
      expect(formatted).toContain('## What We Did');
      expect(formatted).toContain('## Delivered Features');
    });

    it('should use custom bullet style', () => {
      const formatted = formatRichCompletion('', validDetails, { bulletStyle: '-' });
      
      expect(formatted).toContain('- First accomplishment');
      expect(formatted).toContain('- Feature one');
    });

    it('should handle separator customization', () => {
      const formatted = formatRichCompletion('Original', validDetails, { 
        includeSeparator: true, 
        separatorStyle: '====' 
      });
      
      expect(formatted).toContain('====');
    });

    it('should not include separator when disabled', () => {
      const formatted = formatRichCompletion('Original', validDetails, { 
        includeSeparator: false 
      });
      
      expect(formatted).toContain('Original');
      expect(formatted).not.toContain('---');
    });

    it('should throw error for invalid details', () => {
      const invalidDetails: RichCompletionDetails = {
        accomplishments: [],
        solutionFeatures: ['Feature'],
        technicalApproach: 'Approach',
        keyDecisions: 'Decisions'
      };
      
      expect(() => formatRichCompletion('', invalidDetails))
        .toThrow('Invalid completion details');
    });

    it('should handle whitespace in original notes correctly', () => {
      const originalNotes = '  \n  Trimmed notes  \n  ';
      const formatted = formatRichCompletion(originalNotes, validDetails);
      
      expect(formatted).toContain('Trimmed notes');
      // The formatted content will have "## Implementation Notes\nTrimmed notes" format
      expect(formatted).toMatch(/## Implementation Notes\nTrimmed notes/);
    });

    it('should format complex multi-line content properly', () => {
      const complexDetails: RichCompletionDetails = {
        accomplishments: [
          'First line\nwith newline',
          'Second accomplishment'
        ],
        solutionFeatures: ['Feature A', 'Feature B'],
        technicalApproach: 'Line 1\nLine 2\nLine 3',
        keyDecisions: 'Decision with\nmultiple lines'
      };
      
      const formatted = formatRichCompletion('', complexDetails);
      expect(formatted).toContain('First line\nwith newline');
      expect(formatted).toContain('Line 1\nLine 2\nLine 3');
    });
  });

  describe('extractImplementationNotes', () => {
    it('should extract notes from rich format', () => {
      const richFormat = `## Implementation Notes
These are the original notes

---

## 📋 Accomplishments
• Item 1`;
      
      const extracted = extractImplementationNotes(richFormat);
      expect(extracted).toBe('These are the original notes');
    });

    it('should return full content if no rich format detected', () => {
      const plainNotes = 'Just regular notes without formatting';
      const extracted = extractImplementationNotes(plainNotes);
      expect(extracted).toBe(plainNotes);
    });

    it('should handle empty notes', () => {
      expect(extractImplementationNotes('')).toBe('');
      expect(extractImplementationNotes(null as any)).toBe('');
      expect(extractImplementationNotes(undefined as any)).toBe('');
    });

    it('should handle notes with only whitespace', () => {
      const extracted = extractImplementationNotes('   \n  \t  ');
      expect(extracted).toBe('');
    });

    it('should extract multi-line implementation notes', () => {
      const richFormat = `## Implementation Notes
Line 1
Line 2
Line 3

---

## Other Section`;
      
      const extracted = extractImplementationNotes(richFormat);
      expect(extracted).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle malformed rich format gracefully', () => {
      const malformed = `## Implementation Notes
Some notes
## 📋 Accomplishments`;
      
      const extracted = extractImplementationNotes(malformed);
      expect(extracted).toBe(malformed.trim());
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle very long accomplishment lists', () => {
      const longDetails: RichCompletionDetails = {
        accomplishments: Array(100).fill('').map((_, i) => `Accomplishment ${i + 1}`),
        solutionFeatures: ['Feature'],
        technicalApproach: 'Approach',
        keyDecisions: 'Decisions'
      };
      
      const formatted = formatRichCompletion('', longDetails);
      expect(formatted).toContain('Accomplishment 1');
      expect(formatted).toContain('Accomplishment 100');
    });

    it('should handle very long text content', () => {
      const longText = 'A'.repeat(10000);
      const longDetails: RichCompletionDetails = {
        accomplishments: ['Item'],
        solutionFeatures: ['Feature'],
        technicalApproach: longText,
        keyDecisions: 'Decisions'
      };
      
      const formatted = formatRichCompletion('', longDetails);
      expect(formatted).toContain(longText);
    });

    it('should preserve special characters in content', () => {
      const specialDetails: RichCompletionDetails = {
        accomplishments: ['Item with émoji 🎉'],
        solutionFeatures: ['Feature with unicode ™️'],
        technicalApproach: 'Approach with symbols: @#$%^&*()',
        keyDecisions: 'Decisions with <tags> and &entities;'
      };
      
      const formatted = formatRichCompletion('', specialDetails);
      expect(formatted).toContain('🎉');
      expect(formatted).toContain('™️');
      expect(formatted).toContain('@#$%^&*()');
      expect(formatted).toContain('<tags>');
    });

    it('should handle all options combined', () => {
      const formatted = formatRichCompletion(
        'Original notes',
        validDetails,
        {
          includeEmojis: false,
          bulletStyle: '*',
          includeSeparator: true,
          separatorStyle: '***',
          customSections: {
            accomplishments: 'Achievements',
            solutionFeatures: 'Capabilities',
            technicalApproach: 'Implementation',
            keyDecisions: 'Rationale'
          }
        }
      );
      
      expect(formatted).toContain('## Implementation Notes');
      expect(formatted).toContain('Original notes');
      expect(formatted).toContain('***');
      expect(formatted).toContain('## Achievements');
      expect(formatted).toContain('## Capabilities');
      expect(formatted).toContain('## Implementation');
      expect(formatted).toContain('## Rationale');
      expect(formatted).toContain('* First accomplishment');
    });
  });
});