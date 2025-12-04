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
        const children = this.node.children;
        card.setSiblingIndex(children.length + 1);
        if (this.isWaste) {
            card.setPosition(0, 0);
            // for(let i=0;i<children.length;i++) {
            //     const child = children[i];
            //     const x = this.computeWasteCardX(child);
            //     child.setPosition(x, 0);
            // }
        } else if(this.isTableau) {
            const y = this.computeTableauCardY(card);
            card.setPosition(0, y);
        } else if(this.isFoundation) {
            card.setPosition(0, 0);
        } else if(this.isStock) {
            card.setPosition(0, 0);
        }
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

    /** 计算 waster card的 X */
    static wasteCardXOffset = 25;

    computeWasteCardX(cardNode: Node): number {
        const cardIndex = this.getCardIndex(cardNode); // 卡牌在堆中的索引（0=最旧，n-1=最新）
        const totalCards = this.node.children.length;
        const maxOffsetCount = 3; // 最多显示3张偏移的牌，超过的继续叠加或固定
        const baseOffset = Pile.wasteCardXOffset; // 单张牌的x偏移量（比如15）

        // 规则：最新的n张牌依次右移，旧牌叠加偏移（避免无限右移）
        if (totalCards <= maxOffsetCount) {
            // 卡牌数量≤3：所有牌依次右移（索引0=0, 1=1*offset, 2=2*offset）
            return cardIndex * baseOffset;
        } else {
            // 卡牌数量>3：
            // 1. 最后3张牌：依次右移（索引n-3 → 0*offset，n-2 →1*offset，n-1→2*offset）
            // 2. 更早的牌：和倒数第3张重叠（固定偏移 = (maxOffsetCount-1)*baseOffset）
            const relativeIndex = cardIndex - (totalCards - maxOffsetCount);
            return relativeIndex >= 0
                ? relativeIndex * baseOffset
                : (maxOffsetCount - 1) * baseOffset;
        }
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
