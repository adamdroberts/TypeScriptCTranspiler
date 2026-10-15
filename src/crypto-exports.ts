import * as fs from 'node:fs';
import * as path from 'node:path';
import {resolvePackageRoot} from './program';

/** Source admission and native export identities use one collection. */
export const cryptoExports:ReadonlySet<string> = new Set(
    [...fs.readFileSync(path.join(resolvePackageRoot(),'runtime/tsc_crypto_exports.def'),'utf8')
        .matchAll(/^TSC_CRYPTO_EXPORT\((\w+), /gm)].map(match=>match[1]!),
);
if(!cryptoExports.size)throw new Error('missing canonical crypto exports');
