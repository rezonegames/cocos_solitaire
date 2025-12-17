import {_decorator, Component, Node, Sprite, SpriteFrame, tween, Vec3, UIOpacity, UITransform, SpriteAtlas} from 'cc';
import _ from 'lodash-es';
import {bundleName} from "db://assets/game1/script/YY";
import {logger} from "db://assets/libs/log/Logger";
import {resLoader} from "db://assets/libs/res/ResLoader";

const {ccclass, property} = _decorator;

// 位置不变，否则key就变了，从小到大 方块，草花，黑桃，红心
export const suits = ['fk', 'mh', 'hx', 'ht']

@ccclass('Card')
export class Card extends Component {
    @property(Node) flipNode: Node = null!;
    @property(Node) front: Node = null!;
    @property(Node) back: Node = null!;
    @property(Sprite) suitSprite: Sprite = null!;
    @property(Sprite) suitBackSprite: Sprite = null!;
    @property(Sprite) rankSprite: Sprite = null!;
    @property(Sprite) holdSprite: Sprite = null!;

    @property({tooltip: "花色"}) suit: string;
    @property({tooltip: "点数"}) rank: number;
    @property({tooltip: "1～52对应的数字"}) key: string;
    @property({tooltip: "是否正面朝上"}) _isFaceUp = false;
    set isFaceUp(value: boolean) {
        this._isFaceUp = value;
    }

    get isFaceUp() {
        return this._isFaceUp && this.isShow();
    }

    detail() {
        const m = {
            'fk': '♦️',
            'mh': '♣️',
            'hx': '♥️',
            'ht': '♠️'
        }
        return `${this.key}：${m[this.suit]}${this.rankToKey()} isFaceUp: ${this.isFaceUp}`;
    }

    init(suit: string, rank: number) {
        this.suit = suit;
        this.rank = rank;
        this.key = (_.indexOf(suits, suit) * 13 + rank).toString();
        // logger.logView(`init suit: ${this.suit} v: ${this.rankToKey()}`);
        this.loadSprites();
        this.holdSprite.enabled = false;
    }

    getColor(): string {
        return _.includes(['hx', 'fk'], this.suit) ? 'red' : 'bla'
    }

    async loadSprites() {
        const atlas = await resLoader.loadAsync(bundleName, 'texture/card/card_atlas', SpriteAtlas);
        
        this.suitSprite.spriteFrame = atlas.getSpriteFrame(`${this.suit}_small`);
        this.suitBackSprite.spriteFrame = atlas.getSpriteFrame(this.suit);
        this.rankSprite.spriteFrame = atlas.getSpriteFrame(`${this.rank}_${this.getColor()}`);
        /*
                const suitPath = `${path}/${this.suit}_small/spriteFrame`;
        this.suitSprite.spriteFrame = await this.loadSF(suitPath);

        const suitBackPath = `${path}/${this.suit}/spriteFrame`;
        this.suitBackSprite.spriteFrame = await this.loadSF(suitBackPath);

        const rankPath = `${path}/${this.rank}_${this.getColor()}/spriteFrame`;
        this.rankSprite.spriteFrame = await this.loadSF(rankPath);

         */
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
            .repeat(2,
                tween()
                    .to(0.06, {position: new Vec3(originalPos.x + 4, originalPos.y, originalPos.z)})
                    .to(0.06, {position: new Vec3(originalPos.x - 4, originalPos.y, originalPos.z)})
            )
            .to(0.06, {position: originalPos})
            .start();
    }

    hide() {
        this.node.getComponent(UIOpacity).opacity = 120;
        this.holdSprite.enabled = true;
    }

    show() {
        this.node.getComponent(UIOpacity).opacity = 255;
        this.holdSprite.enabled = false;
    }

    isShow() {
        return this.node.getComponent(UIOpacity).opacity === 255;
    }
}
