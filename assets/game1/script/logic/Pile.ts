import { _decorator, Node, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('Pile')
export class Pile extends Component {

    isFoundation = false;
    isTableau = false;
    isStock = false;
    isWaste = false;

    getTopCard(): Node | null {
        const c = this.node.children;
        return c.length > 0 ? c[c.length - 1] : null;
    }

    addCard(card: Node) {
        card.setParent(this.node);
    }
}
