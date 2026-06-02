interface Point {
    x: number;
    y: number;
}

function makeDirectReader(): () => number {
    const point: Point = { x: 2, y: 5 };
    return () => point.x + point.y;
}

function makeAliasReader(): () => number {
    const point: Point = { x: 3, y: 7 };
    const alias = point;
    return () => alias.x + alias.y;
}

const direct = makeDirectReader();
const alias = makeAliasReader();

console.log(direct(), alias());
