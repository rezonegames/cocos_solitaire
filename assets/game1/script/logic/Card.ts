import {_decorator, Component, Node, Sprite, SpriteFrame, tween, Vec3, UIOpacity} from 'cc';
import _ from 'lodash-es';
import {bundleName} from "db://assets/game1/script/YY";
import {ResUtil} from "db://assets/libs/res/ResUtil";
import {logger} from "db://assets/libs/log/Logger";

const {ccclass, property} = _decorator;

// 位置不变，否则key就变了，从小到大 草花，方块，黑桃，红心
// export const suits = ['mh', 'fk', 'ht', 'hx']
export const suits = ['fk', 'mh', 'hx', 'ht']

@ccclass('Card')
export class Card extends Component {
    @property(Node) flipNode: Node = null!;
    @property(Node) front: Node = null!;
    @property(Node) back: Node = null!;
    @property(Sprite) suitSprite: Sprite = null!;
    @property(Sprite) suitBackSprite: Sprite = null!;
    @property(Sprite) rankSprite: Sprite = null!;

    @property({ tooltip: "花色" }) suit: string;
    @property({ tooltip: "点数" }) rank: number;
    @property({ tooltip: "1～52对应的数字" }) key: string;
    @property({ tooltip: "是否正面朝上" }) isFaceUp = false;

    detail() {
        return `key: ${this.key} suit: ${this.suit} rank: ${this.rank} isFaceUp: ${this.isFaceUp}`;
    }

    init(suit: string, rank: number, key?: string) {
        this.suit = suit;
        this.rank = rank;
        this.key = key;
        if(!this.key) {
            this.key = (_.findIndex(suits, suit)*13 + rank).toString();
        }
        logger.logView(`init: ${this.key}, ${this.suit}, ${this.rankToKey()}`);
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

    rankToKey() {
        const r = this.rank;
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

    simpleShake() {
        const originalPos = this.node.position.clone();
        tween(this.node)
            .repeat(3,
                tween()
                    .to(0.06, { position: new Vec3(originalPos.x + 4, originalPos.y, originalPos.z) })
                    .to(0.06, { position: new Vec3(originalPos.x - 4, originalPos.y, originalPos.z) })
            )
            .to(0.06, { position: originalPos })
            .start();
    }

    hide() {
        this.node.getComponent(UIOpacity).opacity = 0;
    }

    show() {
        this.node.getComponent(UIOpacity).opacity = 255;
    }

    isHide() {
        return this.node.getComponent(UIOpacity).opacity === 0
    }
}
