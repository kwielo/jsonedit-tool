import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import './style.css'

import { ensureSessionId } from './session.js'
import { ThemeManager } from './theme.js'
import { TabManager } from './tab-manager.js'
import { TabBar } from './tab-bar.js'
import { CommandPalette } from './command-palette.js'

const sessionId = ensureSessionId()

const manager = new TabManager(sessionId, {
  leftPanes: document.getElementById('left-panes'),
  rightPanes: document.getElementById('right-panes'),
})

const tabBar = new TabBar(
  document.getElementById('tabbar'),
  document.getElementById('btn-clear-all'),
  manager,
)

manager.onChanged = () => tabBar.render()

new ThemeManager(document.getElementById('btn-theme'))
new CommandPalette(manager)

document.getElementById('btn-add-tab').addEventListener('click', () => manager.add())
document.getElementById('btn-clear').addEventListener('click', () => {
  if (manager.getActive() && confirm('You sure?')) manager.clearBoth()
})
document.getElementById('btn-l2r').addEventListener('click', () => manager.copyLeftToRight())
document.getElementById('btn-r2l').addEventListener('click', () => manager.copyRightToLeft())
document.getElementById('btn-clear-all').addEventListener('click', async () => {
  if (confirm('Clear ALL stored JSON data for every tab/session? This cannot be undone.')) {
    await manager.clearAll()
  }
})

document.addEventListener('paste', (event) => {
  const target = event.target
  if (target instanceof Element && target.closest('.editor, input, textarea, [contenteditable]')) {
    return
  }
  const text = event.clipboardData?.getData('text')
  if (!text || !manager.getActive()) return
  event.preventDefault()
  manager.pasteToLeft(text)
})

manager.restore()
