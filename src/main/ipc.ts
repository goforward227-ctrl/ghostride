import { ipcMain } from 'electron'
import type { ClaudeProcess } from './types'
import { ApprovalHandler } from './approval-handler'

export function registerIpcHandlers(
  getProcessMap: () => Map<string, ClaudeProcess>,
  approvalHandler: ApprovalHandler,
  renameProject: (sessionId: string, newName: string) => boolean,
  notifyRenderer: () => void
): void {
  ipcMain.handle('approve', (_event, sessionId: string) => {
    const proc = getProcessMap().get(sessionId)
    if (!proc) return { success: false, error: 'Process not found' }
    const tty = proc.tty
    getProcessMap().delete(sessionId)
    notifyRenderer()
    approvalHandler.approve(tty)
    return { success: true }
  })

  ipcMain.handle('reject', (_event, sessionId: string) => {
    const proc = getProcessMap().get(sessionId)
    if (!proc) return { success: false, error: 'Process not found' }
    const tty = proc.tty
    proc.status = 'running'
    notifyRenderer()
    approvalHandler.reject(tty)
    return { success: true }
  })

  ipcMain.handle('bulk-approve', async () => {
    const processMap = getProcessMap()
    let approved = 0
    let failed = 0

    for (const proc of processMap.values()) {
      if (proc.status === 'approval') {
        const result = await approvalHandler.approve(proc.tty)
        if (result.success) approved++
        else failed++
      }
    }

    return { approved, failed }
  })

  ipcMain.handle('rename', (_event, sessionId: string, newName: string) => {
    return renameProject(sessionId, newName)
  })
}
