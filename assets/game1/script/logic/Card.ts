import {_decorator, Component, Node, Sprite, SpriteFrame, tween, Vec3} from 'cc';
import _ from 'lodash-es';
import {bundleName} from "db://assets/game1/script/YY";
import {ResUtil} from "db://assets/libs/res/ResUtil";

const {ccclass, property} = _decorator;

export const suits = ['hx', 'fk', 'ht', 'mh']

@ccclass('Card')
export class Card extends Component {
    @property(Node) flipNode: Node = null!;
    @property(Node) front: Node = null!;
    @property(Node) back: Node = null!;
    @property(Sprite) suitSprite: Sprite = null!;
    @property(Sprite) suitBackSprite: Sprite = null!;
    @property(Sprite) rankSprite: Sprite = null!;

    suit: string;
    rank: number;
    isFaceUp = false;

    init(suit: string, rank: number) {
        this.suit = suit as any;
        this.rank = rank;
        this.node.setScale(0.66, 0.66, 1);   // 整体缩放 Card 大小
        this.loadSprites();
    }

    getColor(): string {
        return _.includes(['hx', 'fk'], this.suit)?'red':'bla'
    }

    async loadSprites() {
        // 资源路径
        const path = 'texture/card'

        const suitPath = `${path}/${this.suit}_small/spriteFrame`;
        this.suitSprite.spriteFrame = await this.loadSF(suitPath);

        const suitBackPath = `${path}/${this.suit}/spriteFrame`;
        this.suitBackSprite.spriteFrame = await this.loadSF(suitBackPath);

        const rankPath = `${path}/${this.rank}_${this.getColor()}/spriteFrame`;
        this.rankSprite.spriteFrame = await this.loadSF(rankPath);
    }

    loadSF(path: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            ResUtil.load(this.node, bundleName, path, SpriteFrame, (err, sf) => {
                if (err) reject(err);
                else resolve(sf);
            });
        });
    }

    rankToKey(r: number) {
        return r === 1 ? "A" :
            r === 11 ? "J" :
                r === 12 ? "Q" :
                    r === 13 ? "K" : r.toString();
    }

    flipFaceUp() {
        if (this.isFaceUp) return;
        this.isFaceUp = true;
        tween(this.flipNode)
            .to(0.1, {scale: new Vec3(0, 1, 1)})
            .call(() => {
                this.front.active = true;
                this.back.active = false;
            })
            .to(0.1, {scale: new Vec3(1, 1, 1)})
            .start();
    }

    flipFaceDown() {
        if (!this.isFaceUp) return;
        this.isFaceUp = false;
        tween(this.flipNode)
            .to(0.1, {scale: new Vec3(0, 1, 1)})
            .call(() => {
                this.front.active = false;
                this.back.active = true;
            })
            .to(0.1, {scale: new Vec3(1, 1, 1)})
            .start();
    }
}
