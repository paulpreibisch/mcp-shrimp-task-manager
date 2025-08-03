import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

function AgentInfoModal({ agent, isOpen, onClose }) {
  const { t } = useLanguage();
  
  if (!isOpen || !agent) return null;
  
  // Handle both agent objects and agent names
  const agentName = typeof agent === 'string' ? agent : agent.name;
  const agentData = typeof agent === 'object' ? agent : null;
  
  // Get agent details - this could be expanded to fetch from a data source
  const getAgentDescription = (name) => {
    const descriptions = {
      'general-purpose': {
        title: 'General Purpose Agent',
        description: 'A versatile agent for researching complex questions, searching for code, and executing multi-step tasks. Best used when you need comprehensive research or are unsure about file locations.',
        capabilities: [
          'Complex research and analysis',
          'Code searching across repositories',
          'Multi-step task execution',
          'General problem solving'
        ],
        bestFor: 'Research tasks, exploration, and complex queries'
      },
      'fullstack': {
        title: 'Full-Stack Development Agent',
        description: 'Expert agent for software architecture decisions, full-stack development, and Git workflow optimization. Handles frontend, backend, database, and DevOps tasks.',
        capabilities: [
          'System architecture design',
          'Frontend/Backend/Database development',
          'Git workflow management',
          'Code architecture reviews',
          'Technology stack decisions'
        ],
        bestFor: 'Development tasks, architecture decisions, and Git operations'
      },
      'task manager': {
        title: 'Task Manager',
        description: 'Default task management system for organizing and executing tasks.',
        capabilities: [
          'Task organization',
          'Task execution',
          'Status tracking',
          'Dependency management'
        ],
        bestFor: 'General task management and execution'
      }
    };
    
    return descriptions[name] || {
      title: name,
      description: `Agent: ${name}`,
      capabilities: [],
      bestFor: 'Specialized tasks'
    };
  };
  
  const agentInfo = agentData || getAgentDescription(agentName);
  
  return (
    <div className="modal-overlay agent-info-modal-overlay" onClick={onClose}>
      <div className="modal-content agent-info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <span className="agent-icon">🤖</span>
            {agentInfo.title || agentName}
          </h3>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <div className="agent-description-section">
            <h4>{t('description') || 'Description'}</h4>
            <p>{agentInfo.description}</p>
          </div>
          
          {agentInfo.capabilities && agentInfo.capabilities.length > 0 && (
            <div className="agent-capabilities-section">
              <h4>{t('capabilities') || 'Capabilities'}</h4>
              <ul>
                {agentInfo.capabilities.map((capability, index) => (
                  <li key={index}>{capability}</li>
                ))}
              </ul>
            </div>
          )}
          
          {agentInfo.bestFor && (
            <div className="agent-best-for-section">
              <h4>{t('bestFor') || 'Best For'}</h4>
              <p>{agentInfo.bestFor}</p>
            </div>
          )}
          
          {agentInfo.tools && agentInfo.tools.length > 0 && (
            <div className="agent-tools-section">
              <h4>{t('availableTools') || 'Available Tools'}</h4>
              <div className="tools-list">
                {agentInfo.tools.map((tool, index) => (
                  <span key={index} className="tool-badge">{tool}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="primary-btn" onClick={onClose}>
            {t('close') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AgentInfoModal;