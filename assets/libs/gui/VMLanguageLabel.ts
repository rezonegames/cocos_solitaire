import {_decorator,} from 'cc';
import {EDITOR} from 'cc/env'
import VMLabel from "../modelview/VMLabel";
import {LanguageLabel, } from "../language/LanguageLabel";
import {logger} from "../log/Logger";

const {ccclass, property, menu, executeInEditMode, help} = _decorator;


@ccclass
@executeInEditMode
@menu('Gui/VMLanguageLabel')
export default class VMLanguageLabel extends VMLabel {

    languageLabel: LanguageLabel;

    onLoad() {
        super.onLoad();
        if(!EDITOR && !this.languageLabel) {
            this.languageLabel = this.addComponent(LanguageLabel);
        }
    }

    setLabelValue(value: any): void {
        if (!value) return;
        this.languageLabel.pack = value;
    }
}