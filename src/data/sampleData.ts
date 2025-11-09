// sampleData.ts - 샘플 데이터
import type { 
  CreateMCPCategory, 
  CreateMCPServer, 
  CreateMCPKey, 
  CreateCategoryServerRelation,
  CreateServerKeyRelation 
} from '../type';

// 샘플 서버 데이터
export const sampleServers: CreateMCPServer[] = [
  {
    name: 'supabase',
    command: 'docker',
    args: ['exec', 'supabase-mcp', 'node', '/app/server.js'],
    description: 'Supabase 데이터베이스 연동'
  },
  {
    name: 'shadcn',
    command: 'docker',
    args: ['exec', 'shadcn-mcp', 'node', '/app/server.js'],
    description: 'Shadcn UI 컴포넌트 관리'
  },
  {
    name: 'context7',
    command: 'docker',
    args: ['exec', 'context7-mcp', 'python', '/app/main.py'],
    description: '컨텍스트 관리 서버'
  },
  {
    name: 'filesystem',
    command: 'docker',
    args: ['exec', 'filesystem-mcp', 'npx', '@modelcontextprotocol/server-filesystem', '/workspace'],
    description: '파일시스템 접근'
  },
  {
    name: 'sqlite',
    command: 'docker',
    args: ['exec', 'sqlite-mcp', 'npx', '@modelcontextprotocol/server-sqlite', '--db-path', '/data/analysis.db'],
    description: 'SQLite 데이터베이스'
  }
];

// 샘플 키 데이터
export const sampleKeys: CreateMCPKey[] = [
  {
    name: 'SUPABASE_URL',
    value: 'your-supabase-url',
    description: 'Supabase 프로젝트 URL',
    isSecret: true
  },
  {
    name: 'SUPABASE_KEY',
    value: 'your-supabase-key',
    description: 'Supabase API 키',
    isSecret: true
  },
  {
    name: 'DATABASE_URL',
    value: 'sqlite:///data/analysis.db',
    description: 'SQLite 데이터베이스 경로',
    isSecret: false
  }
];

// 샘플 카테고리 데이터
export const sampleCategories: CreateMCPCategory[] = [
  {
    name: '개발',
    description: '개발 관련 MCP 서버들',
    icon: 'Code',
    target: 'both',
    isActive: false
  },
  {
    name: '일반',
    description: '일반적인 작업용 MCP 서버들',
    icon: 'Globe',
    target: 'both',
    isActive: true
  },
  {
    name: '데이터분석',
    description: '데이터 분석 및 처리용 MCP 서버들',
    icon: 'Database',
    target: 'claude',
    isActive: false
  }
];

// 카테고리-서버 관계 데이터
export const sampleCategoryServerRelations: Omit<CreateCategoryServerRelation, 'categoryId' | 'serverId'>[] = [
  // 개발 카테고리 (index 0)
  { order: 0, isEnabled: true }, // supabase (index 0)
  { order: 1, isEnabled: true }, // shadcn (index 1)
  
  // 일반 카테고리 (index 1)
  { order: 0, isEnabled: true }, // context7 (index 2)
  { order: 1, isEnabled: true }, // filesystem (index 3)
  
  // 데이터분석 카테고리 (index 2)
  { order: 0, isEnabled: true }, // sqlite (index 4)
];

// 서버-키 관계 데이터
export const sampleServerKeyRelations: Omit<CreateServerKeyRelation, 'serverId' | 'keyId'>[] = [
  // supabase 서버 (index 0)
  { keyName: 'SUPABASE_URL' }, // SUPABASE_URL 키 (index 0)
  { keyName: 'SUPABASE_KEY' }, // SUPABASE_KEY 키 (index 1)
  
  // sqlite 서버 (index 4)
  { keyName: 'DATABASE_URL' }, // DATABASE_URL 키 (index 2)
];

// 초기화 함수
export const initializeSampleData = async () => {
  const results = {
    categories: [] as string[],
    servers: [] as string[],
    keys: [] as string[],
    categoryServerRelations: [] as string[],
    serverKeyRelations: [] as string[]
  };

  try {
    console.log('Starting sample data initialization...');

    // API 사용 가능 여부 확인
    if (typeof (window as any).electronAPI?.createMCPServer !== 'function') {
      throw new Error('MCP Store API not available');
    }

    // 1. 서버 생성
    console.log('Creating servers...');
    for (const serverData of sampleServers) {
      try {
        const result = await (window as any).electronAPI.createMCPServer(serverData);
        if (result.success) {
          results.servers.push(result.server.id);
          console.log(`Created server: ${serverData.name}`);
        } else {
          console.error(`Failed to create server ${serverData.name}:`, result.error);
        }
      } catch (error) {
        console.error(`Error creating server ${serverData.name}:`, error);
      }
    }

    // 2. 키 생성
    console.log('Creating keys...');
    for (const keyData of sampleKeys) {
      try {
        const result = await (window as any).electronAPI.createMCPKey(keyData);
        if (result.success) {
          results.keys.push(result.key.id);
          console.log(`Created key: ${keyData.name}`);
        } else {
          console.error(`Failed to create key ${keyData.name}:`, result.error);
        }
      } catch (error) {
        console.error(`Error creating key ${keyData.name}:`, error);
      }
    }

    // 3. 카테고리 생성
    console.log('Creating categories...');
    for (const categoryData of sampleCategories) {
      try {
        const result = await (window as any).electronAPI.createMCPCategory(categoryData);
        if (result.success) {
          results.categories.push(result.category.id);
          console.log(`Created category: ${categoryData.name}`);
        } else {
          console.error(`Failed to create category ${categoryData.name}:`, result.error);
        }
      } catch (error) {
        console.error(`Error creating category ${categoryData.name}:`, error);
      }
    }

    // 4. 카테고리-서버 관계 생성
    console.log('Creating category-server relations...');
    const categoryServerPairs = [
      [0, 0], [0, 1], // 개발: supabase, shadcn
      [1, 2], [1, 3], // 일반: context7, filesystem
      [2, 4]          // 데이터분석: sqlite
    ];

    for (let i = 0; i < categoryServerPairs.length; i++) {
      const [categoryIndex, serverIndex] = categoryServerPairs[i];
      const categoryId = results.categories[categoryIndex];
      const serverId = results.servers[serverIndex];
      const relationData = sampleCategoryServerRelations[i];

      if (categoryId && serverId) {
        try {
          const result = await (window as any).electronAPI.addServerToCategory(
            categoryId, 
            serverId, 
            relationData.order
          );
          if (result.success) {
            results.categoryServerRelations.push(`${categoryId}-${serverId}`);
            console.log(`Added server ${serverIndex} to category ${categoryIndex}`);
          } else {
            console.error(`Failed to add server to category:`, result.error);
          }
        } catch (error) {
          console.error(`Error adding server to category:`, error);
        }
      } else {
        console.warn(`Missing category or server for relation ${i}: categoryId=${categoryId}, serverId=${serverId}`);
      }
    }

    // 5. 서버-키 관계 생성
    console.log('Creating server-key relations...');
    const serverKeyPairs = [
      [0, 0], [0, 1], // supabase: SUPABASE_URL, SUPABASE_KEY
      [4, 2]          // sqlite: DATABASE_URL
    ];

    for (let i = 0; i < serverKeyPairs.length; i++) {
      const [serverIndex, keyIndex] = serverKeyPairs[i];
      const serverId = results.servers[serverIndex];
      const keyId = results.keys[keyIndex];
      const relationData = sampleServerKeyRelations[i];

      if (serverId && keyId) {
        try {
          const result = await (window as any).electronAPI.addKeyToServer(
            serverId,
            keyId,
            relationData.keyName
          );
          if (result.success) {
            results.serverKeyRelations.push(`${serverId}-${keyId}`);
            console.log(`Added key ${keyIndex} to server ${serverIndex}`);
          } else {
            console.error(`Failed to add key to server:`, result.error);
          }
        } catch (error) {
          console.error(`Error adding key to server:`, error);
        }
      } else {
        console.warn(`Missing server or key for relation ${i}: serverId=${serverId}, keyId=${keyId}`);
      }
    }

    console.log('Sample data initialization completed:', results);
    return results;
  } catch (error) {
    console.error('Error initializing sample data:', error);
    throw error;
  }
};
