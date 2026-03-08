// utils/db.js
// 数据库查询工具函数

const PAGE_SIZE = 20

/**
 * 分页查询所有数据
 * @param {Function} queryBuilder - 查询构建函数，接收 (skip, limit) 参数
 * @returns {Promise<Array>} 所有查询结果
 */
async function fetchAll(queryBuilder) {
  const all = []
  let skip = 0
  while (true) {
    const { data } = await queryBuilder(skip, PAGE_SIZE)
    all.push(...data)
    if (data.length < PAGE_SIZE) break
    skip += data.length
  }
  return all
}

module.exports = {
  fetchAll,
  PAGE_SIZE
}
