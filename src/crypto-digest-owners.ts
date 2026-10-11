import * as fs from "node:fs";
import * as path from "node:path";
import {resolvePackageRoot} from "./program";

/** Source import admission projects the runtime's canonical owner collection. */
export const cryptoDigestExports = new Set(
    [...fs.readFileSync(path.join(resolvePackageRoot(), "runtime", "tsc_crypto_digest.def"), "utf8")
        .matchAll(/^TSC_CRYPTO_DIGEST_OWNER\((\w+),\s*(\w+),\s*\d+\)$/gm)]
        .flatMap(match => [match[1]!, match[2]!]),
);
if (!cryptoDigestExports.size) throw new Error("Crypto descriptor collection has no owners");
