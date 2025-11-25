import {_decorator, Component, Node, Sprite, SpriteFrame, tween, Vec3} from 'cc';
import {resLoader} from "db://assets/libs/res/ResLoader";
import {bundleName} from "db://assets/game1/script/YY";

const {ccclass, property} = _decorator;

@ccclass('Card')
export class Card extends Component {
    @property(Node) front: Node = null!;
    @property(Node) back: Node = null!;
    @property(Sprite) suitSprite: Sprite = null!;
    @property(Sprite) rankSprite: Sprite = null!;

    suit: 'spade' | 'heart' | 'club' | 'diamond';
    rank: number; // 1~13
    isFaceUp = false;

    init(suit: string, rank: number) {
        this.suit = suit as any;
        this.rank = rank;
        this.loadSprites().then();
    }

    async loadSprites() {
        // suit 图
        const suitPath = `textures/play_ui/${this.suit}`;
        this.suitSprite.spriteFrame = await this.loadSF(suitPath);

        // rank 图 (1->A, 11->J,12->Q,13->K)
        const rankStr = this.rankToKey(this.rank);
        const rankPath = `textures/ranks/${rankStr}/spriteFrame`;
        this.rankSprite.spriteFrame = await this.loadSF(rankPath);
    }

    loadSF(path: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            resLoader.load(bundleName, path, SpriteFrame, (err, spriteFrame) => {
                if (err) return reject(err);
                resolve(spriteFrame);
            })
        })

    }

    rankToKey(r: number) {
        return r === 1 ? "A" :
            r === 11 ? "J" :
                r === 12 ? "Q" :
                    r === 13 ? "K" : r.toString();
    }

    /** 翻牌动画 */
    flipFaceUp() {
        if (this.isFaceUp) return;
        this.isFaceUp = true;

        tween(this.node)
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

        tween(this.node)
            .to(0.1, {scale: new Vec3(0, 1, 1)})
            .call(() => {
                this.front.active = false;
                this.back.active = true;
            })
            .to(0.1, {scale: new Vec3(1, 1, 1)})
            .start();
    }

    /** 红黑色 */
    getColor() {
        return (this.suit === "heart" || this.suit === "diamond") ? "red" : "black";
    }
}
