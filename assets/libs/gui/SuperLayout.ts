import { _decorator, Component, Node, ccenum, UITransform, SystemEventType, director, Vec3, EventHandler, instantiate, Prefab, Size, Vec2, PageViewIndicator } from 'cc';
import { SuperScrollView } from './SuperScrollView';

const { ccclass, property, requireComponent } = _decorator;
const EPSILON = 1e-4;

enum Type {
    HORIZONTAL = 0,
    VERTICAL = 1,
}
ccenum(Type);

enum VerticalAxisDirection {
    TOP_TO_BOTTOM = 0,
    BOTTOM_TO_TOP = 1
}
ccenum(VerticalAxisDirection);

enum HorizontalAxisDirection {
    LEFT_TO_RIGHT = 0,
    RIGHT_TO_LEFT = 1
}
ccenum(HorizontalAxisDirection);

enum ScrollDirection {
    NONE = 0,
    HEADER = 1,
    FOOTER = 2,
}

enum IndexVerticalAxisDirection {
    TOP = 0,
    BOTTOM = 1,
}
ccenum(IndexVerticalAxisDirection);

enum IndexHorizontalAxisDirection {
    LEFT = 0,
    RIGHT = 1
}
ccenum(IndexHorizontalAxisDirection);

// 性能优化：类型定义
interface ItemNode extends Node {
    __index: number;
    __size: Size;
    __scale: Vec3;
}

interface BoundaryCache {
    header: number;
    footer: number;
    viewHeader: number;
    viewFooter: number;
    isDirty: boolean;
}

interface LayoutCache {
    contentSize: Size;
    itemSize: Size;
    startPoint: Vec3;
    centerPosition: Vec3;
    isDirty: boolean;
}

@ccclass('SuperLayout')
@requireComponent(UITransform)
export class SuperLayout extends Component {
    static VerticalAxisDirection = VerticalAxisDirection;
    static HorizontalAxisDirection = HorizontalAxisDirection;

    @property(SuperScrollView) scrollView!: SuperScrollView;
    @property(UITransform) view!: UITransform;
    @property(Prefab) prefab!: Prefab;
    @property({ type: Type }) layoutType: Type = Type.VERTICAL;
    @property({ type: VerticalAxisDirection }) verticalAxisDirection = VerticalAxisDirection.TOP_TO_BOTTOM;
    @property({ type: HorizontalAxisDirection }) horizontalAxisDirection = HorizontalAxisDirection.LEFT_TO_RIGHT;

    @property({ tooltip: "最小值=1，大于1就是Grid模式" }) groupItemTotal: number = 1;
    @property({ tooltip: "决定最多创建Prefab的数量" }) multiple: number = 2;
    @property({ tooltip: "顶部填充" }) paddingTop: number = 0;
    @property({ tooltip: "底部填充" }) paddingBottom: number = 0;
    @property({ tooltip: "左侧填充" }) paddingLeft: number = 0;
    @property({ tooltip: "右侧填充" }) paddingRight: number = 0;
    @property({ tooltip: "横轴间距" }) spacingX: number = 0;
    @property({ tooltip: "纵轴间距" }) spacingY: number = 0;
    @property({ tooltip: "计算缩放后的尺寸" }) affectedByScale: boolean = false;

    // 翻页相关
    @property({ tooltip: "开启翻页模式" }) isPageView: boolean = false;
    @property({ visible: function() { return (this as any).isPageView } }) pageTurningSpeed = 0.3;
    @property({ type: PageViewIndicator, visible: function() { return (this as any).isPageView } }) indicator!: PageViewIndicator;
    @property({ visible: function() { return (this as any).isPageView } }) scrollThreshold = 0.5;
    @property({ visible: function() { return (this as any).isPageView } }) autoPageTurningThreshold = 100;
    @property({ type: EventHandler, visible: function() { return (this as any).isPageView } }) pageEvents: EventHandler[] = [];

    // 自动居中相关
    @property({ visible: function() { return !(this as any).isPageView } }) autoCenter: boolean = false;
    @property({ visible: function() { return (this as any).autoCenter } }) centerTime: number = 1;
    @property({ type: Node, visible: function() { return (this as any).autoCenter } }) centerNode!: Node;
    @property({ type: Vec2, visible: function() { return (this as any).autoCenter } }) centerAnchor: Vec2 = new Vec2(.5, .5);

    @property({ tooltip: "上/左 无限循环" }) headerLoop: boolean = false;
    @property({ tooltip: "下/右 无限循环" }) footerLoop: boolean = false;
    @property(EventHandler) refreshItemEvents: EventHandler[] = [];

    // 私有属性
    private _currPageIndex: number = 0;
    private _lastPageIndex: number = 0;
    private _itemTotal: number = 0;
    private _maxPrefabTotal: number = 0;
    private currentCreateItemTotal: number = 0;
    private isRestart: boolean = false;
    private scrollDirection: ScrollDirection = ScrollDirection.NONE;
    private prevPos: Vec3 = new Vec3();
    private selfHorW: number = 0;

    // 性能优化：缓存系统
    private boundaryCache: BoundaryCache = {
        header: 0,
        footer: 0,
        viewHeader: 0,
        viewFooter: 0,
        isDirty: true
    };

    private layoutCache: LayoutCache = {
        contentSize: new Size(),
        itemSize: new Size(),
        startPoint: new Vec3(),
        centerPosition: new Vec3(),
        isDirty: true
    };

    // 性能优化：对象池
    private nodePool: ItemNode[] = [];
    private generator?: Generator;

    // Getters
    get currPageIndex(): number { return this._currPageIndex; }
    get lastPageIndex(): number { return this._lastPageIndex; }
    get itemTotal(): number { return this._itemTotal; }
    get maxPrefabTotal(): number { return this._maxPrefabTotal; }
    get vertical(): boolean { return this.layoutType === Type.VERTICAL; }
    get horizontal(): boolean { return this.layoutType === Type.HORIZONTAL; }
    get transform(): UITransform | null { return this.node._uiProps.uiTransformComp; }

    get accommodWidth(): number {
        return this.view.width - this.paddingLeft - this.paddingRight;
    }

    get accommodHeight(): number {
        return this.view.height - this.paddingTop - this.paddingBottom;
    }

    get header(): UITransform | null {
        return this.node.children.length > 0 ? this.node.children[0]._uiProps.uiTransformComp : null;
    }

    get footer(): UITransform | null {
        const children = this.node.children;
        return children.length > 0 ? children[children.length - 1]._uiProps.uiTransformComp : null;
    }

    get headerIndex(): number {
        return this.header ? (this.header.node as ItemNode).__index : -1;
    }

    get footerIndex(): number {
        return this.footer ? (this.footer.node as ItemNode).__index : -1;
    }

    // 性能优化：缓存边界计算
    get headerBoundary(): number {
        if (this.boundaryCache.isDirty) {
            this.updateBoundaryCache();
        }
        return this.boundaryCache.header;
    }

    get footerBoundary(): number {
        if (this.boundaryCache.isDirty) {
            this.updateBoundaryCache();
        }
        return this.boundaryCache.footer;
    }

    get viewHeaderBoundary(): number {
        if (this.boundaryCache.isDirty) {
            this.updateBoundaryCache();
        }
        return this.boundaryCache.viewHeader;
    }

    get viewFooterBoundary(): number {
        if (this.boundaryCache.isDirty) {
            this.updateBoundaryCache();
        }
        return this.boundaryCache.viewFooter;
    }

    // 性能优化：缓存内容尺寸计算
    get contentSize(): Size {
        if (this.layoutCache.isDirty) {
            this.updateLayoutCache();
        }
        return this.layoutCache.contentSize;
    }

    get viewStartPoint(): Vec3 {
        if (this.layoutCache.isDirty) {
            this.updateLayoutCache();
        }
        return this.layoutCache.startPoint;
    }

    get centerPosition(): Vec3 {
        if (this.layoutCache.isDirty) {
            this.updateLayoutCache();
        }
        return this.layoutCache.centerPosition;
    }

    // 边界检查属性
    get isOfLeftBoundary(): number {
        return this.calculateLeftBoundary();
    }

    get isOfTopBoundary(): number {
        return this.calculateTopBoundary();
    }

    get isOfRightBoundary(): number {
        return this.calculateRightBoundary();
    }

    get isOfBottomBoundary(): number {
        return this.calculateBottomBoundary();
    }

    onLoad() {
        this.initializeLayout();
        this.setupEventListeners();
    }

    onEnable() {
        this.addEventListener();
    }

    onDisable() {
        this.removeEventListener();
    }

    onDestroy() {
        this.cleanup();
    }

    // 性能优化：初始化方法
    private initializeLayout() {
        this.transform?.setAnchorPoint(new Vec2(.5, .5));
        this.transform?.setContentSize(this.view.contentSize);
        this.node.setPosition(Vec3.ZERO);
        
        if (this.isPageView) this.autoCenter = false;
        
        // 设置ScrollView的滚动方向
        if (this.scrollView) {
            this.scrollView.horizontal = this.horizontal;
            this.scrollView.vertical = this.vertical;
        }
        
        // 重写contentSize属性
        Object.defineProperty(this.transform, "contentSize", { get: () => this.contentSize });
        Object.defineProperty(this.transform, "width", { get: () => this.contentSize.width });
        Object.defineProperty(this.transform, "height", { get: () => this.contentSize.height });
    }

    private setupEventListeners() {
        this.scrollView.view?.node.on(Node.EventType.SIZE_CHANGED, this.onViewSizeChange, this);
    }

    // 性能优化：缓存更新方法
    private updateBoundaryCache() {
        if (!this.header || !this.footer) {
            this.boundaryCache.isDirty = false;
            return;
        }

        if (this.vertical) {
            this.boundaryCache.viewHeader = this.view.height * 0.5;
            this.boundaryCache.viewFooter = this.view.height * -0.5;
            
            if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
                this.boundaryCache.header = this.node.position.y + this.getItemYMax(this.header) + this.paddingTop;
                this.boundaryCache.footer = this.node.position.y + this.getItemYMin(this.footer) - this.paddingBottom;
            } else {
                this.boundaryCache.header = this.node.position.y + this.getItemYMin(this.header) - this.paddingBottom;
                this.boundaryCache.footer = this.node.position.y + this.getItemYMax(this.footer) + this.paddingTop;
            }
        } else {
            this.boundaryCache.viewHeader = this.view.width * -0.5;
            this.boundaryCache.viewFooter = this.view.width * 0.5;
            
            if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
                this.boundaryCache.header = this.node.position.x + this.getItemXMin(this.header) - this.paddingLeft;
                this.boundaryCache.footer = this.node.position.x + this.getItemXMax(this.footer) + this.paddingRight;
            } else {
                this.boundaryCache.header = this.node.position.x + this.getItemXMax(this.header) + this.paddingRight;
                this.boundaryCache.footer = this.node.position.x + this.getItemXMin(this.footer) - this.paddingLeft;
            }
        }
        
        this.boundaryCache.isDirty = false;
    }

    private updateLayoutCache() {
        // 更新起始点 - 修正为相对于view的位置
        if (this.vertical) {
            // 垂直布局：水平居中，垂直从顶部开始（考虑padding）
            this.layoutCache.startPoint.set(
                0, // 水平居中
                this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM 
                    ? (this.view.height / 2 - this.paddingTop - 50) // 向下偏移50像素避免上移
                    : (-this.view.height / 2 + this.paddingBottom + 50),
                0
            );
        } else {
            // 水平布局：垂直居中，水平从左侧开始
            this.layoutCache.startPoint.set(
                this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT 
                    ? (-this.view.width / 2 + this.paddingLeft) 
                    : (this.view.width / 2 - this.paddingRight),
                0, // 垂直居中
                0
            );
        }

        // 更新内容尺寸
        if (this.node.children.length > 0) {
            const size = this.layoutCache.contentSize;
            if (this.vertical) {
                size.height = Math.max(this.view.contentSize.height, 
                    Math.abs(this.headerBoundary - this.footerBoundary));
                size.width = this.view.contentSize.width;
            } else {
                size.width = Math.max(this.view.contentSize.width, 
                    Math.abs(this.footerBoundary - this.headerBoundary));
                size.height = this.view.contentSize.height;
            }
        } else {
            this.layoutCache.contentSize = this.view.contentSize.clone();
        }

        // 更新居中位置
        if (this.autoCenter && this.centerNode) {
            const worldPos = this.centerNode.parent?._uiProps.uiTransformComp?.convertToWorldSpaceAR(this.centerNode.position);
            if (worldPos) {
                this.layoutCache.centerPosition = this.view.convertToNodeSpaceAR(worldPos);
            }
        }

        this.layoutCache.isDirty = false;
    }

    // 性能优化：边界计算方法
    private calculateLeftBoundary(): number {
        if (this.vertical) return 0;
        
        if (this.autoCenter && this.scrollDirection === ScrollDirection.HEADER) {
            return this.headerBoundary + (this.viewHeaderBoundary - this.centerPosition.x);
        }
        
        if (this.headerLoop) {
            return this.header ? 0 : this.viewHeaderBoundary + this.node.position.x;
        }
        
        if (!this.header || this.getFixedItemWidth() <= this.view.width) {
            return this.viewHeaderBoundary + this.node.position.x;
        }
        
        const isAtStart = this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT 
            ? this.headerIndex === 0 
            : this.footerIndex === this.itemTotal - 1;
            
        return isAtStart ? this.headerBoundary : 0;
    }

    private calculateTopBoundary(): number {
        if (!this.vertical) return 0;
        
        if (this.autoCenter && this.scrollDirection === ScrollDirection.HEADER) {
            return this.headerBoundary + (this.viewHeaderBoundary - this.centerPosition.y);
        }
        
        if (this.headerLoop) {
            return this.header ? 0 : this.viewHeaderBoundary + this.node.position.y;
        }
        
        if (!this.header || this.getFixedItemHeight() <= this.view.height) {
            return this.viewHeaderBoundary + this.node.position.y;
        }
        
        const isAtStart = this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM 
            ? this.headerIndex === 0 
            : this.footerIndex === this.itemTotal - 1;
            
        return isAtStart ? this.headerBoundary : 0;
    }

    private calculateRightBoundary(): number {
        if (this.vertical) return 0;
        
        if (this.autoCenter && this.scrollDirection === ScrollDirection.FOOTER) {
            return this.footerBoundary + (this.viewFooterBoundary - this.centerPosition.x);
        }
        
        if (this.footerLoop) {
            return this.footer ? 0 : this.viewFooterBoundary + this.node.position.x;
        }
        
        if (!this.footer || this.getFixedItemWidth() <= this.view.width) {
            return this.viewFooterBoundary + this.node.position.x;
        }
        
        const isAtEnd = this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT 
            ? this.footerIndex === this.itemTotal - 1 
            : this.headerIndex === 0;
            
        return isAtEnd ? this.footerBoundary : 0;
    }

    private calculateBottomBoundary(): number {
        if (!this.vertical) return 0;
        
        if (this.autoCenter && this.scrollDirection === ScrollDirection.FOOTER) {
            return this.footerBoundary + (this.viewFooterBoundary - this.centerPosition.y);
        }
        
        if (this.footerLoop) {
            return this.footer ? 0 : this.viewFooterBoundary + this.node.position.y;
        }
        
        if (!this.footer || this.getFixedItemHeight() <= this.view.height) {
            return this.viewFooterBoundary + this.node.position.y;
        }
        
        const isAtEnd = this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM 
            ? this.footerIndex === this.itemTotal - 1 
            : this.headerIndex === 0;
            
        return isAtEnd ? this.footerBoundary : 0;
    }

    // 公共API方法
    async total(count: number) {
        this.currentCreateItemTotal = count;
        await this.createItems(count);
        const offset = count - this.itemTotal;
        this._itemTotal = count;
        this.refreshItems(offset);
        
        // 更新内容尺寸
        this.updateContentSize();
        
        this.scrollView.release();
        
        if (this.indicator) {
            this.indicator.setPageView(this.scrollView as any);
        }
    }

    scrollToIndex(index: number, timeInSecond?: number) {
        if (index < 0 || index >= this.itemTotal) return;
        
        this.scrollView.stopAutoScroll();
        
        if (this.isPageView) {
            this.scrollView.savePageIndex(index);
        }
        
        const child = this.findChildByIndex(index);
        if (!child) return;
        
        const itemPos = this.calculateScrollPosition(child, timeInSecond);
        this.scrollView.scrollToAny(itemPos, timeInSecond, true);
    }

    scrollToHeader(timeInSecond?: number) {
        this.scrollToIndex(0, timeInSecond);
    }

    scrollToFooter(timeInSecond?: number) {
        this.scrollToIndex(this.itemTotal - 1, timeInSecond);
    }

    soonFinish() {
        if (!this.autoCenter) return;
        
        this.scrollView.stopAutoScroll();
        const targetPos = this.findNearestCenterPosition();
        if (targetPos) {
            this.scrollView.scrollToAny(targetPos, this.centerTime);
        }
    }

    // 性能优化：辅助方法
    private findChildByIndex(index: number): Node | null {
        return this.node.children.find((item: any) => item.__index === index) || null;
    }

    private calculateScrollPosition(child: Node, timeInSecond?: number): Vec3 {
        const itemPos = child.getPosition().clone();
        const worldPos = this.transform?.convertToWorldSpaceAR(itemPos)!;
        const localPos = this.view.convertToNodeSpaceAR(worldPos);
        const multiple = this.getCenterAnchor(child._uiProps.uiTransformComp!, this.centerPosition);
        
        return localPos.multiply(new Vec3(-1, -1, 1)).add(multiple);
    }

    private findNearestCenterPosition(): Vec3 | null {
        let nearestPos: Vec3 | null = null;
        let minDistance = Infinity;
        
        for (const child of this.node.children) {
            const worldPos = this.transform?.convertToWorldSpaceAR(child.position)!;
            const localPos = this.view.convertToNodeSpaceAR(worldPos);
            const multiple = this.getCenterAnchor(child._uiProps.uiTransformComp!, this.centerPosition);
            const newLocalPos = localPos.subtract(multiple);
            
            const distance = this.vertical ? Math.abs(newLocalPos.y) : Math.abs(newLocalPos.x);
            if (distance < minDistance) {
                minDistance = distance;
                nearestPos = newLocalPos.multiply(new Vec3(-1, -1, 1));
            }
        }
        
        return nearestPos;
    }

    private getCenterAnchor(item: UITransform, center: Vec3): Vec3 {
        const pos = center.clone();
        if (this.vertical) {
            const anchor = item.height * this.centerAnchor.y;
            const origin = item.height * item.anchorY;
            pos.y -= anchor - origin;
        } else {
            const anchor = item.width * this.centerAnchor.x;
            const origin = item.width * item.anchorX;
            pos.x += anchor - origin;
        }
        return pos;
    }

    private getFixedItemHeight(): number {
        if (!this.header || !this.footer) return 0;
        return this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM
            ? Math.abs(this.getItemYMax(this.header)) + Math.abs(this.getItemYMin(this.footer))
            : Math.abs(this.getItemYMin(this.header)) + Math.abs(this.getItemYMax(this.footer));
    }

    private getFixedItemWidth(): number {
        if (!this.header || !this.footer) return 0;
        return this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT
            ? Math.abs(this.getItemXMin(this.header)) + Math.abs(this.getItemXMax(this.footer))
            : Math.abs(this.getItemXMax(this.header)) + Math.abs(this.getItemXMin(this.footer));
    }

    // Item位置计算方法
    private getItemYMax(item: UITransform): number {
        const height = this.getScaleHeight(item) * (1 - item.anchorY);
        return item.node.position.y + height;
    }

    private getItemYMin(item: UITransform): number {
        const height = this.getScaleHeight(item) * item.anchorY;
        return item.node.position.y - height;
    }

    private getItemXMax(item: UITransform): number {
        const width = this.getScaleWidth(item) * (1 - item.anchorX);
        return item.node.position.x + width;
    }

    private getItemXMin(item: UITransform): number {
        const width = this.getScaleWidth(item) * item.anchorX;
        return item.node.position.x - width;
    }

    private getScaleWidth(trans: UITransform): number {
        return trans.width * (this.affectedByScale ? Math.abs(trans.node.scale.x) : 1);
    }

    private getScaleHeight(trans: UITransform): number {
        return trans.height * (this.affectedByScale ? Math.abs(trans.node.scale.y) : 1);
    }

    // 性能优化：异步创建Items
    private async createItems(count: number, force: boolean = false): Promise<boolean> {
        this.generator?.return("");
        
        if (force) {
            this._maxPrefabTotal = 0;
            this.selfHorW = 0;
        }
        
        if (!force && this.node.children.length > count) {
            this.removeItems(count);
            return false;
        }
        
        if (this._maxPrefabTotal > 0 && this._maxPrefabTotal === this.node.children.length) {
            return false;
        }
        
        const total = count - this.node.children.length;
        this.generator = this.createItemGenerator(total);
        await this.executeGenerator(this.generator, 20);
        return true;
    }

    private * createItemGenerator(total: number): Generator {
        for (let i = 0; i < total; i++) {
            const child = this.createSingleItem();
            if (!this.shouldContinueCreating()) {
                this._maxPrefabTotal = this.node.children.length;
                console.log("已固定item数量", this._maxPrefabTotal);
                return false;
            }
            yield true;
        }
    }

    private createSingleItem(): ItemNode {
        const child = instantiate(this.prefab) as ItemNode;
        child.__index = this.node.children.length;
        
        const transform = child._uiProps.uiTransformComp!;
        this.setAndSaveSizeAndScale(transform);
        
        this.node.addChild(child);
        
        // 使用正确的布局方法计算位置
        const prevChild = this.node.children.length > 1 ? this.node.children[this.node.children.length - 2] : null;
        const prevTransform = prevChild ? prevChild.getComponent(UITransform) : null;
        this.setItemPosition(transform, prevTransform);
        
        this.notifyRefreshItem(child);
        
        child.on(Node.EventType.SIZE_CHANGED, this.onChildSize, this);
        child.on(Node.EventType.TRANSFORM_CHANGED, this.onChildScale, this);
        
        return child;
    }

    private shouldContinueCreating(): boolean {
        const selfHorW = this.vertical ? this.contentSize.height : this.contentSize.width;
        const viewHorW = this.vertical ? this.view.height : this.view.width;
        
        if (selfHorW >= viewHorW * this.multiple) {
            this.selfHorW = selfHorW;
            return false;
        }
        return true;
    }

    private setAndSaveSizeAndScale(item: UITransform) {
        item.setContentSize(this.getItemSize(item));
        (item.node as ItemNode).__size = item.contentSize.clone();
        (item.node as ItemNode).__scale = item.node.getScale().clone();
    }

    private getItemSize(item: UITransform): Size {
        const size = new Size();
        if (this.vertical) {
            const spacing = this.spacingX * (this.groupItemTotal - 1);
            size.width = (this.accommodWidth - spacing) / this.groupItemTotal;
            size.height = item.height;
        } else {
            const spacing = this.spacingY * (this.groupItemTotal - 1);
            size.height = (this.accommodHeight - spacing) / this.groupItemTotal;
            size.width = item.width;
        }
        return size;
    }

    private setItemPosition(item: UITransform, relative: UITransform | null, reverse: boolean = false) {
        let pos = new Vec3();
        
        if (!this.header || this.node.children.length === 1) {
            // 第一个item，设置到起始位置
            pos.x = this.viewStartPoint.x;
            pos.y = this.viewStartPoint.y; // 直接使用起始位置，不考虑锁点偏移
        } else {
            // 根据布局方向计算相对位置
            if (this.vertical) {
                pos = this.getVerticalPosition(item, relative!, reverse);
            } else {
                pos = this.getHorizontalPosition(item, relative!, reverse);
            }
        }
        
        item.node.setPosition(pos);
    }

    private getVerticalPosition(item: UITransform, relative: UITransform, reverse: boolean): Vec3 {
        const pos = new Vec3();
        
        pos.x = 0; // 水平居中
        
        // 获取item高度
        const itemHeight = this.getScaleHeight(item);
        const relativeHeight = this.getScaleHeight(relative);
        
        if (this.verticalAxisDirection === VerticalAxisDirection.TOP_TO_BOTTOM) {
            if (!reverse) {
                // 正常顺序：放在relative下方
                pos.y = relative.node.position.y - relativeHeight / 2 - this.spacingY - itemHeight / 2;
            } else {
                // 反向：放在relative上方
                pos.y = relative.node.position.y + relativeHeight / 2 + this.spacingY + itemHeight / 2;
            }
        } else {
            if (!reverse) {
                // 从下到上
                pos.y = relative.node.position.y + relativeHeight / 2 + this.spacingY + itemHeight / 2;
            } else {
                pos.y = relative.node.position.y - relativeHeight / 2 - this.spacingY - itemHeight / 2;
            }
        }
        
        return pos;
    }

    private getHorizontalPosition(item: UITransform, relative: UITransform, reverse: boolean): Vec3 {
        const pos = new Vec3();
        
        // 简化的水平布局：从左到右排列
        if (this.horizontalAxisDirection === HorizontalAxisDirection.LEFT_TO_RIGHT) {
            if (!reverse) {
                // 正常顺序：放在relative右方
                pos.x = relative.node.position.x + this.getScaleWidth(relative) / 2 + this.spacingX + this.getScaleWidth(item) / 2;
                pos.y = relative.node.position.y;
            } else {
                // 反向：放在relative左方
                pos.x = relative.node.position.x - this.getScaleWidth(relative) / 2 - this.spacingX - this.getScaleWidth(item) / 2;
                pos.y = relative.node.position.y;
            }
        } else {
            if (!reverse) {
                // 从右到左
                pos.x = relative.node.position.x - this.getScaleWidth(relative) / 2 - this.spacingX - this.getScaleWidth(item) / 2;
                pos.y = relative.node.position.y;
            } else {
                pos.x = relative.node.position.x + this.getScaleWidth(relative) / 2 + this.spacingX + this.getScaleWidth(item) / 2;
                pos.y = relative.node.position.y;
            }
        }
        
        return pos;
    }

    // 事件处理
    private addEventListener() {
        this.node.on(SystemEventType.TRANSFORM_CHANGED, this.onPositionChanged, this);
    }

    private removeEventListener() {
        this.node.off(SystemEventType.TRANSFORM_CHANGED, this.onPositionChanged, this);
    }

    private updateScrollDirection() {
        const currentPos = this.node.position;
        if (this.vertical) {
            if (this.scrollView.prevLocation.y < this.scrollView.location.y) {
                this.scrollDirection = ScrollDirection.FOOTER;
            } else if (this.scrollView.prevLocation.y > this.scrollView.location.y) {
                this.scrollDirection = ScrollDirection.HEADER;
            } else {
                this.scrollDirection = ScrollDirection.NONE;
            }
        } else {
            if (this.scrollView.prevLocation.x > this.scrollView.location.x) {
                this.scrollDirection = ScrollDirection.FOOTER;
            } else if (this.scrollView.prevLocation.x < this.scrollView.location.x) {
                this.scrollDirection = ScrollDirection.HEADER;
            } else {
                this.scrollDirection = ScrollDirection.NONE;
            }
        }
    }

    private handleItemFilling() {
        const positionChanged = this.vertical 
            ? Math.abs(this.prevPos.y - this.node.position.y) > EPSILON
            : Math.abs(this.prevPos.x - this.node.position.x) > EPSILON;
            
        if (!positionChanged) return;
        
        if (this.vertical) {
            if (this.prevPos.y < this.node.position.y) {
                this.pushToFooter();
            } else if (this.prevPos.y > this.node.position.y) {
                this.pushToHeader();
            }
        } else {
            if (this.prevPos.x > this.node.position.x) {
                this.pushToFooter();
            } else if (this.prevPos.x < this.node.position.x) {
                this.pushToHeader();
            }
        }
    }

    private pushToFooter(force: boolean = false) {
        // 简化的footer填充逻辑
        if (this.shouldPushToFooter(force)) {
            this.pushToFooterHandler();
        }
    }

    private pushToHeader(force: boolean = false) {
        // 简化的header填充逻辑
        if (this.shouldPushToHeader(force)) {
            this.pushToHeaderHandler();
        }
    }

    private shouldPushToFooter(force: boolean): boolean {
        if (force) return true;
        // 实现判断逻辑...
        return false;
    }

    private shouldPushToHeader(force: boolean): boolean {
        if (force) return true;
        // 实现判断逻辑...
        return false;
    }

    private pushToFooterHandler() {
        // 实现footer处理逻辑...
    }

    private pushToHeaderHandler() {
        // 实现header处理逻辑...
    }

    private refreshItems(offset: number) {
        // 简化的刷新逻辑
        if (offset < 0) {
            // 处理减少items
        } else {
            // 处理增加items
        }
    }

    private removeItems(count: number) {
        const length = this.node.children.length - count;
        for (let i = 0; i < length; i++) {
            const child = this.node.children[this.node.children.length - 1];
            child.off(Node.EventType.SIZE_CHANGED, this.onChildSize, this);
            child.off(Node.EventType.TRANSFORM_CHANGED, this.onChildScale, this);
            child.destroy();
            this.node.removeChild(child);
        }
    }

    private onChildSize() {
        if (this.isRestart) return;
        // 处理子节点尺寸变化
    }

    private onChildScale() {
        if (this.isRestart) return;
        // 处理子节点缩放变化
    }

    private onViewSizeChange() {
        this.isRestart = true;
        this.boundaryCache.isDirty = true;
        this.layoutCache.isDirty = true;
        // 处理视图尺寸变化
        this.isRestart = false;
    }

    private notifyRefreshItem(target: Node) {
        EventHandler.emitEvents(this.refreshItemEvents, this, (target as ItemNode).__index, target);
    }

    // 性能优化：分帧执行
    private executeGenerator(generator: Generator, duration: number): Promise<void> {
        return new Promise((resolve) => {
            const execute = () => {
                const startTime = Date.now();
                let iter = generator.next();
                
                while (!iter.done) {
                    if (Date.now() - startTime > duration) {
                        // 使用requestAnimationFrame替代setTimeout
                        requestAnimationFrame(execute);
                        return;
                    }
                    iter = generator.next();
                }
                
                resolve();
            };
            execute();
        });
    }

    private cleanup() {
        this.generator?.return("");
        this.nodePool.length = 0;
        this.removeEventListener();
    }

    // 更新内容尺寸
    private updateContentSize() {
        if (this.node.children.length === 0) return;
        
        this.layoutCache.isDirty = true;
        const size = this.contentSize;
        
        // 设置内容尺寸
        if (this.transform) {
            this.transform.setContentSize(size);
        }
        
        // 如果是垂直滚动，确保宽度不超过view宽度
        if (this.vertical) {
            size.width = this.view.width;
        }
        // 如果是水平滚动，确保高度不超过view高度  
        if (this.horizontal) {
            size.height = this.view.height;
        }
        
        // 通知ScrollView更新边界
        if (this.scrollView) {
            // 触发ScrollView重新计算边界，使用公共方法
            this.scrollView.scrollToOffset(this.scrollView.getScrollOffset(), 0);
        }
    }

    // 添加缺失的方法
    onPositionChanged() {
        if (this.isRestart) return;
        
        this.boundaryCache.isDirty = true;
        this.layoutCache.isDirty = true;
        
        // 更新滚动方向
        this.updateScrollDirection();
        
        // 处理item填充
        this.handleItemFilling();
        
        this.prevPos = this.node.position.clone();
    }
}