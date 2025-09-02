import React, { useState, useEffect, useRef } from 'react';
import { releaseMetadata, getReleaseFile } from '../data/releases';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTranslation } from 'react-i18next';
import { getUIStrings, getReleaseContent } from '../i18n/documentation/index.js';
import ImageLightbox, { useLightbox } from './ImageLightbox';

function ReleaseNotes() {
  const [selectedVersion, setSelectedVersion] = useState(releaseMetadata[0]?.version || '');
  const [releaseContent, setReleaseContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState({});
  const [tableOfContents, setTableOfContents] = useState({});
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const uiStrings = getUIStrings('releaseNotes', currentLanguage);
  const lightbox = useLightbox();
  const imagesRef = useRef([]);

  useEffect(() => {
    if (selectedVersion) {
      loadReleaseContent(selectedVersion);
      // Auto-expand the selected version to show TOC
      setExpandedVersions(prev => ({ ...prev, [selectedVersion]: true }));
    }
  }, [selectedVersion, currentLanguage]);
  
  // Load TOC for all versions on mount
  useEffect(() => {
    const loadAllTOCs = async () => {
      for (const release of releaseMetadata) {
        if (!tableOfContents[release.version]) {
          try {
            let releaseFile = getReleaseFile(release.version);
            const response = await fetch(releaseFile);
            if (response.ok) {
              const content = await response.text();
              const toc = extractTableOfContents(content);
              setTableOfContents(prev => ({ ...prev, [release.version]: toc }));
            }
          } catch (error) {
            console.error(`Error loading TOC for ${release.version}:`, error);
          }
        }
      }
    };
    loadAllTOCs();
  }, []);

  const loadReleaseContent = async (version) => {
    setLoading(true);
    setReleaseContent('');
    
    try {
      // First check if we have translated content in the language files
      const translatedContent = getReleaseContent(version, currentLanguage);
      let content = '';
      
      if (translatedContent && translatedContent.content) {
        content = translatedContent.content;
        setReleaseContent(content);
      } else {
        // Try to load language-specific markdown file
        let releaseFile;
        if (currentLanguage !== 'en') {
          // Check for language-specific file first (e.g., v3.0.0-zh.md)
          releaseFile = `/releases/${version}-${currentLanguage}.md`;
          const response = await fetch(releaseFile);
          
          if (response.ok) {
            content = await response.text();
            setReleaseContent(content);
          } else {
            // Fallback to English version
            releaseFile = getReleaseFile(version);
            const resp = await fetch(releaseFile);
            
            if (resp.ok) {
              content = await resp.text();
              setReleaseContent(content);
            } else {
              content = `# ${version}\n\n${uiStrings.notFound}`;
              setReleaseContent(content);
            }
          }
        } else {
          // Fallback to English version
          releaseFile = getReleaseFile(version);
          const response = await fetch(releaseFile);
          
          if (response.ok) {
            content = await response.text();
            setReleaseContent(content);
          } else {
            content = `# ${version}\n\n${uiStrings.notFound}`;
            setReleaseContent(content);
          }
        }
      }
      
      // Generate TOC for this version
      const toc = extractTableOfContents(content);
      setTableOfContents(prev => ({ ...prev, [version]: toc }));
      
    } catch (error) {
      console.error('Error loading release content:', error);
      const errorContent = `# ${version}\n\n${uiStrings.error}`;
      setReleaseContent(errorContent);
      setTableOfContents(prev => ({ ...prev, [version]: [] }));
    } finally {
      setLoading(false);
    }
  };

  const extractTableOfContents = (content) => {
    if (!content) return [];
    
    const lines = content.split('\n');
    const tocItems = [];
    
    lines.forEach((line) => {
      if (line.startsWith('## ') && !line.includes('Table of Contents')) {
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
  
  const toggleVersionExpanded = async (version) => {
    setExpandedVersions(prev => ({
      ...prev,
      [version]: !prev[version]
    }));
    
    // Load TOC if not already loaded
    if (!tableOfContents[version]) {
      try {
        let releaseFile = getReleaseFile(version);
        const response = await fetch(releaseFile);
        if (response.ok) {
          const content = await response.text();
          const toc = extractTableOfContents(content);
          setTableOfContents(prev => ({ ...prev, [version]: toc }));
        }
      } catch (error) {
        console.error(`Error loading TOC for ${version}:`, error);
      }
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
        const href = linkMatch[2];
        const isAnchor = href.startsWith('#');
        
        parts.push(
          <a
            key={`link-${key++}`}
            href={href}
            target={isAnchor ? undefined : "_blank"}
            rel={isAnchor ? undefined : "noopener noreferrer"}
            style={{ color: '#ffff00', textDecoration: 'underline' }}
            onClick={isAnchor ? (e) => {
              e.preventDefault();
              const targetId = href.substring(1);
              const element = document.getElementById(targetId);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            } : undefined}
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
          <span
            className="inline-code"
            key={`code-${key++}`}
          >
            {codeMatch[1]}
          </span>
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
          <h1 key={i} id={id} className="release-h1" style={{
            color: '#ff69b4',
            fontSize: '2.5rem'
          }}>
            {parseInlineMarkdown(text)}
          </h1>
        );
        i++;
      } else if (line.startsWith('## ')) {
        const text = line.substring(3);
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        // Check if it's "New Features" or "Bug Fixes" to apply different colors
        const isNewFeatures = text.includes('New Features');
        const isBugFixes = text.includes('Bug Fixes');
        let color = '#ff69b4'; // default pink
        if (isNewFeatures) color = '#ffffff'; // white for New Features
        if (isBugFixes) color = '#ffa500'; // orange for Bug Fixes
        elements.push(
          <h2 key={i} id={id} className="release-h2" style={{
            color: color,
            fontSize: '2rem'
          }}>
            {parseInlineMarkdown(text)}
          </h2>
        );
        i++;
      } else if (line.startsWith('### ')) {
        const text = line.substring(4);
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        elements.push(
          <h3 key={i} id={id} className="release-h3" style={{
            color: '#ff69b4',
            fontSize: '1.5rem'
          }}>
            {parseInlineMarkdown(text)}
          </h3>
        );
        i++;
      } else if (line.startsWith('##### ')) {
        const text = line.substring(6);
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        elements.push(
          <h5 key={i} id={id} className="release-h5" style={{
            color: '#87CEEB',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            marginTop: '1rem',
            marginBottom: '0.5rem'
          }}>
            {parseInlineMarkdown(text)}
          </h5>
        );
        i++;
      } else if (line.startsWith('#### ')) {
        const text = line.substring(5);
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        // Apply light blue for Overview and Key Highlights
        const isOverviewOrHighlights = text.includes('Overview') || text.includes('Key Highlights') || text.includes('Key Features') || text.includes('Key Improvements');
        elements.push(
          <h4 key={i} id={id} className="release-h4" style={{
            color: isOverviewOrHighlights ? '#87CEEB' : '#ff69b4',
            fontSize: '1.25rem'
          }}>
            {parseInlineMarkdown(text)}
          </h4>
        );
        i++;
      } else if (line.startsWith('```')) {
        // Handle code blocks
        const language = line.substring(3).trim() || 'text';
        const codeLines = [];
        i++; // Move past the opening ```
        
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
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
                style={{ maxWidth: '75%', height: 'auto', margin: '1rem 0', cursor: 'pointer' }}
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
      } else if (line.match(/^\*[^*]+\*$/)) {
        // Italic line
        elements.push(
          <p key={i} className="release-text italic">
            {parseInlineMarkdown(line)}
          </p>
        );
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
            overflowY: 'scroll',
            borderRight: '1px solid rgba(79, 189, 186, 0.2)',
            paddingRight: '1rem'
          }}>
            <h3>{uiStrings.versions}</h3>
            <ul className="version-list" style={{ listStyle: 'none', padding: 0 }}>
              {releaseMetadata.map((release) => (
                <li key={release.version} style={{ marginBottom: '0.5rem' }}>
                  <div>
                    <button
                      className={`version-button ${selectedVersion === release.version ? 'active' : ''}`}
                      onClick={() => setSelectedVersion(release.version)}
                      title={release.summary}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div>
                          <span className="version-number">{release.version}</span>
                          <span className="version-date" style={{ marginLeft: '0.5rem' }}>{release.date}</span>
                        </div>
                        {release.title && (
                          <span className="version-title" style={{ fontSize: '0.9em', opacity: 0.8 }}>{release.title}</span>
                        )}
                      </div>
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVersionExpanded(release.version);
                        }}
                        style={{
                          display: 'inline-block',
                          color: selectedVersion === release.version ? '#ffffff' : '#ffa500',
                          cursor: 'pointer',
                          padding: '0 0.5rem',
                          fontSize: '1rem',
                          transform: expandedVersions[release.version] ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease, color 0.3s ease',
                          filter: 'drop-shadow(0 0 2px rgba(255, 165, 0, 0.5))'
                        }}
                      >▶</span>
                    </button>
                    
                    {expandedVersions[release.version] && tableOfContents[release.version] && (
                      <div style={{
                        marginLeft: '1rem',
                        marginTop: '0.5rem',
                        paddingLeft: '0.5rem',
                        borderLeft: '2px solid rgba(79, 189, 186, 0.2)'
                      }}>
                        {tableOfContents[release.version].map((item, index) => (
                          <a
                            key={index}
                            href={`#${item.id}`}
                            style={{
                              display: 'block',
                              color: '#87CEEB',
                              textDecoration: 'none',
                              fontSize: item.level === 4 ? '0.8rem' : item.level === 3 ? '0.85rem' : '0.9rem',
                              marginLeft: item.level === 4 ? '2rem' : item.level === 3 ? '1rem' : '0',
                              marginBottom: '0.3rem',
                              padding: '0.2rem 0',
                              transition: 'color 0.2s ease'
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              const element = document.getElementById(item.id);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.color = '#ADD8E6';
                              e.target.style.textDecoration = 'underline';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.color = '#87CEEB';
                              e.target.style.textDecoration = 'none';
                            }}
                          >
                            {item.level === 4 ? '◦ ' : item.level === 3 ? '• ' : '▸ '}{item.text}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="release-details" style={{
            flex: 1,
            overflowY: 'scroll',
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
                {renderMarkdown(releaseContent)}
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

export default ReleaseNotes;