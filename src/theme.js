const ICONS = { dark: '\u263E', light: '\u2600', auto: '\u25D0' }
const TITLES = { dark: 'Dark mode', light: 'Light mode', auto: 'Auto (system)' }
const CYCLE = { dark: 'light', light: 'auto', auto: 'dark' }

export class ThemeManager {
  constructor(buttonEl) {
    this.btn = buttonEl
    const stored = localStorage.getItem('theme')
    this.mode = stored && stored in ICONS ? stored : 'auto'

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.mode === 'auto') this.apply()
      })

    this.btn.addEventListener('click', () => this.cycle())
    this.apply()
  }

  apply() {
    const dark =
      this.mode === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : this.mode === 'dark'
    document.body.classList.toggle('jse-theme-dark', dark)
    this.btn.textContent = ICONS[this.mode]
    this.btn.title = TITLES[this.mode]
    this.btn.setAttribute('aria-label', TITLES[this.mode])
  }

  cycle() {
    this.mode = CYCLE[this.mode]
    localStorage.setItem('theme', this.mode)
    this.apply()
  }
}
