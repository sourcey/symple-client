export default class Emitter {
  constructor () {
    this.listeners = {}
  }

  on (event, fn) {
    if (typeof this.listeners[event] === 'undefined') { this.listeners[event] = [] }
    if (typeof fn !== 'undefined' && fn.constructor === Function) { this.listeners[event].push(fn) }
  }

  off (event, fn) {
    if (typeof this.listeners[event] !== 'undefined') {
      for (let i = 0; i < this.listeners[event].length; i++) {
        if (this.listeners[event][i] === fn) {
          this.listeners[event].splice(i, 1)
        }
      }
    }
  }

  emit () {
    const event = arguments[0]
    const args = Array.prototype.slice.call(arguments, 1)
    if (typeof this.listeners[event] !== 'undefined') {
      for (let i = 0; i < this.listeners[event].length; i++) {
        if (this.listeners[event][i].constructor === Function) {
          this.listeners[event][i].apply(this, args)
        }
      }
    }
  }
}
