import { create } from 'zustand';
import type { MCPStore, MCPCategory, MCPServer } from '../type';

interface MCPState {
  store: MCPStore | null;
  categories: MCPCategory[];
  servers: MCPServer[];
  currentCategory: MCPCategory | null;
  selectedTarget: 'claude' | 'cursor';
  
  // Actions
  setStore: (store: MCPStore | null) => void;
  setCategories: (categories: MCPCategory[]) => void;
  setServers: (servers: MCPServer[]) => void;
  setCurrentCategory: (category: MCPCategory | null) => void;
  setSelectedTarget: (target: 'claude' | 'cursor') => void;
  refreshData: () => Promise<void>;
}

export const useMCPStore = create<MCPState>((set, get) => ({
  store: null,
  categories: [],
  servers: [],
  currentCategory: null,
  selectedTarget: 'claude',
  
  setStore: (store) => set({ store }),
  setCategories: (categories) => set({ categories }),
  setServers: (servers) => set({ servers }),
  setCurrentCategory: (currentCategory) => set({ currentCategory }),
  setSelectedTarget: (selectedTarget) => set({ selectedTarget }),
  
  refreshData: async () => {
    try {
      if (typeof (window.electronAPI as any).getMCPStore !== 'function') {
        console.warn('MCP Store API not available');
        return;
      }

      const storeData = await (window.electronAPI as any).getMCPStore();
      if (storeData) {
        const activeCategories = Object.values(storeData.categories || {})
          .filter((cat: any) => !cat.delYn) as MCPCategory[];
        const activeServers = Object.values(storeData.servers || {})
          .filter((server: any) => !server.delYn) as MCPServer[];

        const { selectedTarget } = get();
        const activeCategoryId = storeData.activeCategories?.[selectedTarget];
        const currentCategory = activeCategoryId && storeData.categories?.[activeCategoryId] 
          ? storeData.categories[activeCategoryId] 
          : null;

        set({
          store: storeData,
          categories: activeCategories,
          servers: activeServers,
          currentCategory
        });
      }
    } catch (error) {
      console.error('Error refreshing MCP data:', error);
    }
  }
}));
