import { ipcRenderer, contextBridge } from 'electron'

export interface ElectronAPI {
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  isMaximized: () => Promise<boolean>
  getAppVersion: () => Promise<string>
  showNotification: (title: string, body: string) => void
  exportReport: (
    data: string,
    filename: string
  ) => Promise<{ success: boolean; filePath?: string; error?: string }>
}

// ────────────────────────────────────────────────────────────
// Expose the GeoPulse design API to the Renderer process.
// Mirrors the interface declared in src/types/attendance.ts
// ────────────────────────────────────────────────────────────
const electronAPI: ElectronAPI = {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  showNotification: (title: string, body: string) =>
    ipcRenderer.send('show-notification', { title, body }),
  exportReport: (data: string, filename: string) =>
    ipcRenderer.invoke('export-report', { data, filename }),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Keep the generic ipcRenderer bridge used by the Vite template.
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...rest) => listener(event, ...rest))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})