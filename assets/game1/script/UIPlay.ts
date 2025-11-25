import {_decorator, Component, Node} from 'cc';
import _ from 'lodash-es';
import VMParentView from "db://assets/libs/gui/VMParentView";

const {ccclass, property} = _decorator;

@ccclass('UIPlay')
export class UIPlay extends VMParentView {

    protected data = {
        // 分数
        score: 0,
        // 时间
        lastTotalTime: 0,
        totalTime: 0,
        totalTimeString: '00:00',
        // 步数
        moves: 0,
    }

    addScore(score: number = 0) {
        this.data.score += score;
    }

    addMoves(moves: number = 0) {
        this.data.moves += moves;
    }

    updateTime(deltaTime: number = 0) {
        this.data.totalTime += deltaTime;
        if (this.data.totalTime - this.data.lastTotalTime < 1) return
        const m = _.padStart(Math.floor(this.data.totalTime / 60).toString(), 2, '0');
        const s = _.padStart(Math.floor(this.data.totalTime % 60).toString(), 2, '0');
        this.data.totalTimeString = `${m}:${s}`;
        this.data.lastTotalTime = this.data.totalTime;
    }

    start() {
    }

    protected onLoad() {
        super.onLoad();
    }

    update(deltaTime: number) {
        this.updateTime(deltaTime);
    }
}

