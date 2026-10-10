export class Owner {
    #value = 3;
    static #saved = 7;
    get #pair(): number { return this.#value; }
    set #pair(value: number) { this.#value = value; }
    #method(value: number): number { return this.#value + value; }
    read(): number { return this.#value; }
    invoke(): number { return this.#method(2); }
    has(value: object): boolean { return #value in value; }
    retain(): () => number { return () => this.#value; }
    async update(): Promise<number> { this.#pair += await Promise.resolve(4); return this.#value; }
    static read(): number { return this.#saved; }
}
