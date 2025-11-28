import {_decorator, Component, EventTouch, Node, UITransform, Vec3} from 'cc';
import {UIPlay} from './UIPlay';
import {Card} from './Card';

const {ccclass, property} = _decorator;

@ccclass('CardDrag')
export class CardDrag extends Component {
    game: UIPlay | null = null;
    private offset: Vec3 = new Vec3();
    private dragging = false;
    private lastClick = 0;

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
        if (now - this.lastClick < 250) {
            if (this.game && this.node.parent !== this.game.stock.node) {
                const c = this.node.getComponent(Card);
                if (c && c.isFaceUp) {
                    this.game.tryAutoToFoundation(this.node);
                }
            }
            this.lastClick = 0;
            return;
        }
        this.lastClick = now;

        if (!this.game) return;

        if (this.node.parent === this.game.stock.node) {
            this.game.onClickStock();
            return;
        }

        // 记录触点偏移
        const ui = this.node.getComponent(UITransform)!;
        const loc = e.getUILocation();
        ui.convertToNodeSpaceAR(new Vec3(loc.x, loc.y), this.offset);

        this.dragging = true;

        // 让 UIPlay 处理拖拽开始
        this.game.startDrag(this.node, this.offset);
    }

    onTouchMove(e: EventTouch) {
        if (!this.dragging || !this.game) return;
        this.game.updateDrag(e.getUILocation());
    }

    onTouchEnd(e?: EventTouch) {
        if (!this.dragging || !this.game) return;
        this.dragging = false;

        // 让 UIPlay 处理拖拽结束
        this.game.endDrag();
    }
}