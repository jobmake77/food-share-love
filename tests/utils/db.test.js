const test = require('node:test')
const assert = require('node:assert/strict')
const { fetchAll } = require('../../utils/db')

test('fetchAll aggregates paginated results', async () => {
  const data = Array.from({ length: 45 }, (_, i) => ({ id: i + 1 }))
  const queryBuilder = async (skip, limit) => {
    return { data: data.slice(skip, skip + limit) }
  }

  const all = await fetchAll(queryBuilder)
  assert.equal(all.length, 45)
  assert.equal(all[0].id, 1)
  assert.equal(all[44].id, 45)
})

test('fetchAll handles empty results', async () => {
  const all = await fetchAll(async () => ({ data: [] }))
  assert.deepEqual(all, [])
})
