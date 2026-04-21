// Binary search tree — recursive class methods, nullable pointers, mutation.
// Demonstrates: class fields, methods, recursive calls, `Node | null`, array methods.

class TreeNode {
    value: number;
    left: TreeNode | null;
    right: TreeNode | null;

    constructor(value: number) {
        this.value = value;
        this.left = null;
        this.right = null;
    }

    insert(v: number): void {
        if (v < this.value) {
            if (this.left === null) this.left = new TreeNode(v);
            else this.left.insert(v);
        } else {
            if (this.right === null) this.right = new TreeNode(v);
            else this.right.insert(v);
        }
    }

    inorder(out: number[]): void {
        if (this.left !== null) this.left.inorder(out);
        out.push(this.value);
        if (this.right !== null) this.right.inorder(out);
    }

    depth(): number {
        const l = this.left === null ? 0 : this.left.depth();
        const r = this.right === null ? 0 : this.right.depth();
        return 1 + (l > r ? l : r);
    }
}

const root = new TreeNode(5);
[3, 8, 1, 4, 7, 9, 2, 6].forEach((v) => root.insert(v));

const sorted: number[] = [];
root.inorder(sorted);
console.log("sorted:", sorted.join(" "));
console.log("depth:", root.depth());
