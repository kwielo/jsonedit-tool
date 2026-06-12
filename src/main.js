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
