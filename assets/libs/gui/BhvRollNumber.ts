import {
    _decorator,
    Component,
    Label,
    CCInteger,
    Enum,
    clamp,
} from 'cc';

const { ccclass, property, menu } = _decorator;

enum VALUE_TYPE {
    INTEGER,
    FIXED_2,
    TIMER,
    PERCENTAGE,
    KMBT_FIXED2,
    CUSTOMER
}

@ccclass('BhvRollNumber')
@menu("添加特殊行为/UI/Roll Number (滚动数字)")
export class BhvRollNumber extends Component {

    @property({
        type: Label,
        tooltip: '需要滚动的 Label 组件，如果不设置会自动查找'
    })
    label: Label | null = null;

    @property({ tooltip: '当前滚动值（起始值）' })
    value = 0;

    @property({ tooltip: '是否显示正负符号' })
    showPlusSymbol = false;

    @property({ tooltip: '滚动目标值' })
    get targetValue() {
        return this._targetValue;
    }
    set targetValue(v: number) {
        this._targetValue = v;
        this.startScroll();
    }
    @property
    private _targetValue = 100;

    /** 滚动的 lerp 差值（0 ~ 1） */
    @property({
        tooltip: '滚动的线性差值',
        step: 0.01,
        max: 1,
        min: 0
    })
    lerp = 0.1;

    @property({ tooltip: '是否在 start 时立即滚动' })
    private playAtStart = true;

    @property({
        tooltip: '滚动前等待几秒',
        step: 0.1,
        max: 10,
        min: 0
    })
    private runWaitTimer = 0;

    @property({
        type: Enum(VALUE_TYPE),
        tooltip: '显示类型'
    })
    private valueType: VALUE_TYPE = VALUE_TYPE.INTEGER;

    /** 自定义文本格式化 */
    private _customCallback: ((cur: number, target: number) => string) | null = null;

    private isScrolling = false;

    onLoad() {
        if (!this.label) {
            this.label = this.getComponent(Label);
        }

        if (this.playAtStart) {
            this.updateLabel();
            this.startScroll();
        }
    }

    /** 开始滚动 */
    startScroll() {
        if (this.isScrolling) return;

        if (this.runWaitTimer > 0) {
            this.scheduleOnce(() => { this.isScrolling = true; }, this.runWaitTimer);
        } else {
            this.isScrolling = true;
        }
    }

    /** 停止滚动 */
    stop() {
        this.value = this.targetValue;
        this.isScrolling = false;
        this.updateLabel();
    }

    /** 初始化 */
    init(value = 0, target = 0, lerp = 0.1) {
        this.value = value;
        this.targetValue = target;
        this.lerp = lerp;
    }

    /** 滚动到指定数字 */
    scrollTo(target?: number) {
        if (target == null) return;
        this.targetValue = target;
    }

    /** 更新 Label 显示 */
    updateLabel() {
        let val = this.value;
        let str = '';

        switch (this.valueType) {
            case VALUE_TYPE.INTEGER:
                str = Math.round(val).toString();
                break;

            case VALUE_TYPE.FIXED_2:
                str = val.toFixed(2);
                break;

            case VALUE_TYPE.TIMER:
                str = formatTimer(val);
                break;

            case VALUE_TYPE.PERCENTAGE:
                str = Math.round(val * 100) + '%';
                break;

            case VALUE_TYPE.KMBT_FIXED2:
                if (val >= Number.MAX_VALUE) str = 'MAX';
                else if (val > 1e12) str = (val / 1e12).toFixed(2) + 'T';
                else if (val > 1e9) str = (val / 1e9).toFixed(2) + 'B';
                else if (val > 1e6) str = (val / 1e6).toFixed(2) + 'M';
                else if (val > 1e3) str = (val / 1e3).toFixed(2) + 'K';
                else str = Math.round(val).toString();
                break;

            case VALUE_TYPE.CUSTOMER:
                if (this._customCallback)
                    str = this._customCallback(val, this.targetValue);
                break;
        }

        // 正负号处理
        if (this.showPlusSymbol) {
            if (val > 0) str = '+' + str;
            else if (val < 0) str = '-' + str;
        }

        if (this.label) {
            if (this.label.string !== str) {
                this.label.string = str;
            }
        }
    }

    update(dt: number) {
        if (!this.isScrolling) return;

        this.value = lerp(this.value, this.targetValue, this.lerp);
        this.updateLabel();

        if (Math.abs(this.value - this.targetValue) <= 0.0001) {
            this.value = this.targetValue;
            this.isScrolling = false;
        }
    }
}

/** 计时器格式：00:00 或 00:00:00 */
function formatTimer(time = 0, full = true) {
    const t = Math.floor(time);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;

    const mm = m < 10 ? '0' + m : '' + m;
    const ss = s < 10 ? '0' + s : '' + s;

    if (full) return `${h}:${mm}:${ss}`;
    return `${m + h * 60}:${ss}`;
}

/** Cocos 3.x 没有 cc.misc.lerp，所以自己写一个 */
function lerp(a: number, b: number, t: number) {
    return a + (b - a) * clamp(t, 0, 1);
}