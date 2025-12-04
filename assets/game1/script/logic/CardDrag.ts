import {_decorator, Component, EventTouch, Node, UITransform, Vec3} from 'cc';
import {UIPlay} from './UIPlay';

const {ccclass, property} = _decorator;

@ccclass('CardDrag')
export class CardDrag extends Component {
    // 推荐通过编辑器绑定，避免动态查找失败
    @property(UIPlay) game: UIPlay | null = null;

    private offset: Vec3 = new Vec3();
    private dragging = false;
    private lastClickTime = 0; // 重命名，语义更清晰
    private touchStartPos: Vec3 = new Vec3();
    private touchStartTime = 0; // 记录触摸开始时间
    private static readonly CLICK_MOVE_THRESHOLD = 1; // 移动阈值（像素）
    private static readonly DOUBLE_CLICK_INTERVAL = 250; // 双击时间间隔（毫秒）
    private static readonly SINGLE_CLICK_MAX_DURATION = 200; // 单击最长时长（毫秒）
    private hasStartedDrag = false;

    onLoad() {
        // 优先用编辑器绑定，兜底动态查找
        if (!this.game) {
            this.game = this.node.scene.getComponentInChildren(UIPlay);
            if (!this.game) {
                console.error('CardDrag: 未找到 UIPlay 组件！');
                return;
            }
        }
        // 绑定触摸事件
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onTouchStart(e: EventTouch) {
        if (!this.game) return;

        const now = Date.now();
        const loc = e.getUILocation();

        // 1. 记录触摸基础信息
        this.touchStartPos.set(loc.x, loc.y);
        this.touchStartTime = now;
        const ui = this.node.getComponent(UITransform)!;
        ui.convertToNodeSpaceAR(new Vec3(loc.x, loc.y), this.offset);

        // 2. 双击判定（核心修复：仅传递 node 参数）
        if (now - this.lastClickTime < CardDrag.DOUBLE_CLICK_INTERVAL) {
            this.game.onDBClickCard(this.node, this.offset); // 匹配 UIPlay 方法参数
            this.lastClickTime = 0; // 重置双击计时
            this.dragging = false;
            this.hasStartedDrag = false;
            return;
        }

        // 3. 非双击，更新上次点击时间
        this.lastClickTime = now;
        this.dragging = false;
        this.hasStartedDrag = false;
    }

    onTouchMove(e: EventTouch) {
        if (!this.game) return;

        // 计算移动距离
        const currentLoc = e.getUILocation();
        const moveDistance = Vec3.distance(
            new Vec3(currentLoc.x, currentLoc.y),
            this.touchStartPos
        );

        // 移动超过阈值，判定为拖拽
        if (moveDistance > CardDrag.CLICK_MOVE_THRESHOLD) {
            this.dragging = true;
            this.lastClickTime = 0; // 拖拽时重置双击计时（避免误判）
            if (!this.hasStartedDrag) {
                this.game.startDrag(this.node, this.offset);
                this.hasStartedDrag = true;
            }
            this.game.updateDrag(e.getUILocation());
        }
    }

    onTouchEnd(e?: EventTouch) {
        if (!this.game || !e) {
            this.resetState();
            return;
        }

        const now = Date.now();
        const currentLoc = e.getUILocation();

        // 1. 计算触摸时长和移动距离
        const touchDuration = now - this.touchStartTime;
        const moveDistance = Vec3.distance(
            new Vec3(currentLoc.x, currentLoc.y),
            this.touchStartPos
        );

        // 2. 判定单点点击（无拖拽、移动距离小、时长短）
        if (!this.dragging &&
            moveDistance <= CardDrag.CLICK_MOVE_THRESHOLD &&
            touchDuration <= CardDrag.SINGLE_CLICK_MAX_DURATION) {
            this.game.onClickCard(this.node, this.offset);
        }
        // 3. 拖拽结束处理
        else if (this.dragging && this.hasStartedDrag) {
            this.game.endDrag();
        }

        this.resetState();
    }

    private resetState() {
        this.dragging = false;
        this.hasStartedDrag = false;
        this.touchStartPos.set(0, 0);
        this.touchStartTime = 0;
    }
}