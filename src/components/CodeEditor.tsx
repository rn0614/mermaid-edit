import { useEffect, useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { useMermaidStore } from '../stores/mermaidStore';
import { Button } from 'react-bootstrap';
import * as monaco from 'monaco-editor';

// Monaco Editor를 로컬 번들에서 로드하도록 설정
loader.config({ monaco });

export default function CodeEditor() {
  const { currentProject, updateProjectCode } = useMermaidStore();
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined && currentProject) {
      updateProjectCode(value);
    }
  };

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
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
        <Button 
          variant="outline-light" 
          size="sm"
          onClick={handleFormat}
          style={{ fontSize: '12px', padding: '2px 8px' }}
        >
          포맷
        </Button>
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

