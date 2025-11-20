import {
    _decorator,
    Component,
    Sprite,
    SpriteFrame,
    CCInteger,
} from 'cc';
import {logger} from "../log/Logger";

const { ccclass, property, executeInEditMode, requireComponent, menu } = _decorator;

@ccclass('BhvFrameIndex')
@executeInEditMode(true)
@requireComponent(Sprite)
@menu("添加特殊行为/UI/Frame Index(帧图改变)")
export class BhvFrameIndex extends Component {

    @property({
        type: [SpriteFrame],
        tooltip: 'sprite 将会用到这些帧图片'
    })
    spriteFrames: SpriteFrame[] = [];

    @property({
        tooltip: '当前显示的帧图',
        type: CCInteger
    })
    get index() {
        return this._index;
    }
    set index(value: number) {
        if (value < 0) return;
        this._index = value % this.spriteFrames.length;
        const sprite = this.node.getComponent(Sprite)!;
        sprite.spriteFrame = this.spriteFrames[this._index];
    }

    @property({ visible: false })
    private _index: number = 0;

    /** 通过设置帧名字 */
    setName(name: string) {
        const index = this.spriteFrames.findIndex(v => v?.name === name);
        if (index < 0) {
            logger.logView('FrameIndex: 找不到 spriteFrame 名称:', name);
            return;
        }
        this.index = index;
    }

    /** 随机范围设置帧图片 */
    random(min?: number, max?: number) {
        if (!this.spriteFrames || this.spriteFrames.length === 0) return;

        const frameMax = this.spriteFrames.length;

        if (min == null || min < 0) min = 0;
        if (max == null || max > frameMax) max = frameMax;

        this.index = Math.floor(Math.random() * (max - min) + min);
    }

    next() {
        this.index++;
    }

    previous() {
        this.index--;
    }
}
