import { useState, useRef, useEffect } from 'react';
import { useMermaidStore } from '../stores/mermaidStore';
import { Button, Form, Modal } from 'react-bootstrap';
import { Settings } from 'lucide-react';
import type { PromptMessage } from '../type';

export default function PromptPanel() {
  const { currentProject, addPromptHistory, promptHistories } = useMermaidStore();
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentHistory = currentProject 
    ? promptHistories[currentProject.id] 
    : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentHistory?.messages]);

  useEffect(() => {
    // API 키 로드
    const loadApiKey = async () => {
      try {
        const result = await window.electronAPI?.loadChatGPTApiKey();
        if (result?.success && result.apiKey) {
          setApiKey(result.apiKey);
        }
      } catch (error) {
        console.error('Failed to load API key:', error);
      }
    };
    loadApiKey();
  }, []);

  const handleSaveApiKey = async () => {
    try {
      const result = await window.electronAPI?.saveChatGPTApiKey(apiKey);
      if (result?.success) {
        setShowSettingsModal(false);
      } else {
        alert('API 키 저장에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Failed to save API key:', error);
      alert(`API 키 저장 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim() || !currentProject || isProcessing) return;

    // API 키 확인
    if (!apiKey) {
      alert('ChatGPT API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.');
      setShowSettingsModal(true);
      return;
    }

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
    const promptText = prompt;
    setPrompt('');

    try {
      // ChatGPT API 호출
      const response = await window.electronAPI?.invoke('mermaid:processPrompt', {
        projectId: currentProject.id,
        prompt: promptText,
        currentCode: currentProject.code,
        history: updatedHistory.messages,
      });

      if (response?.success && response.code) {
        // 생성된 코드 적용 (원본 코드와 함께 전달하여 diff 표시)
        useMermaidStore.getState().updateProjectCode(response.code, response.originalCode);

        const assistantMessage: PromptMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: response.message || '코드가 생성되었습니다.',
          timestamp: new Date(),
          codeDiff: response.code,
          originalCode: response.originalCode,
        };

        const finalHistory = {
          ...updatedHistory,
          messages: [...updatedHistory.messages, assistantMessage],
          updatedAt: new Date(),
        };

        addPromptHistory(currentProject.id, finalHistory);
      } else {
        // 오류 처리
        const errorMessage: PromptMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: `오류가 발생했습니다: ${response?.error || '알 수 없는 오류'}`,
          timestamp: new Date(),
        };

        const finalHistory = {
          ...updatedHistory,
          messages: [...updatedHistory.messages, errorMessage],
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
        background: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h6 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'inline' }}>AI 프롬프트</h6>
          <small style={{ color: '#666', marginLeft: '8px' }}>Ctrl+Enter로 전송</small>
        </div>
        <Button
          variant="link"
          size="sm"
          onClick={() => setShowSettingsModal(true)}
          style={{ 
            padding: '4px 8px',
            color: '#666',
            textDecoration: 'none'
          }}
        >
          <Settings size={16} />
        </Button>
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

      {/* 설정 모달 */}
      <Modal show={showSettingsModal} onHide={() => setShowSettingsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>ChatGPT API 설정</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>API 키</Form.Label>
            <Form.Control
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
            <Form.Text className="text-muted">
              ChatGPT API 키를 입력하세요. API 키는 안전하게 저장됩니다.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSettingsModal(false)}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSaveApiKey}>
            저장
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

