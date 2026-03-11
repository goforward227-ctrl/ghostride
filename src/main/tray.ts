import { Tray, Menu, nativeImage, nativeTheme, app, BrowserWindow } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import { showWindowBelowTray, setQuitting } from './window'

let tray: Tray | null = null

const res = (...parts: string[]): string => join(__dirname, '../../resources', ...parts)

function loadImage(name1x: string, name2x: string, template = false): Electron.NativeImage {
  const img = nativeImage.createEmpty()
  img.addRepresentation({ scaleFactor: 1.0, buffer: readFileSync(res(name1x)) })
  img.addRepresentation({ scaleFactor: 2.0, buffer: readFileSync(res(name2x)) })
  if (template) img.setTemplateImage(true)
  return img
}

let normalIcon: Electron.NativeImage
let badgeLightIcon: Electron.NativeImage
let badgeDarkIcon: Electron.NativeImage
let currentHasBadge = false

function buildIcons(): void {
  normalIcon = loadImage('trayIconTemplate.png', 'trayIconTemplate@2x.png', true)
  badgeLightIcon = loadImage('trayIconBadgeLight.png', 'trayIconBadgeLight@2x.png')
  badgeDarkIcon = loadImage('trayIconBadgeDark.png', 'trayIconBadgeDark@2x.png')
}

function getBadgeIcon(): Electron.NativeImage {
  return nativeTheme.shouldUseDarkColors ? badgeDarkIcon : badgeLightIcon
}

export function createTray(
  win: BrowserWindow,
  onBulkApprove: () => void
): Tray {
  buildIcons()

  tray = new Tray(normalIcon)
  tray.setToolTip('Ghostride')

  // Left-click: toggle popover panel below tray icon
  tray.on('click', (_event, bounds) => {
    if (win.isVisible()) {
      win.hide()
    } else {
      showWindowBelowTray(bounds)
    }
  })

  // Right-click: context menu
  tray.on('right-click', () => {
    if (!tray) return
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Approve All',
        accelerator: 'CmdOrCtrl+A',
        click: (): void => {
          onBulkApprove()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: (): void => {
          setQuitting(true)
          app.quit()
        }
      }
    ])
    tray!.popUpContextMenu(contextMenu)
  })

  // Update badge icon when system theme changes
  nativeTheme.on('updated', () => {
    if (tray && currentHasBadge) {
      tray.setImage(getBadgeIcon())
    }
  })

  return tray
}

export function updateTrayTitle(pendingCount: number): void {
  if (!tray) return
  const shouldBadge = pendingCount > 0
  if (shouldBadge !== currentHasBadge) {
    currentHasBadge = shouldBadge
    tray.setImage(shouldBadge ? getBadgeIcon() : normalIcon)
  }
  tray.setTitle('')
}
