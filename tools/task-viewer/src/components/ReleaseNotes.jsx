import React, { useState, useEffect, useRef } from 'react';
import { releaseMetadata, getReleaseFile } from '../data/releases';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useLanguage } from '../i18n/LanguageContext';
import { getUIStrings, getReleaseContent } from '../i18n/documentation/index.js';
import ImageLightbox, { useLightbox } from './ImageLightbox';

function ReleaseNotes() {
  const [selectedVersion, setSelectedVersion] = useState(releaseMetadata[0]?.version || '');
  const [releaseContent, setReleaseContent] = useState('');
  const [loading, setLoading] = useState(true);
  const { currentLanguage } = useLanguage();
  const uiStrings = getUIStrings('releaseNotes', currentLanguage);
  const lightbox = useLightbox();
  const imagesRef = useRef([]);

  useEffect(() => {
    if (selectedVersion) {
      loadReleaseContent(selectedVersion);
    }
  }, [selectedVersion, currentLanguage]);

  const loadReleaseContent = async (version) => {
    setLoading(true);
    setReleaseContent('');
    
    try {
      // First check if we have translated content
      const translatedContent = getReleaseContent(version, currentLanguage);
      if (translatedContent && translatedContent.content) {
        setReleaseContent(translatedContent.content);
      } else if (currentLanguage === 'en') {
        // Load from markdown file for English
        const releaseFile = getReleaseFile(version);
        const response = await fetch(releaseFile);
        
        if (response.ok) {
          const content = await response.text();
          setReleaseContent(content);
        } else {
          setReleaseContent(`# ${version}\n\n${uiStrings.notFound}`);
        }
      } else {
        // Fallback to English if translation not available
        const releaseFile = getReleaseFile(version);
        const response = await fetch(releaseFile);
        
        if (response.ok) {
          const content = await response.text();
          setReleaseContent(content);
        } else {
          setReleaseContent(`# ${version}\n\n${uiStrings.notFound}`);
        }
      }
    } catch (error) {
      console.error('Error loading release content:', error);
      setReleaseContent(`# ${version}\n\n${uiStrings.error}`);
    } finally {
      setLoading(false);
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
    <div className="release-notes-tab-content">
      <div className="release-notes-inner">
        <div className="release-notes-header">
          <h2>{uiStrings.header}</h2>
        </div>
        
        <div className="release-notes-content">
          <div className="release-sidebar">
            <h3>{uiStrings.versions}</h3>
            <ul className="version-list">
              {releaseMetadata.map((release) => (
                <li key={release.version}>
                  <button
                    className={`version-button ${selectedVersion === release.version ? 'active' : ''}`}
                    onClick={() => setSelectedVersion(release.version)}
                    title={release.summary}
                  >
                    <span className="version-number">{release.version}</span>
                    <span className="version-date">{release.date}</span>
                    {release.title && (
                      <span className="version-title">{release.title}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="release-details">
            {loading ? (
              <div className="release-loading">{uiStrings.loading}</div>
            ) : (
              <div className="release-markdown-content">
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