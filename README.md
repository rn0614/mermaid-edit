# Mermaid Graph Tool

Electron 기반의 Mermaid.js 그래프 편집기입니다. 실시간 미리보기, 코드 편집, AI 기반 프롬프트 편집을 지원하는 데스크톱 애플리케이션입니다.

## 주요 기능

## 사용방법
1. npm 설치 및 electron-build 실행
```bash
npm i
npm run electron-build
```
2. dist-electron/win-unpacked/Mermaid Graph Tool 실행

3. 




### 🎨 실시간 편집 및 미리보기
- **실시간 렌더링**: 코드 수정 시 즉시 Mermaid 다이어그램이 업데이트됩니다
- **3패널 레이아웃**: Preview | Code Editor / Prompt 패널로 구성된 직관적인 UI
- **드래그 리사이즈**: 패널 크기를 자유롭게 조정할 수 있습니다
- **오류 처리**: 문법 오류 발생 시 마지막 유효한 그래프를 유지합니다

### 💻 코드 편집
- **Monaco Editor**: VS Code와 동일한 편집 경험
- **Syntax Highlighting**: Mermaid 문법 하이라이팅
- **자동 포맷팅**: 코드 포맷 자동 정리
- **Diff 표시**: AI로 생성된 코드 변경사항을 초록색으로 하이라이트

### 🤖 AI 기반 프롬프트 편집
- **ChatGPT API 연동**: 자연어 프롬프트로 다이어그램 생성 및 수정
- **대화 히스토리**: 프롬프트 대화 내역 저장 및 관리
- **코드 자동 적용**: AI가 생성한 코드를 자동으로 적용

### 📁 프로젝트 관리
- **다중 프로젝트**: 여러 Mermaid 프로젝트를 생성하고 관리
- **자동 저장**: 코드 변경 시 자동으로 저장
- **로컬 저장**: electron-store를 사용한 안전한 로컬 저장

### 📋 내보내기 및 공유
- **클립보드 복사**: 고해상도 PNG 이미지를 클립보드에 복사
- **SVG/PNG 내보내기**: 파일로 저장 가능
- **고품질 렌더링**: 3배 스케일 팩터로 고해상도 이미지 생성

## 기술 스택

- **프레임워크**: Electron + React 19 + TypeScript
- **빌드 도구**: Vite
- **상태 관리**: Zustand
- **코드 에디터**: Monaco Editor
- **렌더링**: Mermaid.js 11.12.1
- **UI 라이브러리**: React Bootstrap
- **스토리지**: electron-store

## 설치 및 실행

### 필수 요구사항
- Node.js 18 이상
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone <repository-url>
cd mermaid-edit

# 의존성 설치
npm install
```

### 개발 모드 실행

```bash
# 개발 서버와 Electron 앱 동시 실행
npm run electron-dev
```

개발 모드에서는 Vite 개발 서버(포트 5173)와 Electron 앱이 동시에 실행됩니다.

### 프로덕션 빌드

```bash
# 빌드
npm run build

# Electron 앱 빌드 (디렉토리)
npm run electron-build

# 배포용 패키지 생성
npm run dist
```

## 사용 방법

### 1. 프로젝트 생성
- 상단 툴바의 "새 프로젝트" 버튼을 클릭
- 프로젝트 이름을 입력하고 생성

### 2. 코드 편집
- 우측 상단의 코드 에디터에서 Mermaid 코드를 작성
- 코드 수정 시 좌측 프리뷰가 실시간으로 업데이트됩니다
- "포맷" 버튼으로 코드 자동 정리

### 3. AI 프롬프트 사용
- 우측 하단의 프롬프트 패널에서 설정 아이콘(⚙️) 클릭
- ChatGPT API 키 입력 및 저장
- 프롬프트 입력 후 Ctrl+Enter로 전송
- AI가 생성한 코드가 자동으로 적용되고 변경사항이 초록색으로 표시됩니다

### 4. 이미지 복사
- 프리뷰 패널의 "클립보드 복사" 버튼 클릭
- 고해상도 PNG 이미지가 클립보드에 복사됩니다
- Word, PowerPoint, 그림판 등에 붙여넣기 가능

### 5. 프로젝트 관리
- 상단 드롭다운에서 프로젝트 선택
- "삭제" 버튼으로 프로젝트 삭제 (되돌릴 수 없음)

## 프로젝트 구조

```
mermaid-edit/
├── src/
│   ├── components/          # React 컴포넌트
│   │   ├── CodeEditor.tsx   # Monaco Editor 통합
│   │   ├── MermaidPreview.tsx # 실시간 렌더링 및 복사
│   │   ├── PromptPanel.tsx  # AI 프롬프트 UI
│   │   └── ResizeHandle.tsx # 패널 리사이즈 핸들
│   ├── pages/
│   │   └── MermaidEditor.tsx # 메인 에디터 페이지
│   ├── stores/
│   │   └── mermaidStore.ts  # Zustand 상태 관리
│   └── type.ts              # TypeScript 타입 정의
├── main.js                  # Electron 메인 프로세스
├── preload.js               # IPC 브리지
└── package.json
```

## 주요 기능 상세

### 실시간 렌더링
- Mermaid.js를 사용한 실시간 SVG 렌더링
- 오류 발생 시 마지막 유효한 그래프 유지
- 렌더링 상태 및 오류 메시지 표시

### AI 프롬프트 편집
- ChatGPT API를 통한 자연어 기반 코드 생성
- 대화 히스토리 저장
- 생성된 코드의 변경사항 시각화 (초록색 하이라이트)

### 고해상도 이미지 생성
- 3배 스케일 팩터로 고품질 렌더링
- Canvas 기반 PNG 변환
- 클립보드 복사 및 파일 저장 지원

## 개발 가이드

### IPC 통신
Electron의 IPC를 통해 메인 프로세스와 렌더러 프로세스 간 통신합니다.

주요 IPC 채널:
- `mermaid:loadProjects` - 프로젝트 로드
- `mermaid:saveProject` - 프로젝트 저장
- `mermaid:deleteProject` - 프로젝트 삭제
- `mermaid:processPrompt` - ChatGPT API 호출
- `mermaid:copyToClipboard` - 클립보드 복사
- `mermaid:saveApiKey` - API 키 저장
- `mermaid:loadApiKey` - API 키 로드

### 상태 관리
Zustand를 사용한 전역 상태 관리:
- 프로젝트 목록 및 현재 프로젝트
- 렌더링 결과 및 오류 상태
- 프롬프트 히스토리

### 스타일 가이드
- React Bootstrap을 사용한 UI 컴포넌트
- 인라인 스타일 사용 (컴포넌트별 스타일 관리)
- 다크 테마 지원 (Monaco Editor)

## 라이선스

이 프로젝트는 개인 사용 목적으로 개발되었습니다.

## 기여

버그 리포트나 기능 제안은 이슈로 등록해주세요.

## 작성자

Sangmo Koo <green0614@gmail.com>

