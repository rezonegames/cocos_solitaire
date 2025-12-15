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
    private timers: any[] = [];
    private isExecuting = false;

    init(game: UIPlay) {
        this.playing = game;
        this.running = false;
    }

    isRunning() {
        return this.running;
    }

    async start() {
        if (this.running || this.isExecuting) return;
        this.isExecuting = true;
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
        this.isExecuting = false;
    }

    stop() {
        this.running = false;
        this.isExecuting = false;
        this.clearAllTimers();
        logger.logView('AutoSolver: 停止求解');
    }

    private clearAllTimers() {
        this.timers.forEach(timer => {
            if (timer) clearTimeout(timer);
        });
        this.timers = [];
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
        if(this.isRunning() || this.isExecuting) return;
        this.isExecuting = true;
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
        this.isExecuting = false;
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
    
    async saveLifeOneCard(): Promise<void> {
        if (this.isExecuting) return;
        this.isExecuting = true;

        const listToCheck: Node[] = [];    // 所有未翻开的牌
        const listToSave: Node[] = [];     // 所有未全翻开的牌列的下方，首张已翻开的牌
        const listCanMoveCards: Node[] = []; // play区每列牌最下方的牌和help区可以移动的牌
        const canMoveDicHolder: Pile[] = [];
        const canMoveDicCard: Node[] = [];

        // 遍历7列tableau
        for (let i = 0; i < 7; i++) {
            const holder = this.playing.tableau[i];
            const allCards = holder.getAllCards();
            const unopenCount = this.getUnopenCount(holder);
            
            if (unopenCount > 0) {
                // 添加未翻开的牌到检查列表
                for (let j = 0; j < unopenCount; j++) {
                    listToCheck.push(allCards[j]);
                }
                // 添加第一张翻开的牌到保存列表
                if (allCards.length > unopenCount) {
                    listToSave.push(allCards[unopenCount]);
                }
            }
            
            // 添加每列最下方的牌
            if (allCards.length > 0) {
                listCanMoveCards.push(allCards[allCards.length - 1]);
            }
        }
        
        // 添加waste区可以移动的牌
        const wasteCards = this.playing.waste.getAllCards();
        listCanMoveCards.push(...wasteCards);

        // 检查每张未翻开的牌
        for (const cardNode of listToCheck) {
            const card = cardNode.getComponent(Card);
            if (card.isFaceUp) continue;
            
            // 检查能否移动到tableau
            for (const holder of this.playing.tableau) {
                if (this.checkCanMoveInPlay(holder, card)) {
                    // 检查是否满足翻开此card后，下一步可以新翻开一张牌
                    for (const item of listToSave) {
                        const itemCard = item.getComponent(Card);
                        const itemHolder = item.parent.getComponent(Pile);
                        const cardHolder = cardNode.parent.getComponent(Pile);
                        
                        const itemHolderUnopenCount = this.getUnopenCount(itemHolder);
                        
                        if ((itemHolderUnopenCount > 1 || (cardHolder !== itemHolder && itemHolderUnopenCount > 0)) 
                            && this.checkCanMoveInPlay(card, itemCard)) {
                            await this.doSaveLife(cardNode, holder);
                            this.isExecuting = false;
                            return;
                        }
                    }
                    
                    canMoveDicHolder.push(holder);
                    canMoveDicCard.push(cardNode);
                    break;
                }
            }
            
            // 检查能否移动到foundation
            for (const holder of this.playing.foundation) {
                if (this.checkCanMoveInResult(holder, card)) {
                    canMoveDicHolder.push(holder);
                    canMoveDicCard.push(cardNode);
                    break;
                }
            }
        }

        // 选择最小值的牌进行移动
        let tempCard: Node | null = null;
        let tempHolder: Pile | null = null;
        
        for (let i = 0; i < canMoveDicCard.length; i++) {
            const cardNode = canMoveDicCard[i];
            const card = cardNode.getComponent(Card);
            
            if (!tempCard || card.rank < tempCard.getComponent(Card).rank) {
                tempCard = cardNode;
                tempHolder = canMoveDicHolder[i];
            }
        }
        
        if (tempCard && tempHolder) {
            await this.doSaveLife(tempCard, tempHolder);
        }
        
        this.isExecuting = false;
    }

    private async doSaveLife(cardNode: Node, targetPile: Pile): Promise<void> {
        const card = cardNode.getComponent(Card);
        logger.logView(`SaveLife: 翻开并移动 ${card.detail()} 到 ${targetPile.node.name}`);
        
        // 翻开这张牌
        card.flipFaceUp();
        
        await this.delay(this.flipBeforeMoveDelay);
        
        // 直接指定只移动这一张牌
        const fromPile = cardNode.parent.getComponent(Pile);
        const dragCopies = this.playing.startDrag(cardNode, new Vec3(), true);
        await this.delay(50);
        this.playing.moveStack(fromPile, dragCopies, targetPile);
    }

    private getUnopenCount(pile: Pile): number {
        const allCards = pile.getAllCards();
        let count = 0;
        for (const cardNode of allCards) {
            const card = cardNode.getComponent(Card);
            if (!card.isFaceUp) {
                count++;
            } else {
                break;
            }
        }
        return count;
    }

    private getCardIndexInHolder(cardNode: Node): number {
        const pile = cardNode.parent.getComponent(Pile);
        return pile.getCardIndex(cardNode);
    }

    private checkCanMoveInPlay(targetPile: Pile, card: Card): boolean;
    private checkCanMoveInPlay(card: Card, targetCard: Card): boolean;
    private checkCanMoveInPlay(arg1: Pile | Card, arg2: Card): boolean {
        if (arg1 instanceof Pile) {
            // 检查能否移动到tableau pile
            return this.playing.canPlaceToTableau(arg2, arg1);
        } else {
            // 检查两张牌能否叠放（tableau规则）
            const movingColor = arg2.getColor();
            const targetColor = arg1.getColor();
            return targetColor !== movingColor && arg1.rank === arg2.rank + 1;
        }
    }

    private checkCanMoveInResult(targetPile: Pile, card: Card): boolean;
    private checkCanMoveInResult(card: Card, targetCard: Card): boolean;
    private checkCanMoveInResult(arg1: Pile | Card, arg2: Card): boolean {
        if (arg1 instanceof Pile) {
            // 检查能否移动到foundation pile
            return this.playing.canPlaceToFoundation(arg2, arg1);
        } else {
            // 检查两张牌能否叠放（foundation规则）
            return arg1.suit === arg2.suit && arg1.rank + 1 === arg2.rank;
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                const index = this.timers.indexOf(timer);
                if (index > -1) this.timers.splice(index, 1);
                resolve();
            }, ms);
            this.timers.push(timer);
        });
    }
}