import { _decorator, Component, Node, tween, Vec3, EventTouch, Button } from 'cc';
const { ccclass, property, menu } = _decorator;

@ccclass('ButtonScale')
@menu('Custom/ButtonScale')
export class ButtonScale extends Component {
    @property({ tooltip: '按下时放大的比例' })
    pressScale: number = 1.1;

    @property({ tooltip: '动画时间（秒）' })
    duration: number = 0.08;

    @property({ tooltip: '点击后恢复缩放的时间（秒）' })
    recoveryDuration: number = 0.08;

    @property({ tooltip: '点击时是否需要禁用一段时间（防连点）' })
    disableButtonTime: number = 0.1;

    private _originalScale: Vec3 = new Vec3();

    onLoad() {
        // 记录初始缩放
        this._originalScale = this.node.scale.clone();

        // 注册事件（按钮系统会自动触发 TOUCH_END）
        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this);
    }

    private _onTouchStart() {
        // 放大动画
        tween(this.node)
            .to(this.duration, { scale: new Vec3(
                    this._originalScale.x * this.pressScale,
                    this._originalScale.y * this.pressScale,
                    this._originalScale.z
                ) })
            .start();
    }

    private _onTouchEnd() {
        this._backToNormal();

        // 防止连点（可选）
        const btn = this.getComponent(Button);
        if (btn) {
            btn.interactable = false;
            setTimeout(() => btn.interactable = true, this.disableButtonTime * 1000);
        }
    }

    private _onTouchCancel() {
        this._backToNormal();
    }

    private _backToNormal() {
        tween(this.node)
            .to(this.recoveryDuration, { scale: this._originalScale })
            .start();
    }
}
