import { _decorator, Node } from 'cc';
import { UIPlay } from './UIPlay';
import { Card } from './Card';
import { Pile } from './Pile';

const { ccclass } = _decorator;

@ccclass('AutoSolver')
export class AutoSolver {

    private playing: UIPlay = null!;
    private running = false;
    private timer = 0;

    /** 初始化（需要 UIPlay 传入自己的实例） */
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
        this.loop();
    }

    /** 停止自动寻道 */
    stop() {
        this.running = false;
    }

    /** 自动执行动作（每 0.1~0.2 秒检查一次） */
    private async loop() {
        if (!this.running) return;

        // 每次执行一步，如果执行成功，继续执行下一步
        const moved = this.doOneStep();

        if (!moved) {
            // 停止自动寻道（已无法继续）
            this.running = false;
            return;
        }

        // 等动画执行后继续（避免太快）
        setTimeout(() => this.loop(), 120);
    }

    /** 执行一次合法动作，返回是否移动成功 */
    private doOneStep(): boolean {
        if (!this.running) return false;

        // 1) 尝试把 Waste → Foundation
        if (this.tryMoveTopToFoundation(this.playing.waste)) return true;

        // 2) 尝试把 Tableau 顶牌 → Foundation
        for (const pile of this.playing.tableau) {
            if (this.tryMoveTopToFoundation(pile)) return true;
        }

        // 3) 尝试把 Tableau → Tableau（构建序列）
        for (const pile of this.playing.tableau) {
            if (this.tryMoveTopToAnotherTableau(pile)) return true;
        }

        // 4) 尝试翻开 Tableau 顶牌（如果没翻开）
        for (const pile of this.playing.tableau) {
            const top = pile.getTopCard();
            if (top) {
                const c = top.getComponent(Card)!;
                if (!c.isFaceUp) {
                    c.flipFaceUp();
                    return true;
                }
            }
        }

        // 5) Stock → Waste
        const stockCard = this.playing.stock.getTopCard();
        if (stockCard) {
            this.playing.onClickStock();
            return true;
        }

        // 6) 全部动作都做不了 → false
        return false;
    }

    /** 尝试把某个堆的顶牌移动到 Foundation */
    private tryMoveTopToFoundation(pile: Pile): boolean {
        const top = pile.getTopCard();
        if (!top) return false;

        const card = top.getComponent(Card)!;

        for (const fd of this.playing.foundation) {
            if (this.playing.canPlaceToFoundation(card, fd)) {
                this.playing.moveStack(top, [top], fd);
                this.playing.addScore(10);
                return true;
            }
        }

        return false;
    }

    /** 尝试把一个 Tableau 顶牌移动到其他 Tableau */
    private tryMoveTopToAnotherTableau(pile: Pile): boolean {
        const top = pile.getTopCard();
        if (!top) return false;

        const card = top.getComponent(Card)!;
        if (!card.isFaceUp) return false;

        for (const target of this.playing.tableau) {
            if (target === pile) continue;

            if (this.playing.canPlaceToTableau(card, target)) {
                // stack 只有一张
                this.playing.moveStack(top, [top], target);
                return true;
            }
        }
        return false;
    }

}
