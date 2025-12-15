# UI屏幕适配和Loading优化方案

## 问题解决

### 1. 屏幕适配问题
- **问题**：窗口大小改变时，界面不能自动适配
- **解决方案**：创建了ScreenAdapter屏幕适配管理器，自动监听窗口大小变化并重新计算适配参数

### 2. Loading菊花问题  
- **问题**：UIManager在打开界面时没有转菊花效果
- **解决方案**：改进了LoadingManager，添加了更好的菊花加载效果和半透明背景

## 新增文件

### 1. ScreenAdapter.ts
屏幕适配管理器，负责：
- 监听窗口大小改变事件
- 自动重新计算适配参数
- 支持横屏/竖屏自动适配

### 2. UIInit.ts
UI初始化组件，负责：
- 启动屏幕适配功能
- 挂载到Canvas节点上使用

### 3. UIAdapterExample.ts
UI适配使用示例，展示：
- 如何在具体界面中使用适配功能
- 不同类型节点的适配方法

## 修改文件

### 1. UIView.ts
- 添加了屏幕适配辅助方法
- 自动为根节点设置全屏适配
- 提供居中适配、顶部/底部栏适配方法

### 2. LoadingManager.ts
- 改进了菊花加载效果
- 添加了半透明背景遮罩
- 使用Graphics绘制更美观的加载动画

## 使用方法

### 1. 启用屏幕适配
在Canvas节点上挂载UIInit组件：
```typescript
// 会自动初始化屏幕适配功能
```

### 2. 在UI界面中使用适配
```typescript
export class YourUI extends UIView {
    onLoad() {
        super.onLoad(); // 自动设置全屏适配
        
        // 设置中心面板居中适配
        this.setCenterAdapter(this.centerPanel, 600, 400);
    }
}
```

### 3. 不同适配方式
```typescript
// 全屏适配
this.setFullScreenAdapter(node);

// 居中适配（固定大小）
this.setCenterAdapter(node, width, height);

// 顶部栏适配
const widget = node.addComponent(Widget);
widget.isAlignTop = true;
widget.isAlignLeft = widget.isAlignRight = true;
widget.top = widget.left = widget.right = 0;
widget.alignMode = 2;
widget.enabled = true;
```

## 特性

### 屏幕适配特性
- ✅ 自动监听窗口大小改变
- ✅ 支持横屏/竖屏自动切换
- ✅ 保持原始设计比例
- ✅ 支持全屏、居中、边缘对齐等多种适配方式

### Loading特性
- ✅ 美观的菊花加载动画
- ✅ 半透明背景遮罩
- ✅ 自动显示/隐藏
- ✅ 防止用户操作

## 注意事项

1. **UIInit组件**：必须挂载到Canvas节点上才能正常工作
2. **Widget组件**：所有适配都基于Widget组件，确保节点有UITransform组件
3. **性能考虑**：屏幕适配会在窗口大小改变时触发，频繁改变窗口大小可能影响性能
4. **移动端**：移动端主要响应orientation-change事件

## 兼容性

- ✅ Cocos Creator 3.x
- ✅ Web平台
- ✅ 移动端平台
- ✅ 桌面端平台