import {_decorator, Component, Node} from 'cc';
import {uiManager} from "./libs/ui/UIManager";

const {ccclass, property} = _decorator;

@ccclass('main')
export class main extends Component {

    onLoad(): void {
        const Loading = -1;

        uiManager.initUIConf({
            [Loading]: {bundle: 'libs', prefab: "hotupdate/UpdatePanel"},
        })

        uiManager.open(Loading);
    }

    start() {

    }

    update(deltaTime: number) {

    }
}

