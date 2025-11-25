import {_decorator, Component} from 'cc';
import {UIView} from "../ui/UIView";
import {VM} from "../modelview/ViewModel"

const {ccclass, property, menu, executionOrder, help} = _decorator;


@ccclass
@executionOrder(-1)
@menu('Gui/VMParentView')
export default class VMParentView extends UIView {
    /**绑定的标签，可以通过这个tag 获取 当前的 vm 实例 */
    protected tag: string = '_temp';

    /**需要绑定的私有数据 */
    protected data: any = {};

    /**VM 管理 */
    public VM = VM;


    /**
     * [注意]不能直接覆盖此方法，如果需要覆盖。
     * 只能在该方法内部调用父类的实现
     ```ts
     onLoad(){
     super.onLoad();
     }
     ```
     *
     */
    protected onLoad() {
        if (this.data == null) return;
        this.tag = '_temp' + '<' + this.node.uuid.replace('.', '') + '>';
        VM.add(this.data, this.tag);
        //cc.log(VM['_mvs'],tag)
        //搜寻所有节点：找到 watch path
        let comps = this.getVMComponents();
        for (let i = 0; i < comps.length; i++) {
            const comp = comps[i];
            this.replaceVMPath(comp, this.tag)
        }
        this.onBind();
    }

    /**在 onLoad 完成 和 start() 之前调用，你可以在这里进行初始化数据等操作 */
    protected onBind() {

    }

    /**在 onDestroy() 后调用,此时仍然可以获取绑定的 data 数据*/
    protected onUnBind() {

    }

    private replaceVMPath(comp: Component, tag: string) {
        let path: string = comp['watchPath'];
        //let comp_name: string = comp.name;

        if (comp['templateMode'] == true) {
            let pathArr: string[] = comp['watchPathArr'];
            if (pathArr) {
                for (let i = 0; i < pathArr.length; i++) {
                    const path = pathArr[i];
                    pathArr[i] = path.replace('*', tag);
                }
            }

        } else {
            //VMLabel

            //遇到特殊 path 就优先替换路径
            if (path.split('.')[0] === '*') {
                comp['watchPath'] = path.replace('*', tag);
            }

        }
    }

    private getVMComponents() {
        let comps = this.node.getComponentsInChildren('VMBase');
        let parents = this.node.getComponentsInChildren('VMParent').filter(v => v.uuid !== this.uuid); //过滤掉自己

        //过滤掉不能赋值的parent
        let filters = [];
        parents.forEach((node: any) => {
            filters = filters.concat(node.getComponentsInChildren('VMBase'));
        })

        comps = comps.filter((v) => filters.indexOf(v) < 0);
        return comps;
    }

    protected onDestroy() {
        super.onDestroy();

        this.onUnBind();
        //解除全部引用
        VM.remove(this.tag);
        this.data = null;
    }
}