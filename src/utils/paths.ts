import path from "path";
import { fileURLToPath } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import fs from "fs";

// 取得專案根目錄
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

// 全局 server 實例
let globalServer: Server | null = null;

/**
 * 設置全局 server 實例
 */
export function setGlobalServer(server: Server): void {
  globalServer = server;
}

/**
 * 獲取全局 server 實例
 */
export function getGlobalServer(): Server | null {
  return globalServer;
}

/**
 * 取得 DATA_DIR 路徑
 * 如果有 server 且支援 listRoots，則使用第一筆 file:// 開頭的 root + "/data"
 * 否則使用環境變數或專案根目錄
 */
export async function getDataDir(): Promise<string> {
  const server = getGlobalServer();
  let rootPath: string | null = null;

  if (server) {
    try {
      const roots = await server.listRoots();

      // 找出第一筆 file:// 開頭的 root
      if (roots.roots && roots.roots.length > 0) {
        const firstFileRoot = roots.roots.find((root) =>
          root.uri.startsWith("file://")
        );
        if (firstFileRoot) {
          // 從 file:// URI 中提取實際路徑
          // Windows: file:///C:/path -> C:/path
          // Unix: file:///path -> /path
          if (process.platform === 'win32') {
            rootPath = firstFileRoot.uri.replace("file:///", "").replace(/\//g, "\\");
          } else {
            rootPath = firstFileRoot.uri.replace("file://", "");
          }
        }
      }
    } catch (error) {
      // Silently handle error - console not supported in MCP
    }
  }

  // 處理 process.env.DATA_DIR
  if (process.env.DATA_DIR) {
    if (path.isAbsolute(process.env.DATA_DIR)) {
      // 如果 DATA_DIR 是絕對路徑，直接返回 DATA_DIR
      return process.env.DATA_DIR;
    } else {
      // 如果 DATA_DIR 是相對路徑，返回 "rootPath/DATA_DIR"
      if (rootPath) {
        return path.join(rootPath, process.env.DATA_DIR);
      } else {
        // 如果沒有 rootPath，使用 PROJECT_ROOT
        return path.join(PROJECT_ROOT, process.env.DATA_DIR);
      }
    }
  }

  // 如果沒有 DATA_DIR，使用預設邏輯
  if (rootPath) {
    return path.join(rootPath, "data");
  }

  // 最後回退到專案根目錄
  return path.join(PROJECT_ROOT, "data");
}

/**
 * 取得任務檔案路徑
 */
export async function getTasksFilePath(): Promise<string> {
  const dataDir = await getDataDir();
  return path.join(dataDir, "tasks.json");
}

/**
 * 取得記憶體資料夾路徑
 */
export async function getMemoryDir(): Promise<string> {
  const dataDir = await getDataDir();
  return path.join(dataDir, "memory");
}

/**
 * 取得 WebGUI 檔案路徑
 */
export async function getWebGuiFilePath(): Promise<string> {
  const dataDir = await getDataDir();
  return path.join(dataDir, "WebGUI.md");
}

/**
 * 取得專案根目錄
 */
export function getProjectRoot(): string {
  return PROJECT_ROOT;
}
