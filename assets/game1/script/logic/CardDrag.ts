// CardDrag.ts
import {_decorator, Component, EventTouch, Node, UITransform, Vec3} from 'cc';
import { UIPlay } from './UIPlay';
import { Card } from './Card';

const { ccclass, property } = _decorator;

@ccclass('CardDrag')
export class CardDrag extends Component {
    game: UIPlay | null = null;

    private offset: Vec3 = new Vec3();
    private dragging = false;
    private selectedStack: Node[] = [];
    private lastClick = 0;
    private originalParent: Node | null = null;

    onLoad() {
        if (!this.game) {
            // 查找场景中 UIPlay 实例
            this.game = this.node.scene.getComponentInChildren(UIPlay);
        }
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onTouchStart(e: EventTouch) {
        const now = Date.now();
        if (now - this.lastClick < 250) {
            // 双击：仅在非 stock 且为面朝上的卡触发自动到 foundation
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

        // 如果点到 stock 的牌，交给 UIPlay.onClickStock 处理（不走拖拽流程）
        if (this.node.parent === this.game.stock.node) {
            this.game.onClickStock();
            return;
        }

        const ui = this.node.getComponent(UITransform)!;
        const loc = e.getUILocation();
        ui.convertToNodeSpaceAR(new Vec3(loc.x, loc.y), this.offset);

        this.dragging = true;
        this.selectedStack = this.game.getStackFrom(this.node);

        // 保存原父
        this.originalParent = this.node.parent;

        // DragLayer（优先查找名为 DragLayer 的节点）
        let layer = this.game.node.getChildByName('DragLayer');
        if (!layer) layer = this.game.node;

        // 把整叠卡移到 dragLayer，并保持世界坐标（避免闪动）
        for (const cardNode of this.selectedStack) {
            const wp = cardNode.getWorldPosition().clone();
            cardNode.parent = layer;
            cardNode.setWorldPosition(wp);
        }

        // 提升层级
        this.selectedStack.forEach((cardNode, idx) => cardNode.setSiblingIndex(9999 + idx));
    }

    onTouchMove(e: EventTouch) {
        if (!this.dragging || !this.game) return;
        const loc = e.getUILocation();
        const parentUI = this.game.getComponent(UITransform)!;
        const pos = parentUI.convertToNodeSpaceAR(new Vec3(loc.x, loc.y));
        const targetPos = pos.subtract(this.offset);

        // 选中的卡已在 dragLayer 下，直接设置本地坐标
        this.selectedStack.forEach((node, index) => {
            node.setPosition(targetPos.x, targetPos.y - index * this.game.getTableauOffset());
        });
    }

    onTouchEnd(e?: EventTouch) {
        if (!this.dragging || !this.game) return;
        this.dragging = false;
        if (!this.selectedStack.length) return;

        // 计算 drop 的 world 坐标（优先触摸点）
        let dropWorld = this.selectedStack[0].getWorldPosition().clone();
        if (e) {
            const loc = e.getUILocation();
            const parentUI = this.game.getComponent(UITransform)!;
            const nodeSpace = parentUI.convertToNodeSpaceAR(new Vec3(loc.x, loc.y));
            const rootWorld = this.game.node.getWorldPosition().clone();
            dropWorld = rootWorld.add(new Vec3(nodeSpace.x, nodeSpace.y, 0));
        }

        // 调用 UIPlay.handleDrop，传入 originalParent 和 dropWorld
        this.game.handleDrop(this.node, this.selectedStack, this.originalParent ?? undefined, dropWorld);

        this.selectedStack = [];
        this.originalParent = null;
    }
}
