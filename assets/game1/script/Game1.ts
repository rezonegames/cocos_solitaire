import { _decorator, Component, Node } from 'cc';
import {GameInstance} from "db://assets/game1/script/YY";
const { ccclass, property } = _decorator;

@ccclass('Game1')
export class Game1 extends Component {

    async start() {
        await GameInstance.init();
    }

    update(deltaTime: number) {
        
    }
}

