let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

const text = "a1 b22 c333";
const first = text.match(/\d+/, mark("m"));
const all = text.matchAll(/[a-z]\d+/g, mark("a"));
const searched = text.search(/\d+/, mark("s"));
const replaced = text.replace(/\d+/, "X", mark("r"));
const split = text.split(/\s+/, 2, mark("p"));

const dynamicText: any = "fish 12 fish";
const dynamicFirst: any = dynamicText.match("\\d+", mark("M"));
const dynamicAll: any = dynamicText.matchAll("fish", mark("A"));
const dynamicSearched: any = dynamicText.search("12", mark("S"));
const dynamicReplaced: any = dynamicText.replace("fish", "cat", mark("R"));
const dynamicSplit: any = dynamicText.split(" ", 2, mark("P"));

console.log("typed:", first ? first[0] : "none", all[0][0], all.length, searched, replaced, split.join("|"));
console.log("dynamic:", dynamicFirst[0], dynamicAll[0][0], dynamicAll.length, dynamicSearched, dynamicReplaced, dynamicSplit.join("|"));
console.log("seen:", seen);
