import { createJSONEditor } from 'vanilla-jsoneditor'
import { loadSession, saveSession, clearAllSessions } from './storage.js'

const emptyContent = () => ({ json: {} })

export class TabManager {
  constructor(sessionId, { leftPanes, rightPanes }) {
    this.sessionId = sessionId
    this.leftPanes = leftPanes
    this.rightPanes = rightPanes
    this.tabs = []
    this.active = null
    this.counter = 0
    this.onChanged = null

    this._persistTimer = null
  }

  getAll() {
    return this.tabs
  }

  getActive() {
    return this.active
  }

  schedulePersist() {
    clearTimeout(this._persistTimer)
    this._persistTimer = setTimeout(() => this.persist(), 300)
  }

  syncActive() {
    if (!this.active || !this.active.leftEditor) return
    this.active.left = this.active.leftEditor.get()
    this.active.right = this.active.rightEditor.get()
  }

  persist() {
    this.syncActive()
    const state = {
      tabCounter: this.counter,
      activeIndex: Math.max(0, this.tabs.indexOf(this.active)),
      tabs: this.tabs.map((t) => ({ name: t.name, left: t.left, right: t.right })),
    }
    saveSession(this.sessionId, state)
  }

  ensureEditors(tab) {
    if (tab.leftEditor) return
    const leftEl = document.createElement('div')
    leftEl.className = 'editor'
    this.leftPanes.appendChild(leftEl)
    const rightEl = document.createElement('div')
    rightEl.className = 'editor'
    this.rightPanes.appendChild(rightEl)
    tab.leftEl = leftEl
    tab.rightEl = rightEl
    tab.leftEditor = createJSONEditor({
      target: leftEl,
      props: {
        content: tab.left,
        mode: 'text',
        onChange: (content) => {
          tab.left = content
          this.schedulePersist()
        },
      },
    })
    tab.rightEditor = createJSONEditor({
      target: rightEl,
      props: {
        content: tab.right,
        mode: 'tree',
        onChange: (content) => {
          tab.right = content
          this.schedulePersist()
        },
      },
    })
  }

  destroyEditors(tab) {
    const { leftEditor, rightEditor, leftEl, rightEl } = tab
    tab.leftEditor = null
    tab.rightEditor = null
    tab.leftEl = null
    tab.rightEl = null
    if (leftEditor) leftEditor.destroy().then(() => leftEl?.remove())
    else leftEl?.remove()
    if (rightEditor) rightEditor.destroy().then(() => rightEl?.remove())
    else rightEl?.remove()
  }

  showTab(tab) {
    tab.leftEl?.classList.remove('hidden')
    tab.rightEl?.classList.remove('hidden')
  }

  hideTab(tab) {
    tab?.leftEl?.classList.add('hidden')
    tab?.rightEl?.classList.add('hidden')
  }

  switchTo(tab) {
    if (tab === this.active) return
    this.syncActive()
    this.hideTab(this.active)
    this.active = tab
    this.ensureEditors(tab)
    this.showTab(tab)
    this.onChanged?.()
    this.persist()
  }

  add() {
    this.counter += 1
    const tab = {
      name: `Tab ${this.counter}`,
      left: emptyContent(),
      right: emptyContent(),
      leftEditor: null,
      rightEditor: null,
      leftEl: null,
      rightEl: null,
    }
    this.tabs.push(tab)
    this.switchTo(tab)
    this.onChanged?.()
  }

  close(tab) {
    const index = this.tabs.indexOf(tab)
    const wasActive = tab === this.active
    this.tabs = this.tabs.filter((t) => t !== tab)
    this.destroyEditors(tab)
    if (wasActive) {
      this.active = null
      this.switchTo(this.tabs[Math.min(index, this.tabs.length - 1)])
    }
    this.onChanged?.()
    this.persist()
  }

  rename(tab, newName) {
    tab.name = newName.trim() || tab.name
    this.onChanged?.()
    this.persist()
  }

  clearBoth() {
    if (!this.active) return
    this.active.leftEditor.set(emptyContent())
    this.active.rightEditor.set(emptyContent())
    this.persist()
  }

  copyLeftToRight() {
    if (!this.active) return
    this.active.rightEditor.set(this.active.leftEditor.get())
    this.persist()
  }

  copyRightToLeft() {
    if (!this.active) return
    this.active.leftEditor.set(this.active.rightEditor.get())
    this.persist()
  }

  pasteToLeft(text) {
    if (!this.active) return
    this.active.leftEditor.set({ text })
    this.active.left = { text }
    this.persist()
  }

  async clearAll() {
    await clearAllSessions()
    this.tabs.forEach((t) => this.destroyEditors(t))
    this.tabs = []
    this.active = null
    this.counter = 0
    this.add()
  }

  async restore() {
    const state = await loadSession(this.sessionId)
    if (state && Array.isArray(state.tabs) && state.tabs.length > 0) {
      this.tabs = state.tabs.map((t) => ({
        name: t.name,
        left: t.left ?? emptyContent(),
        right: t.right ?? emptyContent(),
        leftEditor: null,
        rightEditor: null,
        leftEl: null,
        rightEl: null,
      }))
      this.counter = state.tabCounter ?? this.tabs.length
      this.active = this.tabs[Math.min(state.activeIndex ?? 0, this.tabs.length - 1)]
      this.ensureEditors(this.active)
      this.showTab(this.active)
      this.onChanged?.()
    } else {
      this.add()
    }
  }
}
