import { _decorator, tween, Vec3, Node, Prefab } from 'cc';
import _ from 'lodash-es';
import VMParentView from "db://assets/libs/gui/VMParentView";
import { CardFactory } from './CardFactory';
import { Card } from './Card';
import { Pile } from './Pile';
import {UndoManager} from "db://assets/game1/script/UndoManager";

const { ccclass, property } = _decorator;


@ccclass('UIPlay')
export class UIPlay extends VMParentView {
    protected data = {
        score: 0,
        lastTotalTime: 0,
        totalTime: 0,
        totalTimeString: '00:00',
        moves: 0,
    }
    @property(Prefab) cardPrefab: Prefab = null;
    @property([Node]) tableauRoots: Node[] = [];
    @property(Node) stockRoot: Node = null!;
    @property(Node) wasteRoot: Node = null!;
    @property([Node]) foundationRoots: Node[] = [];

    @property
    tableauOffset = 35;

    tableau: Pile[] = [];
    stock: Pile;
    waste: Pile;
    foundation: Pile[] = [];

    factory: CardFactory = null!;
    undoManager: UndoManager = null!;

    /**
     * 加积分
     * @param score
     */
    addScore(score: number = 0) {
        this.data.score += score;
    }

    /**
     * 加步数
     * @param moves
     */
    addMoves(moves: number = 0) {
        this.data.moves += moves;
    }

    updateTime(deltaTime: number = 0) {
        this.data.totalTime += deltaTime;
        if (this.data.totalTime - this.data.lastTotalTime < 1) return;
        const m = _.padStart(Math.floor(this.data.totalTime / 60).toString(), 2, '0');
        const s = _.padStart(Math.floor(this.data.totalTime % 60).toString(), 2, '0');
        this.data.totalTimeString = `${m}:${s}`;
        this.data.lastTotalTime = this.data.totalTime;
    }

    start() {
        this.initGame();
    }

    initGame() {
        // 初始化牌桌
        this.tableau = this.tableauRoots.map(n => n.addComponent(Pile));
        this.stock = this.stockRoot.addComponent(Pile);
        this.waste = this.wasteRoot.addComponent(Pile);
        this.foundation = this.foundationRoots.map(n => n.addComponent(Pile));
        this.undoManager = new UndoManager();
        this.factory = new CardFactory(this.cardPrefab);
        // 生牌
        let deck = this.factory.generateDeck();
        this.factory.shuffle(deck);
        // 发牌到7列
        for (let col = 0; col < 7; col++) {
            for (let j = 0; j <= col; j++) {
                const card = deck.shift()!;
                const pile = this.tableau[col];
                pile.addCard(card);
                const cardComp = card.getComponent(Card)!;
                if (j === col) cardComp.flipFaceUp();
                else cardComp.flipFaceDown();
            }
        }
        // 剩余牌放入 stock
        for (const card of deck) {
            this.stock.addCard(card);
            card.getComponent(Card)!.flipFaceDown();
        }
    }

    getStackFrom(cardNode: Node): Node[] {
        const parent = cardNode.parent!;
        const children = parent.children;
        const idx = children.indexOf(cardNode);
        return children.slice(idx);
    }

    // ============================
    //   规则判断（统一用 Pile）
    // ============================
    canPlaceToTableau(card: Card, pile: Pile) {
        const last = pile.getTopCard();
        if (!last) return card.rank === 13;
        const lastCard = last.getComponent(Card)!;
        return lastCard.getColor() !== card.getColor()
            && lastCard.rank === card.rank + 1;
    }

    canPlaceToFoundation(card: Card, pile: Pile) {
        const last = pile.getTopCard();
        if (!last) return card.rank === 1;
        const lastCard = last.getComponent(Card)!;
        return lastCard.suit === card.suit
            && lastCard.rank + 1 === card.rank;
    }

    // ============================
    //     点击 / 拖拽规则
    // ============================
    onClickStock() {
        const last = this.stock.getTopCard();
        if (!last) {
            this.recycleWasteToStock();
            return;
        }

        const card = last.getComponent(Card)!;
        card.flipFaceUp();
        last.setParent(this.waste.node);
    }

    recycleWasteToStock() {
        const cards = [...this.waste.node.children].reverse();
        for (const c of cards) {
            c.setParent(this.stock.node);
            c.getComponent(Card)!.flipFaceDown();
        }
    }

    tryAutoToFoundation(cardNode: Node) {
        const card = cardNode.getComponent(Card)!;
        for (const fd of this.foundation) {
            if (this.canPlaceToFoundation(card, fd)) {
                this.moveStack(cardNode, [cardNode], fd);
                this.addScore(10);
                return;
            }
        }
    }

    handleDrop(cardNode: Node, stack: Node[]) {
        const card = cardNode.getComponent(Card)!;

        // Foundation
        for (const fd of this.foundation) {
            if (this.canPlaceToFoundation(card, fd)) {
                this.moveStack(cardNode, stack, fd);
                this.addScore(10);
                return;
            }
        }

        // Tableau
        for (const pile of this.tableau) {
            if (this.canPlaceToTableau(card, pile)) {
                this.moveStack(cardNode, stack, pile);
                return;
            }
        }

        // 回原处
        const parent = stack[0].parent!;
        this.resetStack(stack, parent);
    }

    // ============================
//        动画 & 移动
// ============================
    moveStack(cardNode: Node, stack: Node[], targetPile: Pile) {
        // 计算未来位置（为了记录 newPositions）
        const oldPileNode = cardNode.parent!;
        const oldPile = oldPileNode.getComponent(Pile)!;
        const oldPositions = stack.map(n => n.position.clone());

        // 计算动画基础 Y
        const baseY = -(targetPile.node.children.length * this.tableauOffset);
        const newPositions = stack.map((n, i) => new Vec3(0, baseY - i * this.tableauOffset));

        // === 记录一次 Undo 动作 ===
        this.undoManager.pushMove({
            cards: [...stack],
            from: oldPile,
            to: targetPile,
            oldPositions,
            newPositions,
        });

        stack.forEach((node, i) => {
            const to = new Vec3(0, baseY - i * this.tableauOffset);

            tween(node)
                .to(0.15, { position: to })
                .call(() => {
                    node.parent = targetPile.node;
                    this.addMoves(1);
                })
                .start();
        });

        // 处理原堆顶翻牌
        this.tryFlipLastCard(oldPileNode);
    }

    private tryFlipLastCard(pileNode: Node) {
        const last = pileNode.children[pileNode.children.length - 1];
        if (!last) return;
        const oldParent = last.getComponent(Pile)!;
        const c = last.getComponent(Card);
        if (c && !c.isFaceUp) {
            // 记录翻牌 undo
            this.undoManager.pushMove({
                cards: [last],
                from: oldParent,
                to: oldParent,
                oldPositions: [last.position.clone()],
                newPositions: [last.position.clone()],
                flip: { card: last, wasFaceUp: false }
            });
            c.flipFaceUp();
        }
    }


    resetStack(stack: Node[], parent: Node) {
        stack.forEach((node, i) => {
            tween(node)
                .to(0.1, { position: new Vec3(0, -i * this.tableauOffset) })
                .call(() => node.parent = parent)
                .start();
        });
    }

    onUndo() {

        const action = this.undoManager.pop()!;

        // 翻牌撤销
        if (action.flip) {
            const card = action.flip.card;
            const c = card.getComponent(Card);
            if (action.flip.wasFaceUp) c.flipFaceUp();
            else c.flipFaceDown();
            return;
        }

        // 普通移动撤销
        const { cards, from, oldPositions } = action;

        cards.forEach((card, i) => {
            tween(card)
                .to(0.15, { position: oldPositions[i] })
                .call(() => {
                    // card.parent = from;

                })
                .start();
        });
    }

}
