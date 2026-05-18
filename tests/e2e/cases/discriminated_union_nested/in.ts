interface Circle {
    kind: "circle";
    radius: number;
}

interface Square {
    kind: "square";
    side: number;
}

interface Packet {
    payload: Circle | Square;
}

function describe(packet: Packet): string {
    if (packet.payload.kind === "circle") {
        const radius: number = packet.payload.radius;
        return "circle:" + (radius * 2);
    }
    const side: number = packet.payload.side;
    return "square:" + (side * side);
}

console.log(describe({ payload: { kind: "circle", radius: 5 } }));
console.log(describe({ payload: { kind: "square", side: 6 } }));
