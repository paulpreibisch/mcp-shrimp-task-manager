import React, { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTranslation } from 'react-i18next';
import { getUIStrings, getReadmeContent } from '../i18n/documentation/index.js';
import ImageLightbox, { useLightbox } from './ImageLightbox';
import { Link as ScrollLink, Element as ScrollElement, Events, scrollSpy, scroller } from 'react-scroll';
import { useScrollSpy, TocItem } from '../hooks/useScrollSpy';

function Help() {
  const [readmeContent, setReadmeContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [tableOfContents, setTableOfContents] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [activeSection, setActiveSection] = useState('');
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const uiStrings = getUIStrings('help', currentLanguage);
  const lightbox = useLightbox();
  const imagesRef = useRef([]);
  const contentRef = useRef(null);
  const sidebarRef = useRef(null);

  // Centralized ID generation function to ensure consistency
  const generateUniqueId = (text, parentPath) => {
    const cleanPath = [...parentPath, text].map(part => 
      part.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    ).filter(part => part.length > 0);
    return cleanPath.join('-');
  };

  useEffect(() => {
    loadReadmeContent();
  }, [currentLanguage]);

  // Initialize react-scroll after content loads
  useEffect(() => {
    if (readmeContent && tableOfContents.length > 0 && contentRef.current) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        // Configure scrollSpy to use our container
        scrollSpy.update();
        console.log('ScrollSpy updated for Help page with container');
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [readmeContent, tableOfContents]);

  // Set up scroll spy for container
  useEffect(() => {
    if (!contentRef.current) return;
    
    const container = contentRef.current;
    
    const handleScroll = () => {
      // Get all ScrollElement targets
      const elements = container.querySelectorAll('[data-scroll-element]');
      if (!elements.length) return;
      
      const containerRect = container.getBoundingClientRect();
      const containerHeight = containerRect.height;
      const containerTop = containerRect.top;
      
      let activeElement = null;
      let minDistance = Infinity;
      
      // Find the element closest to the top of the viewport (with a bias toward visible elements)
      elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const relativeTop = rect.top - containerTop;
        
        // Element is in the viewport or just above it
        if (relativeTop >= -50 && relativeTop <= containerHeight / 3) {
          // Calculate distance from the ideal position (slightly below top)
          const distance = Math.abs(relativeTop - 50);
          
          if (distance < minDistance) {
            minDistance = distance;
            activeElement = element;
          }
        }
      });
      
      // If no element is in the ideal range, find the last element that's above the viewport
      if (!activeElement) {
        for (let i = elements.length - 1; i >= 0; i--) {
          const element = elements[i];
          const rect = element.getBoundingClientRect();
          const relativeTop = rect.top - containerTop;
          
          if (relativeTop <= 50) {
            activeElement = element;
            break;
          }
        }
      }
      
      if (activeElement) {
        const activeId = activeElement.getAttribute('data-scroll-element');
        if (activeId && activeId !== activeSection) {
          setActiveSection(activeId);
        }
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [activeSection, readmeContent]);

  // Auto-scroll sidebar to keep active item centered in viewport
  useEffect(() => {
    if (!activeSection || !sidebarRef.current) return;
    
    const activeItem = document.querySelector(`.help-toc-item[data-id="${activeSection}"]`);
    
    if (activeItem && sidebarRef.current) {
      const sidebar = sidebarRef.current;
      
      // Get bounding rectangles for accurate positioning
      const sidebarRect = sidebar.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      
      // Calculate the item's position relative to the sidebar's scrollable area
      // This accounts for the current scroll position
      const itemPositionInSidebar = itemRect.top - sidebarRect.top + sidebar.scrollTop;
      
      const itemHeight = activeItem.offsetHeight;
      const sidebarHeight = sidebar.clientHeight;
      
      // Calculate the scroll position to center the active item in the sidebar viewport
      // We want the item's center to align with the sidebar's center
      const targetScrollTop = itemPositionInSidebar - (sidebarHeight / 2) + (itemHeight / 2);
      
      // Ensure we don't scroll beyond the bounds
      const maxScroll = sidebar.scrollHeight - sidebarHeight;
      const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));
      
      // Smoothly scroll to the calculated position
      sidebar.scrollTo({
        top: finalScrollTop,
        behavior: 'smooth'
      });
    }
  }, [activeSection]);

  const loadReadmeContent = async () => {
    setLoading(true);
    
    try {
      let content = '';
      
      // Quick Start section to be inserted at the top
      const quickStartSection = `
# 🦐 Shrimp Task Manager Viewer

## 🚀 Quick Start

### Installation & Setup

1. **Clone and navigate to the task viewer directory**
   \`\`\`bash
   cd path/to/mcp-shrimp-task-manager/tools/task-viewer
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Build the React application**
   \`\`\`bash
   npm run build
   \`\`\`

4. **Start the server**
   \`\`\`bash
   npm start
   \`\`\`

   The viewer will be available at \`http://localhost:9998\`

### Development Mode

For development with hot reload:

\`\`\`bash
# Starting both the API server and development server together
npm run start:all

# Running servers separately if needed:
npm start          # API server on port 9998
npm run dev        # Vite dev server on port 3000
\`\`\`

The app will be available at \`http://localhost:3000\` with automatic rebuilding on file changes.

### Production Deployment

#### Standard Deployment

\`\`\`bash
# Building the application for production
npm run build

# Starting the production server
npm start
\`\`\`

---

`;
      
      // Archive documentation will be added after main content  
      const archiveDocumentation = `

---

## Archive Feature

### Overview

The Archive feature is a powerful tool that allows you to save your current task lists for later use. This is particularly useful when you need to switch between different projects or features without losing your planning work.

### Use Cases

#### When to Archive Your Task List Using the Archive Feature

The Archive feature becomes invaluable when you're juggling multiple projects or need to pivot your focus without losing your carefully crafted task plans. Imagine you're in the middle of implementing a complex authentication system with 30+ interconnected tasks, dependencies mapped out, and agents assigned. Suddenly, a critical bug in production demands your immediate attention. Rather than losing all that planning work or trying to work around it, you can archive your current task list with a single click, preserving every detail including task descriptions, dependencies, completion status, and even the initial request that spawned the project.

This feature particularly shines when you're working across multiple features or experiments. For example, you might be exploring two different architectural approaches for a new feature. You can fully plan out the first approach with all its tasks, archive it with a descriptive name like "Microservices Architecture Approach", then start fresh with the second approach. Later, you can compare both archived plans side by side, or import the one that proves most viable. The Archive feature also serves as an excellent template system – if you find yourself repeatedly implementing similar features across different projects, you can archive a well-structured task list and reuse it as a starting template for future work, saving hours of planning time.

### Working with Archives

#### Creating an Archive

![Archive Dialog](/releases/archive-dialog.png)
*The Archive Current Tasks dialog shows a summary of what will be archived, including the project name, task counts, and the complete initial request that created these tasks*

To archive your current tasks:
1. Click the **Archive** button in the main toolbar
2. The archive dialog will show:
   - Your current project name
   - Total number of tasks
   - Task status breakdown (completed, in progress, pending)
   - The initial request that created these tasks
3. Click **Continue** to save the archive
4. Your tasks will be stored locally and persist across sessions

#### Viewing Archives

![Archive List](/releases/archive-list.png)
*The Archive tab displays all archived task lists with creation dates, statistics, and action buttons. Click "View" to examine all tasks within an archived list, "Delete" to remove an archive, or "Import" to restore tasks to your current workflow*

Navigate to the **Archive** tab to see all your saved task lists:
- View the date each archive was created
- See the project name and task statistics
- Review the initial request that spawned the tasks
- **Click "View"** to examine all tasks within the archived task list
- **Click "Delete"** to permanently remove an archive
- **Click "Import"** to restore the archived tasks to your current task list

![Archive Details View](/releases/archive-details.png)

The Archive Details page provides a comprehensive view of the archived task list, including the complete initial request and full task breakdown with all dependencies and descriptions preserved.

#### Importing Archives

![Import Archive Dialog](/releases/archive-import.png)
*The Import Archive dialog offers flexible options for restoring archived tasks - either append them to your current task list or completely replace your existing tasks with the archived ones*

To restore tasks from an archive:
1. Go to the **Archive** tab
2. Click the **Import** button next to the archive you want to restore
3. Choose your import mode:
   - **Append to current tasks**: Adds archived tasks to your existing task list
   - **Replace all current tasks**: Removes existing tasks and imports only the archived ones
4. Click **Import** to restore the tasks

### Archive Storage

#### Data Preservation

- Archives are stored locally in your browser's storage
- Each archive preserves:
  - All task details and descriptions
  - Task dependencies and relationships
  - The original initial request
  - Task completion status
  - Agent assignments
- You can maintain multiple archives simultaneously
- Archives persist across browser sessions`;
      
      // First check if we have translated content
      const translatedContent = getReadmeContent(currentLanguage);
      if (translatedContent && translatedContent.content) {
        // For translated content, prepend Quick Start
        content = quickStartSection + translatedContent.content + archiveDocumentation;
        setReadmeContent(content);
      } else if (currentLanguage === 'en') {
        // Load from README.md for English
        const response = await fetch('/api/readme');
        
        if (response.ok) {
          let readmeText = await response.text();
          
          // Remove the original title and quick start section if present
          // Keep everything after the first "## " that isn't Quick Start
          const lines = readmeText.split('\n');
          let startIndex = 0;
          let foundFirstSection = false;
          
          for (let i = 0; i < lines.length; i++) {
            // Skip title and initial content until we find the first feature section
            if (lines[i].startsWith('## ') && !lines[i].includes('Quick Start')) {
              // Found the first non-quick-start section
              startIndex = i;
              foundFirstSection = true;
              break;
            }
          }
          
          if (foundFirstSection) {
            readmeText = lines.slice(startIndex).join('\n');
          }
          
          // Prepend our Quick Start section
          content = quickStartSection + readmeText + archiveDocumentation;
          setReadmeContent(content);
        } else {
          content = quickStartSection + `\n\n## Help Content Not Found\n\n${uiStrings.notFound}` + archiveDocumentation;
          setReadmeContent(content);
        }
      } else {
        // Fallback to English if translation not available
        const response = await fetch('/api/readme');
        
        if (response.ok) {
          let readmeText = await response.text();
          
          // Remove the original title and quick start section if present
          const lines = readmeText.split('\n');
          let startIndex = 0;
          let foundFirstSection = false;
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('## ') && !lines[i].includes('Quick Start')) {
              startIndex = i;
              foundFirstSection = true;
              break;
            }
          }
          
          if (foundFirstSection) {
            readmeText = lines.slice(startIndex).join('\n');
          }
          
          content = quickStartSection + readmeText + archiveDocumentation;
          setReadmeContent(content);
        } else {
          content = quickStartSection + `\n\n## Help Content Not Found\n\n${uiStrings.notFound}` + archiveDocumentation;
          setReadmeContent(content);
        }
      }
      
      // Generate table of contents
      const toc = extractTableOfContents(content);
      setTableOfContents(toc);
      
    } catch (error) {
      console.error('Error loading README:', error);
      setReadmeContent(`# Help\n\n${uiStrings.error}`);
      setTableOfContents([]);
    } finally {
      setLoading(false);
    }
  };

  const extractTableOfContents = (content) => {
    if (!content) return [];
    
    const lines = content.split('\n');
    const tocItems = [];
    let inCodeBlock = false;
    const parentPath = []; // Track parent sections for unique ID generation
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track code block state - check for both regular and indented code blocks
      if (line.match(/^\s*```/)) {
        inCodeBlock = !inCodeBlock;
        continue; // Skip this line
      }
      
      // Skip everything inside code blocks
      if (inCodeBlock) {
        continue;
      }
      
      // Skip lines that look like shell comments (even outside code blocks)
      // These patterns indicate command-line comments, not markdown headers
      if (line.match(/^#\s+[A-Z][a-z]+ing\s/)) { // Starting, Running, Building, etc.
        continue;
      }
      if (line.match(/^#\s+(For|Add|Set|Install|Configure|Create|Update|Delete|Enable|Disable)\s/i)) {
        continue;
      }
      if (line.match(/^#\s+[a-z]/)) { // Comments starting with lowercase
        continue;
      }
      
      // Now process actual markdown headers
      if (line.match(/^#\s+/) && !line.includes('Help')) {
        const text = line.substring(2).trim();
        // Final check: skip if this still looks like a comment
        if (text.match(/^(Starting|Running|Building|Adding|Reloading|Installing|Configuring)/)) {
          continue;
        }
        parentPath.length = 0; // Reset for new top-level section
        parentPath.push(text);
        const id = generateUniqueId(text, parentPath.slice(0, -1));
        tocItems.push({ level: 1, text, id, children: [] });
      } else if (line.match(/^##\s+/)) {
        const text = line.substring(3).trim();
        parentPath.length = 1; // Keep only top-level parent
        parentPath.push(text);
        const id = generateUniqueId(text, parentPath.slice(0, -1));
        const parent = tocItems[tocItems.length - 1];
        if (parent && parent.level === 1) {
          parent.children.push({ level: 2, text, id, children: [] });
        } else {
          tocItems.push({ level: 2, text, id, children: [] });
        }
      } else if (line.match(/^###\s+/)) {
        const text = line.substring(4).trim();
        parentPath.length = Math.min(2, parentPath.length); // Keep up to level 2 parents
        parentPath.push(text);
        const id = generateUniqueId(text, parentPath.slice(0, -1));
        // Find the appropriate parent (should be the nearest level 2 item)
        let added = false;
        for (let j = tocItems.length - 1; j >= 0; j--) {
          const item = tocItems[j];
          // If we find a level 2 item, add as its child
          if (item.level === 2) {
            item.children.push({ level: 3, text, id, children: [] });
            added = true;
            break;
          }
          // If we find a level 1 item with level 2 children, add to the last level 2 child
          if (item.level === 1 && item.children.length > 0) {
            const lastChild = item.children[item.children.length - 1];
            if (lastChild.level === 2) {
              lastChild.children.push({ level: 3, text, id, children: [] });
              added = true;
              break;
            }
          }
        }
        // If no parent found, add as top-level item
        if (!added) {
          tocItems.push({ level: 3, text, id, children: [] });
        }
      } else if (line.match(/^####\s+/)) {
        const text = line.substring(5).trim();
        parentPath.length = Math.min(3, parentPath.length); // Keep up to level 3 parents
        parentPath.push(text);
        const id = generateUniqueId(text, parentPath.slice(0, -1));
        // Find the appropriate parent for level 4 headers (should be the nearest level 3 item)
        let added = false;
        for (let j = tocItems.length - 1; j >= 0; j--) {
          const item = tocItems[j];
          // If we find a level 3 item, add as its child
          if (item.level === 3) {
            item.children.push({ level: 4, text, id, children: [] });
            added = true;
            break;
          }
          // Check level 2 items for level 3 children
          if (item.level === 2 && item.children.length > 0) {
            const lastLevel3 = item.children[item.children.length - 1];
            if (lastLevel3.level === 3) {
              lastLevel3.children.push({ level: 4, text, id, children: [] });
              added = true;
              break;
            }
          }
          // Check level 1 items for nested children
          if (item.level === 1 && item.children.length > 0) {
            const lastLevel2 = item.children[item.children.length - 1];
            if (lastLevel2.level === 2 && lastLevel2.children.length > 0) {
              const lastLevel3 = lastLevel2.children[lastLevel2.children.length - 1];
              if (lastLevel3.level === 3) {
                lastLevel3.children.push({ level: 4, text, id, children: [] });
                added = true;
                break;
              }
            }
          }
        }
        // If no parent found, add as child of the last level 2 or as top-level
        if (!added) {
          for (let j = tocItems.length - 1; j >= 0; j--) {
            const item = tocItems[j];
            if (item.level === 2) {
              item.children.push({ level: 4, text, id, children: [] });
              break;
            }
          }
        }
      }
    }
    
    // Initialize expanded state for all items with children
    const expanded = {};
    
    const initializeExpanded = (items, parentKey = '') => {
      items.forEach((item, index) => {
        const itemKey = parentKey ? `${parentKey}-${index}` : `section-${index}`;
        if (item.children && item.children.length > 0) {
          // Start with all sections expanded
          expanded[itemKey] = true;
          // Recursively initialize children
          initializeExpanded(item.children, itemKey);
        }
      });
    };
    
    initializeExpanded(tocItems);
    setExpandedSections(expanded);
    
    return tocItems;
  };

  // Handle active section updates for styling
  const handleSetActive = (to) => {
    setActiveSection(to);
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => {
      // If not in state or true, set to false; if false, set to true
      const currentState = prev[sectionKey];
      return {
        ...prev,
        [sectionKey]: currentState === false ? true : false
      };
    });
  };

  const expandAll = () => {
    const expanded = {};
    const setAllExpanded = (items, parentKey = '') => {
      items.forEach((item, index) => {
        const itemKey = parentKey ? `${parentKey}-${index}` : `section-${index}`;
        if (item.children && item.children.length > 0) {
          expanded[itemKey] = true;
          setAllExpanded(item.children, itemKey);
        }
      });
    };
    setAllExpanded(tableOfContents);
    setExpandedSections(expanded);
  };

  const collapseAll = () => {
    const collapsed = {};
    const setAllCollapsed = (items, parentKey = '', level = 1) => {
      items.forEach((item, index) => {
        const itemKey = parentKey ? `${parentKey}-${index}` : `section-${index}`;
        if (item.children && item.children.length > 0) {
          // Keep level 1 expanded, collapse level 2+ items
          collapsed[itemKey] = level === 1;
          setAllCollapsed(item.children, itemKey, level + 1);
        }
      });
    };
    setAllCollapsed(tableOfContents);
    setExpandedSections(collapsed);
  };

  const getItemColor = (item) => {
    // Special pink color for main page sections
    const pageHeaders = ['📋 Tasks Tab', '📊 Task History Tab', '🤖 Sub-Agents Tab', '🎨 Templates Tab', '📦 Task Archives Tab', '⚙️ Global Settings Tab'];
    if (pageHeaders.some(header => item.text.includes(header))) {
      return '#FF69B4'; // Hot pink
    }
    
    // Regular color scheme
    if (item.level === 1) return '#FFA500'; // Orange
    if (item.level === 2) return '#FFD700'; // Gold
    if (item.level === 3) return '#87CEEB'; // Sky Blue
    return '#B0C4DE'; // Light Steel Blue
  };

  const getItemHoverColor = (item) => {
    // Special hover color for pink items
    const pageHeaders = ['📋 Tasks Tab', '📊 Task History Tab', '🤖 Sub-Agents Tab', '🎨 Templates Tab', '📦 Task Archives Tab', '⚙️ Global Settings Tab'];
    if (pageHeaders.some(header => item.text.includes(header))) {
      return '#FF86C8'; // Lighter pink
    }
    
    // Regular hover colors
    if (item.level === 1) return '#FFB84D';
    if (item.level === 2) return '#FFE55C';
    if (item.level === 3) return '#ADD8E6';
    return '#D3D3D3';
  };

  const renderTocItem = (item, index, parentKey = '') => {
    const itemKey = parentKey ? `${parentKey}-${index}` : `section-${index}`;
    const hasChildren = item.children && item.children.length > 0;
    // Default to true if not explicitly set to false
    const isExpanded = hasChildren ? (expandedSections[itemKey] !== false) : true;
    const isPageHeader = ['Tasks Tab', 'Task History Tab', 'Sub-Agents Tab', 'Templates Tab', 'Task Archives Tab', 'Global Settings Tab']
      .some(header => item.text.includes(header));
    const isActive = item.id === activeSection;

    return (
      <div key={itemKey} style={{ marginBottom: '0.25rem' }}>
        <div 
          className={`help-toc-item ${isActive ? 'active' : ''}`}
          data-id={item.id}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleSection(itemKey)}
              style={{
                background: 'none',
                border: 'none',
                color: getItemColor(item),
                cursor: 'pointer',
                padding: '0 4px',
                fontSize: '0.9rem',
                marginRight: '2px'
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          <div
            className="help-toc-text"
            onClick={() => {
              scroller.scrollTo(item.id, {
                duration: 500,
                delay: 0,
                smooth: 'easeInOutQuart',
                containerId: 'help-content-container',
                offset: -20
              });
            }}
            style={{
              display: 'block',
              color: isActive ? '#FFFFFF' : getItemColor(item),
              textDecoration: 'none',
              fontSize: item.level === 4 ? '0.85rem' : item.level === 3 ? '0.9rem' : item.level === 2 ? '0.95rem' : '1rem',
              marginLeft: hasChildren ? '0' : (item.level === 3 ? '1.5rem' : item.level === 2 ? '0.75rem' : item.level === 1 ? '0' : '1rem'),
              padding: '0.3rem 0.5rem',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
              fontWeight: isActive ? 'bold' : (item.level === 1 || isPageHeader ? 'bold' : item.level === 2 ? '600' : 'normal'),
              backgroundColor: isActive ? 'rgba(79, 189, 186, 0.6)' : 'transparent',
              borderLeft: isActive ? '3px solid #4fbdba' : '3px solid transparent',
              flex: 1,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.target.style.backgroundColor = 'rgba(79, 189, 186, 0.1)';
                e.target.style.color = getItemHoverColor(item);
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = getItemColor(item);
              } else {
                e.target.style.backgroundColor = 'rgba(79, 189, 186, 0.6)';
                e.target.style.color = '#FFFFFF';
              }
            }}
          >
            {item.text}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div style={{ marginLeft: '1rem' }}>
            {item.children.map((child, childIndex) => renderTocItem(child, childIndex, itemKey))}
          </div>
        )}
      </div>
    );
  };

  // Parse inline markdown (bold, italic, code, links)
  const parseInlineMarkdown = (text) => {
    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Check for links [text](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch && linkMatch.index !== undefined) {
        // Add text before the match
        if (linkMatch.index > 0) {
          parts.push(remaining.substring(0, linkMatch.index));
        }
        // Add link
        parts.push(
          <a
            key={`link-${key++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#3b82f6', textDecoration: 'underline' }}
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.substring(linkMatch.index + linkMatch[0].length);
        continue;
      }

      // Check for bold text **text**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      if (boldMatch && boldMatch.index !== undefined) {
        // Add text before the match
        if (boldMatch.index > 0) {
          parts.push(remaining.substring(0, boldMatch.index));
        }
        // Add bold text
        parts.push(
          <strong key={`bold-${key++}`}>
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
        continue;
      }

      // Check for code `text`
      const codeMatch = remaining.match(/`([^`]+)`/);
      if (codeMatch && codeMatch.index !== undefined) {
        // Add text before the match
        if (codeMatch.index > 0) {
          parts.push(remaining.substring(0, codeMatch.index));
        }
        // Add code text
        parts.push(
          <code
            className="inline-code"
            key={`code-${key++}`}
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.substring(codeMatch.index + codeMatch[0].length);
        continue;
      }

      // Check for italic text *text* or _text_
      const italicMatch = remaining.match(/[*_]([^*_]+)[*_]/);
      if (italicMatch && italicMatch.index !== undefined) {
        // Add text before the match
        if (italicMatch.index > 0) {
          parts.push(remaining.substring(0, italicMatch.index));
        }
        // Add italic text
        parts.push(
          <em key={`italic-${key++}`}>
            {italicMatch[1]}
          </em>
        );
        remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
        continue;
      }

      // No more markdown found, add the rest as plain text
      parts.push(remaining);
      break;
    }

    return parts;
  };

  const renderMarkdown = (content) => {
    if (!content) return null;
    
    const lines = content.split('\n');
    const elements = [];
    const imageList = [];
    const parentPath = []; // Track parent sections for unique ID generation
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      if (line.startsWith('# ')) {
        const text = line.substring(2);
        // Use consistent ID generation logic like in TOC
        parentPath.length = 0; // Reset for new top-level section
        parentPath.push(text);
        const id = generateUniqueId(text, parentPath.slice(0, -1));
        elements.push(
          <ScrollElement key={i} name={id}>
            <h1 id={id} className="release-h1" data-scroll-element={id}>
              {parseInlineMarkdown(text)}
            </h1>
          </ScrollElement>
        );
        i++;
      } else if (line.startsWith('## ')) {
        const text = line.substring(3);
        parentPath.length = 1; // Keep only top-level parent (same as TOC)
        parentPath.push(text);
        const id = generateUniqueId(text, parentPath.slice(0, -1));
        elements.push(
          <ScrollElement key={i} name={id}>
            <h2 id={id} className="release-h2" data-scroll-element={id}>
              {parseInlineMarkdown(text)}
            </h2>
          </ScrollElement>
        );
        i++;
      } else if (line.startsWith('### ')) {
        const text = line.substring(4);
        parentPath.length = Math.min(2, parentPath.length);
        parentPath.push(text);
        const id = generateUniqueId(text, parentPath.slice(0, -1));
        elements.push(
          <ScrollElement key={i} name={id}>
            <h3 id={id} className="release-h3" data-scroll-element={id}>
              {parseInlineMarkdown(text)}
            </h3>
          </ScrollElement>
        );
        i++;
      } else if (line.startsWith('#### ')) {
        const text = line.substring(5);
        parentPath.length = Math.min(3, parentPath.length);
        parentPath.push(text);
        const id = generateUniqueId(text, parentPath.slice(0, -1));
        elements.push(
          <ScrollElement key={i} name={id}>
            <h4 id={id} className="release-h4" data-scroll-element={id}>
              {parseInlineMarkdown(text)}
            </h4>
          </ScrollElement>
        );
        i++;
      } else if (line.match(/^\s*```/)) {
        // Handle code blocks (including indented ones)
        const indent = line.match(/^(\s*)/)[1].length;
        const language = line.trim().substring(3).trim() || 'text';
        const codeLines = [];
        i++; // Move past the opening ```
        
        while (i < lines.length && !lines[i].match(/^\s*```/)) {
          // Remove the base indentation from code lines
          if (indent > 0 && lines[i].startsWith(' '.repeat(indent))) {
            codeLines.push(lines[i].substring(indent));
          } else {
            codeLines.push(lines[i]);
          }
          i++;
        }
        
        const codeContent = codeLines.join('\n');
        elements.push(
          <div key={`code-${i}`} className="code-block-wrapper" style={{ position: 'relative' }}>
            <button
              className="code-copy-button"
              onClick={() => {
                navigator.clipboard.writeText(codeContent);
                // Optional: Add visual feedback
                const button = event.target;
                const originalText = button.textContent;
                button.textContent = uiStrings.copied;
                button.classList.add('copied');
                setTimeout(() => {
                  button.textContent = originalText;
                  button.classList.remove('copied');
                }, 2000);
              }}
              title="Copy code to clipboard"
            >
              {uiStrings.copy}
            </button>
            <SyntaxHighlighter
              language={language}
              style={dark}
            >
              {codeContent}
            </SyntaxHighlighter>
          </div>
        );
        i++; // Skip the closing ```
      } else if (line.match(/^\d+\.\s/)) {
        // Handle numbered lists
        const match = line.match(/^\d+\.\s(.*)$/);
        if (match) {
          elements.push(
            <div key={i} className="release-list-item numbered">
              {line.substring(0, line.indexOf('.') + 1)} {parseInlineMarkdown(match[1])}
            </div>
          );
        }
        i++;
      } else if (line.startsWith('- ')) {
        elements.push(
          <div key={i} className="release-list-item">
            • {parseInlineMarkdown(line.substring(2))}
          </div>
        );
        i++;
      } else if (line.match(/^\s+- /)) {
        // Handle nested bullets
        const indent = line.match(/^(\s+)/)[1].length;
        elements.push(
          <div key={i} className="release-list-item nested" style={{ marginLeft: `${indent * 10}px` }}>
            ◦ {parseInlineMarkdown(line.trim().substring(2))}
          </div>
        );
        i++;
      } else if (line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)) {
        // Handle images
        const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgMatch) {
          const altText = imgMatch[1];
          const imgUrl = imgMatch[2];
          const imageIndex = imageList.length;
          
          imageList.push({
            src: imgUrl,
            title: altText || `Image ${imageIndex + 1}`,
            description: altText
          });
          
          elements.push(
            <div key={i} className="release-image">
              <img 
                src={imgUrl} 
                alt={altText} 
                style={{ maxWidth: '100%', height: 'auto', margin: '1rem 0', cursor: 'pointer' }}
                onClick={() => lightbox.openLightbox(imagesRef.current, imageIndex)}
              />
            </div>
          );
        }
        i++;
      } else if (line.trim() === '') {
        elements.push(<div key={i} className="release-spacer" />);
        i++;
      } else if (line.trim() === '---') {
        elements.push(<hr key={i} className="release-divider" />);
        i++;
      } else {
        elements.push(
          <p key={i} className="release-text">
            {parseInlineMarkdown(line)}
          </p>
        );
        i++;
      }
    }
    
    // Store images in ref to avoid re-renders
    imagesRef.current = imageList;
    
    return elements;
  };

  return (
    <div className="release-notes-tab-content" style={{
      height: 'calc(100vh - 140px)',
      maxHeight: '900px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div className="release-notes-inner" style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div className="release-notes-header" style={{
          flexShrink: 0
        }}>
          <h2>{uiStrings.header}</h2>
        </div>
        
        <div className="release-notes-content" style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          height: '100%'
        }}>
          <div className="release-sidebar" ref={sidebarRef} style={{
            width: '300px',
            minWidth: '300px',
            overflowY: 'auto',
            borderRight: '1px solid rgba(79, 189, 186, 0.2)',
            paddingRight: '1rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem' 
            }}>
              <h3 style={{ color: '#4fbdba', fontWeight: 'bold', margin: 0 }}>📚 Table of Contents</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={expandAll}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.85rem',
                    backgroundColor: 'transparent',
                    color: '#4fbdba',
                    border: '1px solid #4fbdba',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(79, 189, 186, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.85rem',
                    backgroundColor: 'transparent',
                    color: '#4fbdba',
                    border: '1px solid #4fbdba',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(79, 189, 186, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  Collapse All
                </button>
              </div>
            </div>
            <div className="toc-list" style={{ padding: 0 }}>
              {tableOfContents.map((item, index) => renderTocItem(item, index))}
            </div>
          </div>
          
          <div id="help-content-container" className="release-details" ref={contentRef} style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingLeft: '2rem',
            paddingRight: '2rem',
            minWidth: 0,
            minHeight: 0,
            maxHeight: '100%',
            position: 'relative'
          }}>
            {loading ? (
              <div className="release-loading">{uiStrings.loading}</div>
            ) : (
              <div className="release-markdown-content" style={{ paddingBottom: '2rem' }}>
                {renderMarkdown(readmeContent)}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ImageLightbox
        isOpen={lightbox.isOpen}
        onClose={lightbox.closeLightbox}
        images={lightbox.images}
        currentIndex={lightbox.currentIndex}
      />
    </div>
  );
}

export default Help;