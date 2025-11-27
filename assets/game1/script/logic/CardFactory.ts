import { _decorator, instantiate, Prefab, Node } from 'cc';
import {Card, suits} from './Card';
import {ResUtil} from "db://assets/libs/res/ResUtil";
const { ccclass, property } = _decorator;

@ccclass('CardFactory')
export class CardFactory {

    constructor(
        private cardPrefab: Prefab,
    ) {}

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
}
