import '@testing-library/jest-dom'

// jsdom lacks ResizeObserver (used by TrendChart)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver ??= ResizeObserverStub

// jsdom implements neither scrollIntoView nor the Pointer Capture API, both of
// which Radix's Select reaches for as soon as it opens. Without these, any test
// that opens a select dies with an unhandled TypeError from inside Radix.
Element.prototype.scrollIntoView ??= () => {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}

// Node 22+'s built-in global `localStorage` blocks jsdom from installing its
// own per-window Storage (window.localStorage ends up undefined), and the
// built-in throws without a --localstorage-file flag. Polyfill a minimal
// in-memory Storage so both `localStorage` and `window.localStorage` work.
class MemoryStorage implements Storage {
  #store = new Map<string, string>()
  get length() { return this.#store.size }
  clear() { this.#store.clear() }
  getItem(key: string) { return this.#store.has(key) ? this.#store.get(key)! : null }
  key(index: number) { return Array.from(this.#store.keys())[index] ?? null }
  removeItem(key: string) { this.#store.delete(key) }
  setItem(key: string, value: string) { this.#store.set(key, String(value)) }
}

const memoryLocalStorage = new MemoryStorage()
const memorySessionStorage = new MemoryStorage()
for (const target of [globalThis, window]) {
  Object.defineProperty(target, 'localStorage', { configurable: true, value: memoryLocalStorage })
  Object.defineProperty(target, 'sessionStorage', { configurable: true, value: memorySessionStorage })
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
