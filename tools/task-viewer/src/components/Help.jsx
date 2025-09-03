import React, { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTranslation } from 'react-i18next';
import { getUIStrings, getReadmeContent } from '../i18n/documentation/index.js';
import ImageLightbox, { useLightbox } from './ImageLightbox';

function Help() {
  const [readmeContent, setReadmeContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [tableOfContents, setTableOfContents] = useState([]);
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const uiStrings = getUIStrings('help', currentLanguage);
  const lightbox = useLightbox();
  const imagesRef = useRef([]);

  useEffect(() => {
    loadReadmeContent();
  }, [currentLanguage]);

  const loadReadmeContent = async () => {
    setLoading(true);
    
    try {
      let content = '';
      
      // Add archive feature documentation
      const archiveDocumentation = `
## Archive Feature

### What is the Archive Feature?

The Archive feature is a powerful tool that allows you to save your current task lists for later use. This is particularly useful when you need to switch between different projects or features without losing your planning work.

### When to Use Archives

- **Multiple Projects**: When working on multiple features simultaneously
- **Context Switching**: When you need to temporarily work on something else
- **Task Preservation**: When you want to save a complex task list before starting fresh
- **Template Creation**: When you have a set of tasks that could be reused

### How to Archive Tasks

![Archive Dialog](/home/fire/claude/mcp-shrimp-task-manager/Screenshots/Screenshot 2025-09-02 215030.png)

To archive your current tasks:
1. Click the **Archive** button in the main toolbar
2. The archive dialog will show:
   - Your current project name
   - Total number of tasks
   - Task status breakdown (completed, in progress, pending)
   - The initial request that created these tasks
3. Click **Continue** to save the archive
4. Your tasks will be stored locally and persist across sessions

### Viewing Archives

![Archive Details View](/home/fire/claude/mcp-shrimp-task-manager/Screenshots/Screenshot 2025-09-02 215236.png)

Navigate to the **Archive** tab to see all your saved task lists:
- View the date each archive was created
- See the project name and task statistics
- Review the initial request that spawned the tasks
- Access the full task list with all details

### Importing from an Archive

![Import Archive Dialog](/home/fire/claude/mcp-shrimp-task-manager/Screenshots/Screenshot 2025-09-02 215208.png)

To restore tasks from an archive:
1. Go to the **Archive** tab
2. Click the import icon (📥) next to the archive you want to restore
3. Choose your import mode:
   - **Append to current tasks**: Adds archived tasks to your existing task list
   - **Replace all current tasks**: Removes existing tasks and imports only the archived ones
4. Click **Import** to restore the tasks

### Archive Management

- Archives are stored locally in your browser's storage
- Each archive preserves:
  - All task details and descriptions
  - Task dependencies and relationships
  - The original initial request
  - Task completion status
  - Agent assignments
- You can maintain multiple archives simultaneously
- Archives persist across browser sessions

---

`;
      
      // First check if we have translated content
      const translatedContent = getReadmeContent(currentLanguage);
      if (translatedContent && translatedContent.content) {
        content = archiveDocumentation + translatedContent.content;
        setReadmeContent(content);
      } else if (currentLanguage === 'en') {
        // Load from README.md for English
        const response = await fetch('/api/readme');
        
        if (response.ok) {
          const readmeText = await response.text();
          content = archiveDocumentation + readmeText;
          setReadmeContent(content);
        } else {
          content = archiveDocumentation + `# Help\n\n${uiStrings.notFound}`;
          setReadmeContent(content);
        }
      } else {
        // Fallback to English if translation not available
        const response = await fetch('/api/readme');
        
        if (response.ok) {
          const readmeText = await response.text();
          content = archiveDocumentation + readmeText;
          setReadmeContent(content);
        } else {
          content = archiveDocumentation + `# Help\n\n${uiStrings.notFound}`;
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
    
    lines.forEach((line) => {
      if (line.startsWith('# ') && !line.includes('Help')) {
        const text = line.substring(2);
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        tocItems.push({ level: 1, text, id });
      } else if (line.startsWith('## ')) {
        const text = line.substring(3);
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        tocItems.push({ level: 2, text, id });
      } else if (line.startsWith('### ')) {
        const text = line.substring(4);
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        tocItems.push({ level: 3, text, id });
      } else if (line.startsWith('#### ')) {
        const text = line.substring(5);
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        tocItems.push({ level: 4, text, id });
      }
    });
    
    return tocItems;
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      if (line.startsWith('# ')) {
        const text = line.substring(2);
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        elements.push(
          <h1 key={i} id={id} className="release-h1">
            {parseInlineMarkdown(text)}
          </h1>
        );
        i++;
      } else if (line.startsWith('## ')) {
        const text = line.substring(3);
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        elements.push(
          <h2 key={i} id={id} className="release-h2">
            {parseInlineMarkdown(text)}
          </h2>
        );
        i++;
      } else if (line.startsWith('### ')) {
        const text = line.substring(4);
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        elements.push(
          <h3 key={i} id={id} className="release-h3">
            {parseInlineMarkdown(text)}
          </h3>
        );
        i++;
      } else if (line.startsWith('#### ')) {
        const text = line.substring(5);
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        elements.push(
          <h4 key={i} id={id} className="release-h4">
            {parseInlineMarkdown(text)}
          </h4>
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
          <div className="release-sidebar" style={{
            width: '300px',
            minWidth: '300px',
            overflowY: 'auto',
            borderRight: '1px solid rgba(79, 189, 186, 0.2)',
            paddingRight: '1rem'
          }}>
            <h3 style={{ color: '#4fbdba', marginBottom: '1rem' }}>Table of Contents</h3>
            <div className="toc-list" style={{ padding: 0 }}>
              {tableOfContents.map((item, index) => (
                <a
                  key={index}
                  href={`#${item.id}`}
                  style={{
                    display: 'block',
                    color: '#87CEEB',
                    textDecoration: 'none',
                    fontSize: item.level === 4 ? '0.85rem' : item.level === 3 ? '0.9rem' : item.level === 2 ? '0.95rem' : '1rem',
                    marginLeft: item.level === 4 ? '2.5rem' : item.level === 3 ? '1.5rem' : item.level === 2 ? '0.5rem' : '0',
                    marginBottom: '0.5rem',
                    padding: '0.3rem 0.5rem',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease',
                    fontWeight: item.level === 1 ? 'bold' : 'normal'
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.id);
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(79, 189, 186, 0.1)';
                    e.target.style.color = '#ADD8E6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#87CEEB';
                  }}
                >
                  {item.level === 4 ? '◦ ' : item.level === 3 ? '• ' : item.level === 2 ? '▸ ' : '▪ '}{item.text}
                </a>
              ))}
            </div>
          </div>
          
          <div className="release-details" style={{
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