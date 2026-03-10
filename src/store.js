import Symple from './symple.js'

export default class Store {
  constructor (options) {
    this.options = options || {}
    this.key = this.options.key || 'id'
    this.data = []
  }

  add (value) {
    this.data.push(value)
  }

  remove (key) {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i][this.key] === key) {
        const res = this.data[i]
        this.data.splice(i, 1)
        return res
      }
    }
    return null
  }

  get (key) {
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i][this.key] === key) {
        return this.data[i]
      }
    }
    return null
  }

  find (params) {
    const res = []
    for (let i = 0; i < this.data.length; i++) {
      if (Symple.match(params, this.data[i])) {
        res.push(this.data[i])
      }
    }
    return res
  }

  findOne (params) {
    const res = this.find(params)
    return res.length ? res[0] : undefined
  }

  last () {
    return this.data[this.data.length - 1]
  }

  size () {
    return this.data.length
  }
}
