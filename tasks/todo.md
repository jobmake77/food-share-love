# 食分爱 - 开发任务

## 已完成 ✅
- [x] 1. 初始化项目结构（app.js / app.json / app.wxss / sitemap.json）
- [x] 2. 云函数：login（登录/注册，生成识别码）
- [x] 3. 云函数：bindPartner（双向绑定伙伴）
- [x] 4. 页面：home（首页，情侣展示 + 功能入口）
- [x] 5. 页面：menu（菜单页，分类+菜品+购物车）
- [x] 6. 页面：diary（日记页，周/月历 + 订单回顾）
- [x] 7. 页面：order（订单页，列表+状态管理）
- [x] 8. 页面：profile（个人页，绑定伙伴+设置）
- [x] 9. 子页面：game（洗碗游戏，骰子+剪刀石头布）
- [x] 10. 子页面：edit-dish（编辑/新增菜品，图片上传）
- [x] 11. 子页面：cart（购物车，备注+下单）
- [x] 12. 子页面：order-success（下单成功）
- [x] 13. 组件：avatar-pair（情侣头像展示）
- [x] 14. 组件：dish-card（菜品卡片）
- [x] 15. 组件：order-card（订单卡片，完成+评价按钮）

## 待完成（后续开发）
- [ ] 在微信开发者工具中配置云开发环境 ID（修改 app.js 中的 env）
- [ ] 创建云数据库 collections（users, categories, dishes, orders, reviews）
- [ ] 上传云函数到云开发环境
- [ ] 创建 tabBar 图标资源（assets/icons/*.png）
- [ ] 测试：两账号互相绑定识别码
- [ ] 测试：完整下单流程
- [ ] 测试：日记页日历展示
- [ ] 测试：洗碗游戏两种模式

## 注意事项
- app.js 第6行 `env: 'prod-env-id'` 需替换为实际云开发环境 ID
- tabBar 图标路径 `assets/icons/` 下需要创建对应的 PNG 图标
- 默认头像路径 `assets/default-avatar.png` 需要提供占位图片
