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

    // 点击事件处理函数
    private onClick(event: EventTouch) {
        const length = this.node.children.length
        logger.logView(`点击了堆：${this.node.name}，堆内卡牌数：${length}`);
        if (this.isStock && length <= 0) {
            const game = this.node.scene.getComponentInChildren(UIPlay);
            game.recycleWasteToStock();
        }
    }

    getTopCard(): Node | null {
        const c = this.node.children;
        return c.length > 0 ? c[c.length - 1] : null;
    }

    getCardIndex(node: Node): number {
        return this.node.children.indexOf(node);
    }

    isEmpty() {
        return this.node.children.length <= 0;
    }

    addCard(card: Node) {
        card.setParent(this.node);
        card.setSiblingIndex(this.node.children.length + 1);
    }

    /** 计算 tableau card的 Y */
    static tableauFaceUpOffset = 52;
    static tableauFaceDownOffset = 28;
    computeTableauCardY(cardNode: Node): number {
        let y = 0;
        const cardIndex = this.getCardIndex(cardNode);
        for (let i = 0; i < cardIndex; i++) {
            const node = this.node.children[i];
            const card = node.getComponent(Card);
            if (!card.isFaceUp) {
                y += -Pile.tableauFaceDownOffset;
            } else {
                y += -Pile.tableauFaceUpOffset;
            }
        }
        return y;
    }

    getStackFrom(node: Node): Node[] {
        // waste 只能取顶牌（一张）
        if (this.isWaste) {
            const topCard = this.getTopCard();
            return topCard === node ? [node] : [];
        }

        // 其他情况按原逻辑处理
        const children = this.node.children;
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
}
