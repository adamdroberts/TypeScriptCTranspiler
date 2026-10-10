export const encode=btoa,decode=atob;
export async function suspended(value:string):Promise<string>{const saved=btoa;return saved(await Promise.resolve(value))}
