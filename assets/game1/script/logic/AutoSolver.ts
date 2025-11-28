import { _decorator, Node } from 'cc';
import { UIPlay } from './UIPlay';
import { Card } from './Card';
import { Pile } from './Pile';

const { ccclass } = _decorator;

@ccclass('AutoSolver')
export class AutoSolver {

    private playing: UIPlay = null!;
    private running = false;
    private retryCount = 0;
    private maxRetries = 3;
    private stockCycles = 0;
    private maxStockCycles = 3;
    private lastWasteCount = -1;

    /** 初始化 */
    init(game: UIPlay) {
        this.playing = game;
    }

    /** 是否正在自动寻路 */
    isRunning() {
        return this.running;
    }

    /** 开始自动寻道 */
    start() {
        if (this.running) return;
        this.running = true;
        this.retryCount = 0;
        this.resetStockCycle();
        this.loop();
    }

    /** 停止自动寻道 */
    stop() {
        this.running = false;
    }

    /** 自动执行动作 */
    private async loop() {
        if (!this.running) return;

        const moved = this.doOneStep();

        if (!moved) {
            this.running = false;
            console.log('AutoSolver: 无法继续，停止自动求解');
            return;
        }

        setTimeout(() => this.loop(), 120);
    }

    /** 执行一次合法动作 */
    private doOneStep(): boolean {
        if (!this.running) return false;

        // 1) 尝试把 Waste → Foundation
        if (this.tryMoveTopToFoundation(this.playing.waste)) {
            this.resetStockCycle();
            return true;
        }

        // 2) 尝试把 Tableau 顶牌 → Foundation
        for (const pile of this.playing.tableau) {
            if (this.tryMoveTopToFoundation(pile)) {
                this.resetStockCycle();
                return true;
            }
        }

        // 3) 尝试把 Tableau → Tableau（构建序列）
        for (const pile of this.playing.tableau) {
            if (this.tryMoveTableauToTableau(pile)) {
                this.resetStockCycle();
                return true;
            }
        }

        // 4) 尝试翻开 Tableau 顶牌
        for (const pile of this.playing.tableau) {
            if (this.tryFlipTableauCard(pile)) {
                this.resetStockCycle();
                return true;
            }
        }

        // 5) 如果 tableau 没有可用动作，翻一张 stock 牌
        if (this.hasNoTableauMoves()) {
            if (this.tryDrawFromStock()) return true;
        }

        // 6) 尝试从 foundation 取牌作为桥梁
        if (this.tryUseFoundationAsBridge()) {
            this.resetStockCycle();
            return true;
        }

        // 7) 最后手段：打乱扣着的牌重试
        if (this.tryShuffleAndRetry()) {
            this.resetStockCycle();
            return true;
        }

        return false;
    }

    /** 尝试把某个堆的顶牌移动到 Foundation */
    private tryMoveTopToFoundation(pile: Pile): boolean {
        const top = pile.getTopCard();
        if (!top) return false;

        const card = top.getComponent(Card)!;
        if (!card.isFaceUp) return false;

        for (const fd of this.playing.foundation) {
            if (this.playing.canPlaceToFoundation(card, fd)) {
                this.playing.moveStack(top, [top], fd);
                this.playing.addScore(10);
                return true;
            }
        }
        return false;
    }

    /** 尝试把 Tableau 移动到其他 Tableau */
    private tryMoveTableauToTableau(pile: Pile): boolean {
        const cards = pile.node.children;
        if (cards.length === 0) return false;

        // 找到最长的可移动序列
        for (let i = cards.length - 1; i >= 0; i--) {
            const card = cards[i].getComponent(Card)!;
            if (!card.isFaceUp) continue;

            // 检查从这张牌开始的序列是否可以移动
            const stack = cards.slice(i);
            const firstCard = stack[0].getComponent(Card)!;

            for (const target of this.playing.tableau) {
                if (target === pile) continue;

                if (this.playing.canPlaceToTableau(firstCard, target)) {
                    this.playing.moveStack(stack[0], stack, target);
                    return true;
                }
            }
        }
        return false;
    }

    /** 尝试翻开 Tableau 顶牌 */
    private tryFlipTableauCard(pile: Pile): boolean {
        const top = pile.getTopCard();
        if (!top) return false;

        const card = top.getComponent(Card)!;
        if (!card.isFaceUp) {
            card.flipFaceUp();
            return true;
        }
        return false;
    }

    /** 检查是否有 tableau 移动可能 */
    private hasNoTableauMoves(): boolean {
        for (const pile of this.playing.tableau) {
            const top = pile.getTopCard();
            if (!top) continue;

            const card = top.getComponent(Card)!;
            if (!card.isFaceUp) return false; // 还有牌可以翻

            for (const target of this.playing.tableau) {
                if (target === pile) continue;
                if (this.playing.canPlaceToTableau(card, target)) {
                    return false; // 还有移动可能
                }
            }
        }
        return true;
    }

    /** 尝试翻 Stock 牌（带循环检测） */
    private tryDrawFromStock(): boolean {
        const currentWasteCount = this.playing.waste.node.children.length;

        // 检查是否在无意义地循环
        if (this.lastWasteCount === currentWasteCount) {
            this.stockCycles++;
        } else {
            this.stockCycles = 0;
        }

        this.lastWasteCount = currentWasteCount;

        // 如果循环次数过多，停止翻牌
        if (this.stockCycles >= this.maxStockCycles) {
            return false;
        }

        const stockCard = this.playing.stock.getTopCard();
        if (stockCard) {
            this.playing.onClickStock();
            return true;
        }

        // Stock 空了，尝试回收 waste
        if (this.playing.waste.node.children.length > 0) {
            this.playing.recycleWasteToStock();
            this.stockCycles++;
            return true;
        }

        return false;
    }

    /** 尝试从 foundation 取牌作为桥梁 */
    private tryUseFoundationAsBridge(): boolean {
        for (const fd of this.playing.foundation) {
            const top = fd.getTopCard();
            if (!top) continue;

            const card = top.getComponent(Card)!;

            // 检查这张牌是否能帮助解锁其他牌
            for (const tableau of this.playing.tableau) {
                if (this.playing.canPlaceToTableau(card, tableau)) {
                    // 检查这个移动是否有意义
                    if (this.wouldUnlockNewMoves(tableau)) {
                        this.playing.moveStack(top, [top], tableau);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /** 检查移动是否能解锁新的可能性 */
    private wouldUnlockNewMoves(tableau: Pile): boolean {
        const cards = tableau.node.children;
        for (const cardNode of cards) {
            const card = cardNode.getComponent(Card)!;
            if (!card.isFaceUp) return true;
        }
        return false;
    }

    /** 打乱扣着的牌重试 */
    private tryShuffleAndRetry(): boolean {
        if (this.retryCount >= this.maxRetries) return false;

        this.retryCount++;

        // 收集所有扣着的牌
        const faceDownCards: Node[] = [];
        for (const pile of this.playing.tableau) {
            for (const cardNode of pile.node.children) {
                const card = cardNode.getComponent(Card)!;
                if (!card.isFaceUp) {
                    faceDownCards.push(cardNode);
                }
            }
        }

        if (faceDownCards.length === 0) return false;

        // 简单的打乱：随机交换位置
        for (let i = 0; i < faceDownCards.length; i++) {
            const j = Math.floor(Math.random() * faceDownCards.length);
            const tempParent = faceDownCards[i].parent;
            const tempIndex = faceDownCards[i].getSiblingIndex();

            faceDownCards[i].parent = faceDownCards[j].parent;
            faceDownCards[i].setSiblingIndex(faceDownCards[j].getSiblingIndex());

            faceDownCards[j].parent = tempParent;
            faceDownCards[j].setSiblingIndex(tempIndex);
        }

        console.log(`AutoSolver: 第 ${this.retryCount} 次重试，打乱了 ${faceDownCards.length} 张扣着的牌`);
        return true;
    }

    /** 重置 Stock 循环计数 */
    private resetStockCycle() {
        this.stockCycles = 0;
        this.lastWasteCount = -1;
    }
}