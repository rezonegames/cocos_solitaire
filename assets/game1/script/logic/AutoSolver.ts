import {_decorator, Node, Vec3} from 'cc';
import {UIPlay} from './UIPlay';
import {Card} from './Card';
import {Pile} from './Pile';
import {suits} from "./Card";
import _ from 'lodash-es';
import {logger} from "db://assets/libs/log/Logger";

const {ccclass} = _decorator;

// 适配 U3D 中的动作提示结构（模拟 MgrHint）
interface HintAction {
    fromCard: Node; // 起始牌节点
    toPile: Pile; // 目标堆
}

@ccclass('AutoSolver')
export class AutoSolver {
    playing: UIPlay = null!;
    running = false;
    isCurGameOneCard = true; // 是否单次抽1张牌（可配置，对应 U3D 的 isCurGameOneCard）
    needCheckLose = true;    // 是否需要检测失败（对应 U3D 的 needCheckLose）
    actionDelay = 800;       // 动作执行延迟（ms）
    flipBeforeMoveDelay = 500;// 翻牌后延迟
    loseTimes = 0;           // 失败次数（对应 U3D 的 loseTimes）

    /** 初始化（关联游戏实例+映射 U3D 结构） */
    init(game: UIPlay, isCurGameOneCard: boolean = true) {
        this.playing = game;
        this.isCurGameOneCard = isCurGameOneCard;
    }

    /** 是否正在自动求解 */
    isRunning() {
        return this.running;
    }

    /** 开始自动求解（贴合 U3D 逻辑的执行流程） */
    async start() {
        if (this.running) return;
        this.running = true;
        this.loseTimes = 0;
        logger.logView('AutoSolver: 开始自动求解（适配 U3D 逻辑）');

        while (this.running) {
            // 检测失败/胜利，终止流程
            if (this.isGameWin()) {
                logger.logView('AutoSolver: 游戏胜利！停止求解');
                this.playing.onGameWin();
                this.running = false;
                break;
            }

            if (this.checkLose()) {
                logger.logView(`AutoSolver: 牌局失败（次数：${this.loseTimes}），停止求解`);
                this.running = false;
                break;
            }

            // 优先级1：执行提示动作
            const hints = this.getHint();
            if (hints.length > 0) {
                const hint = hints[0];
                await this.executeHint(hint);
                await this.delay(this.actionDelay);
                continue;
            }

            // 优先级2：移动帮助堆（Waste）的牌到目标堆/游戏堆
            if (await this.tryMoveWasteCard()) {
                await this.delay(this.actionDelay);
                continue;
            }

            // 优先级3：解锁游戏堆（Tableau）的扣牌
            if (await this.tryFlipTableauCard()) {
                await this.delay(this.flipBeforeMoveDelay);
                continue;
            }

            // 优先级4：抽取帮助堆新牌（Stock → Waste）
            if (await this.tryDrawFromStock()) {
                await this.delay(this.actionDelay);
                continue;
            }

            // 优先级5：回收帮助堆（Waste → Stock）
            if (await this.tryRecycleWaste()) {
                await this.delay(this.actionDelay);
                continue;
            }

            // 无可用动作，停止求解
            logger.logView('AutoSolver: 无可用动作，停止求解');
            this.running = false;
            break;
        }
    }

    /** 停止自动求解 */
    stop() {
        this.running = false;
        logger.logView('AutoSolver: 停止自动求解');
    }

    /** 核心适配：U3D checkLose 逻辑迁移到 Cocos */
    checkLose(): boolean {
        if (!this.needCheckLose) return false;

        // Stock 和 Waste 都为空，且没有可用移动
        const stockEmpty = this.playing.stock.isEmpty();
        const wasteEmpty = this.playing.waste.isEmpty();

        if (!stockEmpty || !wasteEmpty) return false;

        // 检查是否有任何可用的移动
        const hints = this.getHint();
        if (hints.length > 0) return false;

        // 检查 Tableau 中是否还有扣着的牌
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

    /** 检测游戏胜利（所有牌在目标堆） */
    isGameWin(): boolean {
        // 检查每个 Foundation 堆是否都有 13 张牌（K）
        for (const pile of this.playing.foundation) {
            const topCard = pile.getTopCard();
            if (!topCard) return false;
            const card = topCard.getComponent(Card);
            if (card.rank !== 13) return false;
        }
        return true;
    }

    /** 测试提示功能 - 执行所有提示动作 */
    async test() {
        logger.logView('=== Test: 开始测试提示功能 ===');
        const hintList = this.getHint();
        logger.logView(`找到 ${hintList.length} 个提示`);
        
        for (let i = 0; i < hintList.length; i++) {
            const hint = hintList[i];
            const card = hint.fromCard.getComponent(Card);
            logger.logView(`执行提示 ${i + 1}: ${card.detail()} -> ${hint.toPile.node.name}`);
            await this.executeHint(hint, true); // isTest=true 不保存undo
            await this.delay(1000);
        }
        logger.logView('=== Test: 测试完成 ===');
    }

    /** 恢复所有牌的show状态 */
    private restoreAllCardsShowState() {
        const allPiles = [
            ...this.playing.tableau,
            ...this.playing.foundation,
            this.playing.stock,
            this.playing.waste
        ];
        
        for (const pile of allPiles) {
            pile.forEachCard((cardNode) => {
                const card = cardNode.getComponent(Card);
                if (!card.isShow()) {
                    card.show();
                }
            });
        }
    }

    /** 模拟 U3D MgrHint.getHint() → 获取最优提示动作 */
    getHint(): HintAction[] {
        const hintList: HintAction[] = [];

        // 1. 优先检测帮助堆（Waste）的牌可移动目标
        const wasteTop = this.playing.waste.getTopCard();
        if (wasteTop) {
            const card = wasteTop.getComponent(Card);
            // 优先尝试移到 Foundation
            for (const fd of this.playing.foundation) {
                if (this.playing.canPlaceToFoundation(card, fd)) {
                    hintList.push({fromCard: wasteTop, toPile: fd});
                    return hintList; // Foundation 优先级最高
                }
            }
            // 尝试移到 Tableau
            for (const pile of this.playing.tableau) {
                if (this.playing.canPlaceToTableau(card, pile)) {
                    hintList.push({fromCard: wasteTop, toPile: pile});
                }
            }
        }

        // 2. 检测游戏堆（Tableau）的牌可移动目标
        for (const fromPile of this.playing.tableau) {
            const cards = fromPile.getVisibleCards();
            for (const cardNode of cards) {
                const card = cardNode.getComponent(Card);
                if (!card.isFaceUp) continue;

                // 优先尝试移到 Foundation
                for (const fd of this.playing.foundation) {
                    if (this.playing.canPlaceToFoundation(card, fd)) {
                        hintList.push({fromCard: cardNode, toPile: fd});
                        return hintList; // Foundation 优先级最高
                    }
                }

                // 尝试移到其他 Tableau
                for (const toPile of this.playing.tableau) {
                    if (fromPile === toPile) continue;
                    if (this.playing.canPlaceToTableau(card, toPile)) {
                        hintList.push({fromCard: cardNode, toPile: toPile});
                    }
                }
            }
        }

        return hintList;
    }

    /** 执行提示动作 */
    async executeHint(hint: HintAction, isTest?: boolean): Promise<void> {
        const {fromCard, toPile} = hint;
        const fromPile = fromCard.parent.getComponent(Pile);
        const stack = fromPile.getStackFrom(fromCard);

        if (stack.length === 0) return;

        // 创建拖拽副本并执行移动
        const dragCopies = this.playing.startDrag(fromCard, new Vec3());
        await this.delay(100);
        this.playing.moveStack(fromPile, dragCopies, toPile, isTest);
    }

    /** 尝试移动 Waste 顶牌 */
    async tryMoveWasteCard(): Promise<boolean> {
        const wasteTop = this.playing.waste.getTopCard();
        if (!wasteTop) return false;

        const card = wasteTop.getComponent(Card);

        // 优先移到 Foundation
        for (const fd of this.playing.foundation) {
            if (this.playing.canPlaceToFoundation(card, fd)) {
                const dragCopies = this.playing.startDrag(wasteTop, new Vec3());
                this.playing.moveStack(this.playing.waste, dragCopies, fd);
                return true;
            }
        }

        // 尝试移到 Tableau
        for (const pile of this.playing.tableau) {
            if (this.playing.canPlaceToTableau(card, pile)) {
                const dragCopies = this.playing.startDrag(wasteTop, new Vec3());
                this.playing.moveStack(this.playing.waste, dragCopies, pile);
                return true;
            }
        }

        return false;
    }

    /** 尝试翻开 Tableau 中的扣牌 */
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

    /** 尝试从 Stock 抽牌到 Waste */
    async tryDrawFromStock(): Promise<boolean> {
        if (this.playing.stock.isEmpty()) return false;

        const topCard = this.playing.stock.getTopCard();
        if (!topCard) return false;

        const card = topCard.getComponent(Card);
        this.playing.waste.addCard(topCard);
        card.flipFaceUp();
        return true;
    }

    /** 尝试回收 Waste 到 Stock */
    async tryRecycleWaste(): Promise<boolean> {
        if (this.playing.waste.isEmpty()) return false;
        if (!this.playing.stock.isEmpty()) return false;

        this.playing.recycleWasteToStock();
        return true;
    }

    /** 自动完成游戏（将所有牌移到Foundation） */
    async autoComplete(): Promise<void> {
        logger.logView('🎯 开始自动完成游戏...');
        let moved = true;
        let loopCount = 0;
        const maxLoops = 100; // 防止无限循环

        while (moved && loopCount < maxLoops) {
            moved = false;
            loopCount++;

            // 尝试从Waste移动
            const wasteTop = this.playing.waste.getTopCard();
            if (wasteTop && wasteTop.getComponent(Card).isShow()) {
                const card = wasteTop.getComponent(Card);
                for (const fd of this.playing.foundation) {
                    if (this.playing.canPlaceToFoundation(card, fd)) {
                        const dragCopies = this.playing.startDrag(wasteTop, new Vec3());
                        this.playing.moveStack(this.playing.waste, dragCopies, fd);
                        await this.delay(300); // 等待动画完成
                        moved = true;
                        break;
                    }
                }
                if (moved) continue;
            }

            // 尝试从Tableau移动
            for (const pile of this.playing.tableau) {
                const topCard = pile.getTopCard();
                if (!topCard) continue;

                const card = topCard.getComponent(Card);
                if (!card.isFaceUp || !card.isShow()) continue;

                for (const fd of this.playing.foundation) {
                    if (this.playing.canPlaceToFoundation(card, fd)) {
                        const dragCopies = this.playing.startDrag(topCard, new Vec3());
                        this.playing.moveStack(pile, dragCopies, fd);
                        await this.delay(300); // 等待动画完成
                        moved = true;
                        break;
                    }
                }
                if (moved) break;
            }
        }

        if (loopCount >= maxLoops) {
            logger.logView('⚠️ 自动完成超出最大循环次数');
        }
        logger.logView('✅ 自动完成结束');
        this.playing.onAnimationComplete();
    }

    /** 检查是否可以赢（所有打开的牌都checkWin可以移到Foundation） */
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
            } else {
                // 找到这个foundation对应的花色（通过检查第一张可能放入的牌）
                for (const {card} of faceUpCards) {
                    if (card.rank === 1 && !foundationState.has(card.suit)) {
                        foundationState.set(card.suit, 0);
                        break;
                    }
                }
            }
        }

        // 尝试将所有打开的牌按顺序放入Foundation
        let changed = true;
        const movedCards = new Set<Card>();

        while (changed && movedCards.size < faceUpCards.length) {
            changed = false;

            for (const {card, pile} of faceUpCards) {
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

    /** 延迟工具函数 */
    delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}