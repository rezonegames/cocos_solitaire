import {_decorator, JsonAsset, Prefab, Node} from 'cc';
import _ from 'lodash-es';
import {Card, suits} from './Card';
import {ResUtil} from "db://assets/libs/res/ResUtil";
import {logger} from "db://assets/libs/log/Logger";
import {VM} from "db://assets/libs/modelview/ViewModel";
import {GlobalData, Player} from "db://assets/game1/script/YY";

const {ccclass, property} = _decorator;

@ccclass('CardFactory')
export class CardFactory {

    deck: Node[] = [];

    constructor(
        private cardPrefab: Prefab,
    ) {

    }

    async generateDeck(levelId: string): Promise<Node[]> {
        const globalData = VM.get<GlobalData>('globalData').$data;
        let v = globalData.getLevelConfig(levelId);
        // 初始化deck
        if (_.isEmpty(this.deck)) {
            for (const suit of suits) {
                for (let rank = 1; rank <= 13; rank++) {
                    const cardNode = ResUtil.instantiate(this.cardPrefab);
                    const card = cardNode.getComponent(Card)!;
                    card.init(suit, rank);
                    this.deck.push(cardNode);
                }
            }
        }
        if (!v) {
            logger.trace(`generateDeck没有可使用的配置！！`)
            // this.shuffle1(this.deck, level);
            v = "48,13,22,9,52,50,5,44,33,18,1,19,25,23,16,41,11,8,15,10,45,7,14,35,40,26,21,17,6,39,38,46,28,34,27,47,51,43,42,12,3,29,24,20,37,2,36,4,49,32,31,30"
        }
        const vList = v.split(',');
        this.deck = _.sortBy(this.deck, (node: Node) => vList.indexOf(node.getComponent(Card)!.key));
        return this.deck;
    }

    /**
     * 单纯随机
     */
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
        const seed = this.seededRandom(level);
        this.seededShuffle(deck, seed);

        // tableau前28张，stock后24张
        const tableauCards = deck.slice(0, 28);
        const stockCards = deck.slice(28);

        // 找出所有小牌（A, 2, 3）
        const allSmallCards: { node: Node, index: number, inStock: boolean }[] = [];
        tableauCards.forEach((node, i) => {
            const card = node.getComponent(Card)!;
            if (card.rank <= 3) {
                allSmallCards.push({node, index: i, inStock: false});
            }
        });
        stockCards.forEach((node, i) => {
            const card = node.getComponent(Card)!;
            if (card.rank <= 3) {
                allSmallCards.push({node, index: i + 28, inStock: true});
            }
        });

        // tableau中每列顶牌位置（会被翻开）：第0,2,5,9,14,20,27张
        const topPositions = [0, 2, 5, 9, 14, 20, 27];
        // tableau中底牌位置（最难翻开）：第1,3,4,6,7,8,10,11,12,13张
        const bottomPositions = [1, 3, 4, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18, 19];

        if (level <= 30) {
            // 简单：将A和小牌放到顶部或stock
            const moveCount = Math.min(allSmallCards.length, 5 + Math.floor((30 - level) / 5));

            for (let i = 0; i < moveCount && i < allSmallCards.length; i++) {
                const smallCard = allSmallCards[i];

                // 50%放到tableau顶部，50%放到stock
                if (seed() < 0.5 && i < topPositions.length) {
                    const targetPos = topPositions[i];
                    [deck[targetPos], deck[smallCard.index]] = [deck[smallCard.index], deck[targetPos]];
                } else {
                    // 放到stock前面（容易翻到）
                    const stockStart = 28;
                    const targetPos = stockStart + (i % 5);
                    if (targetPos < deck.length) {
                        [deck[targetPos], deck[smallCard.index]] = [deck[smallCard.index], deck[targetPos]];
                    }
                }
            }
        } else if (level >= 70) {
            // 困难：将A和小牌埋到tableau底部
            const aces = allSmallCards.filter(c => c.node.getComponent(Card)!.rank === 1);
            const moveCount = Math.min(aces.length, 3 + Math.floor((level - 70) / 10));

            for (let i = 0; i < moveCount && i < bottomPositions.length; i++) {
                if (i < aces.length) {
                    const targetPos = bottomPositions[i];
                    [deck[targetPos], deck[aces[i].index]] = [deck[aces[i].index], deck[targetPos]];
                }
            }
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
}