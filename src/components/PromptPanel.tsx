import { useState, useRef, useEffect } from 'react';
import { useMermaidStore } from '../stores/mermaidStore';
import { Button, Form, Alert } from 'react-bootstrap';
import type { PromptMessage } from '../type';

export default function PromptPanel() {
  const { currentProject, addPromptHistory, promptHistories } = useMermaidStore();
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentHistory = currentProject 
    ? promptHistories[currentProject.id] 
    : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentHistory?.messages]);

  const handleSendPrompt = async () => {
    if (!prompt.trim() || !currentProject || isProcessing) return;

    setIsProcessing(true);
    const userMessage: PromptMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    // 사용자 메시지 추가
    const updatedHistory = {
      id: currentHistory?.id || `history-${Date.now()}`,
      projectId: currentProject.id,
      messages: [...(currentHistory?.messages || []), userMessage],
      createdAt: currentHistory?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    addPromptHistory(currentProject.id, updatedHistory);
    setPrompt('');

    try {
      // LLM API 호출 (임시로 로컬 처리)
      // 실제로는 IPC를 통해 main process에서 LLM API 호출
      const response = await window.electronAPI?.invoke('mermaid:processPrompt', {
        projectId: currentProject.id,
        prompt: prompt,
        currentCode: currentProject.code,
        history: updatedHistory.messages,
      });

      if (response?.code) {
        // 생성된 코드 적용
        useMermaidStore.getState().updateProjectCode(response.code);

        const assistantMessage: PromptMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: response.message || '코드가 생성되었습니다.',
          timestamp: new Date(),
          codeDiff: response.code,
        };

        const finalHistory = {
          ...updatedHistory,
          messages: [...updatedHistory.messages, assistantMessage],
          updatedAt: new Date(),
        };

        addPromptHistory(currentProject.id, finalHistory);
      }
    } catch (error: any) {
      console.error('Prompt processing error:', error);
      const errorMessage: PromptMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `오류가 발생했습니다: ${error.message}`,
        timestamp: new Date(),
      };

      const finalHistory = {
        ...updatedHistory,
        messages: [...updatedHistory.messages, errorMessage],
        updatedAt: new Date(),
      };

      addPromptHistory(currentProject.id, finalHistory);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSendPrompt();
    }
  };

  if (!currentProject) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f8f9fa',
        color: '#666'
      }}>
        <p>프로젝트를 선택하거나 생성하세요</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '12px', 
        borderBottom: '1px solid #dee2e6',
        background: '#fff'
      }}>
        <h6 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>AI 프롬프트</h6>
        <small style={{ color: '#666' }}>Ctrl+Enter로 전송</small>
      </div>

      {/* 메시지 히스토리 */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '12px',
        background: '#f8f9fa'
      }}>
        {currentHistory?.messages.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: '#999', 
            padding: '40px 20px' 
          }}>
            <p>프롬프트를 입력하여 Mermaid 다이어그램을 생성하거나 수정하세요.</p>
            <small>예: "사용자 로그인 플로우 다이어그램 만들어줘"</small>
          </div>
        )}
        
        {currentHistory?.messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: '12px',
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: msg.role === 'user' ? '#007bff' : '#fff',
                color: msg.role === 'user' ? '#fff' : '#333',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
              {msg.codeDiff && (
                <details style={{ marginTop: '8px', fontSize: '11px' }}>
                  <summary style={{ cursor: 'pointer', opacity: 0.8 }}>
                    생성된 코드 보기
                  </summary>
                  <pre style={{ 
                    marginTop: '8px', 
                    padding: '8px', 
                    background: 'rgba(0,0,0,0.1)', 
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '11px'
                  }}>
                    {msg.codeDiff}
                  </pre>
                </details>
              )}
              <div style={{ 
                fontSize: '10px', 
                opacity: 0.7, 
                marginTop: '4px' 
              }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div style={{ 
        padding: '12px', 
        borderTop: '1px solid #dee2e6',
        background: '#fff'
      }}>
        <Form.Group>
          <Form.Control
            as="textarea"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="프롬프트를 입력하세요... (Ctrl+Enter로 전송)"
            disabled={isProcessing}
            style={{ resize: 'none' }}
          />
        </Form.Group>
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="primary"
            onClick={handleSendPrompt}
            disabled={!prompt.trim() || isProcessing}
            size="sm"
          >
            {isProcessing ? '처리 중...' : '전송'}
          </Button>
        </div>
      </div>
    </div>
  );
}

