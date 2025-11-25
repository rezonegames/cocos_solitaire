import {Vec3, Node} from 'cc';
import {Pile} from "db://assets/game1/script/Pile";
import {Card} from "db://assets/game1/script/Card";

export interface UndoMove {
    cards: Node[]; // 移动的所有牌（单张或多张）
    from: Pile; // 从哪里来
    to: Pile; // 移到哪里
    oldPositions: Vec3[];  // 每张牌原本的本地位置
    newPositions: Vec3[];  // 移动后的本地位置
    flip?: {               // 如果涉及翻牌，加上这个
        card: Node;
        wasFaceUp: boolean;
    };
}

export class UndoManager {
    private stack: UndoMove[] = [];

    pushMove(move: UndoMove) {
        this.stack.push(move);
    }

    pop() {
        return this.stack.pop();
    }
}
