import _ from 'lodash-es';
import {VM} from "db://assets/libs/modelview/ViewModel";
import {storageManager} from "db://assets/libs/storage/StorageManager";
import {logger} from "db://assets/libs/log/Logger";
import {delay} from "db://assets/libs/utils/Utils";

/**
 * 默认使用storageManager保存，如果接入服务器，写入到服务器
 * @param key
 * @param data
 */
export function saveData(key: string, data: any) {
    if (_.isObject(data)) data = JSON.stringify(data)
    storageManager.set(key, data);
}

export async function getData() {
    storageManager.clear(); // todo：后面干掉
    // 关卡
    const levelId = storageManager.get('levelId', '0_1');
    player.setLevelId(levelId);
    // 背包
    const items = storageManager.get('items', JSON.stringify({coin: 10,}));
    logger.logModel(`items: ${items}`);
    player.setItems(JSON.parse(items));
    // 等级
    player.level = storageManager.getNumber('level');
    // 经验
    player.exp = storageManager.getNumber('exp');
    // 最大经验
    player.maxExp = storageManager.getNumber('maxExp');
    logger.logConfig(`player/globalData done`);
}

/** 玩家数据 */
export class Player {
    // 名字
    name: string = 'Player';

    // 关卡
    levelId: string = '';

    // 等级，经验
    level: number = 1;
    exp: number = 0;
    maxExp: number = 100;

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

    // 最佳关卡数据
    bestRecord = {}

    /**
     * 下面是一些方法
     */
    // 添加经验值，升级： 动画式增加经验值：检查并处理升级
    async addExp(exp: number) {
        const globalData = VM.get<GlobalData>('globalData').$data;
        // 慢慢增加经验值
        await this.animateExpGain(exp);
        // 检查并处理升级
        await this.checkAndHandleLevelUp(globalData);
        saveData('exp', this.exp);
        saveData('maxExp', this.maxExp);
        saveData('level', this.level);
    }

    private async animateExpGain(targetExp: number) {
        const startExp = this.exp;
        const duration = Math.min(1000, targetExp * 10); // 最多1秒，每点经验10ms
        const steps = Math.min(50, targetExp); // 最多50步
        const stepExp = targetExp / steps;
        const stepDuration = duration / steps;
        for (let i = 0; i < steps; i++) {
            await delay(stepDuration);
            this.exp = Math.min(startExp + (i + 1) * stepExp, startExp + targetExp);
        }
        this.exp = startExp + targetExp; // 确保最终值正确
    }

    private async checkAndHandleLevelUp(globalData: GlobalData) {
        while (true) {
            const expConfig = globalData.getExpConfig(this.level);
            if (!expConfig) break;
            const {max_exp} = expConfig;
            if (this.exp < max_exp) break;
            // 升级处理
            const overflowExp = this.exp - max_exp;
            this.exp = 0;
            this.level++;
            // 升级动画延迟
            logger.logView(`🎉 升级到 ${this.level} 级！`);
            // 等待升级动画完成
            await delay(1500);
            // 更新最大经验值
            const newExpConfig = globalData.getExpConfig(this.level);
            if (newExpConfig) {
                this.maxExp = newExpConfig.max_exp || newExpConfig;
                this.addItems({coin: newExpConfig.coin})
            }
            // 如果还有溢出经验，继续添加
            if (overflowExp > 0) {
                await this.animateExpGain(overflowExp);
            }
        }
    }

    // 设置关卡等级
    setLevelId(levelId: string) {
        this.levelId = levelId;
    }

    setNextLevelId() {
        const globalData = VM.get<GlobalData>('globalData').$data;
        const [kind, subLevel] = this.levelId.split('_');
        const configList = globalData.levelConfig[kind];
        const index = _.findIndex(configList, (item: any) => item.k === Number(subLevel));
        let newSubLevel = configList[index + 1]?.k;
        let newKind = kind;
        if (!newSubLevel) {
            newKind = `${Number(kind) + 1}`;
            const newConfigList = globalData.levelConfig[newKind];
            if (!newConfigList) return logger.trace(`newConfigList is null: ${newKind}`);
            newSubLevel = newConfigList[0].k;
        }
        this.addItems({coin: 10});
        this.levelId = `${newKind}_${newSubLevel}`;
        saveData('levelId', this.levelId);
        logger.logView(`new LevelId: ${this.levelId}`);
    }

    // 设置背包
    setItems(items: any) {
        _.forEach(items, (v, k) => {
            this.items[k] = v;
        })
        logger.logModel(`items: ${JSON.stringify(this.items)}`)
    }

    addItems(items: any): boolean {
        for (const k in items) {
            const v = items[k];
            if ((this.items[k] || 0) + v < 0) {
                return false;
            }
        }
        for (const k in items) {
            const v = items[k];
            this.items[k] = (this.items[k] || 0) + v;
        }
        saveData('items', this.items);
        return true;
    }

    // 设置最好记录
    getOrSetBestRecord(k: string, v: any) {
        let bestRecord = this.bestRecord[k];
        if (!bestRecord) {
            this.bestRecord[k] = v;
            bestRecord = v;
            saveData(`bestRecord.${k}`, bestRecord);
        }
        return bestRecord;
    }
}

let player = new Player();
VM.add(player, 'player');

/** 全局数据，比如声音，关卡配置，等等 */
export class GlobalData {
    // 关卡配置
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
    levelConfig = {};

    /** 经验相关的函数方法 */
    expConfig = {};

    /** 商店 */
    shopConfig = {};

    /** 方法 */
    // 获取关卡配置
    getLevelConfig(levelId: string) {
        const [kind, subLevel] = levelId.split('_').map(Number);
        const configList = this.levelConfig[kind];
        if (!configList) return null;
        const index = _.findIndex(configList, (item: any) => item.k === subLevel)
        const v = configList[index].v;
        logger.logConfig(`${kind}_${subLevel}: ${v}`);
        return v;
    }

    // 获取经验配置
    getExpConfig(level: number) {
        // 如果没有配置，返回默认值
        return this.expConfig[level] || {maxExp: 100 + (level - 1) * 50};
    }
}

let globalData = new GlobalData();
VM.add(globalData, 'globalData');