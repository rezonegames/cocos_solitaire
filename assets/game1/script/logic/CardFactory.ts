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
     * 根据关卡难度进行洗牌
     * @param deck 牌组
     * @param level 关卡等级 (1-100)
     */
    shuffle1(deck: Node[], level: number) {
        // 限制等级范围
        level = Math.max(1, Math.min(100, level));

        // 根据难度调整洗牌策略
        if (level <= 20) {
            // 简单难度：部分有序洗牌
            const seed = this.seededRandom(level);
            this.partialShuffle(deck, 0.3, seed);
        } else if (level <= 50) {
            // 中等难度：标准洗牌
            const seed = this.seededRandom(level);
            this.seededShuffle(deck, seed);
        } else if (level <= 80) {
            // 困难难度：多次洗牌
            const seed1 = this.seededRandom(level);
            const seed2 = this.seededRandom(level + 1000); // 使用不同的种子值
            this.seededShuffle(deck, seed1);
            this.seededShuffle(deck, seed2);
        } else {
            // 极难难度：完全随机 + 特殊排列
            const seed1 = this.seededRandom(level);
            const seed2 = this.seededRandom(level + 1000);
            const seed3 = this.seededRandom(level + 2000);
            this.seededShuffle(deck, seed1);
            this.seededShuffle(deck, seed2);
            this.createDifficultPattern(deck, seed3);
        }
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

    /**
     * 部分洗牌（保持一定有序性）
     */
    private partialShuffle(deck: Node[], shuffleRatio: number, randomFunc: () => number) {
        const shuffleCount = Math.floor(deck.length * shuffleRatio);

        for (let i = 0; i < shuffleCount; i++) {
            const pos1 = Math.floor(randomFunc() * deck.length);
            const pos2 = Math.floor(randomFunc() * deck.length);
            [deck[pos1], deck[pos2]] = [deck[pos2], deck[pos1]];
        }
    }

    /**
     * 创建困难模式的特殊排列
     */
    private createDifficultPattern(deck: Node[], randomFunc: () => number) {
        // 将大牌尽量放在小牌下面，增加难度
        const cards = deck.map(node => ({
            node,
            rank: node.getComponent(Card)!.rank
        }));

        // 按rank排序，大牌在前
        cards.sort((a, b) => b.rank - a.rank);

        // 重新排列到deck中，但加入一些随机性
        for (let i = 0; i < cards.length; i++) {
            if (randomFunc() < 0.7) { // 70%概率保持困难排列
                deck[i] = cards[i].node;
            }
        }
    }
}