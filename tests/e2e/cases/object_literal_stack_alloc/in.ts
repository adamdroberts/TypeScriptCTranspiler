interface Point {
    x: number;
    y: number;
}

function total(): number {
    const point: Point = { x: 2, y: 5 };
    return point.x + point.y;
}

console.log(total());
