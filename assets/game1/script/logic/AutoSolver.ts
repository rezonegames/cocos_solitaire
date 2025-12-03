import {_decorator, Node} from 'cc';
import {UIPlay} from './UIPlay';
import {Card} from './Card';
import {Pile} from './Pile';
import {suits} from "./Card";
import _ from 'lodash-es';

const {ccclass} = _decorator;

// 适配 U3D 中的动作提示结构（模拟 MgrHint）
interface HintAction {
    fromCard: Node; // 起始牌节点
    toPile: Pile; // 目标堆
}

// 模拟 U3D 中的管理器（映射到 Cocos 的 UIPlay 实例）
interface MgrHolderMapping {
    holderHelpClose: Pile; // 未抽取的帮助堆（对应 Cocos 的 Stock）
    holderHelpOpen: Pile;  // 已抽取的帮助堆（对应 Cocos 的 Waste）
    holderResult: Pile[];  // 目标堆（对应 Cocos 的 Foundation）
    holderPlay: Pile[];    // 游戏堆（对应 Cocos 的 Tableau）
}

@ccclass('AutoSolver')
export class AutoSolver {
    private playing: UIPlay = null!;
    private running = false;
    private isCurGameOneCard = true; // 是否单次抽1张牌（可配置，对应 U3D 的 isCurGameOneCard）
    private needCheckLose = true;    // 是否需要检测失败（对应 U3D 的 needCheckLose）
    private actionDelay = 800;       // 动作执行延迟（ms）
    private flipBeforeMoveDelay = 500;// 翻牌后延迟
    private loseTimes = 0;           // 失败次数（对应 U3D 的 loseTimes）

    // 映射 U3D 的管理器到 Cocos 的堆结构
    private mgrMapping: MgrHolderMapping = {
        holderHelpClose: null!,
        holderHelpOpen: null!,
        holderResult: [],
        holderPlay: []
    };

    /** 初始化（关联游戏实例+映射 U3D 结构） */
    init(game: UIPlay, isCurGameOneCard: boolean = true) {
        this.playing = game;
        this.isCurGameOneCard = isCurGameOneCard;

        // 核心映射：U3D 堆 → Cocos 堆
        this.mgrMapping = {
            holderHelpClose: game.stock,       // U3D holderHelpClose = Cocos Stock（未抽牌堆）
            holderHelpOpen: game.waste,        // U3D holderHelpOpen = Cocos Waste（已抽牌堆）
            holderResult: game.foundation,     // U3D holderResult = Cocos Foundation（目标堆）
            holderPlay: game.tableau           // U3D holderPlay = Cocos Tableau（游戏堆）
        };
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
        console.log('AutoSolver: 开始自动求解（适配 U3D 逻辑）');

        while (this.running) {
            // 检测失败/胜利，终止流程（完全复用 U3D checkLose 逻辑）
            if (this.checkLose() || this.isGameWin()) {
                const log = this.checkLose()
                    ? `AutoSolver: 牌局失败（次数：${this.loseTimes}），停止求解`
                    : 'AutoSolver: 游戏胜利！停止求解';
                console.log(log);
                this.running = false;
                break;
            }

            // 优先级1：执行提示动作（模拟 U3D 的 MgrHint.getHint()）
            if (this.tryExecuteHintAction()) {
                await this.delay(this.actionDelay);
                continue;
            }

            // 优先级2：移动帮助堆（Waste）的牌到目标堆/游戏堆（对应 U3D 处理 holderHelpOpen）
            if (await this.tryMoveHelpCardToValidPile()) {
                await this.delay(this.actionDelay);
                continue;
            }

            // 优先级3：解锁游戏堆（Tableau）的扣牌（对应 U3D 解锁 holderPlay 的扣牌）
            if (this.tryFlipTableauFaceDownCard()) {
                await this.delay(this.flipBeforeMoveDelay);
                continue;
            }

            // 优先级4：抽取帮助堆新牌（Stock → Waste，对应 U3D 抽取 holderHelpClose）
            if (this.tryDrawNewHelpCard()) {
                await this.delay(this.actionDelay);
                continue;
            }

            // 优先级5：回收帮助堆（Waste → Stock，对应 U3D 无牌可抽时的逻辑）
            if (this.tryRecycleHelpOpenToClose()) {
                await this.delay(1000); // 回收动作延迟稍长
                continue;
            }

            // 无可用动作，停止求解
            console.log('AutoSolver: 无可用动作，停止求解');
            this.running = false;
            break;
        }
    }

    /** 停止自动求解 */
    stop() {
        this.running = false;
        console.log('AutoSolver: 停止自动求解');
    }

    /** 核心适配：U3D checkLose 逻辑迁移到 Cocos */
    private checkLose(): boolean {
        if (!this.needCheckLose) return false;

        // 1. 未抽取的帮助堆（Stock）有牌 → 不失败
        if (this.mgrMapping.holderHelpClose.node.children.length > 0) return false;

        // 2. 所有牌都在目标堆 → 不失败（已胜利）
        const totalResultCards = this.mgrMapping.holderResult.reduce((sum, pile) => sum + pile.node.children.length, 0);
        if (totalResultCards >= 52) return false;

        // 3. 检测已抽取的帮助堆（Waste）的牌是否能移动
        const helpOpenCards = this.mgrMapping.holderHelpOpen.node.children;
        if (helpOpenCards.length > 0) {
            const listToCheck = [...this.mgrMapping.holderResult, ...this.mgrMapping.holderPlay];
            let ind = -1;

            do {
                ind += this.isCurGameOneCard ? 1 : 3;
                if (ind < 0) continue;
                if (ind >= helpOpenCards.length) ind = helpOpenCards.length - 1;

                const cardNode = helpOpenCards[ind];
                const card = cardNode.getComponent(Card)!;

                // 只要有一张牌能移动 → 不失败
                for (const pile of listToCheck) {
                    if (this.canMoveToPile(card, pile)) {
                        return false;
                    }
                }
            } while (ind < helpOpenCards.length - 1);
        }

        // 4. 检测是否有提示动作 → 有则不失败
        const hintList = this.getHint();
        if (hintList.length > 0) return false;

        // 5. 满足所有失败条件 → 失败次数+1
        this.loseTimes++;
        return true;
    }

    /** 检测游戏胜利（所有牌在目标堆） */
    private isGameWin(): boolean {
        const totalResultCards = this.mgrMapping.holderResult.reduce((sum, pile) => sum + pile.node.children.length, 0);
        return totalResultCards >= 52;
    }

    /** 模拟 U3D MgrHint.getHint() → 获取最优提示动作 */
    private getHint(): HintAction[] {
        const hintList: HintAction[] = [];

        // 1. 优先检测帮助堆（Waste）的牌可移动目标
        const helpOpenCards = this.mgrMapping.holderHelpOpen.node.children;
        for (const cardNode of helpOpenCards) {
            const card = cardNode.getComponent(Card)!;
            // 检测目标堆
            for (const resultPile of this.mgrMapping.holderResult) {
                if (this.canMoveToPile(card, resultPile)) {
                    hintList.push({fromCard: cardNode, toPile: resultPile});
                    return hintList; // 直接返回第一个最优提示
                }
            }
            // 检测游戏堆
            for (const playPile of this.mgrMapping.holderPlay) {
                if (this.canMoveToPile(card, playPile)) {
                    hintList.push({fromCard: cardNode, toPile: playPile});
                    return hintList;
                }
            }
        }

        // 2. 检测游戏堆（Tableau）的牌可移动目标
        for (const playPile of this.mgrMapping.holderPlay) {
            const cards = playPile.node.children;
            for (let i = cards.length - 1; i >= 0; i--) {
                const cardNode = cards[i];
                const card = cardNode.getComponent(Card)!;
                if (!card.isFaceUp) continue;

                // 检测目标堆
                for (const resultPile of this.mgrMapping.holderResult) {
                    if (this.canMoveToPile(card, resultPile)) {
                        hintList.push({fromCard: cardNode, toPile: resultPile});
                        return hintList;
                    }
                }
            }
        }

        return hintList;
    }

    /** 执行提示动作（模拟 U3D 执行 hint 动作） */
    private tryExecuteHintAction(): boolean {
        const hintList = this.getHint();
        if (hintList.length === 0) return false;

        const {fromCard, toPile} = hintList[0];
        const card = fromCard.getComponent(Card)!;

        // 确保牌是翻开状态
        if (!card.isFaceUp) {
            card.flipFaceUp();
            this.playing.undoManager.pushMove({
                cards: [fromCard],
                from: fromCard.parent.getComponent(Pile)!,
                to: fromCard.parent.getComponent(Pile)!,
                oldPositions: [fromCard.position.clone()],
                newPositions: [fromCard.position.clone()],
                flip: {card: fromCard, wasFaceUp: false}
            } as any);
        }

        // 执行移动（调用 Cocos 原生移动逻辑）
        if (toPile.isFoundation) {
            // this.playing.tryAutoToFoundation(fromCard);
        } else {
            const cardStack = this.playing.getStackFrom(fromCard);
            // this.playing.moveStack(fromCard, cardStack, toPile, fromCard.parent);
        }

        console.log(`AutoSolver: 执行提示动作 - 移动 ${card.suit}${card.rank} 到 ${toPile.node.name}`);
        return true;
    }

    /** 移动帮助堆（Waste）的牌到目标堆/游戏堆（对应 U3D 处理 holderHelpOpen） */
    private async tryMoveHelpCardToValidPile(): Promise<boolean> {
        const helpOpenPile = this.mgrMapping.holderHelpOpen;
        const helpOpenCards = helpOpenPile.node.children;
        if (helpOpenCards.length === 0) return false;

        // 按 U3D 逻辑的步长遍历（1张/3张）
        const step = this.isCurGameOneCard ? 1 : 3;
        for (let i = helpOpenCards.length - 1; i >= 0; i -= step) {
            const cardNode = helpOpenCards[i];
            const card = cardNode.getComponent(Card)!;

            // 先尝试移动到目标堆（Foundation）
            for (const resultPile of this.mgrMapping.holderResult) {
                if (this.canMoveToPile(card, resultPile)) {
                    if (!card.isFaceUp) {
                        card.flipFaceUp();
                        await this.delay(this.flipBeforeMoveDelay);
                    }
                    // this.playing.tryAutoToFoundation(cardNode);
                    console.log(`AutoSolver: 移动帮助堆牌 ${card.suit}${card.rank} 到目标堆`);
                    return true;
                }
            }

            // 再尝试移动到游戏堆（Tableau）
            for (const playPile of this.mgrMapping.holderPlay) {
                if (this.canMoveToPile(card, playPile)) {
                    if (!card.isFaceUp) {
                        card.flipFaceUp();
                        await this.delay(this.flipBeforeMoveDelay);
                    }
                    const cardStack = this.playing.getStackFrom(cardNode);
                    // this.playing.moveStack(cardNode, cardStack, playPile, cardNode.parent);
                    console.log(`AutoSolver: 移动帮助堆牌 ${card.suit}${card.rank} 到游戏堆`);
                    return true;
                }
            }
        }

        return false;
    }

    /** 解锁游戏堆（Tableau）的扣牌（翻最后一张扣牌，对应 U3D 解锁 holderPlay） */
    private tryFlipTableauFaceDownCard(): boolean {
        for (const playPile of this.mgrMapping.holderPlay) {
            const cards = playPile.node.children;
            if (cards.length === 0) continue;

            // 找到最后一张扣牌
            for (let i = cards.length - 1; i >= 0; i--) {
                const cardNode = cards[i];
                const card = cardNode.getComponent(Card)!;
                if (!card.isFaceUp) {
                    // 翻牌并记录undo
                    card.flipFaceUp();
                    this.playing.undoManager.pushMove({
                        cards: [cardNode],
                        from: playPile,
                        to: playPile,
                        oldPositions: [cardNode.position.clone()],
                        newPositions: [cardNode.position.clone()],
                        flip: {card: cardNode, wasFaceUp: false}
                    } as any);
                    console.log(`AutoSolver: 解锁游戏堆扣牌 - ${card.suit}${card.rank}`);
                    return true;
                }
            }
        }
        return false;
    }

    /** 抽取新牌（Stock → Waste，对应 U3D 抽取 holderHelpClose） */
    private tryDrawNewHelpCard(): boolean {
        const helpClosePile = this.mgrMapping.holderHelpClose;
        if (helpClosePile.node.children.length === 0) return false;

        // 调用 Cocos 原生抽牌逻辑
        this.playing.onClickStock();
        console.log('AutoSolver: 抽取新牌（Stock → Waste）');
        return true;
    }

    /** 回收帮助堆（Waste → Stock，对应 U3D 无新牌时的回收逻辑） */
    private tryRecycleHelpOpenToClose(): boolean {
        const helpClosePile = this.mgrMapping.holderHelpClose;
        const helpOpenPile = this.mgrMapping.holderHelpOpen;

        // 未抽取堆为空，且已抽取堆有牌 → 回收
        if (helpClosePile.node.children.length === 0 && helpOpenPile.node.children.length > 0) {
            this.playing.recycleWasteToStock();
            console.log('AutoSolver: 回收帮助堆（Waste → Stock）');
            return true;
        }
        return false;
    }

    /** 通用判断：牌是否能移动到目标堆（复用 Cocos 原生校验逻辑） */
    private canMoveToPile(card: Card, targetPile: Pile): boolean {
        if (targetPile.isFoundation) {
            return this.playing.canPlaceToFoundation(card, targetPile);
        } else if ((targetPile as any).isTableau) {
            return this.playing.canPlaceToTableau(card, targetPile);
        }
        return false;
    }

    /** 延迟工具函数 */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}