import {_decorator, SpriteFrame, SpriteAtlas} from 'cc';
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

    @property(SpriteFrame)
    icon: SpriteFrame = null!

    async init(item) {
        // ID
        this.data.itemId = item.itemId;
        // 图片
        if (!cardAtlasCache) {
            try {
                cardAtlasCache = await resLoader.loadAsync(bundleName, 'texture/pop_shop/pop_shop_atlas', SpriteAtlas);
            } catch (e) {
                cardAtlasCache = null;
            }
        }
        if (cardAtlasCache) {
            this.icon = cardAtlasCache.getSpriteFrame(item.image);
        }
        // 价格
        switch (item.priceType) {
            case "subscribe":
                this.data.name = `ui_vip`;
                this.data.buyStr = `ui_subscribe`;
                break
            case "ad":
                this.data.name = item.price;
                this.data.buyStr = `ui_free`;
                break
            default:
                this.data.name = `${item.count}`
                this.data.buyStr = `US$${item.price}`;
        }
        // 折扣
        if(this.data.countDown > 0) {
            this.data.countDownStr = `+${(1 + item.count_down) * 100}%`;
        }
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

