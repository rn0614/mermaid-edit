import { create } from 'zustand';
import type { MermaidProject, MermaidRenderResult, PromptHistory, ProjectSnapshot, MermaidAppState } from '../type';

interface MermaidStore extends MermaidAppState {
  // Actions
  setCurrentProject: (project: MermaidProject | null) => void;
  updateProjectCode: (code: string, originalCode?: string) => void;
  createProject: (name: string, code?: string) => MermaidProject;
  deleteProject: (id: string) => Promise<void>;
  setRenderResult: (result: MermaidRenderResult) => void;
  setIsRendering: (isRendering: boolean) => void;
  setError: (error: string | null) => void;
  addPromptHistory: (projectId: string, history: PromptHistory) => void;
  addSnapshot: (projectId: string, snapshot: ProjectSnapshot) => void;
  loadProjects: () => Promise<void>;
  saveProject: (project: MermaidProject) => Promise<void>;
  lastOriginalCode: string | null; // diff 표시용 원본 코드
  setLastOriginalCode: (code: string | null) => void;
}

export const useMermaidStore = create<MermaidStore>((set, get) => ({
  // Initial state
  currentProject: null,
  projects: {},
  promptHistories: {},
  snapshots: {},
  renderResult: null,
  isRendering: false,
  error: null,
  lastOriginalCode: null,

  // Actions
  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  updateProjectCode: (code, originalCode) => {
    const { currentProject } = get();
    if (currentProject) {
      const updatedProject: MermaidProject = {
        ...currentProject,
        code,
        updatedAt: new Date(),
        version: currentProject.version + 1,
      };
      set({
        currentProject: updatedProject,
        projects: {
          ...get().projects,
          [updatedProject.id]: updatedProject,
        },
        lastOriginalCode: originalCode || null,
      });
    }
  },

  setLastOriginalCode: (code) => {
    set({ lastOriginalCode: code });
  },

  createProject: (name, code = 'graph TD\n    A[Start] --> B[End]') => {
    const id = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newProject: MermaidProject = {
      id,
      name,
      code,
      lastValidCode: code, // 초기 코드를 유효한 코드로 설정
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };
    
    set({
      projects: {
        ...get().projects,
        [id]: newProject,
      },
      currentProject: newProject,
    });
    
    return newProject;
  },

  deleteProject: async (id) => {
    try {
      // IPC를 통해 프로젝트 삭제
      await window.electronAPI?.invoke('mermaid:deleteProject', id);
      
      // 상태에서도 삭제
      const { projects, currentProject } = get();
      const updatedProjects = { ...projects };
      delete updatedProjects[id];
      
      set({
        projects: updatedProjects,
        currentProject: currentProject?.id === id ? null : currentProject,
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
      set({ error: '프로젝트를 삭제하는데 실패했습니다.' });
      throw error;
    }
  },

  setRenderResult: (result) => {
    set({ renderResult: result });
    
    // 성공 시 마지막 유효 코드 저장
    if (result.success && result.svg) {
      const { currentProject } = get();
      if (currentProject) {
        const updatedProject: MermaidProject = {
          ...currentProject,
          lastValidCode: currentProject.code,
        };
        set({
          currentProject: updatedProject,
          projects: {
            ...get().projects,
            [updatedProject.id]: updatedProject,
          },
        });
      }
    }
  },

  setIsRendering: (isRendering) => {
    set({ isRendering });
  },

  setError: (error) => {
    set({ error });
  },

  addPromptHistory: (projectId, history) => {
    set({
      promptHistories: {
        ...get().promptHistories,
        [projectId]: history,
      },
    });
  },

  addSnapshot: (projectId, snapshot) => {
    const { snapshots } = get();
    const projectSnapshots = snapshots[projectId] || [];
    set({
      snapshots: {
        ...snapshots,
        [projectId]: [...projectSnapshots, snapshot],
      },
    });
  },

  loadProjects: async () => {
    try {
      // IPC를 통해 프로젝트 로드
      const rawProjects = await window.electronAPI?.invoke('mermaid:loadProjects') || {};
      
      // 날짜 문자열을 Date 객체로 변환
      const projects: Record<string, MermaidProject> = {};
      Object.keys(rawProjects).forEach((id) => {
        const project = rawProjects[id];
        projects[id] = {
          ...project,
          createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
          updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date(),
        };
      });
      
      set({ projects });
    } catch (error) {
      console.error('Failed to load projects:', error);
      set({ error: '프로젝트를 불러오는데 실패했습니다.' });
    }
  },

  saveProject: async (project) => {
    try {
      // IPC를 통해 프로젝트 저장
      await window.electronAPI?.invoke('mermaid:saveProject', project);
      set({
        projects: {
          ...get().projects,
          [project.id]: project,
        },
      });
    } catch (error) {
      console.error('Failed to save project:', error);
      set({ error: '프로젝트를 저장하는데 실패했습니다.' });
    }
  },
}));

