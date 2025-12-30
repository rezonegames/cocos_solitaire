# SuperScrollView 使用指南

## 基本设置

### 1. 场景结构
```
ScrollViewNode (SuperScrollView组件)
├── view (Mask组件)
│   └── content (SuperLayout组件)
│       └── (动态创建的item节点)
└── scrollbar (可选)
```

### 2. 组件配置

#### SuperScrollView 配置
- **Vertical**: 垂直滚动
- **Horizontal**: 水平滚动  
- **Pull Refresh**: 下拉刷新功能
- **Is Transmit Event**: 事件穿透

#### SuperLayout 配置
- **Scroll View**: 关联的SuperScrollView
- **View**: 可视区域的UITransform
- **Prefab**: Item预制体
- **Layout Type**: VERTICAL(垂直) / HORIZONTAL(水平)
- **Group Item Total**: 每行/列的item数量
- **Multiple**: 创建item的倍数(性能优化)
- **Padding**: 内边距
- **Spacing**: 间距

## 完整使用示例

### 完整功能示例 (SuperScrollExample)
```typescript
import { _decorator, Component, Node, Label, Sprite, Color, SpriteFrame } from 'cc';
import { SuperLayout } from '../gui/SuperLayout';

const { ccclass, property } = _decorator;

interface ListItemData {
    id: number;
    title: string;
    content: string;
    avatar?: SpriteFrame;
}

@ccclass('SuperScrollExample')
export class SuperScrollExample extends Component {
    @property(SuperLayout) 
    layout!: SuperLayout;
    
    @property(Node)
    loadingNode!: Node;
    
    private listData: ListItemData[] = [];
    private isLoading = false;

    start() {
        this.initScrollView();
        this.loadInitialData();
    }

    private initScrollView() {
        // 配置刷新事件
        this.layout.refreshItemEvents = [{
            target: this.node,
            component: 'SuperScrollExample',
            handler: 'onRefreshItem'
        }];

        // 如果开启了下拉刷新
        if (this.layout.scrollView.pullRefresh) {
            this.layout.scrollView.headerEvents = [{
                target: this.node,
                component: 'SuperScrollExample',
                handler: 'onPullRefresh'
            }];

            this.layout.scrollView.footerEvents = [{
                target: this.node,
                component: 'SuperScrollExample',
                handler: 'onLoadMore'
            }];
        }

        // 如果是翻页模式
        if (this.layout.isPageView) {
            this.layout.pageEvents = [{
                target: this.node,
                component: 'SuperScrollExample',
                handler: 'onPageChanged'
            }];
        }
    }

    private async loadInitialData() {
        this.showLoading(true);
        
        // 模拟异步加载数据
        const data = await this.fetchData(0, 50);
        this.listData = data;
        
        // 设置总数量，这会触发item的创建和刷新
        await this.layout.total(this.listData.length);
        
        this.showLoading(false);
    }

    // 模拟数据获取
    private async fetchData(offset: number, limit: number): Promise<ListItemData[]> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const data: ListItemData[] = [];
                for (let i = offset; i < offset + limit; i++) {
                    data.push({
                        id: i,
                        title: `标题 ${i}`,
                        content: `这是第${i}个item的内容描述，可以是任意长度的文本。`
                    });
                }
                resolve(data);
            }, 500); // 模拟网络延迟
        });
    }

    // Item刷新回调 - 最重要的方法
    onRefreshItem(itemNode: Node, index: number) {
        const data = this.listData[index];
        if (!data) {
            console.warn(`数据索引${index}不存在`);
            return;
        }

        // 更新item显示内容
        this.updateItemDisplay(itemNode, data, index);
    }

    private updateItemDisplay(itemNode: Node, data: ListItemData, index: number) {
        // 查找子节点并更新内容
        const titleLabel = itemNode.getChildByName('Title')?.getComponent(Label);
        const contentLabel = itemNode.getChildByName('Content')?.getComponent(Label);
        const indexLabel = itemNode.getChildByName('Index')?.getComponent(Label);
        const avatar = itemNode.getChildByName('Avatar')?.getComponent(Sprite);

        if (titleLabel) {
            titleLabel.string = data.title;
        }

        if (contentLabel) {
            contentLabel.string = data.content;
        }

        if (indexLabel) {
            indexLabel.string = `#${index}`;
        }

        if (avatar && data.avatar) {
            avatar.spriteFrame = data.avatar;
        }

        // 设置背景颜色（奇偶行不同颜色）
        const bg = itemNode.getChildByName('Background')?.getComponent(Sprite);
        if (bg) {
            bg.color = index % 2 === 0 ? Color.WHITE : new Color(245, 245, 245);
        }

        // 添加点击事件
        itemNode.off(Node.EventType.TOUCH_END);
        itemNode.on(Node.EventType.TOUCH_END, () => {
            this.onItemClick(data, index);
        });
    }

    // 下拉刷新回调
    onPullRefresh(event: any) {
        if (event.action && !this.isLoading) {
            this.isLoading = true;
            console.log('开始下拉刷新...');
            
            // 模拟刷新数据
            this.fetchData(0, 20).then(async (newData) => {
                this.listData = newData.concat(this.listData.slice(20));
                await this.layout.total(this.listData.length);
                this.layout.scrollView.release(); // 释放刷新状态
                this.isLoading = false;
                console.log('刷新完成');
            });
        } else {
            // 显示刷新进度
            console.log(`刷新进度: ${Math.floor(event.progress * 100)}%`);
        }
    }

    // 上拉加载更多回调
    onLoadMore(event: any) {
        if (event.action && !this.isLoading) {
            this.isLoading = true;
            console.log('开始加载更多...');
            
            const currentCount = this.listData.length;
            this.fetchData(currentCount, 20).then(async (moreData) => {
                this.listData = this.listData.concat(moreData);
                await this.layout.total(this.listData.length);
                this.layout.scrollView.release();
                this.isLoading = false;
                console.log('加载更多完成');
            });
        }
    }

    // 翻页回调
    onPageChanged() {
        const currentPage = this.layout.currPageIndex;
        const lastPage = this.layout.lastPageIndex;
        console.log(`页面切换: ${lastPage} -> ${currentPage}`);
    }

    // Item点击回调
    private onItemClick(data: ListItemData, index: number) {
        console.log(`点击了第${index}个item:`, data);
        // 这里可以处理item点击逻辑，比如跳转详情页
    }

    private showLoading(show: boolean) {
        if (this.loadingNode) {
            this.loadingNode.active = show;
        }
    }

    // 公共方法 - 外部调用

    // 滚动到指定item
    public scrollToItem(index: number, animated: boolean = true) {
        if (index >= 0 && index < this.listData.length) {
            this.layout.scrollToIndex(index, animated ? 0.5 : 0);
        }
    }

    // 滚动到顶部
    public scrollToTop(animated: boolean = true) {
        this.layout.scrollToHeader(animated ? 0.5 : 0);
    }

    // 滚动到底部
    public scrollToBottom(animated: boolean = true) {
        this.layout.scrollToFooter(animated ? 0.5 : 0);
    }

    // 添加新数据
    public async addData(newData: ListItemData[]) {
        this.listData = this.listData.concat(newData);
        await this.layout.total(this.listData.length);
    }

    // 插入数据
    public async insertData(index: number, data: ListItemData) {
        this.listData.splice(index, 0, data);
        await this.layout.total(this.listData.length);
    }

    // 删除数据
    public async removeData(index: number) {
        if (index >= 0 && index < this.listData.length) {
            this.listData.splice(index, 1);
            await this.layout.total(this.listData.length);
        }
    }

    // 更新数据
    public updateData(index: number, newData: Partial<ListItemData>) {
        if (index >= 0 && index < this.listData.length) {
            Object.assign(this.listData[index], newData);
            // 如果item当前可见，需要手动刷新
            const itemNode = this.layout.node.children.find((child: any) => child.__index === index);
            if (itemNode) {
                this.updateItemDisplay(itemNode, this.listData[index], index);
            }
        }
    }

    // 清空数据
    public async clearData() {
        this.listData = [];
        await this.layout.total(0);
    }

    // 获取当前数据
    public getData(): ListItemData[] {
        return [...this.listData]; // 返回副本
    }

    // 搜索数据
    public searchData(keyword: string): ListItemData[] {
        return this.listData.filter(item => 
            item.title.includes(keyword) || item.content.includes(keyword)
        );
    }
}
```

### 简化示例

#### 基础垂直列表
```typescript
@ccclass('SimpleList')
export class SimpleList extends Component {
    @property(SuperLayout) layout!: SuperLayout;
    
    private data: any[] = [];
    
    async start() {
        // 先配置事件回调
        this.layout.refreshItemEvents = [{
            target: this.node,
            component: 'SimpleList',
            handler: 'onRefreshItem'
        }];
        
        // 再设置数据
        this.data = this.generateData(100);
        await this.layout.total(this.data.length);
    }
    
    onRefreshItem(item: Node, index: number) {
        const data = this.data[index];
        if (!data) return;
        
        const titleLabel = item.getChildByName('Title')?.getComponent(Label);
        if (titleLabel) titleLabel.string = data.title;
    }
    
    private generateData(count: number): any[] {
        const data = [];
        for (let i = 0; i < count; i++) {
            data.push({ id: i, title: `Item ${i}` });
        }
        return data;
    }
}
```

#### 网格布局
```typescript
@ccclass('GridList')
export class GridList extends Component {
    @property(SuperLayout) layout!: SuperLayout;
    
    async start() {
        // 先配置布局参数
        this.layout.groupItemTotal = 3; // 3列网格
        this.layout.spacingX = 10;
        this.layout.spacingY = 10;
        
        // 配置事件回调
        this.layout.refreshItemEvents = [{
            target: this.node,
            component: 'GridList',
            handler: 'onRefreshItem'
        }];
        
        // 设置数据
        const data = this.generateData(50);
        await this.layout.total(data.length);
    }
}
```

#### 翻页模式
```typescript
@ccclass('PageList')
export class PageList extends Component {
    @property(SuperLayout) layout!: SuperLayout;
    
    async start() {
        // 先配置翻页参数
        this.layout.isPageView = true;
        this.layout.pageTurningSpeed = 0.3;
        this.layout.scrollThreshold = 0.5;
        
        // 配置事件回调
        this.layout.pageEvents = [{
            target: this.node,
            component: 'PageList',
            handler: 'onPageChanged'
        }];
        
        // 设置数据
        await this.layout.total(5);
    }
    
    onPageChanged() {
        console.log('当前页:', this.layout.currPageIndex);
    }
}
```

## 初始化时机

### 1. start()中初始化（最常见）
```typescript
async start() {
    this.initScrollView();
    await this.loadData();
}
```

### 2. onLoad()中初始化
```typescript
async onLoad() {
    // 配置事件
    this.layout.refreshItemEvents = [{
        target: this.node,
        component: 'YourComponent',
        handler: 'onRefreshItem'
    }];
    
    // 设置数据
    const data = this.generateData(100);
    await this.layout.total(data.length);
}
```

### 3. 延迟初始化（按需加载）
```typescript
@ccclass('LazyList')
export class LazyList extends Component {
    @property(SuperLayout) layout!: SuperLayout;
    private isInitialized = false;
    
    // 外部调用初始化
    async initList(data: any[]) {
        if (this.isInitialized) return;
        
        this.layout.refreshItemEvents = [{
            target: this.node,
            component: 'LazyList',
            handler: 'onRefreshItem'
        }];
        
        await this.layout.total(data.length);
        this.isInitialized = true;
    }
    
    // 显示时才初始化
    async onShow() {
        if (!this.isInitialized) {
            await this.initList(this.getData());
        }
    }
}
```

### 4. 网络数据加载后初始化
```typescript
@ccclass('NetworkList')
export class NetworkList extends Component {
    @property(SuperLayout) layout!: SuperLayout;
    
    start() {
        // 先配置事件，不设置数据
        this.layout.refreshItemEvents = [{
            target: this.node,
            component: 'NetworkList',
            handler: 'onRefreshItem'
        }];
        
        // 异步加载数据
        this.loadDataFromServer();
    }
    
    async loadDataFromServer() {
        try {
            const response = await fetch('/api/list');
            const data = await response.json();
            
            // 数据加载完成后初始化
            await this.layout.total(data.length);
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }
}
```

### 5. 条件初始化
```typescript
@ccclass('ConditionalList')
export class ConditionalList extends Component {
    @property(SuperLayout) layout!: SuperLayout;
    
    start() {
        // 根据条件决定是否初始化
        if (this.shouldShowList()) {
            this.initList();
        }
    }
    
    private shouldShowList(): boolean {
        // 根据用户权限、设备性能等条件判断
        return true;
    }
    
    async initList() {
        this.layout.refreshItemEvents = [{
            target: this.node,
            component: 'ConditionalList',
            handler: 'onRefreshItem'
        }];
        
        const data = this.generateData(50);
        await this.layout.total(data.length);
    }
}
```

### 6. 重新初始化
```typescript
@ccclass('ReusableList')
export class ReusableList extends Component {
    @property(SuperLayout) layout!: SuperLayout;
    private currentData: any[] = [];
    
    onLoad() {
        // 只配置一次事件
        this.layout.refreshItemEvents = [{
            target: this.node,
            component: 'ReusableList',
            handler: 'onRefreshItem'
        }];
    }
    
    // 可以多次调用，重新设置数据
    async setData(newData: any[]) {
        this.currentData = newData;
        await this.layout.total(newData.length);
    }
    
    // 切换不同类型的数据
    async switchToUserList() {
        const userData = await this.fetchUserData();
        await this.setData(userData);
    }
    
    async switchToProductList() {
        const productData = await this.fetchProductData();
        await this.setData(productData);
    }
}
```

## 快速开始步骤

1. **创建场景**：按照上面的场景结构创建节点
2. **添加组件**：给对应节点添加SuperScrollView和SuperLayout组件
3. **创建Item预制体**：包含Title、Content等子节点
4. **编写脚本**：参考SuperScrollExample.ts
5. **配置属性**：在编辑器中配置各项参数
6. **运行测试**：检查滚动、刷新等功能

## 常用API

### SuperLayout 方法
```typescript
// 设置数据总数
await layout.total(count: number)

// 滚动到指定索引
layout.scrollToIndex(index: number, timeInSecond?: number)

// 滚动到顶部/底部
layout.scrollToHeader(timeInSecond?: number)
layout.scrollToFooter(timeInSecond?: number)

// 自动居中到最近item
layout.scrollToCenter()
```

### SuperScrollView 方法
```typescript
// 自定义滚动
scrollView.scrollToAny(moveDelta: Vec3, timeInSecond?: number)

// 释放刷新状态
scrollView.release()

// 停止自动滚动
scrollView.stopAutoScroll()
```

## 性能优化建议

1. **合理设置Multiple**: 根据设备性能调整item创建倍数
2. **预制体优化**: 保持item预制体结构简单
3. **数据懒加载**: 大数据集分批加载
4. **避免频繁更新**: 批量更新数据而不是逐个更新

## 注意事项

1. **预制体要求**: Item预制体必须有UITransform组件
2. **事件回调**: 必须在调用total()之前配置refreshItemEvents
3. **异步处理**: total()是异步方法，需要使用await
4. **初始化时机**: 可以在onLoad、start、或任意合适的时机初始化
5. **事件配置**: refreshItemEvents只需配置一次，total()可以多次调用
6. **内存管理**: 大列表注意及时清理不需要的数据
7. **布局约束**: Grid模式下所有item尺寸必须一致
8. **重复初始化**: 可以多次调用total()来更新数据