import {Vec3, Node} from 'cc';
import {Pile} from "./Pile";

export interface UndoMove {
    cards: Node[]; // 移动的所有牌（单张或多张）
    from: Pile; // 从哪里来
    to: Pile; // 移到哪里
    flippedCard?: Node; // 移动后被翻开的牌
}

export class UndoManager {
    private stack: UndoMove[] = [];

    pushMove(move: UndoMove) {
        this.stack.push(move);
    }

    pop(): UndoMove | undefined {
        return this.stack.pop();
    }

    peek(): UndoMove | undefined {
        return this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
    }

    clear() {
        this.stack.length = 0;
    }

    size(): number {
        return this.stack.length;
    }

    isEmpty(): boolean {
        return this.stack.length === 0;
    }
}
