import {uiManager} from "db://assets/libs/ui/UIManager";
import {VM} from "../../libs/modelview/ViewModel";
import {storageManager} from "db://assets/libs/storage/StorageManager";
import {logger} from "db://assets/libs/log/Logger";
import {languageManager} from "db://assets/libs/language/Language";
import {HotUpdate} from "db://assets/libs/hotupate/HotUpdate";
import {HotUpdateWeb} from "db://assets/libs/hotupate/HotUpdateWeb";

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

    static async init() {

        const language = storageManager.get('language', 'en');
        logger.logConfig(`game1 storage language:${language}`);
        await languageManager.setLanguage('game1', language);

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