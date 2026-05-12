interface Point {
    x: number;
    y: number;
}

interface Named {
    name: string;
}

interface NamedPoint extends Point, Named {
    visible: boolean;
}

interface LabelledPoint extends NamedPoint {
    label: string;
}

function describe(p: LabelledPoint): string {
    return p.name + ":" + p.label + ":" + String(p.x + p.y) + ":" + String(p.visible);
}

const p: LabelledPoint = {
    x: 2,
    y: 3,
    name: "origin-ish",
    visible: true,
    label: "A",
};

console.log("fields:", p.x, p.y, p.name, p.visible, p.label);
console.log("describe:", describe(p));
console.log("keys:", Object.keys(p).join(","));
