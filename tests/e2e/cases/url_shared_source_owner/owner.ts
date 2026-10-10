import { URL as NativeURL, URLSearchParams as NativeParams } from "node:url";

export const createURL = NativeURL;
export const createParams = NativeParams;

export function appendValue(params: URLSearchParams, key: string, value: string): void {
    params.append(key, value);
}

export async function retainURL(input: string): Promise<URL> {
    const constructor = createURL;
    const url = new constructor(await Promise.resolve(input));
    const params = url.searchParams;
    await Promise.resolve();
    appendValue(params, "retained", "yes");
    return url;
}
