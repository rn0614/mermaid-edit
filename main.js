import { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, clipboard } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import Store from 'electron-store';
import * as XLSX from 'xlsx';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

// 설정 저장소 초기화
const store = new Store();

// 트레이 관련 변수
let tray = null;
let mainWindow = null;

// Vite 개발 서버가 준비될 때까지 기다리는 함수
function waitForViteServer(url, maxAttempts = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkServer = () => {
      attempts++;
      const urlObj = new URL(url);
      
      const req = http.get({
        hostname: urlObj.hostname,
        port: urlObj.port || 5173,
        path: '/',
        timeout: 2000
      }, (res) => {
        req.destroy();
        resolve();
      });
      
      req.on('error', (err) => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error(`Vite 서버가 ${maxAttempts}번 시도 후에도 응답하지 않습니다. Vite 개발 서버가 실행 중인지 확인하세요.`));
        } else {
          setTimeout(checkServer, delay);
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error(`Vite 서버가 ${maxAttempts}번 시도 후에도 응답하지 않습니다. Vite 개발 서버가 실행 중인지 확인하세요.`));
        } else {
          setTimeout(checkServer, delay);
        }
      });
    };
    
    checkServer();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  // Content Security Policy 설정
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; connect-src 'self' http://localhost:* https://cdn.jsdelivr.net;"
        ]
      }
    });
  });

  if (isDev) {
    const viteUrl = 'http://localhost:5173';
    console.log('개발 모드: Vite 서버 대기 중...');
    waitForViteServer(viteUrl)
      .then(() => {
        console.log('Vite 서버 준비 완료, 페이지 로드 중...');
        mainWindow.loadURL(viteUrl);
        mainWindow.webContents.openDevTools();
      })
      .catch((err) => {
        console.error('Vite 서버 연결 실패:', err.message);
        // 폴백: 빌드된 파일 로드 시도
        const indexPath = path.join(__dirname, 'dist/index.html');
        if (fs.existsSync(indexPath)) {
          console.log('빌드된 파일로 폴백:', indexPath);
          mainWindow.loadFile(indexPath);
        } else {
          // 에러 메시지 표시
          mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.executeJavaScript(`
              document.body.innerHTML = '<div style="padding: 20px; font-family: Arial; text-align: center;"><h2>Vite 개발 서버를 찾을 수 없습니다</h2><p>다음 중 하나를 시도하세요:</p><ul style="text-align: left; display: inline-block;"><li>다른 터미널에서 <code>npm run dev</code> 실행</li><li><code>npm run electron-dev</code> 사용 (권장)</li></ul></div>';
            `);
          });
          mainWindow.loadURL('data:text/html,<html><body><h1>Vite 서버 연결 실패</h1></body></html>');
        }
      });
  } else {
    const indexPath = path.join(__dirname, 'dist/index.html');
    console.log('Loading production file:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
      // 폴백: 상대 경로로 시도
      const fallbackPath = path.join(__dirname, '..', 'dist', 'index.html');
      console.log('Trying fallback path:', fallbackPath);
      mainWindow.loadFile(fallbackPath);
    });
  }

  // 트레이 생성
  createTray();
}

// IPC 핸들러들
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('files:getExcelFiles', async (event, folderPath) => {
  try {
    const files = await fs.readdir(folderPath);
    const excelFiles = files.filter(file => 
      file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls')
    );
    
    return excelFiles.map(file => ({
      name: file,
      path: path.join(folderPath, file),
      fullPath: path.join(folderPath, file)
    }));
  } catch (error) {
    console.error('Error reading folder:', error);
    throw error;
  }
});

ipcMain.handle('files:readExcelFile', async (event, filePath) => {
  try {
    const buffer = await fs.readFile(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // 워크북을 JSON으로 변환하여 전송
    const sheets = {};
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      sheets[sheetName] = jsonData;
    });
    
    return {
      sheetNames: workbook.SheetNames,
      sheets: sheets
    };
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
});

ipcMain.handle('files:saveExcelFile', async (event, filePath, data) => {
  try {
    const workbook = XLSX.utils.book_new();
    
    // 각 시트 데이터를 워크시트로 변환
    Object.keys(data.sheets).forEach(sheetName => {
      const sheetData = data.sheets[sheetName];
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    
    // 파일 저장
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    await fs.writeFile(filePath, buffer);
    
    return true;
  } catch (error) {
    console.error('Error saving Excel file:', error);
    throw error;
  }
});

ipcMain.handle('files:saveToOutputFolder', async (event, originalFilePath, fileName, data) => {
  try {
    // 원본 파일의 디렉토리 경로 가져오기
    const originalDir = path.dirname(originalFilePath);
    const outputDir = path.join(originalDir, 'output');
    
    // output 폴더가 없으면 생성
    await fs.ensureDir(outputDir);
    
    // output 폴더에 파일 저장
    const outputFilePath = path.join(outputDir, fileName);
    
    const workbook = XLSX.utils.book_new();
    
    // 각 시트 데이터를 워크시트로 변환
    Object.keys(data.sheets).forEach(sheetName => {
      const sheetData = data.sheets[sheetName];
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    
    // 파일 저장
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    await fs.writeFile(outputFilePath, buffer);
    
    return outputFilePath;
  } catch (error) {
    console.error('Error saving to output folder:', error);
    throw error;
  }
});

ipcMain.handle('settings:save', async (event, settings) => {
  try {
    store.set('userSettings', settings);
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
});

ipcMain.handle('settings:load', async () => {
  try {
    return store.get('userSettings', {
      selectedFolder: '',
      cellRules: [],
      lastUsedFiles: []
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    throw error;
  }
});

ipcMain.handle('files:saveFile', async (event, fileName, data) => {
  try {
    const result = await dialog.showSaveDialog({
      defaultPath: fileName,
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] }
      ]
    });
    
    if (!result.canceled) {
      const buffer = Buffer.from(data);
      await fs.writeFile(result.filePath, buffer);
      return result.filePath;
    }
    return null;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
});

// MCP 설정 파일 처리 핸들러
ipcMain.handle('mcp:readConfig', async (event, filePath) => {
  try {
    const expandedPath = filePath.replace(/%APPDATA%/g, process.env.APPDATA || '');
    const configData = await fs.readFile(expandedPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error reading MCP config:', error);
    return null;
  }
});

ipcMain.handle('mcp:writeConfig', async (event, filePath, config) => {
  try {
    const expandedPath = filePath.replace(/%APPDATA%/g, process.env.APPDATA || '');
    
    // 디렉토리가 존재하지 않으면 생성
    const dir = path.dirname(expandedPath);
    await fs.ensureDir(dir);
    
    // 설정 파일 저장
    await fs.writeFile(expandedPath, JSON.stringify(config, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error writing MCP config:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:getDefaultPaths', async () => {
  const appData = process.env.APPDATA || '';
  return {
    claude: path.join(appData, 'Claude', 'claude_desktop_config.json'),
    cursor: path.join(appData, 'Cursor', 'config.json')
  };
});

// MCP Store 핸들러들
ipcMain.handle('mcp:getStore', async () => {
  try {
    const storeData = store.get('mcpStore');
    return storeData || {
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
        claude: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
        cursor: path.join(process.env.APPDATA || '', 'Cursor', 'config.json')
      },
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date()
      }
    };
  } catch (error) {
    console.error('Error getting MCP store:', error);
    return null;
  }
});

ipcMain.handle('mcp:saveStore', async (event, storeData) => {
  try {
    store.set('mcpStore', storeData);
    return { success: true };
  } catch (error) {
    console.error('Error saving MCP store:', error);
    return { success: false, error: error.message };
  }
});

// 카테고리 관련 핸들러
ipcMain.handle('mcp:createCategory', async (event, categoryData) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    const newCategory = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...categoryData,
      version: 1,
      delYn: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    storeData.categories = storeData.categories || {};
    storeData.categories[newCategory.id] = newCategory;
    store.set('mcpStore', storeData);
    
    return { success: true, category: newCategory };
  } catch (error) {
    console.error('Error creating category:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:updateCategory', async (event, categoryId, updates) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    if (!storeData.categories || !storeData.categories[categoryId]) {
      return { success: false, error: 'Category not found' };
    }
    
    const category = storeData.categories[categoryId];
    storeData.categories[categoryId] = {
      ...category,
      ...updates,
      version: category.version + 1,
      updatedAt: new Date()
    };
    
    store.set('mcpStore', storeData);
    return { success: true, category: storeData.categories[categoryId] };
  } catch (error) {
    console.error('Error updating category:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:deleteCategory', async (event, categoryId) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    if (!storeData.categories || !storeData.categories[categoryId]) {
      return { success: false, error: 'Category not found' };
    }
    
    const category = storeData.categories[categoryId];
    storeData.categories[categoryId] = {
      ...category,
      delYn: true,
      version: category.version + 1,
      updatedAt: new Date()
    };
    
    store.set('mcpStore', storeData);
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: error.message };
  }
});

// 서버 관련 핸들러
ipcMain.handle('mcp:createServer', async (event, serverData) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    const newServer = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...serverData,
      version: 1,
      delYn: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    storeData.servers = storeData.servers || {};
    storeData.servers[newServer.id] = newServer;
    store.set('mcpStore', storeData);
    
    return { success: true, server: newServer };
  } catch (error) {
    console.error('Error creating server:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:updateServer', async (event, serverId, updates) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    if (!storeData.servers || !storeData.servers[serverId]) {
      return { success: false, error: 'Server not found' };
    }
    
    const server = storeData.servers[serverId];
    storeData.servers[serverId] = {
      ...server,
      ...updates,
      version: server.version + 1,
      updatedAt: new Date()
    };
    
    store.set('mcpStore', storeData);
    return { success: true, server: storeData.servers[serverId] };
  } catch (error) {
    console.error('Error updating server:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:deleteServer', async (event, serverId) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    if (!storeData.servers || !storeData.servers[serverId]) {
      return { success: false, error: 'Server not found' };
    }
    
    const server = storeData.servers[serverId];
    storeData.servers[serverId] = {
      ...server,
      delYn: true,
      version: server.version + 1,
      updatedAt: new Date()
    };
    
    store.set('mcpStore', storeData);
    return { success: true };
  } catch (error) {
    console.error('Error deleting server:', error);
    return { success: false, error: error.message };
  }
});

// 키 관련 핸들러
ipcMain.handle('mcp:createKey', async (event, keyData) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    const newKey = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...keyData,
      version: 1,
      delYn: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    storeData.keys = storeData.keys || {};
    storeData.keys[newKey.id] = newKey;
    store.set('mcpStore', storeData);
    
    return { success: true, key: newKey };
  } catch (error) {
    console.error('Error creating key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:updateKey', async (event, keyId, updates) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    if (!storeData.keys || !storeData.keys[keyId]) {
      return { success: false, error: 'Key not found' };
    }
    
    const key = storeData.keys[keyId];
    storeData.keys[keyId] = {
      ...key,
      ...updates,
      version: key.version + 1,
      updatedAt: new Date()
    };
    
    store.set('mcpStore', storeData);
    return { success: true, key: storeData.keys[keyId] };
  } catch (error) {
    console.error('Error updating key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:deleteKey', async (event, keyId) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    if (!storeData.keys || !storeData.keys[keyId]) {
      return { success: false, error: 'Key not found' };
    }
    
    const key = storeData.keys[keyId];
    storeData.keys[keyId] = {
      ...key,
      delYn: true,
      version: key.version + 1,
      updatedAt: new Date()
    };
    
    store.set('mcpStore', storeData);
    return { success: true };
  } catch (error) {
    console.error('Error deleting key:', error);
    return { success: false, error: error.message };
  }
});

// 활성 카테고리 설정
ipcMain.handle('mcp:setActiveCategory', async (event, target, categoryId) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    storeData.activeCategories = storeData.activeCategories || { claude: null, cursor: null };
    storeData.activeCategories[target] = categoryId;
    storeData.metadata = storeData.metadata || { version: '1.0.0', lastUpdated: new Date() };
    storeData.metadata.lastUpdated = new Date();
    
    store.set('mcpStore', storeData);
    return { success: true };
  } catch (error) {
    console.error('Error setting active category:', error);
    return { success: false, error: error.message };
  }
});

// 카테고리에 서버 추가
ipcMain.handle('mcp:addServerToCategory', async (event, categoryId, serverId, order = 0) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    const relationId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    storeData.categoryServerRelations = storeData.categoryServerRelations || {};
    storeData.categoryServerRelations[relationId] = {
      id: relationId,
      categoryId,
      serverId,
      order,
      isEnabled: true,
      version: 1,
      delYn: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    store.set('mcpStore', storeData);
    return { success: true };
  } catch (error) {
    console.error('Error adding server to category:', error);
    return { success: false, error: error.message };
  }
});

// 카테고리에서 서버 제거
ipcMain.handle('mcp:removeServerFromCategory', async (event, categoryId, serverId) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    if (!storeData.categoryServerRelations) {
      return { success: false, error: 'No relations found' };
    }
    
    const relation = Object.values(storeData.categoryServerRelations)
      .find(rel => rel.categoryId === categoryId && rel.serverId === serverId && !rel.delYn);
    
    if (!relation) {
      return { success: false, error: 'Relation not found' };
    }
    
    storeData.categoryServerRelations[relation.id] = {
      ...relation,
      delYn: true,
      version: relation.version + 1,
      updatedAt: new Date()
    };
    
    store.set('mcpStore', storeData);
    return { success: true };
  } catch (error) {
    console.error('Error removing server from category:', error);
    return { success: false, error: error.message };
  }
});

// 서버에 키 추가
ipcMain.handle('mcp:addKeyToServer', async (event, serverId, keyId, keyName) => {
  try {
    const storeData = await store.get('mcpStore') || {};
    const relationId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    storeData.serverKeyRelations = storeData.serverKeyRelations || {};
    storeData.serverKeyRelations[relationId] = {
      id: relationId,
      serverId,
      keyId,
      keyName,
      version: 1,
      delYn: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    store.set('mcpStore', storeData);
    return { success: true };
  } catch (error) {
    console.error('Error adding key to server:', error);
    return { success: false, error: error.message };
  }
});

// Mermaid Graph Tool IPC 핸들러들 (app.whenReady 이전에 등록)
const mermaidStore = new Store({ name: 'mermaid-projects' });

// IPC 핸들러 등록 함수
function registerMermaidHandlers() {
  ipcMain.handle('mermaid:loadProjects', async () => {
    try {
      const projects = mermaidStore.get('projects', {});
      return projects;
    } catch (error) {
      console.error('Error loading projects:', error);
      return {};
    }
  });

  ipcMain.handle('mermaid:saveProject', async (event, project) => {
    try {
      const projects = mermaidStore.get('projects', {});
      projects[project.id] = {
        ...project,
        createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : project.createdAt,
        updatedAt: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : project.updatedAt,
      };
      mermaidStore.set('projects', projects);
      return { success: true };
    } catch (error) {
      console.error('Error saving project:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mermaid:processPrompt', async (event, { projectId, prompt, currentCode, history }) => {
    try {
      // TODO: 실제 LLM API 연동
      // 현재는 간단한 응답만 반환
      const response = {
        message: '프롬프트가 처리되었습니다. (LLM 연동 필요)',
        code: currentCode, // 실제로는 LLM이 생성한 코드
      };
      return response;
    } catch (error) {
      console.error('Error processing prompt:', error);
      throw error;
    }
  });

  ipcMain.handle('mermaid:saveSVGFile', async (event, svgData) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: `diagram-${Date.now()}.svg`,
        filters: [
          { name: 'SVG Files', extensions: ['svg'] }
        ]
      });
      
      if (!result.canceled && result.filePath) {
        await fs.writeFile(result.filePath, svgData, 'utf8');
        return { success: true, path: result.filePath };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Error saving SVG:', error);
      throw error;
    }
  });

  ipcMain.handle('mermaid:exportPNG', async (event, { projectId, code, svgData }) => {
    try {
      // 렌더러에서 생성한 SVG 데이터를 받아서 PNG로 변환
      // TODO: SVG를 PNG로 변환하는 로직 구현 필요 (sharp 또는 puppeteer 사용)
      const result = await dialog.showSaveDialog({
        defaultPath: `diagram-${Date.now()}.png`,
        filters: [
          { name: 'PNG Files', extensions: ['png'] }
        ]
      });
      
      if (!result.canceled && result.filePath) {
        // TODO: SVG를 PNG로 변환하는 로직 구현 필요
        // 현재는 SVG 파일로 저장
        if (svgData) {
          await fs.writeFile(result.filePath.replace('.png', '.svg'), svgData, 'utf8');
        }
        return { success: true, path: result.filePath };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Error exporting PNG:', error);
      throw error;
    }
  });

  ipcMain.handle('mermaid:copyToClipboard', async (event, pngData) => {
    try {
      // PNG 데이터를 Buffer로 변환
      const buffer = Buffer.from(pngData);
      const image = nativeImage.createFromBuffer(buffer);
      
      // PNG 형식으로 클립보드에 복사
      clipboard.writeImage(image);
      
      return { success: true };
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return { success: false, error: error.message };
    }
  });
}

// 트레이 메뉴 업데이트 IPC 핸들러
ipcMain.handle('tray:updateMenu', async () => {
  await updateTrayMenu();
});

// 트레이에서 카테고리 변경 시 렌더러에 알림
ipcMain.handle('tray:notifyCategoryChange', async () => {
  if (mainWindow) {
    mainWindow.webContents.send('tray:categoryChanged');
  }
});


// 트레이 생성 함수
function createTray() {
  // 트레이 아이콘 경로 설정
  let iconPath;
  
  if (isDev) {
    // 개발 환경: src/assets/tray.ico 사용 (절대 경로)
    iconPath = path.resolve(__dirname, 'src', 'assets', 'tray.ico');
  } else {
    // 프로덕션 환경: dist/assets/tray.ico 사용
    iconPath = path.resolve(__dirname, 'assets', 'tray.ico');
  }
  
  // 아이콘 파일이 없으면 기본 아이콘 생성
  let trayIcon;
  try {
    console.log('=== TRAY ICON DEBUG ===');
    console.log('Looking for tray icon at:', iconPath);
    console.log('__dirname:', __dirname);
    console.log('isDev:', isDev);
    console.log('File exists:', fs.existsSync(iconPath));
    console.log('========================');
    
    if (fs.existsSync(iconPath)) {
      console.log('Using tray icon from:', iconPath);
      trayIcon = nativeImage.createFromPath(iconPath);
    } else {
      console.log('Tray icon not found at:', iconPath);
      // 기본 아이콘 생성 (16x16 픽셀)
      const iconBuffer = Buffer.from(`
        <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
          <rect width="16" height="16" fill="#2563eb"/>
          <text x="8" y="12" font-family="Arial" font-size="10" fill="white" text-anchor="middle">M</text>
        </svg>
      `);
      trayIcon = nativeImage.createFromBuffer(iconBuffer);
    }
  } catch (error) {
    console.error('Error creating tray icon:', error);
    // 기본 아이콘 사용
    trayIcon = nativeImage.createFromBuffer(Buffer.from(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect width="16" height="16" fill="#2563eb"/>
        <text x="8" y="12" font-family="Arial" font-size="10" fill="white" text-anchor="middle">M</text>
      </svg>
    `));
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('MCP 관리 도구');

  // 트레이 컨텍스트 메뉴 생성
  updateTrayMenu();
}

// 트레이 메뉴 업데이트 함수
async function updateTrayMenu() {
  if (!tray) return;

  try {
    // MCP 스토어에서 카테고리 정보 가져오기
    const storeData = await store.get('mcpStore') || {};
    const categories = Object.values(storeData.categories || {})
      .filter(cat => !cat.delYn);

    // 카테고리 메뉴 아이템 생성
    const categoryMenuItems = categories.map(category => ({
      label: category.name,
      type: 'radio',
      checked: storeData.activeCategories?.claude === category.id,
      click: () => switchToCategory(category.id, 'claude')
    }));

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'MCP 관리 도구',
        enabled: false
      },
      { type: 'separator' },
      {
        label: '앱 보이기',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: '앱 숨기기',
        click: () => {
          if (mainWindow) {
            mainWindow.hide();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Claude Desktop 카테고리',
        submenu: categoryMenuItems.length > 0 ? categoryMenuItems : [
          { label: '카테고리 없음', enabled: false }
        ]
      },
      { type: 'separator' },
      {
        label: '종료',
        click: () => {
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
  } catch (error) {
    console.error('Error updating tray menu:', error);
  }
}

// 카테고리 전환 함수
async function switchToCategory(categoryId, target) {
  try {
    // 직접 스토어에서 활성 카테고리 설정
    const storeData = await store.get('mcpStore') || {};
    storeData.activeCategories = storeData.activeCategories || {};
    storeData.activeCategories[target] = categoryId;
    await store.set('mcpStore', storeData);
    
    // MCP 설정 파일 업데이트
    await updateMCPConfig(categoryId, target);
    console.log(`Switched to category ${categoryId} for ${target}`);
    
    // 렌더러에 카테고리 변경 알림
    if (mainWindow) {
      mainWindow.webContents.send('tray:categoryChanged');
    }
  } catch (error) {
    console.error('Error switching category:', error);
  }
}

// MCP 설정 파일 업데이트 함수
async function updateMCPConfig(categoryId, target) {
  try {
    const storeData = await store.get('mcpStore') || {};
    const category = storeData.categories?.[categoryId];
    if (!category) return;

    // 카테고리의 서버들 가져오기
    const relations = Object.values(storeData.categoryServerRelations || {})
      .filter(rel => rel.categoryId === categoryId && !rel.delYn && rel.isEnabled)
      .sort((a, b) => a.order - b.order);

    const categoryServers = relations
      .map(rel => storeData.servers[rel.serverId])
      .filter(server => server && !server.delYn);

    // MCP 설정 파일 생성
    const mcpConfig = {
      mcpServers: {}
    };

    categoryServers.forEach(server => {
      const serverKeys = Object.values(storeData.serverKeyRelations || {})
        .filter(rel => rel.serverId === server.id && !rel.delYn)
        .map(rel => ({
          key: storeData.keys[rel.keyId],
          keyName: rel.keyName
        }))
        .filter(item => item.key && !item.key.delYn);

      const env = {};
      serverKeys.forEach(({ key, keyName }) => {
        env[keyName] = key.value;
      });

      mcpConfig.mcpServers[server.name] = {
        command: server.command,
        args: server.args,
        ...(Object.keys(env).length > 0 && { env })
      };
    });

    // 실제 파일에 저장
    const configPath = target === 'claude' 
      ? (storeData.configPaths?.claude || '') 
      : (storeData.configPaths?.cursor || '');
    
    if (configPath) {
      await fs.writeFile(configPath, JSON.stringify(mcpConfig, null, 2));
      console.log(`MCP config updated for ${target}:`, configPath);
    }
  } catch (error) {
    console.error('Error updating MCP config:', error);
  }
}

// IPC 핸들러 등록
registerMermaidHandlers();

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});