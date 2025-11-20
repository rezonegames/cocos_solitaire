import { _decorator, Component, Node, CCInteger } from 'cc';
import {EDITOR} from 'cc/env'
const { ccclass, property, executeInEditMode, menu } = _decorator;

@ccclass('BhvSwitchPage')
@executeInEditMode(true)
@menu("添加特殊行为/UI/Switch Page (切换页面)")
export class BhvSwitchPage extends Component {

    @property
    isLoopPage: boolean = false;

    @property({ visible: false })
    private _index: number = 0;

    public get index(): number {
        return this._index;
    }

    @property({ type: CCInteger })
    public set index(v: number) {
        if (this.isChanging) return;

        v = Math.round(v);
        const count = this.node.children.length - 1;

        if (this.isLoopPage) {
            if (v > count) v = 0;
            if (v < 0) v = count;
        } else {
            if (v > count) v = count;
            if (v < 0) v = 0;
        }

        this.preIndex = this._index; // 记录之前的页面
        this._index = v;

        // 编辑器下直接显示页面
        if (EDITOR) {
            this._updateEditorPage(v);
        } else {
            this._updatePage(v);
        }
    }

    /** 上一页记录 */
    private preIndex: number = 0;

    /** 是否在切换页面中 */
    private _isChanging: boolean = false;
    public get isChanging(): boolean {
        return this._isChanging;
    }

    // 生命周期
    onLoad() {
        this.preIndex = this.index;
        this._updatePage(this.index);
    }

    /** 编辑器模式下显示当前页面 */
    private _updateEditorPage(page: number) {
        if (!EDITOR) return;
        this.node.children.forEach((child, i) => {
            child.active = i === page;
        });
    }

    /** 运行时切换页面 */
    private _updatePage(page: number) {
        const children = this.node.children;
        const preNode = children[this.preIndex];
        const curNode = children[this.index];

        if (preNode === curNode) return;

        preNode.active = false;
        curNode.active = true;
    }

    /** 下一页 */
    public next(): boolean {
        if (this.isChanging) return false;
        this.index++;
        return true;
    }

    /** 上一页 */
    public previous(): boolean {
        if (this.isChanging) return false;
        this.index--;
        return true;
    }

    /** 外部事件设置页码 */
    public setEventIndex(e: any, index: number): boolean {
        if (index >= 0 && index != null && !this.isChanging) {
            this.index = index;
            return true;
        }
        return false;
    }
}
