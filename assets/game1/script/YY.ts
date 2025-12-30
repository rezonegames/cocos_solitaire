import {JsonAsset} from 'cc'
import _ from 'lodash-es';
import {uiManager} from "db://assets/libs/ui/UIManager";
import {storageManager} from "db://assets/libs/storage/StorageManager";
import {logger} from "db://assets/libs/log/Logger";
import {languageManager} from "db://assets/libs/language/Language";
import {resLoader} from "db://assets/libs/res/ResLoader";
import {wechatAd} from "db://assets/game1/script/wechat/WechatAd";
import {VM} from "db://assets/libs/modelview/ViewModel";
import {getData, GlobalData} from "db://assets/game1/script/Data";

/** UI类型 */
export enum UIID {
    UIBackGround,
    UILogin,
    UISelectGame,
    UIPlay,
    UIWin,
    UILevelUp,
    UILose,
    UIPause,
    UIMagicWand,
    UIShop,
    UISetting,
    UIStarChest,
    UIDailyChallenge,
}

// bundle
export let bundleName = "game1"

export class GameInstance {

    static async init() {
        const globalData = VM.get<GlobalData>('globalData').$data;
        const v = await resLoader.loadAsync(bundleName, 'config/f2', JsonAsset)
        // globalData.levelConfig =v.json;
        globalData.levelConfig = _
            .chain(v.json)
            // 1. 把每个 key 解析成 { group, k, v }
            .map((value, key) => {
                const [group, k] = key.split("_").map(Number);
                return {group, k, v: value};
            })
            // 2. 以 group 分组
            .groupBy("group")
            // 3. 调整结构：只保留 k,v 并按 k 排序
            .mapValues(arr =>
                _.sortBy(arr.map(item => ({k: item.k, v: item.v})), "k")
            )
            .value();
        const v1 = await resLoader.loadAsync(bundleName, 'config/level', JsonAsset);
        globalData.expConfig = v1.json;
        const v2 = await resLoader.loadAsync(bundleName, 'config/shop', JsonAsset);
        globalData.shopConfig = v2.json;
        const language = storageManager.get('language', 'en');
        await languageManager.setLanguage('game1', language);
        logger.logConfig(`config success :)`);

        // 获取玩家数据
        await getData();

        // 初始化广告
        wechatAd.init();

        const bundle = bundleName;
        uiManager.initUIConf({
            [UIID.UIBackGround]: {bundle, prefab: 'prefab/BackGround'},
            [UIID.UILogin]: {bundle, prefab: 'prefab/Login'},
            [UIID.UISelectGame]: {bundle, prefab: 'prefab/SelectGame'},
            [UIID.UIPlay]: {bundle, prefab: 'prefab/Play'},
            [UIID.UIPause]: {bundle, prefab: 'prefab/Pause', preventTouch: true},
            [UIID.UIWin]: {bundle, prefab: 'prefab/Win', preventTouch: true},
            [UIID.UILose]: {bundle, prefab: 'prefab/Lose', preventTouch: true},
            [UIID.UILevelUp]: {bundle, prefab: 'prefab/LevelUp', preventTouch: true},
            [UIID.UIMagicWand]: {bundle, prefab: 'prefab/MagicWand', preventTouch: true},
            [UIID.UIShop]: {bundle, prefab: 'prefab/Shop', preventTouch: true},
        })
        uiManager.open(UIID.UIBackGround);
        uiManager.open(UIID.UILogin);

        logger.logView(`init done`);
    }
}