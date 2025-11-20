import {uiManager} from "db://assets/libs/ui/UIManager";
import {VM} from "../../libs/modelview/ViewModel";

// UI类型
export enum UIID {
    UIBackGround,
    UILogin,
    UIPlay,
}

// 玩家数据
export class Player {
    name: string;
    level: number;
    // 道具
    items: {
        coin: number;
    }
}

let player = new Player();
VM.add(player, 'player');

// bundle
export let bundleName = "game1"

export class GameInstance {

    static init() {

        const bundle = bundleName;
        uiManager.initUIConf({
            [UIID.UIBackGround]: {bundle, prefab: 'prefab/BackGround'},
            [UIID.UILogin]: {bundle, prefab: 'prefab/Login'},
            [UIID.UIPlay]: {bundle, prefab: 'prefab/Play'},
        })
        uiManager.open(UIID.UIBackGround);
        uiManager.open(UIID.UILogin);
    }
}