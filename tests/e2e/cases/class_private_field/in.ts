class Vault {
    #value = 41;

    read(): number {
        return this.#value + 1;
    }
}

console.log("private field:", new Vault().read());
