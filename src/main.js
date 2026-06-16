import { createJSONEditor } from 'vanilla-jsoneditor'
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import './style.css'
import { loadSession, saveSession, clearAllSessions } from './storage.js'

const applyTheme = (dark) => {
  document.body.classList.toggle('jse-theme-dark', dark)
  document.getElementById('btn-theme').textContent = dark ? '\u2600' : '\u263E'
}

const storedTheme = localStorage.getItem('theme')
let darkMode = storedTheme
  ? storedTheme === 'dark'
  : window.matchMedia('(prefers-color-scheme: dark)').matches

const emptyContent = () => ({ json: {} })

// Each browser tab gets its own sessionId, kept in the URL so a refresh restores
// that tab's data. Duplicating/sharing the URL reopens the same session.
const ensureSessionId = () => {
  const params = new URLSearchParams(window.location.search)
  let id = params.get('s')
  if (!id) {
    id = crypto.randomUUID()
    params.set('s', id)
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}?${query}${window.location.hash}`)
  }
  return id
}

const sessionId = ensureSessionId()

const leftEditor = createJSONEditor({
  target: document.getElementById('editor-left'),
  props: {
    content: emptyContent(),
    mode: 'text',
    onChange: (content) => {
      if (!activeTab) return
      activeTab.left = content
      schedulePersist()
    },
  },
})

const rightEditor = createJSONEditor({
  target: document.getElementById('editor-right'),
  props: {
    content: emptyContent(),
    mode: 'tree',
    onChange: (content) => {
      if (!activeTab) return
      activeTab.right = content
      schedulePersist()
    },
  },
})

const tabbar = document.getElementById('tabbar')
const addTabButton = document.getElementById('btn-add-tab')

let tabs = []
let activeTab = null
let tabCounter = 0

let persistTimer = null
const schedulePersist = () => {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(persist, 300)
}

const persist = () => {
  saveActiveTab()
  const state = {
    tabCounter,
    activeIndex: Math.max(0, tabs.indexOf(activeTab)),
    tabs: tabs.map((tab) => ({ name: tab.name, left: tab.left, right: tab.right })),
  }
  saveSession(sessionId, state)
}

const saveActiveTab = () => {
  if (!activeTab) return
  activeTab.left = leftEditor.get()
  activeTab.right = rightEditor.get()
}

const loadTab = (tab) => {
  leftEditor.set(tab.left)
  rightEditor.set(tab.right)
}

const renderTabs = () => {
  tabbar.querySelectorAll('.tab').forEach((el) => el.remove())
  tabs.forEach((tab) => {
    const el = document.createElement('span')
    el.className = 'tab' + (tab === activeTab ? ' tab--active' : '')
    el.title = 'Double-click to rename.'

    const label = document.createElement('span')
    label.className = 'tab_label'
    label.textContent = tab.name
    el.appendChild(label)

    if (tabs.length > 1) {
      const close = document.createElement('button')
      close.type = 'button'
      close.className = 'tab_close'
      close.textContent = '\u00D7'
      close.title = 'Close tab.'
      close.setAttribute('aria-label', 'Close tab')
      close.addEventListener('click', (event) => {
        event.stopPropagation()
        closeTab(tab)
      })
      el.appendChild(close)
    }

    el.addEventListener('click', () => switchTab(tab))
    el.addEventListener('dblclick', () => startRename(tab, label))
    tabbar.insertBefore(el, addTabButton)
  })
}

const switchTab = (tab) => {
  if (tab === activeTab) return
  saveActiveTab()
  activeTab = tab
  loadTab(tab)
  renderTabs()
  persist()
}

const addTab = () => {
  tabCounter += 1
  const tab = { name: `Tab ${tabCounter}`, left: emptyContent(), right: emptyContent() }
  tabs.push(tab)
  switchTab(tab)
  renderTabs()
}

const closeTab = (tab) => {
  const index = tabs.indexOf(tab)
  tabs = tabs.filter((t) => t !== tab)
  if (tab === activeTab) {
    activeTab = null
    switchTab(tabs[Math.min(index, tabs.length - 1)])
  }
  renderTabs()
  persist()
}

const startRename = (tab, label) => {
  const input = document.createElement('input')
  input.className = 'tab_input'
  input.value = tab.name
  input.size = Math.max(tab.name.length, 4)
  label.replaceWith(input)
  input.focus()
  input.select()
  const finish = () => {
    tab.name = input.value.trim() || tab.name
    renderTabs()
    persist()
  }
  input.addEventListener('blur', finish)
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') input.blur()
    if (event.key === 'Escape') {
      input.value = tab.name
      input.blur()
    }
  })
}

addTabButton.addEventListener('click', addTab)

// pasting anywhere outside the editors replaces the left pane content
document.addEventListener('paste', (event) => {
  const target = event.target
  if (target instanceof Element && target.closest('.editor, input, textarea, [contenteditable]')) {
    return
  }
  const text = event.clipboardData?.getData('text')
  if (!text) {
    return
  }
  event.preventDefault()
  leftEditor.set({ text })
  if (activeTab) activeTab.left = { text }
  persist()
})

applyTheme(darkMode)

document.getElementById('btn-theme').addEventListener('click', () => {
  darkMode = !darkMode
  localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  applyTheme(darkMode)
})

document.getElementById('btn-clear').addEventListener('click', () => {
  if (confirm('You sure?')) {
    leftEditor.set(emptyContent())
    rightEditor.set(emptyContent())
    persist()
  }
})

document.getElementById('btn-l2r').addEventListener('click', () => {
  rightEditor.set(leftEditor.get())
  persist()
})

document.getElementById('btn-r2l').addEventListener('click', () => {
  leftEditor.set(rightEditor.get())
  persist()
})

document.getElementById('btn-clear-all').addEventListener('click', async () => {
  if (!confirm('Clear ALL stored JSON data for every tab/session? This cannot be undone.')) {
    return
  }
  await clearAllSessions()
  tabs = []
  activeTab = null
  tabCounter = 0
  addTab()
})

// Restore this session's tabs on load, or start a fresh single tab.
const init = async () => {
  const state = await loadSession(sessionId)
  if (state && Array.isArray(state.tabs) && state.tabs.length > 0) {
    tabs = state.tabs.map((tab) => ({
      name: tab.name,
      left: tab.left ?? emptyContent(),
      right: tab.right ?? emptyContent(),
    }))
    tabCounter = state.tabCounter ?? tabs.length
    activeTab = tabs[Math.min(state.activeIndex ?? 0, tabs.length - 1)]
    loadTab(activeTab)
    renderTabs()
  } else {
    addTab()
  }
}

init()
