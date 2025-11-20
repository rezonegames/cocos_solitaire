import {_decorator, Component, Node} from 'cc';
import {uiManager} from "../libs/ui/UIManager";

const {ccclass, property} = _decorator;

@ccclass('Loading')
export class Loading extends Component {

    onLoad(): void {
        const Loading = -1;

        uiManager.initUIConf({
            [Loading]: {bundle: 'loading', prefab: "UpdatePanel"},
        })

        uiManager.open(Loading);
    }

    start() {

    }

    update(deltaTime: number) {

    }
}

