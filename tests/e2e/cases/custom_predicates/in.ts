interface Fish {
    kind: "fish";
    swim: number;
}

interface Bird {
    kind: "bird";
    fly: number;
}

type Pet = Fish | Bird;

function isFish(pet: Pet): pet is Fish {
    return pet.kind === "fish";
}

function move(pet: Pet): string {
    if (isFish(pet)) {
        const speed: number = pet.swim;
        return "swim:" + speed;
    }
    const speed: number = pet.fly;
    return "fly:" + speed;
}

console.log(move({ kind: "fish", swim: 7 }));
console.log(move({ kind: "bird", fly: 11 }));
