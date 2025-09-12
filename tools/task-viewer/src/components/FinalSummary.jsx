import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure,
} from '@chakra-ui/react';

const FinalSummary = forwardRef(({ 
  tasks = [], 
  projectId, 
  onSummaryGenerated, 
  existingSummary = null 
}, ref) => {
  const [summary, setSummary] = useState(existingSummary);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal controls
  const {
    isOpen: isSummaryModalOpen,
    onOpen: onSummaryModalOpen,
    onClose: onSummaryModalClose
  } = useDisclosure();
  
  // Update summary when existingSummary prop changes
  useEffect(() => {
    setSummary(existingSummary);
  }, [existingSummary]);
  
  // Expose openModal method via ref
  useImperativeHandle(ref, () => ({
    openModal: onSummaryModalOpen
  }));

  const handleGenerateSummary = async () => {
    console.log('Generate button clicked');
    console.log('Tasks:', tasks);
    console.log('ProjectId:', projectId);
    
    setIsGenerating(true);
    setError(null);

    try {
      // Filter tasks that have summaries (treat having a summary as being completed)
      // Some tasks may not have explicit status field but having a summary indicates completion
      const completedTasks = tasks.filter(task => 
        (task.status === 'completed' || task.summary) && task.summary
      ).map(task => ({
        id: task.id,
        name: task.name,
        summary: task.summary
      }));
      
      // Get incomplete tasks for warning section
      const incompleteTasks = tasks.filter(task => 
        task.status !== 'completed' && !task.summary
      ).map(task => ({
        id: task.id,
        name: task.name,
        status: task.status || 'pending'
      }));
      
      console.log('Completed tasks with summaries:', completedTasks);
      console.log('Task statuses:', tasks.map(t => ({ name: t.name, status: t.status, hasSummary: !!t.summary })));
      
      if (completedTasks.length === 0) {
        setError('No tasks with summaries found. Please ensure tasks have summaries.');
        setIsGenerating(false);
        return;
      }

      const response = await fetch(`/api/tasks/${projectId}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completedTasks,
          totalTasks: tasks.length,
          incompleteTasks
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      setSummary(data.summary);
      
      if (onSummaryGenerated) {
        onSummaryGenerated(data.summary);
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      setError('Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  // Format the summary with colors, bold, and emojis
  const formatSummary = (text) => {
    if (!text) return null;
    
    // Split by lines and process each
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Check for markdown bold headings (e.g., **Project Status:**)
      if (line.trim().startsWith('**') && line.trim().includes(':**')) {
        const cleanLine = line.replace(/\*\*/g, '');
        const isWarningSection = cleanLine.includes('⚠️') || cleanLine.includes('Remaining Tasks');
        return (
          <div key={index} style={{ 
            color: isWarningSection ? '#e74c3c' : '#f39c12',
            fontWeight: 'bold',
            marginTop: index === 0 ? 0 : '12px',
            marginBottom: '8px',
            fontSize: '15px'
          }}>
            {cleanLine}
          </div>
        );
      }
      // Check for bullet points (already includes emojis from OpenAI)
      else if (line.trim().startsWith('•') || line.trim().startsWith('-') || /^\d+\./.test(line.trim())) {
        const isWarningItem = line.includes('❌');
        return (
          <div key={index} style={{ 
            color: isWarningItem ? '#e74c3c' : '#b8c5d6',
            marginLeft: '16px',
            marginBottom: '4px',
            lineHeight: '1.6'
          }}>
            {line}
          </div>
        );
      }
      // Regular text (might be part of status or impact description)
      else if (line.trim()) {
        return (
          <div key={index} style={{ 
            color: '#b8c5d6',
            marginBottom: '8px',
            lineHeight: '1.6'
          }}>
            {line}
          </div>
        );
      }
      // Empty lines
      return <div key={index} style={{ height: '8px' }} />;
    });
  };

  return (
    <>
      {/* Summary Modal */}
      <Modal 
        isOpen={isSummaryModalOpen} 
        onClose={onSummaryModalClose}
        size="xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent bg="#1a1f3a" color="#e5e5e5">
          <ModalHeader display="flex" alignItems="center" gap={2}>
            📊 Summary
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {summary ? (
              <div style={{
                fontSize: '14px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                padding: '16px',
                backgroundColor: '#0f1626',
                borderRadius: '8px'
              }}>
                {formatSummary(summary)}
              </div>
            ) : (
              <div style={{
                fontSize: '14px',
                color: '#7f8c8d',
                fontStyle: 'italic',
                marginBottom: '12px',
                padding: '16px',
                backgroundColor: '#0f1626',
                borderRadius: '8px'
              }}>
                📌 Click Generate to create an overall summary of all completed tasks.
              </div>
            )}
            
            {error && (
              <div style={{ 
                color: '#e74c3c', 
                marginTop: '10px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                ⚠️ {error}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="teal"
              isLoading={isGenerating}
              loadingText="Generating..."
              onClick={handleGenerateSummary}
              mr={3}
            >
              {summary ? '🔄 Regenerate' : '✨ Generate'}
            </Button>
            <Button colorScheme="green" onClick={onSummaryModalClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
});

export default FinalSummary;