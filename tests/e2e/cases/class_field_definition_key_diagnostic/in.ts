class PrivateOwner { #value = 1; }
new PrivateOwner();

class ObservedPrivateOwner {
    #value = 1;
    read(): number { return this.#value; }
    increment(): number { return ++this.#value; }
    has(value: object): boolean { return #value in value; }
}
const owner = new ObservedPrivateOwner();
console.log("private value:", owner.read(), owner.increment(), owner.read());
console.log("private brand:", owner.has(owner), owner.has({}));
console.log("private visibility:", Object.keys(owner).length, Reflect.ownKeys(owner).length);
