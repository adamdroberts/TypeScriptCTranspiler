import {store, seen, MapOwner, remember, resumed} from "./owner";
async function main(): Promise<void> {
 const key = {id: "source"}; remember(key, "value");
 console.log("imported:", seen.has(key), await resumed(key));
 console.log("original constructor:", MapOwner === WeakMap, store instanceof WeakMap);
 const symbol = Symbol("weak-key"); const symbols = new WeakMap<symbol, string>();
 console.log("symbol:", symbols.getOrInsert(symbol, "initial"), symbols.getOrInsert(symbol, "ignored"));
 symbols.delete(symbol);
 console.log("computed:", symbols.getOrInsertComputed(symbol, current => current === symbol ? "computed" : "wrong"));
 const fromIterable = new WeakMap<object, string>([[key, "iterable"]]);
 console.log("iterable:", fromIterable.get(key));
}
main();
