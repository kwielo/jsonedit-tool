import { createJSONEditor } from 'vanilla-jsoneditor'
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import './style.css'
import { loadSession, saveSession, clearAllSessions } from './storage.js'

const THEME_ICONS = { dark: '\u263E', light: '\u2600', auto: '\u25D0' }
const THEME_TITLES = { dark: 'Dark mode', light: 'Light mode', auto: 'Auto (system)' }
const THEME_CYCLE = { dark: 'light', light: 'auto', auto: 'dark' }

const resolveTheme = (mode) =>
  mode === 'auto'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : mode === 'dark'

const applyTheme = () => {
  const dark = resolveTheme(themeMode)
  document.body.classList.toggle('jse-theme-dark', dark)
  const btn = document.getElementById('btn-theme')
  btn.textContent = THEME_ICONS[themeMode]
  btn.title = THEME_TITLES[themeMode]
  btn.setAttribute('aria-label', THEME_TITLES[themeMode])
}

const storedTheme = localStorage.getItem('theme')
let themeMode = storedTheme && storedTheme in THEME_ICONS ? storedTheme : 'auto'

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (themeMode === 'auto') applyTheme()
})

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

const leftPanes = document.getElementById('left-panes')
const rightPanes = document.getElementById('right-panes')
const tabbar = document.getElementById('tabbar')
const addTabButton = document.getElementById('btn-add-tab')

// Each tab owns a live left+right editor pair so that switching tabs preserves
// the tree's expansion, scroll, selection and undo history. Editors are created
// lazily on first activation and destroyed when the tab is closed.
let tabs = []
let activeTab = null
let tabCounter = 0

let persistTimer = null
const schedulePersist = () => {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(persist, 300)
}

const syncActiveTab = () => {
  if (!activeTab || !activeTab.leftEditor) return
  activeTab.left = activeTab.leftEditor.get()
  activeTab.right = activeTab.rightEditor.get()
}

const persist = () => {
  syncActiveTab()
  const state = {
    tabCounter,
    activeIndex: Math.max(0, tabs.indexOf(activeTab)),
    tabs: tabs.map((tab) => ({ name: tab.name, left: tab.left, right: tab.right })),
  }
  saveSession(sessionId, state)
}

const ensureEditors = (tab) => {
  if (tab.leftEditor) return
  const leftEl = document.createElement('div')
  leftEl.className = 'editor'
  leftPanes.appendChild(leftEl)
  const rightEl = document.createElement('div')
  rightEl.className = 'editor'
  rightPanes.appendChild(rightEl)
  tab.leftEl = leftEl
  tab.rightEl = rightEl
  tab.leftEditor = createJSONEditor({
    target: leftEl,
    props: {
      content: tab.left,
      mode: 'text',
      onChange: (content) => {
        tab.left = content
        schedulePersist()
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
        schedulePersist()
      },
    },
  })
}

const destroyEditors = (tab) => {
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

const showTab = (tab) => {
  tab.leftEl?.classList.remove('hidden')
  tab.rightEl?.classList.remove('hidden')
}

const hideTab = (tab) => {
  tab?.leftEl?.classList.add('hidden')
  tab?.rightEl?.classList.add('hidden')
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

    const editIcon = document.createElement('button')
    editIcon.type = 'button'
    editIcon.className = 'tab_edit'
    editIcon.title = 'Rename tab'
    editIcon.setAttribute('aria-label', 'Rename tab')
    editIcon.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
    editIcon.addEventListener('click', (event) => {
      event.stopPropagation()
      startRename(tab, label, el)
    })
    el.appendChild(editIcon)

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
    el.addEventListener('dblclick', () => startRename(tab, label, el))
    tabbar.insertBefore(el, addTabButton)
  })
}

const switchTab = (tab) => {
  if (tab === activeTab) return
  syncActiveTab()
  hideTab(activeTab)
  activeTab = tab
  ensureEditors(tab)
  showTab(tab)
  renderTabs()
  persist()
}

const addTab = () => {
  tabCounter += 1
  const tab = {
    name: `Tab ${tabCounter}`,
    left: emptyContent(),
    right: emptyContent(),
    leftEditor: null,
    rightEditor: null,
    leftEl: null,
    rightEl: null,
  }
  tabs.push(tab)
  switchTab(tab)
  renderTabs()
}

const closeTab = (tab) => {
  const index = tabs.indexOf(tab)
  const wasActive = tab === activeTab
  tabs = tabs.filter((t) => t !== tab)
  destroyEditors(tab)
  if (wasActive) {
    activeTab = null
    switchTab(tabs[Math.min(index, tabs.length - 1)])
  }
  renderTabs()
  persist()
}

const startRename = (tab, label, el) => {
  el.classList.add('tab--editing')
  const input = document.createElement('input')
  input.className = 'tab_input'
  input.value = tab.name
  label.replaceWith(input)
  input.focus()
  input.select()
  const finish = () => {
    tab.name = input.value.trim() || tab.name
    el.classList.remove('tab--editing')
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
  if (!text || !activeTab) {
    return
  }
  event.preventDefault()
  activeTab.leftEditor.set({ text })
  activeTab.left = { text }
  persist()
})

applyTheme()

document.getElementById('btn-theme').addEventListener('click', () => {
  themeMode = THEME_CYCLE[themeMode]
  localStorage.setItem('theme', themeMode)
  applyTheme()
})

document.getElementById('btn-clear').addEventListener('click', () => {
  if (!activeTab) return
  if (confirm('You sure?')) {
    activeTab.leftEditor.set(emptyContent())
    activeTab.rightEditor.set(emptyContent())
    persist()
  }
})

document.getElementById('btn-l2r').addEventListener('click', () => {
  if (!activeTab) return
  activeTab.rightEditor.set(activeTab.leftEditor.get())
  persist()
})

document.getElementById('btn-r2l').addEventListener('click', () => {
  if (!activeTab) return
  activeTab.leftEditor.set(activeTab.rightEditor.get())
  persist()
})

document.getElementById('btn-clear-all').addEventListener('click', async () => {
  if (!confirm('Clear ALL stored JSON data for every tab/session? This cannot be undone.')) {
    return
  }
  await clearAllSessions()
  tabs.forEach(destroyEditors)
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
      leftEditor: null,
      rightEditor: null,
      leftEl: null,
      rightEl: null,
    }))
    tabCounter = state.tabCounter ?? tabs.length
    activeTab = tabs[Math.min(state.activeIndex ?? 0, tabs.length - 1)]
    ensureEditors(activeTab)
    showTab(activeTab)
    renderTabs()
  } else {
    addTab()
  }
}

init()
