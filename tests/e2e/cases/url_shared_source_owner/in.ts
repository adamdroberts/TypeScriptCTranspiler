import { createURL, createParams, appendValue, retainURL } from "./owner";

async function main(): Promise<void> {
    const url = await retainURL("https://example.com/path?first=1");
    const params = url.searchParams;
    appendValue(params, "second", "two words");
    console.log("imports:", createURL === URL, createParams === URLSearchParams);
    console.log("retained:", params === url.searchParams, url.search);
    url.search = "?updated=3";
    console.log("live:", params === url.searchParams, params.get("updated"));
    const copy = new createParams([["a", "1"], ["a", "2"]]);
    console.log("iterable:", Array.from(copy.keys()).join(","), Array.from(copy.values()).join(","));
    const canParse = createURL.canParse(await Promise.resolve("https://example.com/"));
    console.log("awaited:", canParse);
}

main();
