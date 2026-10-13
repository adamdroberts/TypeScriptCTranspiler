const raw = JSON.rawJSON("9007199254740993123456789");
console.log("raw:", JSON.isRawJSON(raw), raw.rawJSON, Object.isFrozen(raw));
console.log("root:", JSON.stringify(raw));
console.log("nested:", JSON.stringify({ value: raw }));
try { JSON.rawJSON("1\n"); } catch (error: any) { console.log("invalid:", error.name); }
