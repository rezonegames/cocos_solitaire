import { _decorator, Component, Sprite } from 'cc';
import { atlasManager } from "db://assets/libs/res/AtlasManager";
import { AtlasPath, CardFrames } from "../AtlasPath";

const { ccclass, property } = _decorator;

/**
 * 卡牌管理器示例
 * 展示如何使用图集管理器来设置卡牌精灵
 */
@ccclass('CardManager')
export class CardManager extends Component {

    @property(Sprite)
    cardSprite: Sprite = null;

    async onLoad() {
        // 预加载卡牌图集
        await this.preloadAtlases();
    }

    /**
     * 预加载所有需要的图集
     */
    private async preloadAtlases() {
        try {
            const atlases = [
                AtlasPath.CARD,
                AtlasPath.MAIN_UI,
                AtlasPath.PLAY_UI
            ];
            
            await atlasManager.loadAtlases(atlases);
            console.log("All atlases loaded successfully");
            
            // 图集加载完成后可以设置默认卡牌
            this.setDefaultCard();
        } catch (error) {
            console.error("Failed to load atlases:", error);
        }
    }

    /**
     * 设置默认卡牌
     */
    private setDefaultCard() {
        if (this.cardSprite) {
            atlasManager.setSpriteFrame(this.cardSprite, AtlasPath.CARD, CardFrames.BIG_1);
        }
    }

    /**
     * 设置卡牌（同步方式，需要图集已加载）
     * @param cardNumber 卡牌数字 1-13
     * @param cardType 卡牌类型 'big' | 'red' | 'bla'
     */
    public setCard(cardNumber: number, cardType: 'big' | 'red' | 'bla') {
        if (!this.cardSprite) return;

        const frameName = `${cardNumber}_${cardType}`;
        const success = atlasManager.setSpriteFrame(this.cardSprite, AtlasPath.CARD, frameName);
        
        if (!success) {
            console.warn(`Failed to set card: ${frameName}`);
        }
    }

    /**
     * 异步设置卡牌（会自动加载图集）
     * @param cardNumber 卡牌数字 1-13
     * @param cardType 卡牌类型 'big' | 'red' | 'bla'
     */
    public async setCardAsync(cardNumber: number, cardType: 'big' | 'red' | 'bla') {
        if (!this.cardSprite) return;

        const frameName = `${cardNumber}_${cardType}`;
        const success = await atlasManager.setSpriteFrameAsync(this.cardSprite, AtlasPath.CARD, frameName);
        
        if (!success) {
            console.warn(`Failed to set card: ${frameName}`);
        }
    }

    /**
     * 设置花色
     * @param suit 花色 'spade' | 'heart' | 'club' | 'diamond'
     */
    public setSuit(suit: 'spade' | 'heart' | 'club' | 'diamond') {
        if (!this.cardSprite) return;

        let frameName: string;
        switch (suit) {
            case 'spade':
                frameName = CardFrames.SPADE;
                break;
            case 'heart':
                frameName = CardFrames.HEART;
                break;
            case 'club':
                frameName = CardFrames.CLUB;
                break;
            case 'diamond':
                frameName = CardFrames.DIAMOND;
                break;
            default:
                console.warn(`Unknown suit: ${suit}`);
                return;
        }

        atlasManager.setSpriteFrame(this.cardSprite, AtlasPath.CARD, frameName);
    }

    onDestroy() {
        // 组件销毁时可以选择释放图集资源
        // 注意：只有确定其他地方不再使用时才释放
        // atlasManager.releaseAtlas(AtlasPath.CARD);
    }
}