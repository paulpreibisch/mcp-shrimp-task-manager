import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

function AgentInfoModal({ agent, isOpen, onClose, availableAgents = [], onSelectAgent }) {
  const { t } = useLanguage();
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  
  // Initialize current agent index when modal opens or agent changes
  useEffect(() => {
    if (isOpen && agent && availableAgents.length > 0) {
      const agentName = typeof agent === 'string' ? agent : agent.name;
      const index = availableAgents.findIndex(a => a.name === agentName);
      if (index >= 0) {
        setCurrentAgentIndex(index);
      }
    }
  }, [isOpen, agent, availableAgents]);
  
  if (!isOpen || !availableAgents || availableAgents.length === 0) return null;
  
  // Get current agent data
  const currentAgent = availableAgents[currentAgentIndex] || availableAgents[0];
  const agentName = currentAgent.name;
  const agentData = currentAgent;
  
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
  
  // Navigation handlers
  const handlePrevious = () => {
    setCurrentAgentIndex((prev) => 
      prev === 0 ? availableAgents.length - 1 : prev - 1
    );
  };
  
  const handleNext = () => {
    setCurrentAgentIndex((prev) => 
      prev === availableAgents.length - 1 ? 0 : prev + 1
    );
  };
  
  const handleUpdate = () => {
    if (onSelectAgent && currentAgent) {
      onSelectAgent(currentAgent.name);
      onClose();
    }
  };
  
  return (
    <div className="modal-overlay agent-info-modal-overlay" onClick={onClose}>
      <div className="modal-with-nav" onClick={(e) => e.stopPropagation()}>
        <button 
          className="agent-nav-button agent-nav-prev" 
          onClick={(e) => {
            e.stopPropagation();
            handlePrevious();
          }}
          title="Previous agent"
          disabled={availableAgents.length <= 1}
        >
          ◀
        </button>
        
        <div className="modal-content agent-info-modal">
          <div className="modal-header">
            <h3>
              <button 
                className="agent-icon robot-copy-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  // Generate a placeholder UUID for demonstration - in real app this would be the current task ID
                  const taskId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    const r = Math.random() * 16 | 0;
                    const v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                  });
                  const instruction = `use the built in subagent located in ./claude/agents/${agentName} to complete this shrimp task: ${taskId} please when u start working mark the shrimp task as in progress`;
                  navigator.clipboard.writeText(instruction);
                  const button = e.target;
                  button.textContent = '✓';
                  setTimeout(() => {
                    button.textContent = '🤖';
                  }, 2000);
                }}
                title={`use the built in subagent located in ./claude/agents/${agentName} to complete this shrimp task: <uuid> please when u start working mark the shrimp task as in progress`}
              >
                🤖
              </button>
              {agentInfo.title || agentName}
              <span className="agent-counter">
                ({currentAgentIndex + 1} of {availableAgents.length})
              </span>
            </h3>
            <button className="modal-close-btn" onClick={onClose} title="Close">
              ×
            </button>
          </div>
          
          <div className="modal-body-wrapper">
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
          
            </div>
          </div>
        
        <div className="modal-footer">
          <div className="footer-tools-section">
            {agentInfo.tools && agentInfo.tools.length > 0 ? (
              <>
                <span className="tools-label">{t('tools') || 'Tools'}:</span>
                <div className="footer-tools-list">
                  {agentInfo.tools.map((tool, index) => (
                    <span key={index} className="footer-tool-badge">{tool}</span>
                  ))}
                </div>
              </>
            ) : (
              <span className="no-tools-label">No specific tools</span>
            )}
          </div>
          
          <div className="footer-buttons">
            <button className="secondary-btn" onClick={onClose}>
              {t('close') || 'Close'}
            </button>
            <button className="primary-btn" onClick={handleUpdate}>
              {t('update') || 'Update Selection'}
            </button>
          </div>
        </div>
      </div>
      
      <button 
        className="agent-nav-button agent-nav-next" 
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        title="Next agent"
        disabled={availableAgents.length <= 1}
      >
        ▶
      </button>
      </div>
    </div>
  );
}

export default AgentInfoModal;