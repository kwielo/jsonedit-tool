const RENAME_SEEN_KEY = 'hasRenamed'

export class TabBar {
  constructor(tabbarEl, clearAllButton, tabManager) {
    this.tabbar = tabbarEl
    this.clearAllButton = clearAllButton
    this.manager = tabManager
    this.hasRenamed = localStorage.getItem(RENAME_SEEN_KEY) === 'true'
  }

  render() {
    this.tabbar.querySelectorAll('.tab').forEach((el) => el.remove())
    const active = this.manager.getActive()

    for (const tab of this.manager.getAll()) {
      const el = document.createElement('span')
      el.className = 'tab' + (tab === active ? ' tab--active' : '')

      const label = document.createElement('span')
      label.className = 'tab_label'
      label.textContent = tab.name
      el.appendChild(label)

      if (!this.hasRenamed) {
        this._attachTooltip(el)
      }

      if (this.manager.getAll().length > 1) {
        this._attachCloseButton(el, tab)
      }

      el.addEventListener('click', () => this.manager.switchTo(tab))
      el.addEventListener('dblclick', () => this._startRename(tab, label, el))
      this.tabbar.insertBefore(el, this.clearAllButton)
    }
  }

  _attachTooltip(el) {
    const tooltip = document.createElement('span')
    tooltip.className = 'tab_tooltip'
    tooltip.textContent = 'Double click to edit'
    el.appendChild(tooltip)
    let timer = null
    el.addEventListener('mouseenter', () => {
      timer = setTimeout(() => { tooltip.style.display = 'block' }, 600)
    })
    el.addEventListener('mouseleave', () => {
      clearTimeout(timer)
      tooltip.style.display = 'none'
    })
  }

  _attachCloseButton(el, tab) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'tab_close'
    btn.textContent = '\u00D7'
    btn.title = 'Close tab.'
    btn.setAttribute('aria-label', 'Close tab')
    btn.addEventListener('click', (event) => {
      event.stopPropagation()
      this.manager.close(tab)
    })
    el.appendChild(btn)
  }

  _startRename(tab, label, el) {
    el.classList.add('tab--editing')
    const input = document.createElement('input')
    input.className = 'tab_input'
    input.value = tab.name
    label.replaceWith(input)
    input.focus()
    input.select()

    const finish = () => {
      this.manager.rename(tab, input.value)
      el.classList.remove('tab--editing')
      if (!this.hasRenamed) {
        this.hasRenamed = true
        localStorage.setItem(RENAME_SEEN_KEY, 'true')
      }
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
}
