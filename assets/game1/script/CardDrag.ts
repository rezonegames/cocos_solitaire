import { _decorator, Component, Node, UITransform, EventTouch, Vec3, tween } from "cc";
import { UIPlay } from "./UIPlay";
import { Card } from "./Card";

const { ccclass, property } = _decorator;

@ccclass("CardDrag")
export class CardDrag extends Component {
    @property(UIPlay)
    game: UIPlay;

    private offset: Vec3 = new Vec3();
    private dragging = false;
    private selectedStack: Node[] = [];

    private lastClick = 0;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    onTouchStart(e: EventTouch) {
        const now = Date.now();
        if (now - this.lastClick < 250) {
            // 双击
            this.game.tryAutoToFoundation(this.node);
            return;
        }
        this.lastClick = now;

        const ui = this.node.getComponent(UITransform);
        const loc = e.getUILocation();
        ui.convertToNodeSpaceAR(new Vec3(loc.x, loc.y), this.offset);

        this.dragging = true;

        // 获取这张牌下方的所有牌（形成一叠）
        this.selectedStack = this.game.getStackFrom(this.node);

        // 提升显示层级
        this.selectedStack.forEach(cardNode => {
            cardNode.setSiblingIndex(9999);
        });
    }

    onTouchMove(e: EventTouch) {
        if (!this.dragging) return;

        const loc = e.getUILocation();
        const parentUI = this.node.parent.getComponent(UITransform)!;
        const pos = parentUI.convertToNodeSpaceAR(new Vec3(loc.x, loc.y));

        const targetPos = pos.subtract(this.offset);

        // 整叠移动
        this.selectedStack.forEach((node, index) => {
            node.setPosition(targetPos.x, targetPos.y - index * this.game.tableauOffset);
        });
    }

    onTouchEnd() {
        if (!this.dragging) return;
        this.dragging = false;

        const card = this.node.getComponent(Card);
        this.game.handleDrop(this.node, this.selectedStack);
    }
}
