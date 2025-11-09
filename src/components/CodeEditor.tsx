import { useRef, useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { useMermaidStore } from '../stores/mermaidStore';
import * as monaco from 'monaco-editor';

// Monaco Editor를 로컬 번들에서 로드하도록 설정
loader.config({ monaco });

// diff 계산 함수
function calculateDiff(original: string, modified: string): monaco.editor.IModelDeltaDecoration[] {
  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  
  if (!original || !modified) return decorations;
  
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  // 간단한 라인 단위 diff 계산
  const maxLines = Math.max(originalLines.length, modifiedLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const originalLine = originalLines[i] || '';
    const modifiedLine = modifiedLines[i] || '';
    
    if (originalLine !== modifiedLine) {
      // 변경된 라인을 초록색 배경으로 표시
      decorations.push({
        range: new monaco.Range(i + 1, 1, i + 1, modifiedLine.length + 1),
        options: {
          isWholeLine: true,
          className: 'diff-modified-line',
          glyphMarginClassName: 'diff-modified-glyph',
          inlineClassName: 'diff-modified-inline',
          minimap: {
            color: '#4ec9b0',
            position: monaco.editor.MinimapPosition.Inline,
          },
        },
      });
    }
  }
  
  return decorations;
}

export default function CodeEditor() {
  const { currentProject, updateProjectCode, lastOriginalCode, setLastOriginalCode } = useMermaidStore();
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // diff decorations 스타일 정의
    const editorModel = editor.getModel();
    if (editorModel) {
      // CSS를 통해 초록색 배경 설정
      const style = document.createElement('style');
      style.textContent = `
        .diff-modified-line {
          background-color: rgba(76, 201, 176, 0.2) !important;
        }
        .diff-modified-glyph {
          background-color: rgba(76, 201, 176, 0.5) !important;
        }
        .diff-modified-inline {
          background-color: rgba(76, 201, 176, 0.3) !important;
        }
      `;
      document.head.appendChild(style);
    }
  };

  // diff 표시 업데이트
  useEffect(() => {
    if (editorRef.current && currentProject && lastOriginalCode) {
      const editor = editorRef.current;
      const model = editor.getModel();
      
      if (model) {
        // 기존 decorations 제거
        if (decorationsRef.current.length > 0) {
          model.deltaDecorations(decorationsRef.current, []);
          decorationsRef.current = [];
        }
        
        // 새로운 diff decorations 추가
        const decorations = calculateDiff(lastOriginalCode, currentProject.code);
        if (decorations.length > 0) {
          const decorationIds = model.deltaDecorations([], decorations);
          decorationsRef.current = decorationIds;
          
          // 5초 후 자동으로 diff 표시 제거
          const timeoutId = setTimeout(() => {
            if (decorationsRef.current.length > 0) {
              model.deltaDecorations(decorationsRef.current, []);
              decorationsRef.current = [];
              setLastOriginalCode(null);
            }
          }, 5000);
          
          return () => clearTimeout(timeoutId);
        }
      }
    }
  }, [currentProject?.code, lastOriginalCode, setLastOriginalCode]);

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined && currentProject) {
      // 사용자가 직접 코드를 수정하면 diff 표시 제거
      if (decorationsRef.current.length > 0 && editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          model.deltaDecorations(decorationsRef.current, []);
          decorationsRef.current = [];
          setLastOriginalCode(null);
        }
      }
      updateProjectCode(value);
    }
  };


  if (!currentProject) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#1e1e1e',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>프로젝트를 선택하거나 생성하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '8px 12px', 
        background: '#252526', 
        borderBottom: '1px solid #3e3e42',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: '#ccc', fontSize: '12px' }}>Mermaid 코드</span>
      </div>
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          defaultLanguage="mermaid"
          value={currentProject.code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}

