import { _decorator, Node } from 'cc';
import { UIPlay } from './UIPlay';
import { Card } from './Card';
import { Pile } from './Pile';
import {suits} from "./Card";

const { ccclass } = _decorator;

@ccclass('AutoSolver')
export class AutoSolver {

    private playing: UIPlay = null!;
    private running = false;
    private retryCount = 0;
    private maxRetries = 3;
    private stockCycles = 0;
    private maxStockCycles = 2;
    private stuckCounter = 0;
    private maxStuckSteps = 10;
    private lastGameState = '';

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
        this.resetCounters();
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

        // 记录当前游戏状态，检测死循环
        const currentState = this.getGameState();
        if (currentState === this.lastGameState) {
            this.stuckCounter++;
            if (this.stuckCounter >= this.maxStuckSteps) {
                console.log('AutoSolver: 检测到死循环，停止求解');
                return false;
            }
        } else {
            this.stuckCounter = 0;
            this.lastGameState = currentState;
        }

        // 1) 尝试把 Waste → Foundation
        if (this.tryMoveTopToFoundation(this.playing.waste)) {
            this.resetCounters();
            return true;
        }

        // 2) 尝试把 Tableau 顶牌 → Foundation
        for (const pile of this.playing.tableau) {
            if (this.tryMoveTopToFoundation(pile)) {
                this.resetCounters();
                return true;
            }
        }

        // 3) 尝试把 Tableau → Tableau
        for (const pile of this.playing.tableau) {
            if (this.tryMoveTableauToTableau(pile)) {
                this.resetCounters();
                return true;
            }
        }

        // 4) 尝试翻开 Tableau 顶牌
        for (const pile of this.playing.tableau) {
            if (this.tryFlipTableauCard(pile)) {
                this.resetCounters();
                return true;
            }
        }

        // 5) 翻 Stock 牌（严格限制）
        if (this.canDrawFromStock()) {
            if (this.tryDrawFromStock()) return true;
        }

        // 6) 尝试从 foundation 取牌（只有卡住时）
        if (this.stuckCounter > 5) {
            if (this.tryUseFoundationAsBridge()) {
                this.resetCounters();
                return true;
            }
        }

        // 7) 打乱重试（严重卡住时）
        if (this.stuckCounter > 8) {
            if (this.tryShuffleAndRetry()) {
                this.resetCounters();
                return true;
            }
        }

        return false;
    }

    /** 生成游戏状态字符串用于检测循环 */
    private getGameState(): string {
        let state = '';

        // Tableau 状态
        for (const pile of this.playing.tableau) {
            const cards = pile.node.children;
            for (const cardNode of cards) {
                const card = cardNode.getComponent(Card)!;
                state += `${card.suit}${card.rank}${card.isFaceUp ? 'U' : 'D'}|`;
            }
            state += '/';
        }

        // Waste 顶牌
        const wasteTop = this.playing.waste.getTopCard();
        if (wasteTop) {
            const card = wasteTop.getComponent(Card)!;
            state += `W:${card.suit}${card.rank}|`;
        }

        // Foundation 状态
        for (const pile of this.playing.foundation) {
            const top = pile.getTopCard();
            if (top) {
                const card = top.getComponent(Card)!;
                state += `F:${card.suit}${card.rank}|`;
            }
        }

        return state;
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
            if (!card.isFaceUp) return false;

            for (const target of this.playing.tableau) {
                if (target === pile) continue;
                if (this.playing.canPlaceToTableau(card, target)) {
                    return false;
                }
            }
        }
        return true;
    }

    /** 检查是否可以翻 Stock */
    private canDrawFromStock(): boolean {
        // 如果有明显的移动机会，不要翻牌
        if (!this.hasNoTableauMoves()) return false;

        // 检查 waste 顶牌是否有用
        const wasteTop = this.playing.waste.getTopCard();
        if (wasteTop && this.isCardUseful(wasteTop)) return false;

        return this.stockCycles < this.maxStockCycles;
    }

    /** 检查牌是否有用 */
    private isCardUseful(cardNode: Node): boolean {
        const card = cardNode.getComponent(Card)!;

        // 检查能否放到 Foundation
        for (const fd of this.playing.foundation) {
            if (this.playing.canPlaceToFoundation(card, fd)) return true;
        }

        // 检查能否放到 Tableau
        for (const pile of this.playing.tableau) {
            if (this.playing.canPlaceToTableau(card, pile)) return true;
        }

        return false;
    }

    /** 尝试翻 Stock 牌 */
    private tryDrawFromStock(): boolean {
        const stockCard = this.playing.stock.getTopCard();
        if (stockCard) {
            this.playing.onClickStock();
            this.stockCycles++;
            return true;
        }

        // Stock 空了，回收一次就停止
        if (this.playing.waste.node.children.length > 0 && this.stockCycles === 0) {
            this.playing.recycleWasteToStock();
            this.stockCycles = this.maxStockCycles;
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

        // 重新随机分配花色和点数
        for (const cardNode of faceDownCards) {
            const card = cardNode.getComponent(Card)!;
            const newSuit = suits[Math.floor(Math.random() * 4)];
            const newRank = Math.floor(Math.random() * 13) + 1;

            // 重新初始化牌
            card.init(newSuit, newRank);
            card.flipFaceDown(); // 确保还是扣着的
        }

        console.log(`AutoSolver: 第 ${this.retryCount} 次重试，重新设置了 ${faceDownCards.length} 张扣着的牌`);
        return true;
    }

    /** 重置所有计数器 */
    private resetCounters() {
        this.stockCycles = 0;
        this.stuckCounter = 0;
        this.lastGameState = '';
    }
}