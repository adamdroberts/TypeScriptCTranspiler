interface Fish {
    swim: number;
}

interface Bird {
    fly: number;
}

type Pet = Fish | Bird;

function move(pet: Pet): string {
    if ("swim" in pet) {
        const speed: number = pet.swim;
        return "swim:" + speed;
    }
    const speed: number = pet.fly;
    return "fly:" + speed;
}

interface Point {
    x: number;
    name: string;
}

class Box {
    value: number;

    constructor(value: number) {
        this.value = value;
    }
}

const p: Point = { x: 7, name: "Ada" };
const box = new Box(3);
const key = "name";

console.log(move({ swim: 4 }));
console.log(move({ fly: 8 }));
console.log("typed:", "x" in p, key in p, "missing" in p);
console.log("class:", "value" in box, "missing" in box);
