import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { useMermaidStore } from '../stores/mermaidStore';
import { Alert, Button } from 'react-bootstrap';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
  },
});

interface MermaidPreviewProps {
  onCopy?: () => void;
}

export default function MermaidPreview({ onCopy }: MermaidPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const lastValidSvgRef = useRef<string | null>(null);
  const { currentProject, renderResult, isRendering } = useMermaidStore();

  useEffect(() => {
    if (!currentProject || !previewRef.current) return;

    const renderMermaid = async () => {
      try {
        const code = currentProject.code.trim();
        if (!code) {
          // 코드가 없을 때는 마지막 유효한 그래프가 있으면 보여주고, 없으면 메시지 표시
          if (lastValidSvgRef.current) {
            previewRef.current!.innerHTML = lastValidSvgRef.current;
          } else {
            previewRef.current!.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Mermaid 코드를 입력하세요</div>';
          }
          return;
        }

        // Mermaid 렌더링 시도
        const { svg } = await mermaid.render(`mermaid-diagram-${Date.now()}`, code);
        // SVG에 명시적 크기 추가 (없는 경우)
        const svgWithSize = svg.includes('width=') && svg.includes('height=') 
          ? svg 
          : svg.replace('<svg', '<svg width="1200" height="800"');
        previewRef.current!.innerHTML = svgWithSize;
        lastValidSvgRef.current = svgWithSize; // 성공한 SVG 저장
        
        // 성공 결과 저장 및 마지막 유효 코드 업데이트
        const store = useMermaidStore.getState();
        store.setRenderResult({
          success: true,
          svg,
        });
        
        // 프로젝트의 마지막 유효 코드 업데이트
        if (currentProject.code !== currentProject.lastValidCode) {
          const updatedProject = {
            ...currentProject,
            lastValidCode: currentProject.code,
          };
          store.setCurrentProject(updatedProject);
          store.saveProject(updatedProject);
        }
      } catch (error: any) {
        const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
        
        // 오류 발생 시 마지막 유효한 그래프가 있으면 그것을 표시
        if (lastValidSvgRef.current) {
          previewRef.current!.innerHTML = lastValidSvgRef.current;
        } else if (currentProject.lastValidCode) {
          // lastValidCode가 있으면 그것을 렌더링 시도
          try {
            const { svg } = await mermaid.render(`mermaid-diagram-fallback-${Date.now()}`, currentProject.lastValidCode);
            previewRef.current!.innerHTML = svg;
            lastValidSvgRef.current = svg;
          } catch (fallbackError: any) {
            // fallback도 실패하면 오류 메시지 표시
            previewRef.current!.innerHTML = `
              <div style="padding: 20px; color: #dc3545;">
                <h5>렌더링 오류</h5>
                <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">${errorMessage}</pre>
              </div>
            `;
          }
        } else {
          // 유효한 그래프가 없으면 오류 메시지 표시
          previewRef.current!.innerHTML = `
            <div style="padding: 20px; color: #dc3545;">
              <h5>렌더링 오류</h5>
              <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">${errorMessage}</pre>
            </div>
          `;
        }
        
        // 실패 결과 저장
        useMermaidStore.getState().setRenderResult({
          success: false,
          error: errorMessage,
          errorMessage: errorMessage,
        });
      }
    };

    renderMermaid();
  }, [currentProject?.code]);

  // 프로젝트가 변경되면 마지막 유효 SVG 초기화
  useEffect(() => {
    if (currentProject?.lastValidCode && previewRef.current) {
      // 프로젝트 변경 시 마지막 유효 코드로 초기 렌더링
      mermaid.render(`mermaid-diagram-init-${Date.now()}`, currentProject.lastValidCode)
        .then(({ svg }) => {
          if (previewRef.current) {
            previewRef.current.innerHTML = svg;
            lastValidSvgRef.current = svg;
          }
        })
        .catch(() => {
          // 초기 렌더링 실패는 무시
        });
    } else {
      lastValidSvgRef.current = null;
    }
  }, [currentProject?.id]);

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
        <div style={{ textAlign: 'center' }}>
          <h5>프로젝트를 선택하거나 생성하세요</h5>
          <p>새 프로젝트를 만들어 Mermaid 다이어그램을 시작하세요.</p>
        </div>
      </div>
    );
  }

  const handleCopyToClipboard = async () => {
    if (!previewRef.current) return;

    try {
      // previewRef에서 SVG 요소 직접 가져오기
      const svgElement = previewRef.current.querySelector('svg');
      if (!svgElement) {
        console.error('SVG element not found');
        return;
      }

      // SVG를 문자열로 변환
      const svgString = new XMLSerializer().serializeToString(svgElement);
      
      // SVG의 크기 정보 추출
      const svgWidth = svgElement.getAttribute('width') || svgElement.viewBox?.baseVal?.width || 1200;
      const svgHeight = svgElement.getAttribute('height') || svgElement.viewBox?.baseVal?.height || 800;
      
      // SVG를 data URL로 변환
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const width = typeof svgWidth === 'string' ? parseInt(svgWidth) : svgWidth;
            const height = typeof svgHeight === 'string' ? parseInt(svgHeight) : svgHeight;
            
            canvas.width = width || 1200;
            canvas.height = height || 800;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // 배경을 흰색으로 설정
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // 이미지 그리기
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              // Canvas를 PNG로 변환하여 클립보드에 복사
              canvas.toBlob(async (blob) => {
                if (blob) {
                  const arrayBuffer = await blob.arrayBuffer();
                  const result = await window.electronAPI?.invoke('mermaid:copyToClipboard', Array.from(new Uint8Array(arrayBuffer)));
                  if (result?.success) {
                    onCopy?.();
                  } else {
                    console.error('Copy failed:', result?.error);
                  }
                }
                resolve();
              }, 'image/png');
            } else {
              reject(new Error('Canvas context not available'));
            }
          } catch (error: any) {
            reject(error);
          }
        };
        
        img.onerror = (error) => {
          console.error('Image load failed:', error);
          reject(new Error('Failed to load SVG image'));
        };
        
        img.src = svgDataUrl;
      });
    } catch (error: any) {
      console.error('Copy to clipboard failed:', error);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '8px 12px', 
        background: '#f8f9fa', 
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '12px', color: '#666' }}>미리보기</span>
        {currentProject && (lastValidSvgRef.current || renderResult?.svg) && (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={handleCopyToClipboard}
            style={{ fontSize: '12px', padding: '2px 8px' }}
          >
            📋 복사
          </Button>
        )}
      </div>
      {isRendering && (
        <Alert variant="info" style={{ margin: '10px', marginBottom: 0 }}>
          렌더링 중...
        </Alert>
      )}
      {renderResult && !renderResult.success && (
        <Alert variant="danger" style={{ margin: '10px', marginBottom: 0 }}>
          <strong>오류:</strong> {renderResult.errorMessage}
        </Alert>
      )}
      <div
        ref={previewRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    </div>
  );
}

