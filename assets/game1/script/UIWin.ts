import {_decorator, Component, Node} from 'cc';
import _ from 'lodash-es';
import {uiManager} from "db://assets/libs/ui/UIManager";
import {Player, UIID} from "db://assets/game1/script/YY";
import {VM} from "db://assets/libs/modelview/ViewModel";
import VMParentView from "db://assets/libs/gui/VMParentView";
import {logger} from "db://assets/libs/log/Logger";

const {ccclass, property} = _decorator;

@ccclass('UIWin')
export class UIWin extends VMParentView {

    data = {
        score: 0,
        totalTimeString: '00:00',
        moves: 0,
        bestScore: 0,
        bestTotalTimeString: '00:00',
        bestMoves: 0,
        addCoin: 30,
        addExp: 100,
        levelId: '',
    }

    player: Player = VM.get<Player>('player').$data;

    init(...args: any) {
        const v = args[0];
        _.merge(this.data, v)
        logger.logView(`win data: ${JSON.stringify(this.data)}`);
        let bestRecord = this.player.getOrSetBestRecord(this.data.levelId, this.data)
        this.data.bestScore = bestRecord.score;
        this.data.bestTotalTimeString = bestRecord.totalTimeString;
        this.data.bestMoves = bestRecord.moves;
        this.player.addItems({coin: this.data.addCoin});
        this.player.addExp(this.data.addExp);
        this.player.setNextLevelId();
    }

    start() {
    }

    update(deltaTime: number) {

    }

    onClaim() {
        uiManager.open(UIID.UISelectGame);
        uiManager.open(UIID.UILevelUp, {before: this.data.levelId, after: this.player.levelId});
    }

    onWatchADS() {

    }
}

