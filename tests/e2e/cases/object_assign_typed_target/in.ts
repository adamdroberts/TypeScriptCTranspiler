interface Settings {
    name: string;
    count: number;
    enabled: boolean;
}

interface SettingsPatch {
    name: string;
    count: number;
    extra: number;
}

const settings: Settings = { name: "old", count: 1, enabled: false };
const patch: SettingsPatch = { name: "typed", count: 2, extra: 99 };
const typedResult: Settings = Object.assign(settings, patch);
console.log("typed:", typedResult === settings, settings.name, settings.count, settings.enabled);

const dynamicPatch: any = { count: 7, enabled: true, extra: "skip" };
Object.assign(settings, dynamicPatch);
console.log("dynamic:", settings.name, settings.count, settings.enabled);

let primitiveCalls = 0;
function primitiveSource(): number {
    primitiveCalls = primitiveCalls + 1;
    return 123;
}

Object.assign(settings, primitiveSource(), false, 10n, Symbol("p"));
console.log("primitive:", primitiveCalls, settings.name, settings.count, settings.enabled);

class Box {
    label = "old";
    value = 1;
}

class BoxPatch {
    label = "class";
    value = 9;
    extra = 5;
}

const box = new Box();
const boxResult: Box = Object.assign(box, new BoxPatch());
console.log("class:", boxResult === box, box.label, box.value);
