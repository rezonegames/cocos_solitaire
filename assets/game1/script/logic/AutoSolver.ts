import {_decorator, Node, Vec3} from 'cc';
import {UIPlay} from './UIPlay';
import {Card} from './Card';
import {Pile} from './Pile';
import {logger} from "db://assets/libs/log/Logger";

const {ccclass} = _decorator;

interface HintAction {
    fromCard: Node;
    toPile: Pile;
}

@ccclass('AutoSolver')
export class AutoSolver {
    playing: UIPlay = null!;
    running = false;
    actionDelay = 200;
    flipBeforeMoveDelay = 100;
    loseTimes = 0;

    init(game: UIPlay) {
        this.playing = game;
        this.running = false;
    }

    isRunning() {
        return this.running;
    }

    async start() {
        if (this.running) return;
        this.running = true;
        this.loseTimes = 0;
        logger.logView('AutoSolver: 开始自动求解');

        while (this.running) {
            if (this.isGameWin()) {
                logger.logView('AutoSolver: 游戏胜利！');
                this.playing.onGameWin();
                this.running = false;
                break;
            }

            if (this.checkLose()) {
                logger.logView('AutoSolver: 牌局失败');
                this.running = false;
                break;
            }

            const hints = this.getHint();
            if (hints.length > 0) {
                await this.executeHint(hints[0]);
                await this.delay(this.actionDelay);
                continue;
            }

            if (await this.tryMoveWasteCard()) {
                await this.delay(this.actionDelay);
                continue;
            }

            if (await this.tryFlipTableauCard()) {
                await this.delay(this.flipBeforeMoveDelay);
                continue;
            }

            if (await this.tryDrawFromStock()) {
                await this.delay(this.actionDelay);
                continue;
            }

            if (await this.tryRecycleWaste()) {
                await this.delay(this.actionDelay);
                continue;
            }

            logger.logView('AutoSolver: 无可用动作');
            this.running = false;
            break;
        }
    }

    stop() {
        this.running = false;
        logger.logView('AutoSolver: 停止求解');
    }

    checkLose(): boolean {
        const stockEmpty = this.playing.stock.isEmpty();
        const wasteEmpty = this.playing.waste.isEmpty();

        if (!stockEmpty || !wasteEmpty) return false;

        const hints = this.getHint();
        if (hints.length > 0) return false;

        for (const pile of this.playing.tableau) {
            const cards = pile.getAllCards();
            for (const cardNode of cards) {
                const card = cardNode.getComponent(Card);
                if (!card.isFaceUp) return false;
            }
        }

        this.loseTimes++;
        return true;
    }

    isGameWin(): boolean {
        for (const pile of this.playing.foundation) {
            const topCard = pile.getTopCard();
            if (!topCard) return false;
            const card = topCard.getComponent(Card);
            if (card.rank !== 13) return false;
        }
        return true;
    }

    async test() {
        logger.logView('=== Test: 开始测试提示功能 ===');
        const hintList = this.getHint();
        logger.logView(`找到 ${hintList.length} 个提示`);
        
        for (let i = 0; i < hintList.length; i++) {
            const hint = hintList[i];
            const card = hint.fromCard.getComponent(Card);
            logger.logView(`执行提示 ${i + 1}: ${card.detail()} -> ${hint.toPile.node.name}`);
            await this.executeHint(hint, true);
            await this.delay(500);
        }
        logger.logView('=== Test: 测试完成 ===');
    }

    getHint(): HintAction[] {
        const hintList: HintAction[] = [];

        const wasteTop = this.playing.waste.getTopCard();
        if (wasteTop) {
            const card = wasteTop.getComponent(Card);
            for (const fd of this.playing.foundation) {
                if (this.playing.canPlaceToFoundation(card, fd)) {
                    hintList.push({fromCard: wasteTop, toPile: fd});
                    return hintList;
                }
            }
            for (const pile of this.playing.tableau) {
                if (this.playing.canPlaceToTableau(card, pile)) {
                    hintList.push({fromCard: wasteTop, toPile: pile});
                }
            }
        }

        for (const fromPile of this.playing.tableau) {
            const cards = fromPile.getVisibleCards();
            for (const cardNode of cards) {
                const card = cardNode.getComponent(Card);
                if (!card.isFaceUp) continue;

                for (const fd of this.playing.foundation) {
                    if (this.playing.canPlaceToFoundation(card, fd)) {
                        hintList.push({fromCard: cardNode, toPile: fd});
                        return hintList;
                    }
                }

                for (const toPile of this.playing.tableau) {
                    if (fromPile === toPile) continue;
                    
                    if (this.playing.canPlaceToTableau(card, toPile)) {
                        if (toPile.isEmpty() && card.rank === 13) {
                            const hasFlippedDownCards = fromPile.getAllCards().some(cardNode => {
                                const c = cardNode.getComponent(Card);
                                return !c.isFaceUp;
                            });
                            
                            if (!hasFlippedDownCards) {
                                continue;
                            }
                        }
                        
                        hintList.push({fromCard: cardNode, toPile: toPile});
                    }
                }
            }
        }

        return hintList;
    }

    async executeHint(hint: HintAction, isTest?: boolean): Promise<void> {
        const {fromCard, toPile} = hint;
        const fromPile = fromCard.parent.getComponent(Pile);
        const stack = fromPile.getStackFrom(fromCard);

        if (stack.length === 0) return;

        const dragCopies = this.playing.startDrag(fromCard, new Vec3());
        await this.delay(50);
        this.playing.moveStack(fromPile, dragCopies, toPile, isTest);
    }

    async tryMoveWasteCard(): Promise<boolean> {
        const wasteTop = this.playing.waste.getTopCard();
        if (!wasteTop) return false;

        const card = wasteTop.getComponent(Card);

        for (const fd of this.playing.foundation) {
            if (this.playing.canPlaceToFoundation(card, fd)) {
                const dragCopies = this.playing.startDrag(wasteTop, new Vec3());
                this.playing.moveStack(this.playing.waste, dragCopies, fd);
                return true;
            }
        }

        for (const pile of this.playing.tableau) {
            if (this.playing.canPlaceToTableau(card, pile)) {
                const dragCopies = this.playing.startDrag(wasteTop, new Vec3());
                this.playing.moveStack(this.playing.waste, dragCopies, pile);
                return true;
            }
        }

        return false;
    }

    async tryFlipTableauCard(): Promise<boolean> {
        for (const pile of this.playing.tableau) {
            const topCard = pile.getTopCard();
            if (!topCard) continue;

            const card = topCard.getComponent(Card);
            if (!card.isFaceUp) {
                card.flipFaceUp();
                return true;
            }
        }
        return false;
    }
    
    async tryDrawFromStock(): Promise<boolean> {
        if (this.playing.stock.isEmpty()) return false;

        const topCard = this.playing.stock.getTopCard();
        if (!topCard) return false;

        const card = topCard.getComponent(Card);
        this.playing.waste.addCard(topCard);
        card.flipFaceUp();
        return true;
    }
    
    async tryRecycleWaste(): Promise<boolean> {
        if (this.playing.waste.isEmpty()) return false;
        if (!this.playing.stock.isEmpty()) return false;

        this.playing.recycleWasteToStock();
        return true;
    }

    async autoComplete(): Promise<void> {
        if(this.isRunning()) return;
        this.running = true;
        logger.logView('🎯 开始自动完成游戏...');
        let moved = true;
        while (moved) {
            moved = false;

            const wasteTop = this.playing.waste.getTopCard();
            if (wasteTop && wasteTop.getComponent(Card).isShow()) {
                const card = wasteTop.getComponent(Card);
                for (const fd of this.playing.foundation) {
                    if (this.playing.canPlaceToFoundation(card, fd)) {
                        const dragCopies = this.playing.startDrag(wasteTop, new Vec3());
                        this.playing.moveStack(this.playing.waste, dragCopies, fd);
                        await this.delay(150);
                        moved = true;
                        break;
                    }
                }
                if (moved) continue;
            }

            for (const pile of this.playing.tableau) {
                const topCard = pile.getTopCard();
                if (!topCard) continue;

                const card = topCard.getComponent(Card);
                if (!card.isFaceUp || !card.isShow()) continue;

                for (const fd of this.playing.foundation) {
                    if (this.playing.canPlaceToFoundation(card, fd)) {
                        const dragCopies = this.playing.startDrag(topCard, new Vec3());
                        this.playing.moveStack(pile, dragCopies, fd);
                        await this.delay(150);
                        moved = true;
                        break;
                    }
                }
                if (moved) break;
            }
        }
        logger.logView('✅ 自动完成结束');
        this.playing.onAnimationComplete();
        this.running = false;
    }

    checkWin(): boolean {
        // 收集所有打开的牌
        const faceUpCards: { card: Card, pile: Pile }[] = [];

        // Waste中的牌
        const wasteTop = this.playing.waste.getTopCard();
        if (wasteTop) {
            const card = wasteTop.getComponent(Card);
            if (card.isFaceUp) {
                faceUpCards.push({card, pile: this.playing.waste});
            }
        }

        // Tableau中的牌
        for (const pile of this.playing.tableau) {
            pile.forEachCard((cardNode) => {
                const card = cardNode.getComponent(Card);
                if (card.isFaceUp) {
                    faceUpCards.push({card, pile});
                }
            });
        }

        // 模拟移动所有牌到Foundation
        const foundationState = new Map<string, number>();
        for (const fd of this.playing.foundation) {
            const topCard = fd.getTopCard();
            if (topCard) {
                const card = topCard.getComponent(Card);
                foundationState.set(card.suit, card.rank);
            }
        }

        // 尝试将所有打开的牌按顺序放入Foundation
        let changed = true;
        const movedCards = new Set<Card>();

        while (changed && movedCards.size < faceUpCards.length) {
            changed = false;

            for (const {card} of faceUpCards) {
                if (movedCards.has(card)) continue;

                const currentRank = foundationState.get(card.suit) || 0;
                if (card.rank === currentRank + 1) {
                    foundationState.set(card.suit, card.rank);
                    movedCards.add(card);
                    changed = true;
                }
            }
        }

        // 检查是否所有打开的牌都能移到Foundation
        const canWin = movedCards.size === faceUpCards.length;

        if (canWin) {
            logger.logView('🎉 CheckWin: 所有打开的牌都可以移到Foundation，游戏可以获胜！');
        }
        return canWin;
    }
    
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}