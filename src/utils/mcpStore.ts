// mcpStore.ts - MCP 데이터 관리 유틸리티
import type { 
  MCPStore, 
  MCPServer, 
  MCPKey, 
  MCPCategory, 
  CategoryServerRelation,
  ServerKeyRelation,
  CreateMCPServer,
  CreateMCPKey,
  CreateMCPCategory,
  CreateCategoryServerRelation,
  CreateServerKeyRelation,
  UpdateMCPServer,
  UpdateMCPKey,
  UpdateMCPCategory
} from '../type';

// 기본 스토어 구조
export const createDefaultStore = (): MCPStore => ({
  servers: {},
  keys: {},
  categories: {},
  categoryServerRelations: {},
  serverKeyRelations: {},
  activeCategories: {
    claude: null,
    cursor: null
  },
  configPaths: {
    claude: '',
    cursor: ''
  },
  metadata: {
    version: '1.0.0',
    lastUpdated: new Date()
  }
});

// ID 생성 유틸리티
export const generateId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// 공통 필드 생성
const createCommonFields = () => ({
  id: generateId(),
  version: 1,
  delYn: false,
  createdAt: new Date(),
  updatedAt: new Date()
});

// 서버 생성
export const createServer = (data: CreateMCPServer): MCPServer => ({
  ...data,
  ...createCommonFields()
});

// 키 생성
export const createKey = (data: CreateMCPKey): MCPKey => ({
  ...data,
  ...createCommonFields()
});

// 카테고리 생성
export const createCategory = (data: CreateMCPCategory): MCPCategory => ({
  ...data,
  ...createCommonFields()
});

// 카테고리-서버 관계 생성
export const createCategoryServerRelation = (data: CreateCategoryServerRelation): CategoryServerRelation => ({
  ...data,
  ...createCommonFields()
});

// 서버-키 관계 생성
export const createServerKeyRelation = (data: CreateServerKeyRelation): ServerKeyRelation => ({
  ...data,
  ...createCommonFields()
});

// 서버 업데이트
export const updateServer = (server: MCPServer, updates: UpdateMCPServer): MCPServer => ({
  ...server,
  ...updates,
  version: server.version + 1,
  updatedAt: new Date()
});

// 키 업데이트
export const updateKey = (key: MCPKey, updates: UpdateMCPKey): MCPKey => ({
  ...key,
  ...updates,
  version: key.version + 1,
  updatedAt: new Date()
});

// 카테고리 업데이트
export const updateCategory = (category: MCPCategory, updates: UpdateMCPCategory): MCPCategory => ({
  ...category,
  ...updates,
  version: category.version + 1,
  updatedAt: new Date()
});

// Soft 삭제
export const softDeleteServer = (server: MCPServer): MCPServer => ({
  ...server,
  delYn: true,
  version: server.version + 1,
  updatedAt: new Date()
});

export const softDeleteKey = (key: MCPKey): MCPKey => ({
  ...key,
  delYn: true,
  version: key.version + 1,
  updatedAt: new Date()
});

export const softDeleteCategory = (category: MCPCategory): MCPCategory => ({
  ...category,
  delYn: true,
  version: category.version + 1,
  updatedAt: new Date()
});

// 활성 카테고리 설정
export const setActiveCategory = (store: MCPStore, target: 'claude' | 'cursor', categoryId: string | null): MCPStore => {
  return {
    ...store,
    activeCategories: {
      ...store.activeCategories,
      [target]: categoryId
    },
    metadata: {
      ...store.metadata,
      lastUpdated: new Date()
    }
  };
};

// 카테고리에 서버 추가
export const addServerToCategory = (
  store: MCPStore, 
  categoryId: string, 
  serverId: string, 
  order: number = 0
): MCPStore => {
  const relationId = generateId();
  const relation = createCategoryServerRelation({
    categoryId,
    serverId,
    order,
    isEnabled: true
  });

  return {
    ...store,
    categoryServerRelations: {
      ...store.categoryServerRelations,
      [relationId]: relation
    },
    metadata: {
      ...store.metadata,
      lastUpdated: new Date()
    }
  };
};

// 서버에 키 연결
export const addKeyToServer = (
  store: MCPStore,
  serverId: string,
  keyId: string,
  keyName: string
): MCPStore => {
  const relationId = generateId();
  const relation = createServerKeyRelation({
    serverId,
    keyId,
    keyName
  });

  return {
    ...store,
    serverKeyRelations: {
      ...store.serverKeyRelations,
      [relationId]: relation
    },
    metadata: {
      ...store.metadata,
      lastUpdated: new Date()
    }
  };
};

// 활성 카테고리 가져오기
export const getActiveCategory = (store: MCPStore, target: 'claude' | 'cursor'): MCPCategory | null => {
  const categoryId = store.activeCategories[target];
  if (!categoryId) return null;
  
  const category = store.categories[categoryId];
  return category && !category.delYn ? category : null;
};

// 카테고리의 서버들 가져오기
export const getCategoryServers = (store: MCPStore, categoryId: string): MCPServer[] => {
  const relations = Object.values(store.categoryServerRelations)
    .filter(rel => rel.categoryId === categoryId && !rel.delYn && rel.isEnabled)
    .sort((a, b) => a.order - b.order);

  return relations
    .map(rel => store.servers[rel.serverId])
    .filter(server => server && !server.delYn);
};

// 서버의 키들 가져오기
export const getServerKeys = (store: MCPStore, serverId: string): { key: MCPKey; keyName: string }[] => {
  const relations = Object.values(store.serverKeyRelations)
    .filter(rel => rel.serverId === serverId && !rel.delYn);

  return relations
    .map(rel => ({
      key: store.keys[rel.keyId],
      keyName: rel.keyName
    }))
    .filter(item => item.key && !item.key.delYn);
};

// 삭제되지 않은 모든 항목들 가져오기
export const getActiveServers = (store: MCPStore): MCPServer[] => {
  return Object.values(store.servers).filter(server => !server.delYn);
};

export const getActiveKeys = (store: MCPStore): MCPKey[] => {
  return Object.values(store.keys).filter(key => !key.delYn);
};

export const getActiveCategories = (store: MCPStore): MCPCategory[] => {
  return Object.values(store.categories).filter(category => !category.delYn);
};
