import {JsonAsset} from 'cc'
import _ from 'lodash-es';
import {uiManager} from "db://assets/libs/ui/UIManager";
import {VM} from "db://assets/libs/modelview/ViewModel";
import {storageManager} from "db://assets/libs/storage/StorageManager";
import {logger} from "db://assets/libs/log/Logger";
import {languageManager} from "db://assets/libs/language/Language";
import {LanguageLabel} from "db://assets/libs/language/LanguageLabel";
import {resLoader} from "db://assets/libs/res/ResLoader";

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
}

/** 玩家数据 */
export class Player {
    // 名字
    name: string = 'Player';

    // kind哪个大关
    kind: string = '0';

    // 等级
    level: number = 1;
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
    // 目前在那个大组
    setKind(kind: string) {
        this.kind = kind;
        storageManager.set('kind', kind);
    }

    // 设置等级
    setLevel(level: number) {
        this.level = level;
        this.levelString = LanguageLabel.pack({dataId: `ui_level`, params: {level: 10}});
    }

    // 提升等级
    addLevel() {
        const globalData = VM.get<GlobalData>('globalData').$data;
        const configList = globalData.levelConfig[this.kind];
        const index = _.findIndex(configList, (item: any) => item.k === this.level);
        const newLevel = configList[index + 1]?.k;
        if (!newLevel) {
            this.kind = `${Number(this.kind) + 1}`
            this.level = 1;
        } else {
            this.level = newLevel;
        }
        this.levelString = LanguageLabel.pack({dataId: `ui_level`, params: {level: 10}});

        logger.logView(`new Level: ${this.level} kind: ${this.kind}}`);
        storageManager.set('kind', this.kind);
        storageManager.set('level', this.level);
    }

    // 设置背包
    setItems(items: any) {
        _.forEach(items, (v, k) => {
            this.items[k] = v;
        })
        logger.logModel(`items: ${JSON.stringify(this.items)}`)
    }

    addItems(items: any) {
        _.forEach(items, (v, k) => {
            this.items[k] += v;
        })
        storageManager.set('items', JSON.stringify(this.items));
    }
}

let player = new Player();
VM.add(player, 'player');

/** 全局数据，比如声音，关卡配置，等等 */
export class GlobalData {
    // 关卡配置
    levelConfig = {};

    /** 方法 */
    // 获取关卡配置
    getLevelConfig(kind: string, k: number) {
        const configList = this.levelConfig[kind];
        if (!configList) return null;
        const index = _.findIndex(configList, (item: any) => item.k === k)
        const v = configList[index].v;
        logger.logConfig(`${kind}_${k}: ${v}`);
        return v;
    }
}

let globalData = new GlobalData();
VM.add(globalData, 'globalData');

// bundle
export let bundleName = "game1"

export class GameInstance {

    static async init() {
        // storageManager.clear();
        // 加载关卡
        /**
         * 重新加载数据
         {
         "0": [
         { k: 1, v: "40,3" },
         { k: 10, v: "27,31" }
         ],
         "1": [
         { k: 11, v: "1,2,4,5" }
         ]
         }
         *  */
        logger.logView(`init start...`);
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
        logger.logConfig(`levelConfig done`);

        const language = storageManager.get('language', 'en');
        await languageManager.setLanguage('game1', language);
        const kind = storageManager.get('kind', '0');
        player.setKind(kind); // todo：还原
        const level = storageManager.getNumber('level', 1);
        player.setLevel(level);
        const items = storageManager.get('items', JSON.stringify({coin: 1000,}));
        player.setItems(JSON.parse(items));
        logger.logConfig(`player/globalData done`);

        const bundle = bundleName;
        uiManager.initUIConf({
            [UIID.UIBackGround]: {bundle, prefab: 'prefab/BackGround'},
            [UIID.UILogin]: {bundle, prefab: 'prefab/Login'},
            [UIID.UISelectGame]: {bundle, prefab: 'prefab/SelectGame'},
            [UIID.UIPlay]: {bundle, prefab: 'prefab/Play'},
            [UIID.UIPause]: {bundle, prefab: 'prefab/Pause'},
            [UIID.UIWin]: {bundle, prefab: 'prefab/Win'},
            [UIID.UILose]: {bundle, prefab: 'prefab/Lose'},
            [UIID.UILevelUp]: {bundle, prefab: 'prefab/LevelUp'},
        })
        uiManager.open(UIID.UIBackGround);
        uiManager.open(UIID.UISelectGame);

        logger.logView(`init done`);
    }
}