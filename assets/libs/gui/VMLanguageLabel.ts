import {_decorator,} from 'cc';
import VMLabel from "../modelview/VMLabel";
import {LanguageLabel, } from "../language/LanguageLabel";
import {logger} from "../log/Logger";
import {LanguageData} from "db://assets/libs/language/LanguageData";

const {ccclass, property, menu, executeInEditMode, help} = _decorator;


@ccclass
@executeInEditMode
@menu('Gui/VMLanguageLabel')
export default class VMLanguageLabel extends VMLabel {

    languageLabel: LanguageLabel;

    onLoad() {
        super.onLoad();
        this.languageLabel = this.addComponent(LanguageLabel);
    }

    setLabelValue(value: any): void {
        if (!value) return;
        logger.logView(value);
        const {dataId, params, fontId} = LanguageData.unpack(value);
        this.languageLabel.params = params;
        this.languageLabel.dataID = dataId;
        this.languageLabel.fontId = fontId;
    }
}