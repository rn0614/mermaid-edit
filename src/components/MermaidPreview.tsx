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
        alert('복사할 이미지를 찾을 수 없습니다.');
        return;
      }

      // 🎯 고해상도를 위한 스케일 팩터 (3배)
      const SCALE_FACTOR = 3;
      
      // SVG의 실제 렌더링 크기 가져오기
      const boundingRect = svgElement.getBoundingClientRect();
      const baseWidth = Math.round(boundingRect.width) || 1200;
      const baseHeight = Math.round(boundingRect.height) || 800;
      
      // 실제 캔버스 크기는 SCALE_FACTOR배
      const canvasWidth = baseWidth * SCALE_FACTOR;
      const canvasHeight = baseHeight * SCALE_FACTOR;
      
      // SVG를 복제하여 수정 (원본에 영향 없도록)
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // SVG의 viewBox 확인 (비율 유지를 위해)
      const viewBox = svgElement.viewBox?.baseVal;
      
      // 명시적 크기 설정
      clonedSvg.setAttribute('width', baseWidth.toString());
      clonedSvg.setAttribute('height', baseHeight.toString());
      
      // viewBox 설정 (기존 viewBox가 있으면 유지, 없으면 생성)
      if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
        clonedSvg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
      } else {
        clonedSvg.setAttribute('viewBox', `0 0 ${baseWidth} ${baseHeight}`);
      }
      
      // SVG를 문자열로 변환
      const svgString = new XMLSerializer().serializeToString(clonedSvg);
      
      // SVG를 data URL로 변환
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
      
      // 디버깅용 로그
      console.log('Original size:', baseWidth, 'x', baseHeight);
      console.log('Canvas size (high-res):', canvasWidth, 'x', canvasHeight);
      console.log('Scale factor:', SCALE_FACTOR);
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');

            // 🎨 고해상도 캔버스
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // 🎨 고품질 렌더링 설정
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              
              // 배경을 흰색으로 설정
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // SCALE_FACTOR배 크기로 이미지 그리기
              ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
              
              // 🎯 Canvas를 PNG로 변환하여 클립보드에 복사 (무손실, 고품질)
              canvas.toBlob(async (blob) => {
                if (blob) {
                  const arrayBuffer = await blob.arrayBuffer();
                  // ArrayBuffer를 Uint8Array로 변환하여 배열로 전달
                  const uint8Array = new Uint8Array(arrayBuffer);
                  const result = await window.electronAPI?.invoke(
                    'mermaid:copyToClipboard', 
                    Array.from(uint8Array), 
                    'image/png'  // 🎯 PNG 형식 사용
                  );
                  
                  if (result?.success) {
                    console.log('✅ Copy successful (PNG, ' + SCALE_FACTOR + 'x resolution)');
                    onCopy?.();
                  } else {
                    console.error('❌ Copy failed:', result?.error);
                    alert('클립보드 복사에 실패했습니다: ' + (result?.error || '알 수 없는 오류'));
                  }
                } else {
                  console.error('Failed to create blob from canvas');
                  alert('이미지 변환에 실패했습니다.');
                }
                resolve();
              }, 'image/png'); // 🎯 PNG 형식, 품질 손실 없음
            } else {
              reject(new Error('Canvas context not available'));
            }
          } catch (error: any) {
            reject(error);
          }
        };
        
        img.onerror = (error) => {
          console.error('Image load failed:', error);
          console.error('SVG data URL (first 200 chars):', svgDataUrl.substring(0, 200));
          console.error('SVG string (first 500 chars):', svgString.substring(0, 500));
          reject(new Error('Failed to load SVG image'));
        };
        
        // SVG 문자열이 유효한지 간단히 확인
        if (!svgString || svgString.trim().length === 0) {
          reject(new Error('SVG string is empty'));
          return;
        }
        
        if (!svgString.includes('<svg')) {
          reject(new Error('Invalid SVG string'));
          return;
        }
        
        img.src = svgDataUrl;
      });
    } catch (error: any) {
      console.error('Copy to clipboard failed:', error);
      alert('클립보드 복사 중 오류가 발생했습니다: ' + error.message);
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