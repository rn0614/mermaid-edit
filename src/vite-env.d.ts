/// <reference types="vite/client" />

// types.ts에서 타입 import
import type { Template, InputValue, CellRule, AppSettings } from './type';


// Electron API 타입 정의
declare global {
  interface Window {
    electronAPI: {
      // 파일 시스템 관련 API
      selectFolder: () => Promise<string | null>;
      getExcelFiles: (folderPath: string) => Promise<Array<{
        name: string;
        path: string;
        fullPath: string;
      }>>;
      readExcelFile: (filePath: string) => Promise<{
        sheetNames: string[];
        sheets: { [key: string]: any[][] };
      }>;
      saveExcelFile: (filePath: string, data: any) => Promise<boolean>;
      saveToOutputFolder: (originalFilePath: string, fileName: string, data: any) => Promise<string>;
      
      // 설정 저장/로드 API - 타입 안전하게 정의
      saveSettings: (settings: AppSettings) => Promise<boolean>;
      loadSettings: () => Promise<AppSettings>;
      
      // 파일 다운로드 API
      saveFile: (fileName: string, data: ArrayBuffer) => Promise<string | null>;
      
      
      // Mermaid Graph Tool API
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      
      // IPC 이벤트 리스너
      onTrayCategoryChanged: (callback: () => void) => void;
      removeTrayCategoryChangedListener: (callback: () => void) => void;
      
    };
  }
}

export {};