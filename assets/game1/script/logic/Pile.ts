import {_decorator, Node, Component, UIOpacity} from 'cc';
import _ from 'lodash-es'
import {Card} from './Card'
import {logger} from "db://assets/libs/log/Logger";

const {ccclass} = _decorator;

@ccclass('Pile')
export class Pile extends Component {

    isFoundation = false;
    isTableau = false;
    isStock = false;
    isWaste = false;

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
