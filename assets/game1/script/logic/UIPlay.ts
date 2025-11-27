// UIPlay.ts
import { _decorator, tween, Vec3, Node, Prefab, director, Canvas, UITransform } from 'cc';
import _ from 'lodash-es';
import VMParentView from "db://assets/libs/gui/VMParentView";
import { CardFactory } from './CardFactory';
import { Card } from './Card';
import { Pile } from './Pile';
import { UndoManager, UndoMove } from './UndoManager';

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

    @property(Node) stockButton: Node = null!;
    @property(Prefab) cardPrefab: Prefab = null!;
    @property([Node]) tableauRoots: Node[] = [];
    @property(Node) stockRoot: Node = null!;
    @property(Node) wasteRoot: Node = null!;
    @property([Node]) foundationRoots: Node[] = [];

    @property
    tableauOffset = 35;

    @property
    maxTableauVisibleHeight = 600;

    tableau: Pile[] = [];
    stock: Pile = null!;
    waste: Pile = null!;
    foundation: Pile[] = [];

    factory: CardFactory = null!;
    undoManager: UndoManager = null!;

    start() {
        this.initGame();

        const canvas = director.getScene()!.getComponent(Canvas);
        canvas.node.on('size-changed', this.onScreenResize, this);
    }

    updateTime(deltaTime: number = 0) {
        this.data.totalTime += deltaTime;
        if (this.data.totalTime - this.data.lastTotalTime < 1) return;
        const m = _.padStart(Math.floor(this.data.totalTime / 60).toString(), 2, '0');
        const s = _.padStart(Math.floor(this.data.totalTime % 60).toString(), 2, '0');
        this.data.totalTimeString = `${m}:${s}`;
        this.data.lastTotalTime = this.data.totalTime;
    }

    addScore(score: number = 0) { this.data.score += score; }
    addMoves(moves: number = 0) { this.data.moves += moves; }

    getTableauOffset() { return this.tableauOffset; }

    /** 初始化游戏 */
    initGame() {
        // 初始化 piles 并标注类型
        this.tableau = this.tableauRoots.map(n => {
            const p = n.getComponent(Pile) ?? n.addComponent(Pile);
            (p as any).isTableau = true;
            return p;
        });

        this.stock = this.stockRoot.getComponent(Pile) ?? this.stockRoot.addComponent(Pile);
        (this.stock as any).isStock = true;

        this.waste = this.wasteRoot.getComponent(Pile) ?? this.wasteRoot.addComponent(Pile);
        (this.waste as any).isWaste = true;

        this.foundation = this.foundationRoots.map(n => {
            const p = n.getComponent(Pile) ?? n.addComponent(Pile);
            (p as any).isFoundation = true;
            return p;
        });

        this.undoManager = new UndoManager();
        this.factory = new CardFactory(this.cardPrefab);

        let deck = this.factory.generateDeck();
        this.factory.shuffle(deck);

        // 发牌到 tableau
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

        // 剩余牌放 stock
        for (const card of deck) {
            this.stock.addCard(card);
            card.getComponent(Card)!.flipFaceDown();
        }

        this.onScreenResize();
    }

    /** 重新开始 */
    restartGame() {
        const allPiles: Pile[] = [
            ...this.tableau,
            ...this.foundation,
            this.stock,
            this.waste
        ];

        for (const pile of allPiles) {
            while (pile.node.children.length > 0) {
                pile.node.children[0].destroy();
            }
        }

        this.undoManager.clear?.();
        this.initGame();
    }

    /** 获取从指定牌开始的牌堆（返回一组 Node） */
    getStackFrom(cardNode: Node): Node[] {
        const parent = cardNode.parent!;
        const children = parent.children;
        const idx = children.indexOf(cardNode);
        return children.slice(idx);
    }

    /** 判断能否放到 tableau（card 为 Card 组件实例） */
    canPlaceToTableau(cardComp: Card, pile: Pile) {
        const last = pile.getTopCard();
        if (!last) return cardComp.rank === 13;
        const lastCard = last.getComponent(Card)!;
        const movingColor = cardComp.getColor();
        const lastColor = lastCard.getColor();
        return lastColor !== movingColor && lastCard.rank === cardComp.rank + 1;
    }

    /** 判断能否放到 foundation */
    canPlaceToFoundation(cardComp: Card, pile: Pile) {
        const last = pile.getTopCard();
        if (!last) return cardComp.rank === 1;
        const lastCard = last.getComponent(Card)!;
        return lastCard.suit === cardComp.suit && lastCard.rank + 1 === cardComp.rank;
    }

    /** 点击 stock：把牌放到 waste 并修正位置 */
    onClickStock() {
        const last = this.stock.getTopCard();
        if (!last) {
            this.recycleWasteToStock();
            return;
        }
        const cardComp = last.getComponent(Card)!;
        cardComp.flipFaceUp();

        // 把牌放 waste，并设置局部位置（避免位置错位）
        last.setParent(this.waste.node);
        last.setPosition(0, 0);
    }

    recycleWasteToStock() {
        const cards = [...this.waste.node.children].reverse();
        for (const c of cards) {
            c.setParent(this.stock.node);
            c.getComponent(Card)!.flipFaceDown();
        }
    }

    /** 当双击或快速点击时尝试自动放到 foundation */
    tryAutoToFoundation(cardNode: Node) {
        const cardComp = cardNode.getComponent(Card)!;
        for (const fd of this.foundation) {
            if (this.canPlaceToFoundation(cardComp, fd)) {
                this.moveStack(cardNode, [cardNode], fd);
                this.addScore(10);
                return;
            }
        }
    }

    isNearNode(pileNode: Node, dropNode: Node): boolean {
        if (!pileNode || !dropNode) return false;

        const pileUI = pileNode.getComponent(UITransform);
        const dropUI = dropNode.getComponent(UITransform);
        if (!pileUI || !dropUI) return false;

        // 世界矩形
        const pileRect = pileUI.getBoundingBoxToWorld();
        const dropRect = dropUI.getBoundingBoxToWorld();

        // 判断是否相交
        return pileRect.intersects(dropRect);
    }

    /** handleDrop：originalParentNode 为拖拽开始时记录的父节点；dropWorldPos 为触摸结束的世界坐标 */
    handleDrop(cardNode: Node, stack: Node[], originalParentNode?: Node, dropWorldPos?: Vec3) {
        const cardComp = cardNode.getComponent(Card)!;
        const worldPoint = dropWorldPos ? dropWorldPos.clone() : stack[0].getWorldPosition().clone();

        // Foundation 优先
        for (const fd of this.foundation) {
            if (this.isNearNode(fd.node, stack[0]) && this.canPlaceToFoundation(cardComp, fd)) {
                this.moveStack(cardNode, stack, fd, originalParentNode);
                this.addScore(10);
                return;
            }
        }

        // Tableau 判定
        for (const pile of this.tableau) {
            if (this.isNearNode(pile.node, stack[0])) {
                if (this.canPlaceToTableau(cardComp, pile)) {
                    this.moveStack(cardNode, stack, pile, originalParentNode);
                    return;
                } else {
                    // 命中但不允许放置，回原位
                    this.resetStack(stack, originalParentNode ?? stack[0].parent!);
                    return;
                }
            }
        }

        // 未命中 → 回原位
        this.resetStack(stack, originalParentNode ?? stack[0].parent!);
    }

    /** 回原处：目标为原父的“末尾”位置（tableau 使用 offset，其他为 0） */
    resetStack(stack: Node[], originalParentNode: Node) {
        if (!originalParentNode) return;

        const parentPile = originalParentNode.getComponent(Pile);
        const isTableau = parentPile?.isTableau ?? false;

        const baseIndex = originalParentNode.children.length; // append position
        const baseLocalY = isTableau ? - baseIndex * this.tableauOffset : 0;

        const parentWorld = originalParentNode.getWorldPosition().clone();
        const baseWorld = parentWorld.clone().add(new Vec3(0, baseLocalY, 0));

        stack.forEach((node, i) => {
            const targetWorld = baseWorld.clone().add(new Vec3(0, isTableau ? -i * this.tableauOffset : 0, 0));
            tween(node)
                .to(0.12, { worldPosition: targetWorld })
                .call(() => {
                    node.parent = originalParentNode;
                    if (isTableau) node.setPosition(0, baseLocalY - i * this.tableauOffset);
                    else node.setPosition(0, 0);
                })
                .start();
        });
    }

    /**
     * 移动 stack 到目标 pile（带动画）
     * - 在最后一张 tween 回调中执行 tryFlipLastCard(oldPileNode)
     * - move 时 reparent 并恢复 worldPosition 以避免闪跳
     */
    moveStack(cardNode: Node, stack: Node[], targetPile: Pile, originalParentNode?: Node) {
        const oldPileNode = originalParentNode ?? cardNode.parent!;
        const oldPile = oldPileNode.getComponent(Pile)!;

        const isTableau = targetPile.isTableau;
        const isFoundation = targetPile.isFoundation;
        const isWaste = targetPile.isWaste;
        const isStock = targetPile.isStock;

        const existing = targetPile.node.children.length;
        const offset = isTableau ? this.computeTableauOffsetForPile(existing + stack.length) : 0;
        const baseLocalY = isTableau ? - existing * offset : 0;
        const targetBaseWorld = targetPile.node.getWorldPosition().clone().add(new Vec3(0, baseLocalY, 0));

        const oldPositions = stack.map(n => n.position.clone());
        const total = stack.length;

        stack.forEach((node, i) => {
            const worldTarget = targetBaseWorld.clone().add(new Vec3(0, isTableau ? - i * offset : 0, 0));

            tween(node)
                .to(0.12, { worldPosition: worldTarget })
                .call(() => {
                    node.parent = targetPile.node;

                    if (isFoundation || isWaste || isStock) {
                        node.setPosition(0, 0);
                    } else if (isTableau) {
                        node.setPosition(0, baseLocalY - i * offset);
                    } else {
                        node.setPosition(0, 0);
                    }

                    this.addMoves(1);

                    // 最后一张完成时翻原堆的最后一张
                    if (i === total - 1) {
                        this.tryFlipLastCard(oldPileNode);
                    }
                })
                .start();
        });

        const newPositions = stack.map((_, i) => isTableau ? new Vec3(0, baseLocalY - i * offset) : new Vec3(0, 0));

        this.undoManager.pushMove({
            cards: [...stack],
            from: oldPile,
            to: targetPile,
            oldPositions,
            newPositions,
        } as any);
    }

    /**
     * 计算 tableau 的 offset（当列很长时自动压缩）
     */
    computeTableauOffsetForPile(totalCardsInPile: number): number {
        const defaultOffset = this.tableauOffset;
        const maxVisibleHeight = this.maxTableauVisibleHeight;
        const needed = totalCardsInPile * defaultOffset;
        if (needed <= maxVisibleHeight) return defaultOffset;

        const compressed = Math.max(8, Math.floor(maxVisibleHeight / Math.max(1, totalCardsInPile)));
        return compressed;
    }

    /**
     * moveToFoundation：将单张牌移动到可放的 foundation（用于自动/双击）
     */
    moveToFoundation(cardNode: Node, originalParentNode?: Node): boolean {
        const cardComp = cardNode.getComponent(Card)!;
        for (const fd of this.foundation) {
            if (this.canPlaceToFoundation(cardComp, fd)) {
                this.moveStack(cardNode, [cardNode], fd, originalParentNode);
                this.addScore(10);
                return true;
            }
        }
        return false;
    }

    /** 翻牌处理：在 old pile 节点上翻最后一张（会把翻牌操作加入 undo） */
    private tryFlipLastCard(pileNode: Node | undefined | null) {
        if (!pileNode) return;
        const children = pileNode.children;
        if (!children || children.length === 0) return;
        const last = children[children.length - 1];
        if (!last) return;
        const pile = pileNode.getComponent(Pile)!;
        const c = last.getComponent(Card);
        if (c && !c.isFaceUp) {
            this.undoManager.pushMove({
                cards: [last],
                from: pile,
                to: pile,
                oldPositions: [last.position.clone()],
                newPositions: [last.position.clone()],
                flip: { card: last, wasFaceUp: false }
            } as any);
            c.flipFaceUp();
        }
    }

    /** 屏幕尺寸变化 */
    onScreenResize() {
        // 调整 Tableau 卡牌位置（使用当前每列的 offset）
        for (let col = 0; col < this.tableau.length; col++) {
            const pile = this.tableau[col];
            const children = pile.node.children;
            const actualOffset = this.computeTableauOffsetForPile(children.length);
            children.forEach((cardNode, i) => {
                cardNode.setPosition(0, -i * actualOffset);
            });
        }

        // Foundation 重叠
        for (const pile of this.foundation) {
            pile.node.children.forEach((cardNode) => {
                cardNode.setPosition(0, 0);
            });
        }
    }

    async autoSolve() {
        // placeholder：可以接 AutoSolver
    }
}
