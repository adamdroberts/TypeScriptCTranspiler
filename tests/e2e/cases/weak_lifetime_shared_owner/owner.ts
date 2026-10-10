export const target = { name: "retained" };
export const symbol = Symbol("target");
export const ref = new WeakRef(target);
export const symbolRef = new WeakRef(symbol);
export const registry = new FinalizationRegistry<string>(() => {});
export const register = registry.register;
export const unregister = registry.unregister;
export const deref = ref.deref;

export async function resumedName(): Promise<string | undefined> {
    await Promise.resolve();
    return deref.call(ref)?.name;
}
