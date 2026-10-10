export class Owner {
    #value = 17;
    read(): unknown { return eval("this.#value"); }
    retain(): (receiver: Owner) => number { return eval("(receiver)=>receiver.#value") as (receiver: Owner) => number; }
}
export function retained(): () => number {
    let local = 19;
    const read = eval("()=>local");
    local = 23;
    return read as () => number;
}
