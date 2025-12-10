import {_decorator, Canvas, director, instantiate, Node, Prefab, tween, UIOpacity, UITransform, Vec2, Vec3, Label, Color} from 'cc';
import _ from 'lodash-es';
import VMParentView from "db://assets/libs/gui/VMParentView";
import {CardFactory} from './CardFactory';
import {Card, suits} from './Card';
import {Pile} from './Pile';
import {UndoManager} from './UndoManager';
import {AutoSolver} from "./AutoSolver";
import {WinAnimation} from "./WinAnimation";
import {logger} from "db://assets/libs/log/Logger";
import {Player, UIID} from "db://assets/game1/script/YY";
import {VM} from "db://assets/libs/modelview/ViewModel";
import {uiManager, UIManager} from "db://assets/libs/ui/UIManager";

const {ccclass, property} = _decorator;

@ccclass('UIPlay')
export class UIPlay extends VMParentView {
    protected data = {
        score: 0,
        scoreDetail: {},
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
    private winAnimation: WinAnimation = null;

    // 游戏运行状态
    private _isRunning = false;
    private _isOperating = false; // 是否正在操作中（防止并发操作）

    // 玩家数据
    private player = VM.get<Player>('player').$data;

    protected onLoad() {
        super.onLoad();
        const canvas = director.getScene()!.getComponent(Canvas);
        canvas.node.on('size-changed', this.onScreenResize, this);
    }

    async start() {
        await this.initGame();

    }

    /** 初始化游戏 */
    async initGame() {
        /** 初始化 piles 并标注类型，准备牌桌 */
        this.tableau = this.tableauRoots.map(n => {
            const p = n.getComponent(Pile) ?? n.addComponent(Pile);
            p.isTableau = true;
            return p;
        });
        this.stock = this.stockRoot.getComponent(Pile) ?? this.stockRoot.addComponent(Pile);
        this.stock.isStock = true;
        this.waste = this.wasteRoot.getComponent(Pile) ?? this.wasteRoot.addComponent(Pile);
        this.waste.isWaste = true;
        this.foundation = this.foundationRoots.map(n => {
            const p = n.getComponent(Pile) ?? n.addComponent(Pile);
            p.isFoundation = true;
            return p;
        });

        /** 生成扑克牌 */
        this.factory = new CardFactory(this.cardPrefab);
        let deck = await this.factory.generateDeck(this.player.kind, this.player.level);

        /** 下面是发牌逻辑：todo：重写 */
        deck.reverse();
        // 先将所有牌放入stock（对应U3D的holderHelpClose）
        for (const card of deck) {
            this.stock.addCard(card);
            const cardComp = card.getComponent(Card)!;
            cardComp.flipFaceDown();
        }
        // 从stock发牌到tableau（对应U3D的发牌逻辑）
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                // 计算从stock末尾取牌的索引：listCard.Count - 1 - j * (6 - i)
                const stockCards = this.stock.getAllCards();
                const index = stockCards.length - 1 - j * (6 - i);
                const card = stockCards[index];
                
                const pile = this.tableau[i];
                pile.addCard(card);
                
                const cardComp = card.getComponent(Card)!;
                const faceUp = j === i;
                if (faceUp) cardComp.flipFaceUp();
                else cardComp.flipFaceDown();
            }
        }

        /** 自动完成 */
        this.autoSolver = new AutoSolver();
        this.autoSolver.init(this);
        /** 动画 */
        this.winAnimation = new WinAnimation();
        this.winAnimation.init(this);
        /** 重做 */
        this.undoManager = new UndoManager();
        this.undoManager.clear?.();
    }

    /** 重新开始 */
    async restartGame() {
        await this.initGame();
    }

    update(delta: number) {
        this.updateTime(delta);
    }

    /** 更新游戏时常 */
    updateTime(deltaTime: number = 0) {
        this.data.totalTime += deltaTime;
        if (this.data.totalTime - this.data.lastTotalTime < 1) return;
        const m = _.padStart(Math.floor(this.data.totalTime / 60).toString(), 2, '0');
        const s = _.padStart(Math.floor(this.data.totalTime % 60).toString(), 2, '0');
        this.data.totalTimeString = `${m}:${s}`;
        this.data.lastTotalTime = this.data.totalTime;
    }

    /** 加分 */
    addScore(card: Card, score: number = 0) {
        const key = card.key;
        if(!this.data.scoreDetail[key]) {
            this.data.scoreDetail[key] = score;
            this.data.score += score;
            this.showScoreAnimation(card.node, score);
        }
    }

    /** 显示加分动画 */
    private showScoreAnimation(cardNode: Node, score: number) {
        const scoreNode = new Node('ScoreText');
        const label = scoreNode.addComponent(Label);
        label.string = `+${score}`;
        label.fontSize = 40;
        label.color = new Color(255, 215, 0);
        
        scoreNode.setParent(this.dragNode);
        
        const cardUI = cardNode.getComponent(UITransform);
        const cardHeight = cardUI ? cardUI.height : 200;
        
        const worldPos = cardNode.getWorldPosition();
        scoreNode.setWorldPosition(worldPos);
        const localPos = scoreNode.position.clone();
        localPos.y -= cardHeight / 2;
        scoreNode.setPosition(localPos);
        
        const opacity = scoreNode.addComponent(UIOpacity);
        opacity.opacity = 0;
        
        const targetY = localPos.y + cardHeight;
        tween(scoreNode)
            .parallel(
                tween().to(0.8, {position: new Vec3(localPos.x, targetY, localPos.z)}, {easing: 'sineOut'}),
                tween().to(0.3, {}, {onUpdate: () => {
                    opacity.opacity = Math.min(255, opacity.opacity + 12);
                }})
            )
            .delay(0.3)
            .to(0.5, {}, {
                onUpdate: () => {
                    opacity.opacity = Math.max(0, opacity.opacity - 10);
                }
            })
            .call(() => {
                scoreNode.destroy();
            })
            .start();
    }

    /** 移动的步数 */
    addMoves(moves: number = 0) {
        this.data.moves += moves;
    }

    /** 双击 */
    onDBClickCard(node: Node, offset: Vec3): void {
    }

    /** 单击 */
    onClickCard(cardNode: Node, offset: Vec3) {
        if (this._isOperating) return;
        
        const card = cardNode.getComponent(Card);
        const pile = cardNode.parent.getComponent(Pile);
        // 如果点击的是stock的card
        if (pile === this.stock) {
            const last = this.stock.getTopCard();
            if (!last) {
                return;
            }
            const cardComp = last.getComponent(Card)!;
            this.waste.addCard(cardNode);
            cardComp.flipFaceUp();
            return;
        } else {
            const fromPile = cardNode.parent.getComponent(Pile);
            for (const pile of this.tableau) {
                if (this.canPlaceToTableau(card, pile)) {
                    this.startDrag(cardNode, offset);
                    this.moveStack(fromPile, this.dragCopies, pile);
                    return;
                }
            }
            for (const fd of this.foundation) {
                if (this.canPlaceToFoundation(card, fd)) {
                    this.startDrag(cardNode, offset);
                    this.moveStack(fromPile, this.dragCopies, fd);
                    return;
                }
            }
            card.simpleShake();
        }
    }

    // 拖拽相关方法
    startDrag(cardNode: Node, offset: Vec3): Node[] {
        if (this._isOperating) return [];
        
        this._isOperating = true;
        this.dragOffset = offset;
        this.selectedStack = this.getStackFrom(cardNode);
        this.dragCopies = [];

        this.selectedStack.forEach((node, idx) => {
            const copy = instantiate(node);
            copy.parent = this.dragNode;
            const worldPos = node.getWorldPosition();
            copy.setWorldPosition(worldPos);
            node.getComponent(Card)!.hide();
            this.dragCopies.push(copy);

            // const card1 = node.getComponent(Card);
            // const card2 = copy.getComponent(Card);
            // logger.logView(`startDrag card1: ${card1.detail()} card2: ${card2.detail()}`);
        });
        return this.dragCopies;
    }

    updateDrag(touchLocation: Vec2) {
        if (!this.dragCopies.length) return;

        const parentUI = this.dragNode.getComponent(UITransform)!;
        const pos = parentUI.convertToNodeSpaceAR(new Vec3(touchLocation.x, touchLocation.y));
        const targetPos = pos.subtract(this.dragOffset);

        this.dragCopies.forEach((copy, i) => {
            copy.setPosition(targetPos.x, targetPos.y - i * Pile.tableauFaceUpOffset, 0);
        });
    }

    endDrag() {
        if (!this.dragCopies.length) {
            this._isOperating = false;
            return;
        }
        this.handleDrop();
    }

    /** 获取从指定牌开始的牌堆 */
    getStackFrom(cardNode: Node): Node[] {
        const parent = cardNode.parent!;
        const parentPile = parent.getComponent(Pile);
        if (!parentPile) {
            logger.trace(`getStackFrom no parent Pile err: ${parent.name}`);
            return [];
        }
        return parentPile.getStackFrom(cardNode);
    }

    /** 判断能否放到 tableau */
    canPlaceToTableau(cardComp: Card, pile: Pile) {
        const last = pile.getTopCard();
        if (!last) return cardComp.rank === 13;
        const lastCard = last.getComponent(Card)!;
        const movingColor = cardComp.getColor();
        const lastColor = lastCard.getColor();
        const v = lastColor !== movingColor && lastCard.rank === cardComp.rank + 1
        // if (v) logger.logView(`canPlaceToTableau dragCard: ${cardComp.detail()} pileLastCard: ${lastCard.detail()} v: ${v}`);
        return v;
    }

    /** 判断能否放到 foundation */
    canPlaceToFoundation(cardComp: Card, pile: Pile) {
        const cardNode = cardComp.node;

        const cardPile = cardNode.parent.getComponent(Pile);
        if (!!cardPile && !cardPile.isTopCard(cardNode)) return false;

        const last = pile.getTopCard();
        if (!last) return cardComp.rank === 1;
        const lastCard = last.getComponent(Card)!;
        return lastCard.suit === cardComp.suit && lastCard.rank + 1 === cardComp.rank;
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
    handleDrop() {
        const topCard = this.dragCopies[0];
        const topCardComp = topCard.getComponent(Card)!;
        const fromPile = this.selectedStack[0].parent.getComponent(Pile);

        // Foundation 优先
        for (const fd of this.foundation) {
            if (this.isNearNode(fd.node, topCard) && this.canPlaceToFoundation(topCardComp, fd)) {
                this.moveStack(fromPile, this.dragCopies, fd);
                return;
            }
        }

        // Tableau 判定
        for (const pile of this.tableau) {
            if (this.isNearNode(pile.getTopCard() || pile.node, topCard)) {
                if (this.canPlaceToTableau(topCardComp, pile)) {
                    this.moveStack(fromPile, this.dragCopies, pile);
                    return;
                } else {
                    this.moveStack(fromPile, this.dragCopies, fromPile);
                    return;
                }
            }
        }
        this.moveStack(fromPile, this.dragCopies, fromPile);
    }

    /** 移动 stack 到目标 pile，如果fromPile==targetPile，说明回到原点了 */
    moveStack(fromPile: Pile, stack: Node[], targetPile: Pile, isTest: boolean = false) {
        let baseLocalY = 0;
        if (targetPile.isTableau) {
            /**
             * 这部分比较绕，如果返回原处，直接设置为第一个选中的节点，为初始baseY。
             * 如果到目标节点，初始位置应该+1个tableauFaceUpOffset
             */
            if (fromPile !== targetPile) {
                const topCard = targetPile.getTopCard();
                if (!!topCard) {
                    baseLocalY = targetPile.computeTableauCardY(topCard);
                    baseLocalY -= Pile.tableauFaceUpOffset;
                }
            } else {
                baseLocalY = targetPile.computeTableauCardY(this.selectedStack[0]);
            }
        }
        const targetBaseWorld = targetPile.node.getWorldPosition().clone().add(new Vec3(0, baseLocalY, 0));
        const total = stack.length;
        stack.forEach((node, i) => {
            const worldTarget = targetBaseWorld.clone().add(new Vec3(0, targetPile.isTableau ?
                -Pile.tableauFaceUpOffset * i : 0, 0));
            tween(node)
                .to(0.2, {worldPosition: worldTarget})
                .call(() => {
                    node.getComponent(Card).hide();
                    // 全部隐藏
                    if (i === total - 1) {
                        this.moveDone(fromPile, targetPile, isTest);
                    }
                })
                .start();
        });
    }

    /** 真正的修改card位置 */
    moveDone(fromPile: Pile, targetPile: Pile, isTest: boolean) {
        if (!isTest) {
            if (fromPile === targetPile) {
                // 回到原来的位置！！
                this.selectedStack.forEach((node, i) => {
                    node.getComponent(Card).show();
                })
            } else {
                // 检查是否需要翻牌
                const fromTopCard = fromPile.getTopCard();
                let flippedCard: Node | undefined;
                if (fromTopCard) {
                    const card = fromTopCard.getComponent(Card);
                    if (card && !card.isFaceUp) {
                        flippedCard = fromTopCard;
                    }
                }

                // 移动牌
                this.selectedStack.forEach((node, i) => {
                    targetPile.addCard(node);
                    node.getComponent(Card).show();
                    // logger.logView(`moveDone fromPile: ${fromPile.name} targetPile: ${targetPile.name}`);
                })

                // 翻牌
                if (flippedCard) {
                    flippedCard.getComponent(Card).flipFaceUp();
                }

                // 保存undo
                this.undoManager.pushMove({
                    cards: [...this.selectedStack],
                    from: fromPile,
                    to: targetPile,
                    flippedCard: flippedCard
                });

                this.addMoves(1);
                if(targetPile.isFoundation) {
                    this.addScore(this.selectedStack[0].getComponent(Card), 10);
                }
                this.autoSolver.checkLose();
                if (this.autoSolver.checkWin()) {
                    this.autoSolver.autoComplete()
                }
            }
        }
        else {
            this.selectedStack.forEach((node, i) => {
                node.getComponent(Card).show();
            })
        }

        // 清理副本和选中栈
        this.dragCopies.forEach(copy => copy.destroy());
        this.dragCopies = [];
        this.selectedStack = [];
        this._isOperating = false;
    }

    /** 翻牌处理 */
    private tryFlipLastCard(pileNode: Node | undefined | null) {
        if (!pileNode) return;
        const pile = pileNode.getComponent(Pile);
        if (!pile) return;
        const last = pile.getTopCard();
        if (!last) return;
        const c = last.getComponent(Card);
        if (c && !c.isFaceUp) {
            c.flipFaceUp();
        }
    }

    /** 屏幕尺寸变化 */
    onScreenResize() {
        for (let col = 0; col < this.tableau.length; col++) {
            const pile = this.tableau[col];
            pile.forEachCard((cardNode) => {
                const y = pile.computeTableauCardY(cardNode);
                cardNode.setPosition(0, y);
            });
        }

        for (const pile of this.foundation) {
            pile.forEachCard((cardNode) => {
                cardNode.setPosition(0, 0);
            });
        }
    }

    recycleWasteToStock() {
        const cards = [...this.waste.getAllCards()].reverse();
        for (const card of cards) {
            this.stock.addCard(card);
            card.getComponent(Card)!.flipFaceDown();
        }
    }

    onUndo() {
        if (this.undoManager.isEmpty()) {
            logger.logView('没有可以撤销的操作');
            return;
        }

        const action = this.undoManager.pop();
        if (!action) return;

        const {cards, from, to, flippedCard} = action;

        // 如果有翻牌，先翻回去
        if (flippedCard) {
            const card = flippedCard.getComponent(Card);
            if (card && card.isFaceUp) {
                card.flipFaceDown();
            }
        }

        // 将牌从目标位置移回原位置
        cards.forEach((cardNode) => {
            from.addCard(cardNode);
        });

        // 重新排列pile中的牌的位置
        this.repositionPileCards(from);
        this.repositionPileCards(to);

        // 减少移动次数
        this.data.moves = Math.max(0, this.data.moves - 1);
    }

    /**
     * 重新排列pile中牌的位置
     */
    private repositionPileCards(pile: Pile) {
        if (pile.isTableau) {
            pile.forEachCard((cardNode) => {
                const y = pile.computeTableauCardY(cardNode);
                cardNode.setPosition(0, y);
            });
        } else {
            // Foundation, Stock, Waste 等都叠在一起
            pile.forEachCard((cardNode) => {
                cardNode.setPosition(0, 0, 0);
            });
        }
    }

    /** 打乱扣着的牌重试 */
    shuffleAndRetry() {
        // 1. 收集所有扣着的牌节点
        const faceDownCards: Node[] = [];
        for (const pile of this.tableau) {
            pile.forEachCard((cardNode) => {
                const card = cardNode.getComponent(Card)!;
                if (!card.isFaceUp) {
                    faceDownCards.push(cardNode);
                }
            });
        }
        this.stock.forEachCard((cardNode) => {
            faceDownCards.push(cardNode);
        });
        this.waste.forEachCard((cardNode) => {
            faceDownCards.push(cardNode);
        });

        if (faceDownCards.length === 0) return false;

        // 2. 收集所有已经使用的牌（翻开的牌和foundation中的牌）
        const usedCards = new Set<string>();

        // 收集 tableau 中翻开的牌
        for (const pile of this.tableau) {
            pile.forEachCard((cardNode) => {
                const card = cardNode.getComponent(Card)!;
                if (card.isFaceUp) {
                    usedCards.add(`${card.suit}-${card.rank}`);
                }
            });
        }

        // 收集 foundation 中的牌
        for (const pile of this.foundation) {
            pile.forEachCard((cardNode) => {
                const card = cardNode.getComponent(Card)!;
                usedCards.add(`${card.suit}-${card.rank}`);
            });
        }

        // 3. 生成完整的52张牌，排除已使用的牌
        const availableCards: { suit: string, rank: number }[] = [];
        for (const suit of suits) {
            for (let rank = 1; rank <= 13; rank++) {
                const key = `${suit}-${rank}`;
                if (!usedCards.has(key)) {
                    availableCards.push({suit, rank});
                }
            }
        }

        // 4. 验证数量是否匹配
        if (availableCards.length !== faceDownCards.length) {
            logger.trace(`牌数不匹配！可用牌: ${availableCards.length}, 扣着的牌: ${faceDownCards.length}`);
            return false;
        }

        // 5. 打乱可用的牌
        for (let i = availableCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableCards[i], availableCards[j]] = [availableCards[j], availableCards[i]];
        }

        // 6. 添加洗牌动画并重新分配
        faceDownCards.forEach((cardNode, index) => {
            const card = cardNode.getComponent(Card)!;
            const originalPos = cardNode.position.clone();
            const delay = index * 0.05;

            tween(cardNode)
                .delay(delay)
                // 向上飞起并旋转
                .parallel(
                    tween().to(0.1, {
                        position: new Vec3(originalPos.x, originalPos.y + 100, originalPos.z)
                    }),
                    tween().to(0.1, {
                        scale: new Vec3(0.8, 0.8, 1)
                    }),
                    tween().by(0.1, {
                        eulerAngles: new Vec3(0, 0, 360)
                    })
                )
                // 水平翻转
                .to(0.2, {scale: new Vec3(0, 0.8, 1)})
                .call(() => {
                    // 重新设置牌
                    const v = availableCards[index];
                    card.init(v.suit, v.rank);
                })
                // 翻转回来
                .to(0.1, {scale: new Vec3(0.8, 0.8, 1)})
                // 落回原位
                .parallel(
                    tween().to(0.2, {
                        position: originalPos
                    }),
                    tween().to(0.2, {
                        eulerAngles: new Vec3(0, 0, 0)
                    }),
                    tween().to(0.2, {
                        scale: new Vec3(0.66, 0.66, 1)
                    })
                )
                .start();
        });

        logger.logView(`打乱了 ${faceDownCards.length} 张扣着的牌`);
        return true;
    }


    async onAutoSolve() {
        if (this.autoSolver.isRunning()) {
            this.autoSolver.stop();
        } else {
            await this.autoSolver.start();
        }
    }

    onMagic() {
        this.shuffleAndRetry()
    }

    onPause() {
        uiManager.open(UIID.UIPause, this);
    }

    onGameWin() {
        this.winAnimation.play();
    }

    /** 结算，claim+广告+自动进入下一关 */
    onAnimationComplete() {
        logger.logView(`完成，准备下一关`);
        uiManager.open(UIID.UIWin, this);
    }

    async onHint() {
        await this.autoSolver.test();
    }

    onDeal(type: string) {
    }
}