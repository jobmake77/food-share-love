# 食物分享爱 - 数据模型文档

## 数据库集合

### 1. users（用户集合）

用户基本信息和伴侣关系。

```javascript
{
  _id: String,              // 用户ID（自动生成）
  _openid: String,          // 微信 openid（自动添加）
  nickname: String,         // 昵称
  avatar: String,           // 头像（emoji 或图片URL）
  partnerId: String,        // 伴侣的用户ID
  partnerCode: String,      // 用户识别码（6位大写字母+数字）
  createdAt: Date,          // 创建时间
  updatedAt: Date           // 更新时间
}
```

---

### 2. categories（分类集合）

菜品分类信息。

```javascript
{
  _id: String,              // 分类ID（自动生成）
  _openid: String,          // 创建者 openid（自动添加）
  name: String,             // 分类名称，如"主食"、"荤菜"、"素菜"
  icon: String,             // 分类图标（emoji），如"🍚"、"🍖"
  sort: Number,             // 排序号，越小越靠前
  createdAt: Date           // 创建时间
}
```

**索引建议**：
- `sort` 升序索引（用于排序查询）

---

### 3. dishes（菜品集合）

菜品详细信息。

```javascript
{
  _id: String,              // 菜品ID（自动生成）
  _openid: String,          // 创建者 openid（自动添加）
  name: String,             // 菜品名称，如"番茄炒蛋"
  desc: String,             // 菜品描述（可选）
  image: String,            // 菜品图片（云存储 fileID，可选）
  emoji: String,            // 菜品 emoji，如"🍳"
  categoryId: String,       // 所属分类ID（关联 categories._id）
  sort: Number,             // 排序号（默认使用时间戳）
  createdAt: Date,          // 创建时间
  updatedAt: Date           // 更新时间
}
```

**索引建议**：
- `categoryId` 索引（用于按分类查询）

---

### 4. orders（订单集合）

点餐订单信息。

```javascript
{
  _id: String,              // 订单ID（自动生成）
  _openid: String,          // 创建者 openid（自动添加）
  orderedBy: String,        // 点单人的用户ID（users._id）
  dishes: [{                // 订单菜品列表
    dishId: String,         // 菜品ID（关联 dishes._id）
    name: String,           // 菜品名称（冗余存储，防止菜品被删除）
    count: Number,          // 数量
    image: String,          // 菜品图片（可选）
    emoji: String           // 菜品 emoji
  }],
  note: String,             // 订单备注（可选）
  status: String,           // 订单状态：'cooking'（烹饪中）、'done'（已完成）
  creatorName: String,      // 创建者昵称
  creatorAvatar: String,    // 创建者头像
  partnerId: String,        // 伴侣ID（可选）
  rating: Number,           // 评分（1-5星，完成后添加）
  review: String,           // 评价内容（完成后添加，可选）
  createdAt: Date           // 创建时间（下单时间）
}
```

**状态说明**：
- `cooking`：订单已创建，正在烹饪中（默认状态）
- `done`：订单已完成

**索引建议**：
- `createdAt` 降序索引（用于按时间查询）
- `status` 索引（用于按状态筛选）

---

### 5. reviews（评价集合）

**注意**：当前版本中，评价数据直接存储在 orders 集合的 `rating` 和 `review` 字段中，暂未使用独立的 reviews 集合。

如果未来需要独立的评价集合，建议结构如下：

```javascript
{
  _id: String,              // 评价ID（自动生成）
  _openid: String,          // 评价者 openid（自动添加）
  orderId: String,          // 关联的订单ID（orders._id）
  rating: Number,           // 评分（1-5星）
  review: String,           // 评价内容（可选）
  images: [String],         // 评价图片（可选）
  createdAt: Date           // 评价时间
}
```

---

## 数据关系图

```
users (用户)
  ├─ partnerId → users._id (伴侣关系)
  └─ _id → orders.orderedBy (点单关系)

categories (分类)
  └─ _id → dishes.categoryId (分类关系)

dishes (菜品)
  ├─ categoryId → categories._id
  └─ _id → orders.dishes[].dishId

orders (订单)
  ├─ orderedBy → users._id
  └─ dishes[].dishId → dishes._id
```

---

## 数据流程

### 1. 用户注册和绑定流程
```
1. 用户登录 → 创建 users 记录
2. 生成 partnerCode（6位识别码）
3. 输入伴侣识别码 → 更新 partnerId 字段
```

### 2. 菜品管理流程
```
1. 创建分类 → categories 集合
2. 添加菜品 → dishes 集合（关联 categoryId）
3. 编辑/删除菜品 → 更新/删除 dishes 记录
4. 删除分类 → 检查是否有关联菜品，有则禁止删除
```

### 3. 点餐流程
```
1. 浏览菜单 → 从 dishes 和 categories 加载数据
2. 添加到购物车 → 存储在 globalData.cart 和本地存储
3. 提交订单 → 创建 orders 记录（status: 'cooking'）
4. 清空购物车 → 清除 globalData.cart 和本地存储
```

### 4. 订单处理流程
```
1. 查看订单 → 从 orders 加载数据（筛选 status）
2. 确认完成 → 更新 orders.status = 'done'
3. 评价订单 → 更新 orders.rating 和 orders.review
```

### 5. 日记查看流程
```
1. 加载日记 → 从 orders 查询 status = 'done' 的订单
2. 按日期分组 → 转换为日历格式
3. 查看详情 → 显示订单的菜品、评分、评价
```

---

## 数据权限建议

### 数据库权限规则（database-permissions.json）

```json
{
  "users": {
    "read": "doc._openid == auth.openid || doc._id == auth.uid",
    "write": "doc._openid == auth.openid"
  },
  "categories": {
    "read": true,
    "write": "auth.openid != null"
  },
  "dishes": {
    "read": true,
    "write": "auth.openid != null"
  },
  "orders": {
    "read": "doc._openid == auth.openid || doc.partnerId == auth.uid",
    "write": "doc._openid == auth.openid"
  }
}
```

---

## 数据迁移和初始化

### 初始化分类数据

```javascript
// 在 import-sample 页面或云函数中执行
const categories = [
  { name: '主食', icon: '🍚', sort: 1 },
  { name: '荤菜', icon: '🍖', sort: 2 },
  { name: '素菜', icon: '🥬', sort: 3 },
  { name: '汤品', icon: '🍲', sort: 4 },
  { name: '甜品', icon: '🍰', sort: 5 }
]

const db = wx.cloud.database()
for (const cat of categories) {
  await db.collection('categories').add({ data: cat })
}
```

---

## 注意事项

1. **字段命名规范**：统一使用驼峰命名（camelCase），如 `categoryId`、`orderedBy`
2. **冗余存储**：订单中存储菜品名称、创建者昵称等，防止关联数据被删除后无法显示
3. **时间字段**：使用 `db.serverDate()` 确保时间准确性
4. **图片存储**：使用云存储，存储 fileID 而不是本地路径
5. **购物车持久化**：使用 `wx.setStorageSync('cart', data)` 持久化到本地
6. **权限控制**：确保用户只能访问自己和伴侣的数据

---

## 版本历史

- **v2.0.0** (2026-03-07)
  - 修复订单状态不一致问题（pending → cooking）
  - 添加 orderedBy 字段到订单
  - 修复购物车数据结构（添加 image 和 emoji 字段）
  - 日记页面连接真实数据库
  - 添加购物车本地持久化
  - 完善数据模型文档

- **v1.0.0** (2026-03-04)
  - 初始版本
