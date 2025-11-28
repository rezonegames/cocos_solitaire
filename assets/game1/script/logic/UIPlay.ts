import {_decorator, Canvas, director, Node, Prefab, tween, UITransform, Vec3, instantiate, UIOpacity, Vec2} from 'cc';
import _ from 'lodash-es';
import VMParentView from "db://assets/libs/gui/VMParentView";
import {CardFactory} from './CardFactory';
import {Card} from './Card';
import {Pile} from './Pile';
import {UndoManager} from './UndoManager';
import {AutoSolver} from "db://assets/game1/script/logic/AutoSolver";
import {logger} from "db://assets/libs/log/Logger";

const {ccclass, property} = _decorator;

@ccclass('UIPlay')
export class UIPlay extends VMParentView {
    protected data = {
        score: 0,
        lastTotalTime: 0,
        totalTime: 0,
        totalTimeString: '00:00',
        moves: 0,
    }

    @property(Node) dragNode: Node = null;
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

    // runtime piles
    tableau: Pile[] = [];
    stock: Pile = null!;
    waste: Pile = null!;
    foundation: Pile[] = [];

    factory: CardFactory = null!;
    undoManager: UndoManager = null!;

    // 拖拽相关
    private dragCopies: Node[] = [];
    private dragOffset: Vec3 = new Vec3();
    private selectedStack: Node[] = [];

    // 自动跑关
    private autoSolver: AutoSolver = null;

    // 游戏运行状态
    private _isRunning = false;

    start() {
        this.initGame();

        const canvas = director.getScene()!.getComponent(Canvas);
        canvas.node.on('size-changed', this.onScreenResize, this);

        // 点击 waste 区域回收
        this.waste.node.on(Node.EventType.TOUCH_END, this.tryRecycleWasteToStock, this);
    }

    updateTime(deltaTime: number = 0) {
        this.data.totalTime += deltaTime;
        if (this.data.totalTime - this.data.lastTotalTime < 1) return;
        const m = _.padStart(Math.floor(this.data.totalTime / 60).toString(), 2, '0');
        const s = _.padStart(Math.floor(this.data.totalTime % 60).toString(), 2, '0');
        this.data.totalTimeString = `${m}:${s}`;
        this.data.lastTotalTime = this.data.totalTime;
    }

    addScore(score: number = 0) {
        this.data.score += score;
    }

    addMoves(moves: number = 0) {
        this.data.moves += moves;
    }

    getTableauOffset() {
        return this.tableauOffset;
    }

    // 拖拽相关方法
    startDrag(cardNode: Node, offset: Vec3) {
        this.dragOffset = offset;
        this.selectedStack = this.getStackFrom(cardNode);
        this.dragCopies = [];

        this.selectedStack.forEach((node, idx) => {
            const copy = instantiate(node);
            copy.parent = this.dragNode;
            const worldPos = node.getWorldPosition();
            copy.setWorldPosition(worldPos);
            node.getComponent(UIOpacity).opacity = 0;
            this.dragCopies.push(copy);
        });
    }

    updateDrag(touchLocation: Vec2) {
        if (!this.dragCopies.length) return;

        const parentUI = this.dragNode.getComponent(UITransform)!;
        const pos = parentUI.convertToNodeSpaceAR(new Vec3(touchLocation.x, touchLocation.y));
        const targetPos = pos.subtract(this.dragOffset);

        this.dragCopies.forEach((copy, i) => {
            copy.setPosition(targetPos.x, targetPos.y - i * this.tableauOffset, 0);
        });
    }

    endDrag() {
        if (!this.selectedStack.length || !this.dragCopies.length) return;

        // 使用副本进行碰撞检测和放置逻辑
        const success = this.handleDropWithCopies(this.dragCopies[0], this.dragCopies);

        if (success) {
            // 放置成功：将原始节点移动到副本的最终位置，然后让 moveStack 处理
            this.selectedStack.forEach((node, idx) => {
                if (this.dragCopies[idx]) {
                    const copyWorldPos = this.dragCopies[idx].getWorldPosition();
                    node.setWorldPosition(copyWorldPos);
                }
                node.getComponent(UIOpacity).opacity = 255;
            });

            // 执行实际的移动逻辑
            this.handleDrop(this.selectedStack[0], this.selectedStack);
        } else {
            // 放置失败：直接恢复原始节点的显示，位置不变
            this.selectedStack.forEach(node => {
                node.getComponent(UIOpacity).opacity = 255;
            });
        }

        // 清理副本和选中栈
        this.dragCopies.forEach(copy => copy.destroy());
        this.dragCopies = [];
        this.selectedStack = [];
    }

    /** 使用副本进行碰撞检测，返回是否可以放置 */
    handleDropWithCopies(copyCardNode: Node, copyStack: Node[]): boolean {
        const originalCard = this.selectedStack[0];
        const cardComp = originalCard.getComponent(Card)!;

        // Foundation 优先
        for (const fd of this.foundation) {
            if (this.isNearNode(fd.node, copyStack[0]) && this.canPlaceToFoundation(cardComp, fd)) {
                return true;
            }
        }

        // Tableau 判定
        for (const pile of this.tableau) {
            const topCard = pile.getTopCard();
            if (originalCard.parent !== pile.node && this.isNearNode(topCard || pile.node, copyStack[0])) {
                if (this.canPlaceToTableau(cardComp, pile)) {
                    return true;
                } else {
                    return false; // 命中但不允许放置
                }
            }
        }

        return false; // 未命中任何目标
    }

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
        this.autoSolver = new AutoSolver();
        this.autoSolver.init(this);

        let deck = this.factory.generateDeck();
        this.factory.shuffle1(deck, 1);

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

    /** 获取从指定牌开始的牌堆 */
    getStackFrom(cardNode: Node): Node[] {
        const parent = cardNode.parent!;
        const parentPile = parent.getComponent(Pile);

        // waste 只能取顶牌（一张）
        if (parentPile && (parentPile as any).isWaste) {
            const topCard = parentPile.getTopCard();
            return topCard === cardNode ? [cardNode] : [];
        }

        // 其他情况按原逻辑处理
        const children = parent.children;
        const idx = children.indexOf(cardNode);
        return children.slice(idx);
    }

    /** 判断能否放到 tableau */
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

    /** 点击 stock */
    onClickStock() {
        const last = this.stock.getTopCard();
        if (!last) {
            return;
        }
        const cardComp = last.getComponent(Card)!;
        cardComp.flipFaceUp();

        last.setParent(this.waste.node);
        last.setPosition(0, 0);
    }

    tryRecycleWasteToStock() {
        const topCard = this.waste.getTopCard();
        if(topCard?.getComponent(Card).rank === 1) {
            return;
        }
        if (this.stock.isEmpty()) {
            this.recycleWasteToStock();
        }
    }

    recycleWasteToStock() {
        const cards = [...this.waste.node.children].reverse();
        for (const c of cards) {
            c.setParent(this.stock.node);
            c.getComponent(Card)!.flipFaceDown();
        }
    }

    /** 双击自动放到 foundation */
    tryAutoToFoundation(cardNode: Node) {
        const cardComp = cardNode.getComponent(Card)!;

        const fromPile = cardNode.parent!.getComponent(Pile);
        if (!cardComp.isFaceUp || fromPile?.isStock) return;

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

        const pilePos = pileNode.getWorldPosition();
        const dropPos = dropNode.getWorldPosition();
        const distance = Vec3.distance(pilePos, dropPos);
        return distance < 80;
    }

    /** 拖拽结束处理 */
    handleDrop(cardNode: Node, stack: Node[]) {
        const cardComp = cardNode.getComponent(Card)!;

        // Foundation 优先
        for (const fd of this.foundation) {
            if (this.isNearNode(fd.node, stack[0]) && this.canPlaceToFoundation(cardComp, fd)) {
                this.moveStack(cardNode, stack, fd);
                this.addScore(10);
                return;
            }
        }

        // Tableau 判定
        for (const pile of this.tableau) {
            const topCard = pile.getTopCard();
            if (cardNode.parent !== pile.node && this.isNearNode(topCard || pile.node, stack[0])) {
                if (this.canPlaceToTableau(cardComp, pile)) {
                    this.moveStack(cardNode, stack, pile);
                    return;
                } else {
                    this.resetStack(stack, cardNode.parent!);
                    return;
                }
            }
        }

        // 未命中 → 回原位
        this.resetStack(stack, cardNode.parent!);
    }

    /** 回原处 */
    resetStack(stack: Node[], originalParentNode: Node) {
        if (!originalParentNode) return;

        const parentPile = originalParentNode.getComponent(Pile);
        const isTableau = parentPile?.isTableau ?? false;
        const startIndex = originalParentNode.children.length - stack.length;

        stack.forEach((node, i) => {
            const localY = isTableau ? -(startIndex + i) * this.tableauOffset : 0;

            tween(node)
                .to(0.12, {position: new Vec3(0, localY, 0)})
                .call(() => {
                    node.setParent(originalParentNode);
                    node.setPosition(0, localY, 0);
                })
                .start();
        });
    }

    /** 移动 stack 到目标 pile */
    moveStack(cardNode: Node, stack: Node[], targetPile: Pile) {
        const oldPileNode = cardNode.parent!;
        const oldPile = oldPileNode.getComponent(Pile)!;

        const isTableau = targetPile.isTableau;
        const isFoundation = targetPile.isFoundation;
        const isWaste = targetPile.isWaste;
        const isStock = targetPile.isStock;

        const existing = targetPile.node.children.length;
        const offset = isTableau ? this.computeTableauOffsetForPile(existing + stack.length) : 0;
        const baseLocalY = isTableau ? -existing * offset : 0;
        const targetBaseWorld = targetPile.node.getWorldPosition().clone().add(new Vec3(0, baseLocalY, 0));

        const oldPositions = stack.map(n => n.position.clone());
        const total = stack.length;

        const newPositions = stack.map((_, i) => isTableau ? new Vec3(0, baseLocalY - i * offset) : new Vec3(0, 0));
        this.undoManager.pushMove({
            cards: [...stack],
            from: oldPile,
            to: targetPile,
            oldPositions,
            newPositions,
        } as any);

        stack.forEach((node, i) => {
            const worldTarget = targetBaseWorld.clone().add(new Vec3(0, isTableau ? -i * offset : 0, 0));

            tween(node)
                .to(0.12, {worldPosition: worldTarget})
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

                    if (i === total - 1) {
                        this.tryFlipLastCard(oldPileNode);
                    }
                })
                .start();
        });
    }

    /** 计算 tableau 的 offset */
    computeTableauOffsetForPile(totalCardsInPile: number): number {
        const defaultOffset = this.tableauOffset;
        const maxVisibleHeight = this.maxTableauVisibleHeight;
        const needed = totalCardsInPile * defaultOffset;
        if (needed <= maxVisibleHeight) return defaultOffset;

        const compressed = Math.max(8, Math.floor(maxVisibleHeight / Math.max(1, totalCardsInPile)));
        return compressed;
    }

    /** 翻牌处理 */
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
                flip: {card: last, wasFaceUp: false}
            } as any);
            c.flipFaceUp();
        }
    }

    /** 屏幕尺寸变化 */
    onScreenResize() {
        for (let col = 0; col < this.tableau.length; col++) {
            const pile = this.tableau[col];
            const children = pile.node.children;
            const actualOffset = this.computeTableauOffsetForPile(children.length);
            children.forEach((cardNode, i) => {
                cardNode.setPosition(0, -i * actualOffset);
            });
        }

        for (const pile of this.foundation) {
            pile.node.children.forEach((cardNode) => {
                cardNode.setPosition(0, 0);
            });
        }
    }

    onUndo() {
        const action = this.undoManager.pop();
        if (!action) return;

        // 处理翻牌操作
        if (action.flip) {
            const card = action.flip.card.getComponent(Card);
            if (action.flip.wasFaceUp) {
                card.flipFaceUp();
            } else {
                card.flipFaceDown();
            }
            return;
        }

        // 处理移动操作
        const { cards, from, to, oldPositions } = action;

        // 将牌从目标位置移回原位置
        cards.forEach((cardNode, index) => {
            cardNode.parent = from.node;
            cardNode.setPosition(oldPositions[index]);
        });

        // 重新排列原pile中的牌的位置
        this.repositionPileCards(from);

        // 如果目标pile不为空，也重新排列
        if (to && to !== from) {
            this.repositionPileCards(to);
        }

        // 减少移动次数
        this.data.moves = Math.max(0, this.data.moves - 1);
    }

    /**
     * 重新排列pile中牌的位置
     */
    private repositionPileCards(pile: Pile) {
        const isTableau = (pile as any).isTableau;
        const children = pile.node.children;

        if (isTableau) {
            const offset = this.computeTableauOffsetForPile(children.length);
            children.forEach((cardNode, index) => {
                cardNode.setPosition(0, -index * offset, 0);
            });
        } else {
            // Foundation, Stock, Waste 等都叠在一起
            children.forEach(cardNode => {
                cardNode.setPosition(0, 0, 0);
            });
        }
    }

    async autoSolve() {
        this.autoSolver.start()
    }

    onPause() {
        this.autoSolver.stop();
    }

    update(delta: number) {
        this.updateTime(delta);
    }
}