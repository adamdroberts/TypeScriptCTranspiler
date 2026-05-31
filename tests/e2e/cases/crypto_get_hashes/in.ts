import * as cryptoNs from "crypto";
import * as nodeCryptoNs from "node:crypto";
import cryptoDefault, { getHashes, getHashes as getHashesAlias } from "crypto";
import nodeCryptoDefault, { getHashes as getHashesNodeAlias } from "node:crypto";

// 1. Global crypto
console.log("Global:", crypto.getHashes().join(","));
console.log("Global extra args:", crypto.getHashes("abc", 123, {}).join(","));

// 2. Named imports & aliases
console.log("Named:", getHashes().join(","));
console.log("Named Alias:", getHashesAlias().join(","));
console.log("Named Node Alias:", getHashesNodeAlias().join(","));

// 3. Namespace imports
console.log("Namespace:", cryptoNs.getHashes().join(","));
console.log("Namespace Node:", nodeCryptoNs.getHashes().join(","));

// 4. Default imports
console.log("Default:", cryptoDefault.getHashes().join(","));
console.log("Default Node:", nodeCryptoDefault.getHashes().join(","));

// Verify return type is an array of strings by mapping or indexing
const hashes = getHashes();
console.log("IsArray:", Array.isArray(hashes));
console.log("Hashes mapped:", hashes.map(h => h.toUpperCase()).join(","));
