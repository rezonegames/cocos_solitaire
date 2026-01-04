import {_decorator, SpriteFrame, SpriteAtlas, Sprite, Button} from 'cc';
import VMParent from "db://assets/libs/modelview/VMParent";
import {resLoader} from "db://assets/libs/res/ResLoader";
import {bundleName} from "db://assets/game1/script/YY";
import {VM} from "db://assets/libs/modelview/ViewModel";
import {Player} from "db://assets/game1/script/Data";
import {wechatAd} from "db://assets/game1/script/wechat/WechatAd";

const {ccclass, property} = _decorator;

// 图集缓存
let cardAtlasCache: SpriteAtlas | null = null;

@ccclass('ShopItem')
export class ShopItem extends VMParent {

    data = {
        "name": '',
        "count": 100,
        "priceType": "subscribe",
        "price": 2,
        "countDown": 0.0,
        "countDownStr": "+150%",
        "image": "ui_vip",
        "itemId": '1001',
        "buyStr": ''
    }
    player = VM.get<Player>('player').$data;

    @property(Sprite) icon: Sprite = null!
    @property(Sprite) bg: Sprite = null!
    @property(Button) btnBuy: Button = null!


    protected async onLoad() {
        super.onLoad();

        // 图片
        if (!cardAtlasCache) {
            try {
                cardAtlasCache = await resLoader.loadAsync(bundleName, 'texture/pop_shop/pop_shop_atlas', SpriteAtlas);
            } catch (e) {
                console.error('加载图集失败:', e);
                cardAtlasCache = null;
            }
        }
    }

    /*
    {
    "name": 100.0,
    "price_type": "ad",
    "price": 0.0,
    "count_down": 0.0,
    "image": "coin01"
  }
     */
    async init(item: any) {
        console.log('ShopItem init called, this:', this, item); // 调试日志
        
        if (!this || !this.data) {
            console.error('ShopItem this 为空或数据不存在');
            return;
        }

        // ID
        this.data.itemId = item.itemId;

        async function f(sprite, image) {
            if (!sprite || !image) return;
            
            // 尝试从图集获取
            if (cardAtlasCache) {
                const spriteFrame = cardAtlasCache.getSpriteFrame(image);
                if (spriteFrame) {
                    sprite.spriteFrame = spriteFrame;
                    return;
                }
            }
            
            // 降级为单图加载
            try {
                sprite.spriteFrame = await resLoader.loadAsync(bundleName, `texture/pop_shop/${image}/spriteFrame`, SpriteFrame);
            } catch (e) {
                console.error(`加载图片失败: ${image}`, e);
            }
        }

        f(this.icon, item.image);
        
        // 价格
        switch (item.price_type) {
            case "subscribe":
                this.data.name = `ui_vip`;
                this.data.buyStr = `ui_subscribe`;
                f(this.bg, `shop_item_bg_vip`);
                f(this.btnBuy.getComponent(Sprite), `button_lv_134`);
                break;
            case "ad":
                this.data.name = item.name;
                this.data.buyStr = `ui_free`;
                f(this.bg, `shop_item_bg`);
                f(this.btnBuy.getComponent(Sprite), `button_hui_134`);
                break;
            default:
                this.data.name = `${item.name}`;
                this.data.buyStr = `US$${item.price}`;
                f(this.bg, `shop_item_bg`);
                f(this.btnBuy.getComponent(Sprite), `button_lv_134`);
        }
        
        // 折扣
        if (item.count_down > 0) {
            this.data.countDown = item.count_down;
            this.data.countDownStr = `+${(1 + item.count_down) * 100}%`;
        }

        this.data.count = item.count;
        this.data.priceType = item.price_type;
    }

    onBuy() {
        switch (this.data.priceType) {
            case "subscribe":
                this.player.addItems({'coin': this.data.count});
                break
            case "ad":
                const self = this;
                wechatAd.showRewardedVideoAd(() => {
                    this.player.addItems({coin: self.data.count});
                });
                break
            default:
                this.player.addItems({'coin': this.data.count});
        }
    }

    start() {

    }

    update(deltaTime: number) {

    }
}

