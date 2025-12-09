import {_decorator, Node, Component, EventTouch} from 'cc';
import {Card} from './Card'
import {logger} from "db://assets/libs/log/Logger";
import {UIPlay} from "db://assets/game1/script/logic/UIPlay";

const {ccclass} = _decorator;

@ccclass('Pile')
export class Pile extends Component {

    isFoundation = false;
    isTableau = false;
    isStock = false;
    isWaste = false;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onClick, this);
    }

    /** 获取实际可见的牌（排除被hide的牌） */
    getVisibleCards(): Node[] {
        return this.node.children.filter(c => c.getComponent(Card)?.isShow());
    }

    /** 获取所有牌（包括被hide的） */
    getAllCards(): Node[] {
        return this.node.children;
    }

    /** 获取牌的数量 */
    getCardCount(): number {
        return this.node.children.length;
    }

    // 点击事件处理函数
    private onClick(event: EventTouch) {
        const length = this.getCardCount();
        // logger.logView(`点击了堆：${this.node.name}，堆内卡牌数：${length}`);
        if (this.isStock && length <= 0) {
            const game = this.node.scene.getComponentInChildren(UIPlay);
            game.recycleWasteToStock();
        }
    }

    isTopCard(node: Node) {
        return node === this.getTopCard();
    }

    getTopCard(): Node | null {
        const c = this.getVisibleCards();
        return c.length > 0 ? c[c.length - 1] : null;
    }

    getCardIndex(node: Node): number {
        return this.node.children.indexOf(node);
    }

    isEmpty() {
        return this.getVisibleCards().length <= 0;
    }

    addCard(card: Node) {
        card.setParent(this.node);  // 改变父节点

        if (this.isWaste) {
            // waste 自己的布局
            const children = this.getAllCards();
            for (let i = 0; i < children.length; i++) {
                const c = children[i];
                const x = this.computeWasteCardX(c);
                c.setPosition(x, 0);
                c.setSiblingIndex(i);
            }
            return;
        }

        if (this.isFoundation) {
            // foundation 堆：直接归位到父节点原点
            card.setPosition(0, 0);
            card.setSiblingIndex(this.getCardCount() - 1);
            return;
        }

        if (this.isTableau) {
            // tableau 堆：按计算的 Y 位置摆放
            const y = this.computeTableauCardY(card);
            card.setPosition(0, y);
            card.setSiblingIndex(this.getCardCount() - 1);
            return;
        }

        if (this.isStock) {
            // stock 堆：归位到父节点原点
            card.setPosition(0, 0);
            card.setSiblingIndex(this.getCardCount() - 1);
            return;
        }
    }

    /** 计算 tableau card的 Y */
    static tableauFaceUpOffset = 52;
    static tableauFaceDownOffset = 28;

    computeTableauCardY(cardNode: Node): number {
        let y = 0;
        const cardIndex = this.getCardIndex(cardNode);
        const children = this.getAllCards();
        for (let i = 0; i < cardIndex; i++) {
            const node = children[i];
            const card = node.getComponent(Card);
            if (!card.isFaceUp) {
                y += -Pile.tableauFaceDownOffset;
            } else {
                y += -Pile.tableauFaceUpOffset;
            }
        }
        return y;
    }

    /** 计算 waster card的 X */
    static wasteCardXOffset = 25;

    computeWasteCardX(cardNode: Node): number {
        const children = this.getAllCards();
        const total = children.length;
        const index = this.getCardIndex(cardNode);

        // waste 最多显示最后三张
        if (total <= 3) {
            // 全部可见：位置为 index * offset
            return index * Pile.wasteCardXOffset;
        }

        // total > 3 的情况
        const firstVisible = total - 3;  // 最后 3 张的起始 index

        if (index < firstVisible) {
            // 更早的牌全部叠在最左
            return 0;
        }

        // 三张可见牌：0 / offset / 2*offset
        return (index - firstVisible) * Pile.wasteCardXOffset;
    }

    getStackFrom(node: Node): Node[] {
        // waste 只能取顶牌（一张）
        if (this.isWaste) {
            const topCard = this.getTopCard();
            return topCard === node ? [node] : [];
        }

        // 其他情况按原逻辑处理
        const children = this.getAllCards();
        const idx = children.indexOf(node);
        let realIdx = idx;
        for (let i = idx; i < children.length; i++) {
            const node1 = children[i];
            const card1 = node1.getComponent(Card)!;
            if (!card1.isFaceUp) {
                return [];
            }
        }
        return children.slice(realIdx);
    }

    /** 遍历所有牌（用于替代直接访问node.children） */
    forEachCard(callback: (cardNode: Node, index: number) => void) {
        this.getAllCards().forEach(callback);
    }
}
