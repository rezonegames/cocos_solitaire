import {_decorator,} from 'cc';
import {EDITOR} from 'cc/env'
import VMLabel from "../modelview/VMLabel";
import {LanguageLabel, } from "../language/LanguageLabel";

const {ccclass, property, menu, executeInEditMode, help} = _decorator;


@ccclass
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
        if(typeof value === 'number') {
            value = value.toString();
        }
        const {dataId, params, fontId} = LanguageLabel.unpack(value);
        this.languageLabel.params = params || [];
        this.languageLabel.dataID = dataId || value;
        this.languageLabel.fontId = fontId;
    }
}