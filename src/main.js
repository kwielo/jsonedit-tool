import { createJSONEditor } from 'vanilla-jsoneditor'
import './style.css'

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
