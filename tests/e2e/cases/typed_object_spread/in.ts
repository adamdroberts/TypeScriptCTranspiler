interface Settings {
    name: string;
    count: number;
    enabled: boolean;
}

interface SettingsPatch {
    count: number;
    enabled: boolean;
    extra: string;
}

const base: Settings = { name: "old", count: 1, enabled: false };
const patch: SettingsPatch = { count: 2, enabled: true, extra: "skip" };

const typed: Settings = { ...base, ...patch, name: "typed" };
console.log("typed:", typed.name, typed.count, typed.enabled);

const dynamicPatch: any = { name: "dynamic", count: 7, extra: "skip" };
const dynamic: Settings = { ...base, ...dynamicPatch, enabled: true };
console.log("dynamic:", dynamic.name, dynamic.count, dynamic.enabled);

const primitive: Settings = { ...base, ...(123 as any), name: "primitive" };
console.log("primitive:", primitive.name, primitive.count, primitive.enabled);
