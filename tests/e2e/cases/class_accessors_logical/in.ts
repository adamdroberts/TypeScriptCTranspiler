class SwitchBox {
    raw: boolean = false;

    get enabled(): boolean {
        return this.raw;
    }

    set enabled(next: boolean) {
        this.raw = next;
    }

    static readyRaw: boolean = true;

    static get ready(): boolean {
        return SwitchBox.readyRaw;
    }

    static set ready(next: boolean) {
        SwitchBox.readyRaw = next;
    }
}

const box = new SwitchBox();
console.log("or:", box.enabled ||= true, box.enabled);
console.log("and:", box.enabled &&= false, box.enabled);
console.log("nullish:", box.enabled ??= true, box.enabled);
console.log("static and:", SwitchBox.ready &&= false, SwitchBox.ready);
console.log("static or:", SwitchBox.ready ||= true, SwitchBox.ready);
