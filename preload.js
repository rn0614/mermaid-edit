const { contextBridge, ipcRenderer } = require('electron');

// 렌더러 프로세스에 안전한 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 파일 시스템 관련 API
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  getExcelFiles: (folderPath) => ipcRenderer.invoke('files:getExcelFiles', folderPath),
  readExcelFile: (filePath) => ipcRenderer.invoke('files:readExcelFile', filePath),
  saveExcelFile: (filePath, data) => ipcRenderer.invoke('files:saveExcelFile', filePath, data),
  saveToOutputFolder: (originalFilePath, fileName, data) => ipcRenderer.invoke('files:saveToOutputFolder', originalFilePath, fileName, data),
  
  // 설정 저장/로드 API
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  
  // 파일 다운로드 API
  saveFile: (fileName, data) => ipcRenderer.invoke('files:saveFile', fileName, data),
  
  // MCP 설정 파일 API
  readMCPConfig: (filePath) => ipcRenderer.invoke('mcp:readConfig', filePath),
  writeMCPConfig: (filePath, config) => ipcRenderer.invoke('mcp:writeConfig', filePath, config),
  getDefaultMCPPaths: () => ipcRenderer.invoke('mcp:getDefaultPaths'),
  
  // MCP Store API
  getMCPStore: () => ipcRenderer.invoke('mcp:getStore'),
  saveMCPStore: (store) => ipcRenderer.invoke('mcp:saveStore', store),
  createMCPCategory: (categoryData) => ipcRenderer.invoke('mcp:createCategory', categoryData),
  updateMCPCategory: (categoryId, updates) => ipcRenderer.invoke('mcp:updateCategory', categoryId, updates),
  deleteMCPCategory: (categoryId) => ipcRenderer.invoke('mcp:deleteCategory', categoryId),
  createMCPServer: (serverData) => ipcRenderer.invoke('mcp:createServer', serverData),
  updateMCPServer: (serverId, updates) => ipcRenderer.invoke('mcp:updateServer', serverId, updates),
  deleteMCPServer: (serverId) => ipcRenderer.invoke('mcp:deleteServer', serverId),
  createMCPKey: (keyData) => ipcRenderer.invoke('mcp:createKey', keyData),
  updateMCPKey: (keyId, updates) => ipcRenderer.invoke('mcp:updateKey', keyId, updates),
  deleteMCPKey: (keyId) => ipcRenderer.invoke('mcp:deleteKey', keyId),
  setActiveCategory: (target, categoryId) => ipcRenderer.invoke('mcp:setActiveCategory', target, categoryId),
  addServerToCategory: (categoryId, serverId, order) => ipcRenderer.invoke('mcp:addServerToCategory', categoryId, serverId, order),
  removeServerFromCategory: (categoryId, serverId) => ipcRenderer.invoke('mcp:removeServerFromCategory', categoryId, serverId),
  addKeyToServer: (serverId, keyId, keyName) => ipcRenderer.invoke('mcp:addKeyToServer', serverId, keyId, keyName),
  
  // 트레이 API
  updateTrayMenu: () => ipcRenderer.invoke('tray:updateMenu'),
  
  // Mermaid Graph Tool API
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  saveChatGPTApiKey: (apiKey) => ipcRenderer.invoke('mermaid:saveApiKey', apiKey),
  loadChatGPTApiKey: () => ipcRenderer.invoke('mermaid:loadApiKey'),
  
  // IPC 이벤트 리스너
  onTrayCategoryChanged: (callback) => {
    ipcRenderer.on('tray:categoryChanged', callback);
  },
  removeTrayCategoryChangedListener: (callback) => {
    ipcRenderer.removeListener('tray:categoryChanged', callback);
  },
  
});