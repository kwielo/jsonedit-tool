export class CommandPalette {
  constructor(tabManager) {
    this.manager = tabManager
    this._index = 0
    this._filtered = []

    this._backdrop = document.createElement('div')
    this._backdrop.className = 'palette_backdrop'
    this._backdrop.hidden = true

    this._el = document.createElement('div')
    this._el.className = 'palette'
    this._el.hidden = true

    this._input = document.createElement('input')
    this._input.className = 'palette_input'
    this._input.placeholder = 'Search tabs\u2026'

    this._list = document.createElement('ul')
    this._list.className = 'palette_list'

    this._el.appendChild(this._input)
    this._el.appendChild(this._list)
    document.body.appendChild(this._backdrop)
    document.body.appendChild(this._el)

    this._input.addEventListener('input', () => this._onFilter())
    this._input.addEventListener('keydown', (e) => this._onKeydown(e))
    this._backdrop.addEventListener('click', () => this.close())

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        this.toggle()
      }
    })
  }

  get isOpen() {
    return !this._el.hidden
  }

  toggle() {
    if (this.isOpen) this.close()
    else this.open()
  }

  open() {
    this._input.value = ''
    this._index = 0
    this._showNewTab = true
    this._filtered = [...this.manager.getAll()]
    this._renderList()
    this._el.hidden = false
    this._backdrop.hidden = false
    this._input.focus()
  }

  close() {
    this._el.hidden = true
    this._backdrop.hidden = true
  }

  _confirm() {
    if (this._showNewTab && this._index === 0) {
      this.close()
      this.manager.add()
      return
    }
    const offset = this._showNewTab ? 1 : 0
    const tab = this._filtered[this._index - offset]
    if (tab) this.manager.switchTo(tab)
    this.close()
  }

  _onFilter() {
    const q = this._input.value.toLowerCase()
    this._showNewTab = q.length === 0
    this._filtered = this.manager.getAll().filter((t) => t.name.toLowerCase().includes(q))
    this._index = 0
    this._renderList()
  }

  _onKeydown(event) {
    const totalItems = this._filtered.length + (this._showNewTab ? 1 : 0)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      this._index = Math.min(this._index + 1, totalItems - 1)
      this._renderList()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      this._index = Math.max(this._index - 1, 0)
      this._renderList()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      this._confirm()
    } else if (event.key === 'Escape') {
      this.close()
    }
  }

  _renderList() {
    this._list.innerHTML = ''
    let offset = 0

    if (this._showNewTab) {
      const li = document.createElement('li')
      li.className = 'palette_item palette_item--action' + (this._index === 0 ? ' palette_item--active' : '')
      li.textContent = '+ New tab'
      li.addEventListener('click', () => {
        this.close()
        this.manager.add()
      })
      li.addEventListener('mouseenter', () => {
        this._index = 0
        this._renderList()
      })
      this._list.appendChild(li)
      offset = 1
    }

    const active = this.manager.getActive()
    this._filtered.forEach((tab, i) => {
      const idx = i + offset
      const li = document.createElement('li')
      li.className = 'palette_item' + (idx === this._index ? ' palette_item--active' : '')
      if (tab === active) li.classList.add('palette_item--current')
      li.textContent = tab.name
      li.addEventListener('click', () => {
        this.manager.switchTo(tab)
        this.close()
      })
      li.addEventListener('mouseenter', () => {
        this._index = idx
        this._renderList()
      })
      this._list.appendChild(li)
    })
  }
}
