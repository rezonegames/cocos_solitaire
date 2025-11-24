import _ from 'lodash-es';
import {uiManager} from "db://assets/libs/ui/UIManager";
import {VM} from "db://assets/libs/modelview/ViewModel";
import {storageManager} from "db://assets/libs/storage/StorageManager";
import {logger} from "db://assets/libs/log/Logger";
import {languageManager} from "db://assets/libs/language/Language";
import {LanguageLabel} from "db://assets/libs/language/LanguageLabel";

// UI类型
export enum UIID {
    UIBackGround,
    UILogin,
    UISelectGame,
    UIPlay,
}

// 玩家数据
export class Player {
    name: string = 'Player';
    // 等级
    level: number = 0;
    levelString: string = 'LV:0';
    // 经验
    exp: number = 0;

    // 道具
    items = {
        coin: 0,
    };

    // 日常宝箱
    dayChest = {
        progress: 0
    }

    // 日常花园
    dayGarden = {
        progress: 0
    }

    /**
     * 下面是一些方法
     */
    setLevel(level: number) {
        this.level = level;
        this.levelString = LanguageLabel.pack({dataId: `ui_level`, params: {level: 10}});
    }

    setItems(items: any) {
        _.forEach(items, (v, k) => {
            // logger.trace(`v: ${v} key: ${k}`);
            this.items[k] = LanguageLabel.pack({dataId: v});
        })
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

        player.setLevel(100)
        player.setItems({coin: 10009,});

        // this.levelString += LanguageLabel.pack({dataId: `ui_level`, params: {level: this.level}});

        const bundle = bundleName;
        uiManager.initUIConf({
            [UIID.UIBackGround]: {bundle, prefab: 'prefab/BackGround'},
            [UIID.UILogin]: {bundle, prefab: 'prefab/Login'},
            [UIID.UISelectGame]: {bundle, prefab: 'prefab/SelectGame'},
            [UIID.UIPlay]: {bundle, prefab: 'prefab/Play'},
        })
        uiManager.open(UIID.UIBackGround);
        uiManager.open(UIID.UISelectGame);
    }
}