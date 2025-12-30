import _ from 'lodash-es';
import {_decorator, Node, EventHandler} from 'cc';
import {VM} from "db://assets/libs/modelview/ViewModel";
import {UIView} from "db://assets/libs/ui/UIView";
import {GlobalData} from "db://assets/game1/script/Data";
import {ShopItem} from "db://assets/game1/script/ShopItem";
import {SuperLayout} from "db://assets/libs/gui/SuperLayout";
import {uiManager} from "db://assets/libs/ui/UIManager";

const {ccclass, property} = _decorator;

@ccclass('UIShop')
export class UIShop extends UIView {

    globalData = VM.get<GlobalData>('globalData').$data;

    @property(SuperLayout) layout!: SuperLayout;
    listData: any[] = [];

    async onLoad() {
        super.onLoad();
        const shopConfig = this.globalData.shopConfig;

        // 配置刷新事件回调
        this.layout.refreshItemEvents = [new EventHandler()];
        this.layout.refreshItemEvents[0].target = this.node;
        this.layout.refreshItemEvents[0].component = 'UIShop';
        this.layout.refreshItemEvents[0].handler = 'onRefreshItem';
        
        // 绑定this上下文
        this.onRefreshItem = this.onRefreshItem.bind(this);

        this.listData = _.map(shopConfig, (item, itemId) => {
            item.itemId = itemId;
            return item;
        });

        await this.layout.total(this.listData.length);
    }

    // Item刷新回调
    async onRefreshItem(sender: any, index: number, itemNode: Node) {
        console.log('onRefreshItem called:', index, itemNode.name); // 调试日志
        const data = this.listData[index];
        if (!data) {
            console.warn('数据不存在:', index);
            return;
        }
        const cellItem = itemNode.getComponent<ShopItem>('ShopItem');
        if (cellItem) {
            // 绑定init方法的this上下文
            const boundInit = cellItem.init.bind(cellItem);
            await boundInit(data);
        } else {
            console.warn('ShopItem组件不存在');
        }
    }

    onClose(): any {
        uiManager.close(this)
    }

    start() {

    }

    update(deltaTime: number) {

    }
}

