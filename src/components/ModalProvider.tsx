import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { Modal, Button } from 'react-bootstrap';

interface ModalContextType {
  showTemplateModal: (currentTemplate: any) => void;
  hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [showModal, setShowModal] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);

  const showTemplateModal = (currentTemplate: any) => {
    setTemplateData(currentTemplate);
    setShowModal(true);
  };

  const hideModal = () => {
    setShowModal(false);
    setTemplateData(null);
  };

  const renderModal = () => {
    if (!showModal || !templateData) return null;

    return (
      <Modal show={showModal} onHide={hideModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>현재 템플릿 정보</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <h6>현재 파일 템플릿:</h6>
            <pre style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '5px',
              fontSize: '12px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {JSON.stringify({
                selectedFile: templateData.selectedFile || '없음',
                inputValuesCount: templateData.inputValues?.length || 0,
                cellRulesCount: templateData.cellRules?.length || 0,
                inputValues: templateData.inputValues || [],
                cellRules: templateData.cellRules || [],
                lastSaved: templateData.lastSaved || '저장되지 않음'
              }, null, 2)}
            </pre>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={hideModal}>
            닫기
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  const value: ModalContextType = {
    showTemplateModal,
    hideModal,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      {renderModal()}
    </ModalContext.Provider>
  );
};