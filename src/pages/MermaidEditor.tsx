import { useEffect, useState } from 'react';
import { Container, Button, Dropdown, Modal, Form } from 'react-bootstrap';
import { useMermaidStore } from '../stores/mermaidStore';
import MermaidPreview from '../components/MermaidPreview';
import CodeEditor from '../components/CodeEditor';
import PromptPanel from '../components/PromptPanel';
import ResizeHandle from '../components/ResizeHandle';
import { toast } from 'react-toastify';

export default function MermaidEditor() {
  const {
    currentProject,
    projects,
    createProject,
    setCurrentProject,
    deleteProject,
    saveProject,
    loadProjects,
  } = useMermaidStore();

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  
  // 패널 크기 상태 관리
  const [previewWidth, setPreviewWidth] = useState(40); // 퍼센트
  const [codeHeight, setCodeHeight] = useState(50); // 퍼센트

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    // 프로젝트가 변경될 때마다 자동 저장
    if (currentProject) {
      const timer = setTimeout(() => {
        saveProject(currentProject);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentProject?.code]);

  const handleNewProject = () => {
    if (!newProjectName.trim()) {
      toast.error('프로젝트 이름을 입력하세요.');
      return;
    }
    createProject(newProjectName.trim());
    setShowNewProjectModal(false);
    setNewProjectName('');
    toast.success('새 프로젝트가 생성되었습니다.');
  };

  const handleDeleteProject = async () => {
    if (projectToDelete) {
      try {
        await deleteProject(projectToDelete);
        setShowDeleteModal(false);
        setProjectToDelete(null);
        toast.success('프로젝트가 삭제되었습니다.');
      } catch (error) {
        console.error('Failed to delete project:', error);
        toast.error('프로젝트 삭제에 실패했습니다.');
      }
    }
  };

  const projectList = Object.values(projects);

  return (
    <Container fluid style={{ height: '100vh', padding: 0 }}>
      {/* 상단 툴바 */}
      <div style={{
        height: '50px',
        background: '#2d2d30',
        borderBottom: '1px solid #3e3e42',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '12px',
      }}>
        <Button
          variant="success"
          size="sm"
          onClick={() => setShowNewProjectModal(true)}
        >
          새 프로젝트
        </Button>

        <Dropdown>
          <Dropdown.Toggle variant="outline-light" size="sm" id="project-dropdown">
            {currentProject?.name || '프로젝트 선택'}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {projectList.length === 0 && (
              <Dropdown.Item disabled>프로젝트가 없습니다</Dropdown.Item>
            )}
            {projectList.map((project) => (
              <Dropdown.Item
                key={project.id}
                onClick={() => setCurrentProject(project)}
                active={currentProject?.id === project.id}
              >
                {project.name}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>

        {currentProject && (
          <>
            <div style={{ flex: 1 }} />
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => {
                setProjectToDelete(currentProject.id);
                setShowDeleteModal(true);
              }}
            >
              삭제
            </Button>
          </>
        )}
      </div>

      {/* 메인 레이아웃: 3패널 */}
      <div style={{ height: 'calc(100vh - 50px)', display: 'flex', margin: 0 }}>
        {/* 왼쪽: 프리뷰 패널 */}
        <div style={{ 
          width: `${previewWidth}%`, 
          padding: 0, 
          borderRight: '1px solid #dee2e6',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <MermaidPreview onCopy={() => toast.success('클립보드에 복사되었습니다.')} />
        </div>

        {/* 수평 리사이즈 핸들 */}
        <ResizeHandle 
          direction="horizontal" 
          onResize={(delta) => {
            const containerWidth = window.innerWidth;
            const deltaPercent = (delta / containerWidth) * 100;
            setPreviewWidth(prev => Math.max(20, Math.min(80, prev + deltaPercent)));
          }} 
        />

        {/* 오른쪽: 코드 에디터 + 프롬프트 패널 */}
        <div style={{ 
          flex: 1, 
          padding: 0, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* 코드 에디터 */}
          <div style={{ 
            height: `${codeHeight}%`, 
            borderBottom: '1px solid #dee2e6',
            overflow: 'hidden'
          }}>
            <CodeEditor />
          </div>

          {/* 수직 리사이즈 핸들 */}
          <ResizeHandle 
            direction="vertical" 
            onResize={(delta) => {
              const containerHeight = window.innerHeight - 50; // 툴바 높이 제외
              const deltaPercent = (delta / containerHeight) * 100;
              setCodeHeight(prev => Math.max(20, Math.min(80, prev + deltaPercent)));
            }} 
          />

          {/* 프롬프트 패널 */}
          <div style={{ 
            flex: 1,
            overflow: 'hidden'
          }}>
            <PromptPanel />
          </div>
        </div>
      </div>

      {/* 새 프로젝트 모달 */}
      <Modal show={showNewProjectModal} onHide={() => setShowNewProjectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>새 프로젝트 생성</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>프로젝트 이름</Form.Label>
              <Form.Control
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="프로젝트 이름을 입력하세요"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleNewProject();
                  }
                }}
                autoFocus
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNewProjectModal(false)}>
            취소
          </Button>
          <Button variant="primary" onClick={handleNewProject}>
            생성
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>프로젝트 삭제</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            취소
          </Button>
          <Button variant="danger" onClick={handleDeleteProject}>
            삭제
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

