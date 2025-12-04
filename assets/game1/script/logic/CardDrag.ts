import { _decorator, Component, EventTouch, Node, UITransform, Vec3, director } from 'cc';
import { UIPlay } from './UIPlay';

const { ccclass, property } = _decorator;

@ccclass('CardDrag')
export class CardDrag extends Component {
    @property(UIPlay) game: UIPlay | null = null;

    private offset: Vec3 = new Vec3();
    private dragging = false;
    private lastClickTime = 0;
    private touchStartPos: Vec3 = new Vec3();
    private touchStartTime = 0;
    private static readonly CLICK_MOVE_THRESHOLD = 1;
    private static readonly DOUBLE_CLICK_INTERVAL = 250;
    private static readonly SINGLE_CLICK_MAX_DURATION = 200;
    private hasStartedDrag = false;

    onLoad() {
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

        // 记录触摸开始时的坐标和时间
        this.touchStartPos.set(loc.x, loc.y);
        this.touchStartTime = now;
        const ui = this.node.getComponent(UITransform)!;
        ui.convertToNodeSpaceAR(new Vec3(loc.x, loc.y), this.offset);

        if (now - this.lastClickTime < CardDrag.DOUBLE_CLICK_INTERVAL) {
            this.game.onDBClickCard(this.node, this.offset);
            this.lastClickTime = 0;
            this.dragging = false;
            this.hasStartedDrag = false;
            return;
        }

        this.lastClickTime = now;
        this.dragging = false;
        this.hasStartedDrag = false;
    }

    onTouchMove(e: EventTouch) {
        if (!this.game) return;

        const currentLoc = e.getUILocation();
        const moveDistance = Vec3.distance(new Vec3(currentLoc.x, currentLoc.y), this.touchStartPos);

        if (moveDistance > CardDrag.CLICK_MOVE_THRESHOLD) {
            this.dragging = true;
            this.lastClickTime = 0;

            if (!this.hasStartedDrag) {
                this.game.startDrag(this.node, this.offset);
                this.hasStartedDrag = true;
            }

            // 更新拖动位置
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

        const touchDuration = now - this.touchStartTime;
        const moveDistance = Vec3.distance(new Vec3(currentLoc.x, currentLoc.y), this.touchStartPos);

        if (!this.dragging &&
            moveDistance <= CardDrag.CLICK_MOVE_THRESHOLD &&
            touchDuration <= CardDrag.SINGLE_CLICK_MAX_DURATION) {
            this.game.onClickCard(this.node, this.offset);
        } else if (this.dragging && this.hasStartedDrag) {
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
