import _ from 'lodash-es';
import {_decorator, Prefab} from 'cc';
import {VM} from "db://assets/libs/modelview/ViewModel";
import {UIView} from "db://assets/libs/ui/UIView";
import {GlobalData} from "db://assets/game1/script/Data";
import {ResUtil} from "db://assets/libs/res/ResUtil";
import {ShopItem} from "db://assets/game1/script/ShopItem";

const {ccclass, property} = _decorator;

@ccclass('UIShop')
export class UIShop extends UIView {

    globalData = VM.get<GlobalData>('globalData').$data;

    @property(Prefab)
    cellItem: Prefab = null!

    onLoad() {
        super.onLoad();
        const shopConfig = this.globalData.shopConfig;
        _.map(shopConfig, (item, itemId) => {
            const node = ResUtil.instantiate(this.cellItem);
            const cellItem = node.getComponent<ShopItem>('ShopItem');
            item.itemId = itemId;
            cellItem.init(item);
            this.node.addChild(node);
        })
    }

    start() {

    }

    update(deltaTime: number) {

    }
}

