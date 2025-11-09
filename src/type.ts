interface CellRule {
  id: string;
  name: string;
  sheetName: string;
  cellAddress: string;
  inputKey: string;
  replaceType: "full" | "partial";
  partialPattern?: string;
}

interface InputValue {
  id: string;
  value: string;
}

interface ExcelFile {
  name: string;
  path: string;
  fullPath: string;
}

interface AppliedChange {
  ruleId: string;
  description: string;
  sheetName: string;
  cellAddress: string;
  originalValue: string;
  newValue: string;
  inputKey: string;
}

// 템플릿 타입 정의
interface Template {
  selectedFile: string;
  inputValues: InputValue[];
  cellRules: CellRule[];
  lastSaved?: string;
}

interface AppSettings {
  selectedFolder?: string;
  templates?: { [key: string]: Template };
  lastUsedFiles?: string[];
}

// 페이지 타입 정의
type PageType = 'excel-change' | 'mcp-maintain' | 'mcp-maintain-setting' | 'docker-ports' | 'batch-process' | 'settings';

// MCP 관련 타입 정의
interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  description: string;
  version: number;
  delYn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MCPKey {
  id: string;
  name: string;
  value: string;
  description: string;
  isSecret: boolean;
  version: number;
  delYn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MCPCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: 'claude' | 'cursor' | 'both';
  isActive: boolean;
  version: number;
  delYn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryServerRelation {
  id: string;
  categoryId: string;
  serverId: string;
  order: number;
  isEnabled: boolean;
  version: number;
  delYn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ServerKeyRelation {
  id: string;
  serverId: string;
  keyId: string;
  keyName: string; // 서버에서 사용하는 키 이름 (예: SUPABASE_URL)
  version: number;
  delYn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ActiveCategory {
  target: 'claude' | 'cursor';
  categoryId: string;
  lastActivated: Date;
  version: number;
  delYn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MCPConfigPaths {
  claude: string;
  cursor: string;
}

// electron-store 데이터 구조
interface MCPStore {
  // 서버 데이터
  servers: Record<string, MCPServer>;
  
  // 키 데이터  
  keys: Record<string, MCPKey>;
  
  // 카테고리 데이터
  categories: Record<string, MCPCategory>;
  
  // 관계 데이터
  categoryServerRelations: Record<string, CategoryServerRelation>;
  serverKeyRelations: Record<string, ServerKeyRelation>;
  
  // 활성 카테고리 설정
  activeCategories: {
    claude: string | null;
    cursor: string | null;
  };
  
  // 설정
  configPaths: MCPConfigPaths;
  
  // 메타데이터
  metadata: {
    version: string;
    lastUpdated: Date;
  };
}

// 유틸리티 타입들
type CreateMCPServer = Omit<MCPServer, 'id' | 'version' | 'delYn' | 'createdAt' | 'updatedAt'>;
type CreateMCPKey = Omit<MCPKey, 'id' | 'version' | 'delYn' | 'createdAt' | 'updatedAt'>;
type CreateMCPCategory = Omit<MCPCategory, 'id' | 'version' | 'delYn' | 'createdAt' | 'updatedAt'>;
type CreateCategoryServerRelation = Omit<CategoryServerRelation, 'id' | 'version' | 'delYn' | 'createdAt' | 'updatedAt'>;
type CreateServerKeyRelation = Omit<ServerKeyRelation, 'id' | 'version' | 'delYn' | 'createdAt' | 'updatedAt'>;

// 업데이트용 타입들 (부분 업데이트)
type UpdateMCPServer = Partial<Omit<MCPServer, 'id' | 'version' | 'delYn' | 'createdAt' | 'updatedAt'>>;
type UpdateMCPKey = Partial<Omit<MCPKey, 'id' | 'version' | 'delYn' | 'createdAt' | 'updatedAt'>>;
type UpdateMCPCategory = Partial<Omit<MCPCategory, 'id' | 'version' | 'delYn' | 'createdAt' | 'updatedAt'>>;

// Mermaid Graph Tool 관련 타입 정의
interface MermaidProject {
  id: string;
  name: string;
  code: string;
  lastValidCode?: string; // 마지막으로 유효했던 코드
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

interface PromptMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  codeDiff?: string; // 생성된 코드 변경사항
}

interface PromptHistory {
  id: string;
  projectId: string;
  messages: PromptMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface MermaidRenderResult {
  success: boolean;
  svg?: string;
  error?: string;
  errorMessage?: string;
}

interface ProjectSnapshot {
  id: string;
  projectId: string;
  code: string;
  timestamp: Date;
  description?: string;
}

interface MermaidAppState {
  currentProject: MermaidProject | null;
  projects: Record<string, MermaidProject>;
  promptHistories: Record<string, PromptHistory>;
  snapshots: Record<string, ProjectSnapshot[]>;
  renderResult: MermaidRenderResult | null;
  isRendering: boolean;
  error: string | null;
}

export type { 
  CellRule, 
  InputValue, 
  ExcelFile, 
  AppliedChange, 
  Template, 
  AppSettings, 
  PageType, 
  MCPServer, 
  MCPKey,
  MCPCategory, 
  CategoryServerRelation,
  ServerKeyRelation,
  ActiveCategory,
  MCPConfigPaths,
  MCPStore,
  CreateMCPServer,
  CreateMCPKey,
  CreateMCPCategory,
  CreateCategoryServerRelation,
  CreateServerKeyRelation,
  UpdateMCPServer,
  UpdateMCPKey,
  UpdateMCPCategory,
  MermaidProject,
  PromptMessage,
  PromptHistory,
  MermaidRenderResult,
  ProjectSnapshot,
  MermaidAppState
};
