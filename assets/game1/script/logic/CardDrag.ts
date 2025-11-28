// CardDrag.ts
import {_decorator, Component, EventTouch, Node, UITransform, Vec3, instantiate, UIOpacity} from 'cc';
import {UIPlay} from './UIPlay';
import {Card} from './Card';
import {logger} from "db://assets/libs/log/Logger";
import {ResUtil} from "db://assets/libs/res/ResUtil";

const {ccclass, property} = _decorator;

@ccclass('CardDrag')
export class CardDrag extends Component {
    // 通过 onLoad 自动查找 UIPlay（也可在 Inspector 里手动赋值）
    game: UIPlay | null = null;

    private offset: Vec3 = new Vec3();

    // 保证拖拽过程中显示在最上层
    private dragging = false;
    private selectedStack: Node[] = [];
    private dragCopies: Node[] = [];
    private lastClick = 0;

    onLoad() {
        if (!this.game) {
            // 在场景中查找 UIPlay（假设挂了 UIPlay 的节点存在）
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

        if(this.node.parent === this.game.waste.node) {
            this.game.tryRecycleWasteToStock()
        }

        // 记录触点偏移
        const ui = this.node.getComponent(UITransform)!;
        const loc = e.getUILocation();
        ui.convertToNodeSpaceAR(new Vec3(loc.x, loc.y), this.offset);

        this.dragging = true;
        this.selectedStack = this.game!.getStackFrom(this.node);

        // 创建副本并设置在原始节点位置
        this.dragCopies = [];
        this.selectedStack.forEach((cardNode, idx) => {
            const copy = instantiate(cardNode);
            copy.parent = this.game.dragNode;

            // 设置副本位置为原始节点的世界位置
            const worldPos = cardNode.getWorldPosition();
            copy.setWorldPosition(worldPos);

            // 使用透明度隐藏原始节点，而不是 active = false
            cardNode.getComponent(UIOpacity).opacity = 0;

            this.dragCopies.push(copy);
        });
    }

    onTouchMove(e: EventTouch) {
        if (!this.dragging || !this.dragCopies) return;

        // 移动副本
        const loc = e.getUILocation();
        const parentUI = this.game.dragNode.getComponent(UITransform)!;
        const pos = parentUI.convertToNodeSpaceAR(new Vec3(loc.x, loc.y));
        const targetPos = pos.subtract(this.offset);

        this.dragCopies.forEach((copy, i) => {
            copy.setPosition(targetPos.x, targetPos.y - i * this.game.getTableauOffset(), 0);
        });
    }

    onTouchEnd(e?: EventTouch) {
        if (!this.dragging || !this.game) return;
        this.dragging = false;

        if (this.selectedStack.length && this.dragCopies.length) {
            // 显示原始节点并移动到副本的最终位置
            this.selectedStack.forEach((cardNode, idx) => {
                cardNode.getComponent(UIOpacity).opacity = 255; // 恢复显示
                if (this.dragCopies[idx]) {
                    const copyWorldPos = this.dragCopies[idx].getWorldPosition();
                    cardNode.setWorldPosition(copyWorldPos);
                }
            });

            // 处理放置逻辑
            this.game.handleDrop(this.node, this.selectedStack);
        }

        // 删除副本
        this.dragCopies?.forEach(copy => copy.destroy());
        this.dragCopies = [];
        this.selectedStack = [];
    }
}
