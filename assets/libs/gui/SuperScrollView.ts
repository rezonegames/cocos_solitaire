import { _decorator, Node, EventTouch, Vec3, Vec2, ScrollView, EventHandler, PageView } from 'cc';
import { SuperLayout } from './SuperLayout';

const { ccclass, property } = _decorator;

// 性能优化：缓存常用计算结果
const EPSILON = 1e-4;
const OUT_OF_BOUNDARY_BREAKING_FACTOR = 0.015;
const _tempVec2 = new Vec2();

export enum ScrollViewDirection {
    HORIZONTAL,
    VERTICAL,
    NONE,
}

interface TouchEventCache {
    startPos: Vec2;
    endPos: Vec2;
    prevLocation: Vec2;
    location: Vec2;
}

@ccclass('SuperScrollView')
export class SuperScrollView extends ScrollView {
    @property({ tooltip: "向上传递事件" }) 
    isTransmitEvent: boolean = false;
    
    @property pullRefresh: boolean = false;
    @property({ visible: function() { return (this as any).pullRefresh } }) 
    headerOutOffset: number = 200;
    @property({ visible: function() { return (this as any).pullRefresh } }) 
    headerMultiple: number = 2;
    @property({ visible: function() { return (this as any).pullRefresh } }) 
    footerOutOffset: number = 200;
    @property({ visible: function() { return (this as any).pullRefresh } }) 
    footerMultiple: number = 2;
    @property({ type: EventHandler, visible: function() { return (this as any).pullRefresh } }) 
    headerEvents: EventHandler[] = [];
    @property({ type: EventHandler, visible: function() { return (this as any).pullRefresh } }) 
    footerEvents: EventHandler[] = [];

    // 性能优化：缓存触摸事件数据
    private touchCache: TouchEventCache = {
        startPos: new Vec2(),
        endPos: new Vec2(),
        prevLocation: new Vec2(),
        location: new Vec2()
    };

    private direction: ScrollViewDirection = ScrollViewDirection.NONE;
    private _layout!: SuperLayout;
    private isCallSoonFinish: boolean = false;
    
    // 添加缺失的触摸位置属性
    prevLocation: Vec2 = new Vec2();
    location: Vec2 = new Vec2();
    
    // 下拉刷新状态缓存
    private refreshState = {
        isMoveHeader: false,
        isMoveFooter: false,
        isLockHeader: false,
        isLockFooter: false,
        headerProgress: 0,
        footerProgress: 0
    };

    onLoad() {
        if (this.layout?.autoCenter) {
            this.brake = 0.7;
        }
        
        // 根据layout类型设置滚动方向
        if (this.layout) {
            if (this.layout.vertical) {
                this.horizontal = false;
                this.vertical = true;
            } else {
                this.horizontal = true;
                this.vertical = false;
            }
        }
    }

    onEnable() {
        super.onEnable();
        this.node.on(PageView.EventType.SCROLL_ENG_WITH_THRESHOLD, this.dispatchPageTurningEvent, this);
    }

    onDisable() {
        super.onDisable();
        this.node.off(PageView.EventType.SCROLL_ENG_WITH_THRESHOLD, this.dispatchPageTurningEvent, this);
    }

    get layout(): SuperLayout {
        if (!this._layout) {
            this._layout = this.content?.getComponent(SuperLayout)!;
        }
        return this._layout;
    }

    get curPageIdx(): number {
        return this.layout?.currPageIndex || 0;
    }

    // 性能优化：重写边界计算方法，添加缓存
    protected _getContentTopBoundary(): number {
        if (!this._content) return -1;
        return this.layout?.isOfTopBoundary || this._topBoundary;
    }

    protected _getContentBottomBoundary(): number {
        if (!this._content) return -1;
        return this.layout?.isOfBottomBoundary || this._bottomBoundary;
    }

    protected _getContentLeftBoundary(): number {
        if (!this._content) return -1;
        return this.layout?.isOfLeftBoundary || this._leftBoundary;
    }

    protected _getContentRightBoundary(): number {
        if (!this._content) return -1;
        return this.layout?.isOfRightBoundary || this._rightBoundary;
    }

    protected _onTouchBegan(event: EventTouch, captureListeners?: Node[]) {
        this.isCallSoonFinish = false;
        this.direction = ScrollViewDirection.NONE;
        
        if (this.layout?.isPageView) {
            event.touch!.getUILocation(_tempVec2);
            Vec2.set(this.touchCache.startPos, _tempVec2.x, _tempVec2.y);
        }
        
        super._onTouchBegan(event, captureListeners);
        
        if (this.isTransmitEvent) {
            this.transmitEvent(event, Node.EventType.TOUCH_START);
        }
    }

    protected _onTouchMoved(event: EventTouch, captureListeners: any) {
        // 性能优化：缓存触摸位置
        const prevLoc = event.touch?.getPreviousLocation();
        const curLoc = event.touch?.getLocation();
        if (prevLoc) this.prevLocation = prevLoc;
        if (curLoc) this.location = curLoc;

        if (this.isTransmitEvent && this.shouldTransmitEvent(event)) {
            this.transmitEvent(event, Node.EventType.TOUCH_MOVE);
            return;
        }

        super._onTouchMoved(event, captureListeners);
        
        if (this.pullRefresh) {
            this.handlePullRefresh();
        }
    }

    // 性能优化：提取事件传递逻辑
    private shouldTransmitEvent(event: EventTouch): boolean {
        if (this.direction === ScrollViewDirection.NONE) {
            const start = event.getStartLocation();
            const current = event.getLocation();
            const xOffset = Math.abs(start.x - current.x);
            const yOffset = Math.abs(start.y - current.y);
            
            this.direction = xOffset > yOffset ? ScrollViewDirection.HORIZONTAL : ScrollViewDirection.VERTICAL;
        }
        
        return (this.vertical && this.direction === ScrollViewDirection.HORIZONTAL) ||
               (this.horizontal && this.direction === ScrollViewDirection.VERTICAL);
    }

    // 性能优化：优化下拉刷新逻辑
    private handlePullRefresh() {
        const outOfBoundary = this._getHowMuchOutOfBoundary();
        const offset = this.vertical ? outOfBoundary.y : -outOfBoundary.x;
        
        if (offset > EPSILON && !this.refreshState.isLockHeader && !this.refreshState.isLockFooter) {
            this.updateHeaderProgress(offset);
        } else if (offset < -EPSILON && !this.refreshState.isLockHeader && !this.refreshState.isLockFooter) {
            this.updateFooterProgress(-offset);
        } else if (Math.abs(offset) <= EPSILON && !this.refreshState.isLockHeader && !this.refreshState.isLockFooter) {
            this.clearProgress();
        }
    }

    private updateHeaderProgress(offset: number) {
        this.refreshState.headerProgress = offset / this.headerOutOffset;
        this.refreshState.isMoveHeader = this.refreshState.headerProgress >= this.headerMultiple;
        
        EventHandler.emitEvents(this.headerEvents, this, {
            action: false,
            progress: this.refreshState.headerProgress,
            stage: this.refreshState.isMoveHeader ? "wait" : "touch"
        });
        EventHandler.emitEvents(this.footerEvents, this, { action: false, progress: 0, stage: "release" });
    }

    private updateFooterProgress(offset: number) {
        this.refreshState.footerProgress = offset / this.footerOutOffset;
        this.refreshState.isMoveFooter = this.refreshState.footerProgress >= this.footerMultiple;
        
        EventHandler.emitEvents(this.footerEvents, this, {
            action: false,
            progress: this.refreshState.footerProgress,
            stage: this.refreshState.isMoveFooter ? "wait" : "touch"
        });
        EventHandler.emitEvents(this.headerEvents, this, { action: false, progress: 0, stage: "release" });
    }

    protected _onTouchEnded(event: EventTouch, captureListeners: any) {
        if (this.layout?.isPageView) {
            event.touch!.getUILocation(_tempVec2);
            Vec2.set(this.touchCache.endPos, _tempVec2.x, _tempVec2.y);
        }
        
        super._onTouchEnded(event, captureListeners);
        
        if (this.isTransmitEvent) {
            this.transmitEvent(event, Node.EventType.TOUCH_END);
        }
    }

    protected _onTouchCancelled(event: EventTouch, captureListeners: any) {
        if (this.layout?.isPageView) {
            event.touch!.getUILocation(_tempVec2);
            Vec2.set(this.touchCache.endPos, _tempVec2.x, _tempVec2.y);
        }
        
        super._onTouchCancelled(event, captureListeners);
        
        if (this.isTransmitEvent) {
            this.transmitEvent(event, Node.EventType.TOUCH_CANCEL);
        }
    }

    // 性能优化：优化自动滚动处理
    protected _processAutoScrolling(dt: number) {
        const result = super._processAutoScrolling(dt);
        
        // 自动居中逻辑优化
        if (this.layout && !this.isCallSoonFinish) {
            const deltaMove = this.getContentPosition();
            const threshold = 2;
            
            if ((this.layout.vertical && Math.abs(deltaMove.y) <= threshold) ||
                (!this.layout.vertical && Math.abs(deltaMove.x) <= threshold)) {
                this.layout.soonFinish();
                this.isCallSoonFinish = true;
            }
        }
        
        return result;
    }

    scrollToAny(moveDelta: Vec3, timeInSecond?: number, attenuated: boolean = true) {
        if (timeInSecond) {
            this._startAutoScroll(moveDelta, timeInSecond, attenuated);
        } else {
            this._moveContent(moveDelta);
        }
    }

    release() {
        this.refreshState.isMoveHeader = false;
        this.refreshState.isMoveFooter = false;
        
        if (this.refreshState.isLockHeader || this.refreshState.isLockFooter) {
            this.updateBoundaries();
            this.clearProgress();
            this.layout?.onPositionChanged();
            this.refreshState.isLockHeader = false;
            this.refreshState.isLockFooter = false;
            this.startAutoScroll();
        }
    }

    private updateBoundaries() {
        if (this.vertical) {
            if (this.refreshState.isLockHeader) this._topBoundary += this.headerOutOffset;
            if (this.refreshState.isLockFooter) this._bottomBoundary -= this.footerOutOffset;
        } else {
            if (this.refreshState.isLockHeader) this._leftBoundary -= this.headerOutOffset;
            if (this.refreshState.isLockFooter) this._rightBoundary += this.footerOutOffset;
        }
    }

    startAutoScroll() {
        this._autoScrolling = true;
        this._outOfBoundaryAmountDirty = true;
    }

    private clearProgress() {
        EventHandler.emitEvents(this.headerEvents, this, { action: false, progress: 0, stage: "release" });
        EventHandler.emitEvents(this.footerEvents, this, { action: false, progress: 0, stage: "release" });
    }

    private dispatchPageTurningEvent() {
        if (this.layout && this.layout.lastPageIndex !== this.layout.currPageIndex) {
            EventHandler.emitEvents(this.layout.pageEvents, this, PageView.EventType.PAGE_TURNING);
            this.node.emit(PageView.EventType.PAGE_TURNING, this);
        }
    }

    private transmitEvent(event: EventTouch, eventType: string) {
        const e = new EventTouch(event.getTouches(), event.bubbles, event.type);
        e.type = eventType;
        e.touch = event.touch;
        const target: any = event.target!;
        target.parent?.dispatchEvent(e);
    }

    // 添加缺失的方法
    savePageIndex(idx: number): boolean {
        if (idx < 0 || idx >= this.layout.itemTotal) {
            return false;
        }
        this.layout['_currPageIndex'] = idx;
        if (this.layout.indicator) {
            this.layout.indicator._changedState();
        }
        return true;
    }
}