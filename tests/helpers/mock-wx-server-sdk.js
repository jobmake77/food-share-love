// tests/helpers/mock-wx-server-sdk.js
const path = require('node:path')
const Module = require('node:module')

function createCommand() {
  const op = (type, value) => ({ __op: type, value })
  const gte = (value) => ({
    __op: 'gte',
    value,
    and(other) {
      return { __op: 'and', left: op('gte', value), right: other }
    }
  })
  const lt = (value) => op('lt', value)
  const inOp = (value) => op('in', value)
  return { gte, lt, in: inOp }
}

function evaluateOp(op, docValue) {
  if (!op || !op.__op) return docValue === op
  switch (op.__op) {
    case 'in':
      return Array.isArray(op.value) && op.value.includes(docValue)
    case 'gte':
      return docValue >= op.value
    case 'lt':
      return docValue < op.value
    case 'and':
      return evaluateOp(op.left, docValue) && evaluateOp(op.right, docValue)
    default:
      return false
  }
}

function matchWhere(doc, where) {
  if (!where || Object.keys(where).length === 0) return true
  return Object.entries(where).every(([key, value]) => evaluateOp(value, doc[key]))
}

function createMockDb({ openid = 'openid-1' } = {}) {
  const collections = new Map()
  let idCounter = 1
  const state = { openid }

  const command = createCommand()

  function ensureCollection(name) {
    if (!collections.has(name)) collections.set(name, [])
    return collections.get(name)
  }

  function makeQuery(name, initialWhere) {
    let where = initialWhere || {}
    let sort = null
    let limit = null
    let skip = 0

    return {
      where(condition) {
        where = condition || {}
        return this
      },
      orderBy(field, direction = 'asc') {
        sort = { field, direction }
        return this
      },
      skip(count) {
        skip = count || 0
        return this
      },
      limit(count) {
        limit = count
        return this
      },
      async get() {
        let data = ensureCollection(name).filter(doc => matchWhere(doc, where))
        if (sort) {
          const { field, direction } = sort
          data = data.slice().sort((a, b) => {
            const av = a[field]
            const bv = b[field]
            if (av === bv) return 0
            const compare = av > bv ? 1 : -1
            return direction === 'desc' ? -compare : compare
          })
        }
        if (skip) data = data.slice(skip)
        if (typeof limit === 'number') data = data.slice(0, limit)
        return { data }
      },
      async count() {
        const total = ensureCollection(name).filter(doc => matchWhere(doc, where)).length
        return { total }
      }
    }
  }

  const db = {
    command,
    serverDate() {
      return new Date()
    },
    collection(name) {
      return {
        add: async ({ data }) => {
          const doc = { ...data }
          if (!doc._id) doc._id = String(idCounter++)
          if (!doc._openid) doc._openid = state.openid
          ensureCollection(name).push(doc)
          return { _id: doc._id }
        },
        doc(id) {
          return {
            get: async () => {
              const data = ensureCollection(name).find(item => item._id === id) || null
              return { data }
            },
            update: async ({ data }) => {
              const target = ensureCollection(name).find(item => item._id === id)
              if (!target) throw new Error('Document not found')
              Object.assign(target, data)
              return { stats: { updated: 1 } }
            },
            remove: async () => {
              const collection = ensureCollection(name)
              const index = collection.findIndex(item => item._id === id)
              if (index >= 0) {
                collection.splice(index, 1)
                return { stats: { removed: 1 } }
              }
              return { stats: { removed: 0 } }
            }
          }
        },
        where(condition) {
          return makeQuery(name, condition)
        },
        orderBy(field, direction) {
          return makeQuery(name, {}).orderBy(field, direction)
        }
      }
    },
    _setOpenid(newOpenid) {
      state.openid = newOpenid
    },
    _getCollection(name) {
      return ensureCollection(name)
    }
  }

  return db
}

function createMockCloud(options = {}) {
  const {
    openid = 'openid-1',
    phoneNumber = '13800000000',
    subscribeShouldFail = false
  } = options

  const db = createMockDb({ openid })
  let contextOpenid = openid

  return {
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    database() {
      return db
    },
    getWXContext() {
      return { OPENID: contextOpenid }
    },
    _setOpenid(nextOpenid) {
      contextOpenid = nextOpenid
      db._setOpenid(nextOpenid)
    },
    openapi: {
      phonenumber: {
        async getPhoneNumber({ code }) {
          if (!code) throw new Error('invalid code')
          return { phone_info: { phoneNumber } }
        }
      },
      subscribeMessage: {
        async send() {
          if (subscribeShouldFail) {
            throw new Error('subscribe failed')
          }
          return { success: true }
        }
      }
    }
  }
}

function loadFunction(modulePath, mockCloud) {
  const resolved = path.resolve(__dirname, '..', '..', modulePath)
  delete require.cache[resolved]
  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === 'wx-server-sdk') return mockCloud
    return originalLoad(request, parent, isMain)
  }
  try {
    return require(resolved)
  } finally {
    Module._load = originalLoad
  }
}

module.exports = {
  createMockCloud,
  createMockDb,
  loadFunction
}
