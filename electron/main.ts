import { app, BrowserWindow, ipcMain, dialog, Notification, session } from 'electron'
import { fileURLToPath } from 'node:url'
import * as fs from 'node:fs'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │
// ├─┬─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null

function isTrustedRendererUrl(requestingUrl: string) {
  try {
    const url = new URL(requestingUrl)
    if (VITE_DEV_SERVER_URL) {
      return url.origin === new URL(VITE_DEV_SERVER_URL).origin
    }
    return url.protocol === 'file:' &&
      path.resolve(fileURLToPath(url)) === path.resolve(RENDERER_DIST, 'index.html')
  } catch {
    return false
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 460,
    minHeight: 700,
    frame: false, // Custom modern titlebar (see DesktopTitleBar.tsx)
    titleBarStyle: 'hidden',
    backgroundColor: '#fbf8ff',
    show: false,
    icon: path.join(process.env.VITE_PUBLIC, 'icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  win.once('ready-to-show', () => {
    win?.show()
  })

  win.on('closed', () => {
    win = null
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// ────────────────────────────────────────────────────────────
// Window controls IPC
// ────────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => {
  win?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (!win) return
  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
})

ipcMain.on('window-close', () => {
  win?.close()
})

ipcMain.handle('window-is-maximized', () => {
  return win ? win.isMaximized() : false
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// ────────────────────────────────────────────────────────────
// Notifications
// ────────────────────────────────────────────────────────────
ipcMain.on('show-notification', (_event, { title, body }: { title?: string; body?: string }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'GeoPulse Enterprise',
      body: body || 'Pemberitahuan Sistem Absensi',
    }).show()
  }
})

// ────────────────────────────────────────────────────────────
// File export IPC
// ────────────────────────────────────────────────────────────
ipcMain.handle(
  'export-report',
  async (_event, { data, filename }: { data: string; filename?: string }) => {
    if (!win) return { success: false, error: 'Window not active' }

    try {
      const defaultPath = path.join(
        app.getPath('downloads'),
        filename || 'Rekap_Absensi_GeoPulse.csv'
      )

      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: 'Simpan Laporan Rekap Presensi',
        defaultPath,
        filters: [
          { name: 'CSV File', extensions: ['csv'] },
          { name: 'JSON Audit', extensions: ['json'] },
          { name: 'Semua File', extensions: ['*'] },
        ],
      })

      if (canceled || !filePath) {
        return { success: false, error: 'Dibatalkan oleh pengguna' }
      }

      fs.writeFileSync(filePath, data, 'utf-8')
      return { success: true, filePath }
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal menyimpan file' }
    }
  }
)

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  let cameraPermissionGranted = false
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const mediaTypes = 'mediaTypes' in details ? details.mediaTypes ?? [] : []
    const isCameraRequest =
      permission === 'media' &&
      mediaTypes.includes('video') &&
      !mediaTypes.includes('audio') &&
      webContents.isFocused() &&
      isTrustedRendererUrl(webContents.getURL())

    if (!isCameraRequest) {
      callback(false)
      return
    }
    if (cameraPermissionGranted) {
      callback(true)
      return
    }

    const prompt = {
      type: 'question' as const,
      buttons: ['Izinkan Kamera', 'Batal'],
      defaultId: 1,
      cancelId: 1,
      title: 'Izin Kamera GeoPulse',
      message: 'Izinkan GeoPulse menggunakan kamera untuk foto bukti kehadiran?',
    }
    const permissionDialog = win
      ? dialog.showMessageBox(win, prompt)
      : dialog.showMessageBox(prompt)
    void permissionDialog.then(({ response }) => {
      cameraPermissionGranted = response === 0
      callback(cameraPermissionGranted)
    }).catch(() => callback(false))
  })
  createWindow()
})