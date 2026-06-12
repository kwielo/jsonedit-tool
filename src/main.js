import { createJSONEditor } from 'vanilla-jsoneditor'
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import './style.css'

const applyTheme = (dark) => {
  document.body.classList.toggle('jse-theme-dark', dark)
  document.getElementById('btn-theme').textContent = dark ? '\u2600' : '\u263E'
}

const storedTheme = localStorage.getItem('theme')
let darkMode = storedTheme
  ? storedTheme === 'dark'
  : window.matchMedia('(prefers-color-scheme: dark)').matches

const emptyContent = () => ({ json: {} })

const leftEditor = createJSONEditor({
  target: document.getElementById('editor-left'),
  props: {
    content: emptyContent(),
    mode: 'text',
  },
})

const rightEditor = createJSONEditor({
  target: document.getElementById('editor-right'),
  props: {
    content: emptyContent(),
    mode: 'tree',
  },
})

const tabbar = document.getElementById('tabbar')
const addTabButton = document.getElementById('btn-add-tab')

let tabs = []
let activeTab = null
let tabCounter = 0

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
addTab()

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
  }
})

document.getElementById('btn-l2r').addEventListener('click', () => {
  rightEditor.set(leftEditor.get())
})

document.getElementById('btn-r2l').addEventListener('click', () => {
  leftEditor.set(rightEditor.get())
})
