import {_decorator, Component, EventTouch, Node, UITransform, Vec3} from 'cc';
import {UIPlay} from './UIPlay';

const {ccclass, property} = _decorator;

@ccclass('CardDrag')
export class CardDrag extends Component {
    game: UIPlay | null = null;
    private offset: Vec3 = new Vec3();
    private dragging = false;
    private lastClick = 0;
    private touchStartPos: Vec3 = new Vec3();
    private static readonly CLICK_MOVE_THRESHOLD = 5;
    private static readonly CLICK_MAX_DURATION = 200;
    private hasStartedDrag = false;

    onLoad() {
        if (!this.game) {
            this.game = this.node.scene.getComponentInChildren(UIPlay) ?? null;
        }
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onTouchStart(e: EventTouch) {
        const now = Date.now();
        // 双击判定（优先级最高）
        if (now - this.lastClick < 250) {
            this.game?.onDBClickCard(this.node);
            this.lastClick = 0;
            this.dragging = false;
            this.hasStartedDrag = false;
            return;
        }
        this.lastClick = now;

        if (!this.game) return;

        // 记录触摸开始位置和偏移
        const loc = e.getUILocation();
        this.touchStartPos.set(loc.x, loc.y);
        const ui = this.node.getComponent(UITransform)!;
        ui.convertToNodeSpaceAR(new Vec3(loc.x, loc.y), this.offset);

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

        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - this.lastClick;
        const currentLoc = e.getUILocation();
        const moveDistance = Vec3.distance(
            new Vec3(currentLoc.x, currentLoc.y),
            this.touchStartPos
        );

        // 判定单点点击
        if (!this.dragging &&
            moveDistance <= CardDrag.CLICK_MOVE_THRESHOLD &&
            touchDuration <= CardDrag.CLICK_MAX_DURATION) {
            this.game.onClickCard(this.node);
        } else if (this.dragging && this.hasStartedDrag) {
            this.game.endDrag();
        }

        this.resetState();
    }

    private resetState() {
        this.dragging = false;
        this.hasStartedDrag = false;
        this.touchStartPos.set(0, 0);
    }
}