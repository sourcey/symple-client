const Symple = {}

// Parse a Symple address into a peer object.
Symple.parseAddress = function (str) {
  const addr = {}
  const arr = str.split('|')

  if (arr.length > 0) { addr.user = arr[0] }
  if (arr.length > 1) { addr.id = arr[1] }

  return addr
}

// Build a Symple address from the given peer object.
Symple.buildAddress = function (peer) {
  return (peer.user ? (peer.user + '|') : '') + (peer.id ? peer.id : '')
}

// Return an array of nested objects matching the given key/value strings.
Symple.filterObject = function (obj, key, value) {
  const r = []
  for (const k in obj) {
    if (obj.hasOwnProperty(k)) {
      const v = obj[k]
      if ((!key || k === key) && (!value || v === value)) {
        r.push(obj)
      } else if (typeof v === 'object') {
        const a = Symple.filterObject(v, key, value)
        if (a) r.push(...a)
      }
    }
  }
  return r
}

// Delete nested objects with properties that match the given key/value strings.
Symple.deleteNested = function (obj, key, value) {
  for (const k in obj) {
    const v = obj[k]
    if ((!key || k === key) && (!value || v === value)) {
      delete obj[k]
    } else if (typeof v === 'object') {
      Symple.deleteNested(v, key)
    }
  }
}

// Count nested object properties that match the given key/value strings.
Symple.countNested = function (obj, key, value, count) {
  if (count === undefined) count = 0
  for (const k in obj) {
    if (obj.hasOwnProperty(k)) {
      const v = obj[k]
      if ((!key || k === key) && (!value || v === value)) {
        count++
      } else if (typeof v === 'object') {
        count = Symple.countNested(v, key, value, count)
      }
    }
  }
  return count
}

// Traverse an object's nested properties.
Symple.traverse = function (obj, fn) {
  for (const k in obj) {
    if (obj.hasOwnProperty(k)) {
      const v = obj[k]
      fn(k, v)
      if (typeof v === 'object') { Symple.traverse(v, fn) }
    }
  }
}

// Generate a random string.
Symple.randomString = function (n) {
  return Math.random().toString(36).slice(2)
}

// Recursively merge object properties of r into l.
Symple.merge = function (l, r) {
  for (const p in r) {
    try {
      if (r[p].constructor === Object) {
        l[p] = Symple.merge(l[p], r[p])
      } else {
        l[p] = r[p]
      }
    } catch (e) {
      l[p] = r[p]
    }
  }
  return l
}

// Extend an object with one or more source objects.
Symple.extend = function () {
  let result = arguments[0]
  for (let i = 1; i < arguments.length; i++) {
    const source = arguments[i]
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        result[key] = source[key]
      }
    }
  }
  return result
}

// Match the object properties of l with r.
Symple.match = function (l, r) {
  for (const prop in l) {
    if (!l.hasOwnProperty(prop) ||
        !r.hasOwnProperty(prop) ||
        r[prop] !== l[prop]) {
      return false
    }
  }
  return true
}

// Format a date as "HH:MM:SS DD/MM".
Symple.formatTime = function (date) {
  function pad (n) { return n < 10 ? ('0' + n) : n }
  return pad(date.getHours()).toString() + ':' +
    pad(date.getMinutes()).toString() + ':' +
    pad(date.getSeconds()).toString() + ' ' +
    pad(date.getDate()).toString() + '/' +
    pad(date.getMonth()).toString()
}

// Debug logger (enable by setting Symple.debug = true).
Symple.debug = false
Symple.log = function () {
  if (Symple.debug && typeof console !== 'undefined' && typeof console.log !== 'undefined') {
    console.log.apply(console, arguments)
  }
}

export default Symple
