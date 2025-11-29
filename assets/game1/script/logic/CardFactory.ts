import {_decorator, instantiate, Prefab, Node} from 'cc';
import {Card, suits} from './Card';
import {ResUtil} from "db://assets/libs/res/ResUtil";

const {ccclass, property} = _decorator;

@ccclass('CardFactory')
export class CardFactory {

    constructor(
        private cardPrefab: Prefab,
    ) {
    }

    generateDeck(): Node[] {
        const deck: Node[] = [];
        for (const suit of suits) {
            for (let rank = 1; rank <= 13; rank++) {
                const cardNode = ResUtil.instantiate(this.cardPrefab);
                const card = cardNode.getComponent(Card)!;
                card.init(suit, rank);
                deck.push(cardNode);
            }
        }
        return deck;
    }

    shuffle(deck: Node[]) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    /**
     * 根据关卡难度进行洗牌 - 高级算法
     */
    shuffle1(deck: Node[], level: number) {
        level = Math.max(1, Math.min(100, level));

        // 使用固定种子确保同一关卡结果一致
        const seed = this.seededRandom(level);

        // 先正常洗牌
        this.seededShuffle(deck, seed);

        if (level <= 20) {
            this.optimizeForBeginner(deck, seed, level);
        } else if (level <= 40) {
            this.optimizeForIntermediate(deck, seed, level);
        } else if (level <= 70) {
            this.optimizeForAdvanced(deck, seed, level);
        } else {
            this.optimizeForMaster(deck, seed, level);
        }
    }

    /**
     * 优化初学者布局：在现有牌组基础上调整
     */
    private optimizeForBeginner(deck: Node[], randomFunc: () => number, level: number) {
        const easyFactor = (21 - level) / 20; // 1.0 到 0.05
        const tableauCards = deck.slice(0, 28);

        // 只调整部分牌，不是全部重写
        for (let col = 0; col < 7; col++) {
            const topIndex = this.getTableauTopIndex(col);
            if (topIndex < tableauCards.length && randomFunc() < easyFactor * 0.6) {
                const topCard = tableauCards[topIndex].getComponent(Card)!;

                // 有概率设置为中等大小的牌
                if (randomFunc() < 0.5) {
                    
                    const suit = suits[Math.floor(randomFunc() * 4)];
                    const rank = Math.floor(randomFunc() * 6) + 6; // 6-11
                    topCard.init(suit, rank);

                    // 尝试在其他列创建可接续的牌
                    this.tryCreateConnection(tableauCards, col, topCard, randomFunc);
                }
            }
        }

        // 调整一些底牌为小牌，增加翻牌价值
        this.adjustBuriedCards(tableauCards, randomFunc, easyFactor);
    }

    /**
     * 尝试创建连接
     */
    private tryCreateConnection(tableauCards: Node[], currentCol: number, topCard: Card, randomFunc: () => number) {
        const topRank = topCard.rank;
        const topColor = topCard.getColor();

        // 30% 概率在其他列创建可连接的牌
        if (randomFunc() < 0.3 && topRank > 1) {
            for (let targetCol = 0; targetCol < 7; targetCol++) {
                if (targetCol === currentCol) continue;

                const targetTopIndex = this.getTableauTopIndex(targetCol);
                if (targetTopIndex < tableauCards.length && randomFunc() < 0.4) {
                    const targetCard = tableauCards[targetTopIndex].getComponent(Card)!;

                    // 创建可以放置的牌 (rank-1, 不同颜色)['hx', 'fk', 'ht', 'mh']
                    const suits = topColor === 'red' ? ['ht', 'mh'] : ['hx', 'fk'];
                    const suit = suits[Math.floor(randomFunc() * 2)];
                    targetCard.init(suit, topRank - 1);
                    break;
                }
            }
        }
    }

    /**
     * 调整埋藏的牌
     */
    private adjustBuriedCards(tableauCards: Node[], randomFunc: () => number, helpFactor: number) {
        // 在简单关卡中，让一些埋藏的牌变成有用的小牌
        for (let i = 0; i < Math.floor(tableauCards.length * 0.6); i++) {
            if (randomFunc() < helpFactor * 0.2) {
                const card = tableauCards[i].getComponent(Card)!;
                
                const suit = suits[Math.floor(randomFunc() * 4)];

                // 60% A, 40% 其他小牌
                const rank = randomFunc() < 0.6 ? 1 : Math.floor(randomFunc() * 4) + 2;
                card.init(suit, rank);
            }
        }
    }

    /**
     * 中级优化
     */
    private optimizeForIntermediate(deck: Node[], randomFunc: () => number, level: number) {
        const tableauCards = deck.slice(0, 28);

        // 只调整少量牌
        for (let col = 0; col < 7; col++) {
            const topIndex = this.getTableauTopIndex(col);
            if (topIndex < tableauCards.length && randomFunc() < 0.3) {
                const topCard = tableauCards[topIndex].getComponent(Card)!;

                if (randomFunc() < 0.4) {
                    
                    const suit = suits[Math.floor(randomFunc() * 4)];
                    const rank = Math.floor(randomFunc() * 8) + 4; // 4-11
                    topCard.init(suit, rank);
                }
            }
        }
    }

    /**
     * 高级和大师级优化
     */
    private optimizeForAdvanced(deck: Node[], randomFunc: () => number, level: number) {
        const tableauCards = deck.slice(0, 28);

        // 让一些顶牌变成大牌，增加难度
        for (let col = 0; col < 7; col++) {
            const topIndex = this.getTableauTopIndex(col);
            if (topIndex < tableauCards.length && randomFunc() < 0.4) {
                const topCard = tableauCards[topIndex].getComponent(Card)!;

                
                const suit = suits[Math.floor(randomFunc() * 4)];
                const rank = Math.floor(randomFunc() * 4) + 10; // 10-13 大牌
                topCard.init(suit, rank);
            }
        }
    }

    private optimizeForMaster(deck: Node[], randomFunc: () => number, level: number) {
        // 大师级：让更多顶牌变成难以移动的大牌
        this.optimizeForAdvanced(deck, randomFunc, level);

        const tableauCards = deck.slice(0, 28);

        // 额外增加一些阻塞
        for (let i = 0; i < Math.floor(tableauCards.length * 0.3); i++) {
            if (randomFunc() < 0.3) {
                const card = tableauCards[i].getComponent(Card)!;
                
                const suit = suits[Math.floor(randomFunc() * 4)];
                const rank = Math.floor(randomFunc() * 3) + 1; // 1-3 关键小牌被埋
                card.init(suit, rank);
            }
        }
    }

    /**
     * 获取tableau列的起始索引
     */
    private getTableauColumnStart(col: number): number {
        let start = 0;
        for (let i = 0; i < col; i++) {
            start += i + 1;
        }
        return start;
    }

    /**
     * 获取tableau列顶牌的索引
     */
    private getTableauTopIndex(col: number): number {
        return this.getTableauColumnStart(col) + col;
    }

    /**
     * 基于种子的随机数生成器
     */
    private seededRandom(seed: number): () => number {
        let state = seed;
        return () => {
            state = (state * 9301 + 49297) % 233280;
            return state / 233280;
        };
    }

    /**
     * 使用种子的洗牌
     */
    private seededShuffle(deck: Node[], randomFunc: () => number) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(randomFunc() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }
}