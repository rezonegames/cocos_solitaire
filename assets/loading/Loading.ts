import {_decorator, Component, sys} from 'cc';
import {storageManager}  from '../libs/storage/StorageManager';
import {languageManager} from "db://assets/libs/language/Language";
import {HotUpdate} from "db://assets/loading/HotUpdate";
import {HotUpdateWeb} from "db://assets/loading/HotUpdateWeb";


const {ccclass, property} = _decorator;

@ccclass('Loading')
export class Loading extends Component {


    async onLoad() {
        // 初始化
        const language = storageManager.get('language', 'en');
        await languageManager.setLanguage('loading', language);

        // 开始热梗
        if (sys.isNative) {
            this.addComponent(HotUpdate);
        } else {
            this.addComponent(HotUpdateWeb);
        }
    }

    start() {

    }

    update(deltaTime: number) {

    }
}

