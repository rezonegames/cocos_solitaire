import {_decorator, Component, EventTouch, Node, UITransform, Vec3, tween} from "cc";
import {UIPlay} from "./UIPlay";

const { ccclass, property } = _decorator;

@ccclass("CardDrag")
export class CardDrag extends Component {
    game: UIPlay | null = null;

    private offset: Vec3 = new Vec3();
    private dragging = false;
    private selectedStack: Node[] = [];
    private lastClick = 0;
    private originalParent: Node | null = null;
    private dragLayer: Node | null = null;

    onLoad() {
        if (!this.game) {
            this.game = this.node.scene.getComponentInChildren(UIPlay);
        }

        // 尝试找到或创建 DragLayer（只做一次）
        if (this.game) {
            this.dragLayer = this.game.node.getChildByName("DragLayer") || null;
        }

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onTouchStart(e: EventTouch) {
        const now = Date.now();
        if (now - this.lastClick < 250) {
            // 双击：尝试自动到 foundation（可由 UIPlay 处理）
            if (this.game) this.game.tryAutoToFoundation(this.node);
            this.lastClick = 0;
            return;
        }
        this.lastClick = now;

        if (!this.game) return;

        // 如果是 stock 的牌（父为 stock），直接触发 stock 点击逻辑，不走拖拽
        if (this.node.parent === this.game.stock.node) {
            this.game.onClickStock();
            return;
        }

        const ui = this.node.getComponent(UITransform)!;
        const loc = e.getUILocation();
        ui.convertToNodeSpaceAR(new Vec3(loc.x, loc.y), this.offset);

        this.dragging = true;
        this.selectedStack = this.game.getStackFrom(this.node);

        // 保存原父节点
        this.originalParent = this.node.parent;

        // 找 dragLayer，优先场景中已有 DragLayer，否则使用 game.node 作为 fallback
        let layer = this.game.node.getChildByName("DragLayer");
        if (!layer) {
            layer = this.game.node;
        }
        this.dragLayer = layer;

        // 把整叠牌移动到 dragLayer 并保持世界坐标（避免闪跳）
        for (const cardNode of this.selectedStack) {
            const wp = cardNode.getWorldPosition().clone();
            cardNode.parent = layer;
            cardNode.setWorldPosition(wp);
        }

        // 提升层级保证在最上
        this.selectedStack.forEach((cardNode, idx) => {
            cardNode.setSiblingIndex(9999 + idx);
        });
    }

    onTouchMove(e: EventTouch) {
        if (!this.dragging || !this.game) return;
        const loc = e.getUILocation();
        const parentUI = this.game.getComponent(UITransform)!;
        const pos = parentUI.convertToNodeSpaceAR(new Vec3(loc.x, loc.y));
        const targetPos = pos.subtract(this.offset);

        // 父为 dragLayer，直接设置本地位置（避免每帧计算世界->本地开销）
        this.selectedStack.forEach((node, index) => {
            node.setPosition(targetPos.x, targetPos.y - index * this.game.getTableauOffset());
        });
    }

    onTouchEnd(e?: EventTouch) {
        if (!this.dragging || !this.game) return;
        this.dragging = false;
        if (!this.selectedStack.length) return;

        // 计算 dropWorld（优先触摸点）
        let dropWorld = this.selectedStack[0].getWorldPosition().clone();
        if (e) {
            const loc = e.getUILocation();
            const parentUI = this.game.getComponent(UITransform)!;
            const nodeSpace = parentUI.convertToNodeSpaceAR(new Vec3(loc.x, loc.y));
            dropWorld = this.game.node.getWorldPosition().clone().add(new Vec3(nodeSpace.x, nodeSpace.y, 0));
        }

        // 把 originalParent 和 dropWorld 一并传给 UIPlay.handleDrop
        this.game.handleDrop(this.node, this.selectedStack, this.originalParent ?? undefined, dropWorld);

        this.selectedStack = [];
        this.originalParent = null;
    }
}
