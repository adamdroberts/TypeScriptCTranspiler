import * as fs from "node:fs/promises";
import * as path from "node:path";

type FileMap = Record<string, string>;

interface PackageFixture {
    packageJson?: Record<string, unknown>;
    files: FileMap;
}

const rootDir = path.resolve(import.meta.dir, "../..");

function cjsPackage(name: string, files: FileMap): PackageFixture {
    return {
        packageJson: { name, version: "1.0.0", main: "index.js" },
        files,
    };
}

function esmPackage(
    name: string,
    files: FileMap,
    packageJson: Record<string, unknown> = {},
): PackageFixture {
    return {
        packageJson: {
            name,
            version: "1.0.0",
            type: "module",
            main: "index.js",
            ...packageJson,
        },
        files,
    };
}

const packages: Record<string, PackageFixture> = {
    "native-pkg": cjsPackage("native-pkg", {
        "index.js": "module.exports = 3;\n",
        "build/Release/native.node": "",
    }),
    "native-exports-pkg": {
        packageJson: {
            name: "native-exports-pkg",
            version: "1.0.0",
            main: "index.js",
            exports: "./build/Release/native.node",
        },
        files: {
            "index.js": "module.exports = 3;\n",
            "build/Release/native.node": "",
        },
    },
    "native-imports-pkg": {
        packageJson: {
            name: "native-imports-pkg",
            version: "1.0.0",
            main: "index.js",
            imports: {
                "#native": {
                    node: "./build/Release/native.node",
                    default: "./fallback.js",
                },
            },
        },
        files: {
            "index.js": "module.exports = 3;\n",
            "fallback.js": "module.exports = 0;\n",
            "build/Release/native.node": "",
        },
    },
    "native-external-imports-pkg": {
        packageJson: {
            name: "native-external-imports-pkg",
            version: "1.0.0",
            main: "index.js",
            imports: {
                "#native": "native-pkg",
            },
        },
        files: {
            "index.js": 'module.exports = require("#native");\n',
        },
    },
    "outer-native-user": cjsPackage("outer-native-user", {
        "index.js": 'const native = require("inner-native-pkg");\nexports.value = native.value;\n',
    }),
    "inner-native-pkg": cjsPackage("inner-native-pkg", {
        "index.js": "exports.value = 3;\n",
        "build/Release/native.node": "",
    }),
    "tsc2c-pure-ts-package": {
        packageJson: {
            name: "tsc2c-pure-ts-package",
            version: "1.0.0",
            type: "module",
            exports: {
                ".": "./src/index.ts",
                "./math": "./src/math.ts",
            },
        },
        files: {
            "src/index.ts": 'import { add } from "./math";\nexport const banner = "pure-ts-package";\nexport function describeTwice(label: string, value: number): string {\n    return label + ":" + add(value, value);\n}\n',
            "src/math.ts": "export function add(left: number, right: number): number {\n    return left + right;\n}\n",
        },
    },
    "tsc2c-imports-package": {
        packageJson: {
            name: "tsc2c-imports-package",
            version: "1.0.0",
            type: "module",
            exports: "./src/index.ts",
            imports: { "#math": "./src/math.ts" },
        },
        files: {
            "src/index.ts": 'import { triple } from "#math";\nexport function summarize(label: string, value: number): string {\n    return label + ":" + triple(value);\n}\n',
            "src/math.ts": "export function triple(value: number): number {\n    return value * 3;\n}\n",
        },
    },
    "tsc2c-import-external-imports-package": {
        packageJson: {
            name: "tsc2c-import-external-imports-package",
            version: "1.0.0",
            type: "module",
            exports: "./src/index.ts",
            imports: {
                "#dep": "tsc2c-import-external-imports-dep",
                "#feature/*": "tsc2c-import-external-imports-dep/*",
            },
        },
        files: {
            "src/index.ts": 'import { label, pick } from "#dep";\nimport { scale } from "#feature/math";\nexport const summary = "external:" + label;\nexport function describe(value: number): string {\n    return pick(value) + ":" + scale(value);\n}\n',
        },
    },
    "tsc2c-import-external-imports-dep": {
        packageJson: {
            name: "tsc2c-import-external-imports-dep",
            version: "1.0.0",
            type: "module",
            exports: {
                ".": "./index.ts",
                "./math": "./math.ts",
            },
        },
        files: {
            "index.ts": 'export const label = "external-dep";\nexport function pick(value: number): string {\n    return "external-entry:" + value;\n}\n',
            "math.ts": "export function scale(value: number): number {\n    return value * 14;\n}\n",
        },
    },
    "tsc2c-conditional-exports-package": {
        packageJson: {
            name: "tsc2c-conditional-exports-package",
            version: "1.0.0",
            type: "module",
            exports: {
                ".": {
                    import: "./src/import-entry.ts",
                    default: "./src/default-entry.ts",
                },
                "./feature": {
                    import: "./src/feature-import.ts",
                    default: "./src/feature-default.ts",
                },
            },
            imports: {
                "#flavor": {
                    import: "./src/flavor-import.ts",
                    default: "./src/flavor-default.ts",
                },
            },
        },
        files: {
            "src/import-entry.ts": 'import { flavor } from "#flavor";\nexport const label = "conditional:" + flavor;\nexport function pick(value: number): string {\n    return "import-entry:" + value;\n}\n',
            "src/default-entry.ts": 'export const label = "wrong-default";\nexport function pick(value: number): string {\n    return "wrong:" + value;\n}\n',
            "src/feature-import.ts": 'export const feature = "feature-import";\nexport function scale(value: number): number {\n    return value * 4;\n}\n',
            "src/feature-default.ts": 'export const feature = "wrong-feature";\nexport function scale(value: number): number {\n    return value * 99;\n}\n',
            "src/flavor-import.ts": 'export const flavor = "import-condition";\n',
            "src/flavor-default.ts": 'export const flavor = "wrong-flavor";\n',
        },
    },
    "tsc2c-import-node-conditions-package": {
        packageJson: {
            name: "tsc2c-import-node-conditions-package",
            version: "1.0.0",
            type: "module",
            exports: {
                ".": [
                    "./src/missing-entry.ts",
                    {
                        node: [
                            "./src/missing-node-entry.ts",
                            "./src/node-entry.ts",
                        ],
                        default: "./src/default-entry.ts",
                    },
                ],
                "./features/*": {
                    node: "./src/features/*.ts",
                    default: "./src/wrong/*.ts",
                },
            },
            imports: {
                "#flavors/*": [
                    {
                        node: [
                            "./src/missing-flavors/*.ts",
                            "./src/flavors/*.ts",
                        ],
                        default: "./src/wrong-flavors/*.ts",
                    },
                ],
            },
        },
        files: {
            "src/node-entry.ts": 'import { flavor } from "#flavors/main";\nexport const label = "node:" + flavor;\nexport function pick(value: number): string {\n    return "node-entry:" + value;\n}\n',
            "src/default-entry.ts": 'export const label = "wrong-default-entry";\nexport function pick(value: number): string {\n    return "wrong-default:" + value;\n}\n',
            "src/features/math.ts": 'export const feature = "node-feature";\nexport function scale(value: number): number {\n    return value * 6;\n}\n',
            "src/wrong/math.ts": 'export const feature = "wrong-feature";\nexport function scale(value: number): number {\n    return value * 99;\n}\n',
            "src/flavors/main.ts": 'export const flavor = "imports-node";\n',
            "src/wrong-flavors/main.ts": 'export const flavor = "wrong-imports-default";\n',
        },
    },
    "tsc2c-import-node-addons-conditions-package": {
        packageJson: {
            name: "tsc2c-import-node-addons-conditions-package",
            version: "1.0.0",
            type: "module",
            exports: {
                ".": {
                    "node-addons": "./src/addons-entry.ts",
                    node: "./src/node-entry.ts",
                    import: "./src/import-entry.ts",
                    default: "./src/default-entry.ts",
                },
                "./tool": {
                    "node-addons": "./src/tool-addons.ts",
                    node: "./src/tool-node.ts",
                    import: "./src/tool-import.ts",
                    default: "./src/tool-default.ts",
                },
            },
            imports: {
                "#flavor": {
                    "node-addons": "./src/flavor-addons.ts",
                    node: "./src/flavor-node.ts",
                    import: "./src/flavor-import.ts",
                    default: "./src/flavor-default.ts",
                },
            },
        },
        files: {
            "src/addons-entry.ts": 'import { flavor } from "#flavor";\nexport const label = "addons:" + flavor;\nexport function pick(value: number): string {\n    return "addons-entry:" + value;\n}\n',
            "src/node-entry.ts": 'export const label = "wrong-node-entry";\nexport function pick(value: number): string {\n    return "wrong-node:" + value;\n}\n',
            "src/import-entry.ts": 'export const label = "wrong-import-entry";\nexport function pick(value: number): string {\n    return "wrong-import:" + value;\n}\n',
            "src/default-entry.ts": 'export const label = "wrong-default-entry";\nexport function pick(value: number): string {\n    return "wrong-default:" + value;\n}\n',
            "src/tool-addons.ts": 'export const tool = "addons-tool";\nexport function scale(value: number): number {\n    return value * 7;\n}\n',
            "src/tool-node.ts": 'export const tool = "wrong-tool-node";\nexport function scale(value: number): number {\n    return value * 77;\n}\n',
            "src/tool-import.ts": 'export const tool = "wrong-tool-import";\nexport function scale(value: number): number {\n    return value * 88;\n}\n',
            "src/tool-default.ts": 'export const tool = "wrong-tool-default";\nexport function scale(value: number): number {\n    return value * 99;\n}\n',
            "src/flavor-addons.ts": 'export const flavor = "imports-node-addons";\n',
            "src/flavor-node.ts": 'export const flavor = "wrong-flavor-node";\n',
            "src/flavor-import.ts": 'export const flavor = "wrong-flavor-import";\n',
            "src/flavor-default.ts": 'export const flavor = "wrong-flavor-default";\n',
        },
    },
    "tsc2c-import-module-sync-conditions-package": {
        packageJson: {
            name: "tsc2c-import-module-sync-conditions-package",
            version: "1.0.0",
            type: "module",
            exports: {
                ".": {
                    "module-sync": "./src/sync-entry.ts",
                    import: "./src/import-entry.ts",
                    default: "./src/default-entry.ts",
                },
                "./tool": {
                    "module-sync": "./src/tool-sync.ts",
                    import: "./src/tool-import.ts",
                    default: "./src/tool-default.ts",
                },
            },
            imports: {
                "#flavor": {
                    "module-sync": "./src/flavor-sync.ts",
                    import: "./src/flavor-import.ts",
                    default: "./src/flavor-default.ts",
                },
            },
        },
        files: {
            "src/sync-entry.ts": 'import { flavor } from "#flavor";\nexport const label = "sync:" + flavor;\nexport function pick(value: number): string {\n    return "sync-entry:" + value;\n}\n',
            "src/import-entry.ts": 'export const label = "wrong-import-entry";\nexport function pick(value: number): string {\n    return "wrong-import:" + value;\n}\n',
            "src/default-entry.ts": 'export const label = "wrong-default-entry";\nexport function pick(value: number): string {\n    return "wrong-default:" + value;\n}\n',
            "src/tool-sync.ts": 'export const tool = "sync-tool";\nexport function scale(value: number): number {\n    return value * 11;\n}\n',
            "src/tool-import.ts": 'export const tool = "wrong-tool-import";\nexport function scale(value: number): number {\n    return value * 88;\n}\n',
            "src/tool-default.ts": 'export const tool = "wrong-tool-default";\nexport function scale(value: number): number {\n    return value * 99;\n}\n',
            "src/flavor-sync.ts": 'export const flavor = "imports-module-sync";\n',
            "src/flavor-import.ts": 'export const flavor = "wrong-flavor-import";\n',
            "src/flavor-default.ts": 'export const flavor = "wrong-flavor-default";\n',
        },
    },
    "tsc2c-require-conditions-package": {
        packageJson: {
            name: "tsc2c-require-conditions-package",
            version: "1.0.0",
            type: "module",
            exports: {
                ".": {
                    import: "./src/import-entry.ts",
                    require: "./src/require-entry.cjs",
                    default: "./src/default-entry.ts",
                },
                "./tool": {
                    import: "./src/tool-import.ts",
                    require: "./src/tool-require.cjs",
                    default: "./src/tool-default.ts",
                },
            },
            imports: {
                "#flavor": {
                    import: "./src/flavor-import.ts",
                    require: "./src/flavor-require.cjs",
                    default: "./src/flavor-default.ts",
                },
            },
        },
        files: {
            "src/import-entry.ts": 'export const label = "wrong-import-entry";\nexport function pick(value: number): string {\n    return "wrong-import:" + value;\n}\n',
            "src/default-entry.ts": 'export const label = "wrong-default-entry";\nexport function pick(value: number): string {\n    return "wrong-default:" + value;\n}\n',
            "src/require-entry.cjs": 'const flavor = require("#flavor");\nexports.label = "require:" + flavor.label;\nexports.pick = function pick(value) { return "require-entry:" + value; };\n',
            "src/tool-import.ts": 'export const tool = "wrong-tool-import";\nexport function scale(value: number): number {\n    return value * 99;\n}\n',
            "src/tool-default.ts": 'export const tool = "wrong-tool-default";\nexport function scale(value: number): number {\n    return value * 100;\n}\n',
            "src/tool-require.cjs": 'exports.tool = "require-tool";\nexports.scale = function scale(value) { return value * 5; };\n',
            "src/flavor-import.ts": 'export const label = "wrong-flavor-import";\n',
            "src/flavor-default.ts": 'export const label = "wrong-flavor-default";\n',
            "src/flavor-require.cjs": 'exports.label = "require-imports";\n',
        },
    },
    "tsc2c-require-module-sync-conditions-package": {
        packageJson: {
            name: "tsc2c-require-module-sync-conditions-package",
            version: "1.0.0",
            type: "module",
            exports: {
                ".": {
                    "module-sync": "./src/sync-entry.cjs",
                    require: "./src/require-entry.cjs",
                    default: "./src/default-entry.ts",
                },
                "./tool": {
                    "module-sync": "./src/tool-sync.cjs",
                    require: "./src/tool-require.cjs",
                    default: "./src/tool-default.ts",
                },
            },
            imports: {
                "#flavor": {
                    "module-sync": "./src/flavor-sync.cjs",
                    require: "./src/flavor-require.cjs",
                    default: "./src/flavor-default.ts",
                },
            },
        },
        files: {
            "src/default-entry.ts": 'export const label = "wrong-default-entry";\nexport function pick(value: number): string {\n    return "wrong-default:" + value;\n}\n',
            "src/require-entry.cjs": 'exports.label = "wrong-require-entry";\nexports.pick = function pick(value) { return "wrong-require:" + value; };\n',
            "src/sync-entry.cjs": 'const flavor = require("#flavor");\nexports.label = "sync:" + flavor.label;\nexports.pick = function pick(value) { return "sync-entry:" + value; };\n',
            "src/tool-default.ts": 'export const tool = "wrong-tool-default";\nexport function scale(value: number): number {\n    return value * 100;\n}\n',
            "src/tool-require.cjs": 'exports.tool = "wrong-tool-require";\nexports.scale = function scale(value) { return value * 99; };\n',
            "src/tool-sync.cjs": 'exports.tool = "sync-tool";\nexports.scale = function scale(value) { return value * 12; };\n',
            "src/flavor-default.ts": 'export const label = "wrong-flavor-default";\n',
            "src/flavor-require.cjs": 'exports.label = "wrong-flavor-require";\n',
            "src/flavor-sync.cjs": 'exports.label = "imports-module-sync";\n',
        },
    },
    "tsc2c-require-custom-conditions-package": {
        packageJson: {
            name: "tsc2c-require-custom-conditions-package",
            version: "1.0.0",
            type: "module",
            exports: {
                ".": {
                    "tsc2c-custom": "./src/custom-entry.cjs",
                    require: "./src/require-entry.cjs",
                    default: "./src/default-entry.ts",
                },
                "./tool": {
                    "tsc2c-custom": "./src/tool-custom.cjs",
                    require: "./src/tool-require.cjs",
                    default: "./src/tool-default.ts",
                },
            },
            imports: {
                "#flavor": {
                    "tsc2c-custom": "./src/flavor-custom.cjs",
                    require: "./src/flavor-require.cjs",
                    default: "./src/flavor-default.ts",
                },
            },
        },
        files: {
            "src/default-entry.ts": 'export const label = "wrong-default-entry";\nexport function pick(value: number): string {\n    return "wrong-default:" + value;\n}\n',
            "src/require-entry.cjs": 'exports.label = "wrong-require-entry";\nexports.pick = function pick(value) { return "wrong-require:" + value; };\n',
            "src/custom-entry.cjs": 'const flavor = require("#flavor");\nexports.label = "custom:" + flavor.label;\nexports.pick = function pick(value) { return "custom-entry:" + value; };\n',
            "src/tool-default.ts": 'export const tool = "wrong-tool-default";\nexport function scale(value: number): number {\n    return value * 100;\n}\n',
            "src/tool-require.cjs": 'exports.tool = "wrong-tool-require";\nexports.scale = function scale(value) { return value * 99; };\n',
            "src/tool-custom.cjs": 'exports.tool = "custom-tool";\nexports.scale = function scale(value) { return value * 15; };\n',
            "src/flavor-default.ts": 'export const label = "wrong-flavor-default";\n',
            "src/flavor-require.cjs": 'exports.label = "wrong-flavor-require";\n',
            "src/flavor-custom.cjs": 'exports.label = "imports-custom";\n',
        },
    },
    "tsc2c-require-external-imports-package": {
        packageJson: {
            name: "tsc2c-require-external-imports-package",
            version: "1.0.0",
            type: "module",
            exports: "./src/index.cjs",
            imports: {
                "#dep": {
                    require: "tsc2c-require-external-imports-dep",
                    default: "./src/wrong-default.cjs",
                },
                "#feature/*": {
                    require: "tsc2c-require-external-imports-dep/*",
                    default: "./src/wrong/*.cjs",
                },
            },
        },
        files: {
            "src/index.cjs": 'const dep = require("#dep");\nconst math = require("#feature/math");\nexports.label = "external:" + dep.label;\nexports.pick = dep.pick;\nexports.scale = math.scale;\n',
            "src/wrong-default.cjs": 'exports.label = "wrong-default";\nexports.pick = function pick(value) { return "wrong:" + value; };\n',
            "src/wrong/math.cjs": "exports.scale = function scale(value) { return value * 99; };\n",
        },
    },
    "tsc2c-require-external-imports-dep": cjsPackage("tsc2c-require-external-imports-dep", {
        "index.js": 'exports.label = "external-dep";\nexports.pick = function pick(value) { return "external-entry:" + value; };\n',
        "math.js": "exports.scale = function scale(value) { return value * 13; };\n",
    }),
    "tsc2c-require-node-addons-conditions-package": {
        packageJson: {
            name: "tsc2c-require-node-addons-conditions-package",
            version: "1.0.0",
            type: "module",
            exports: {
                ".": {
                    "node-addons": "./src/addons-entry.cjs",
                    require: "./src/require-entry.cjs",
                    default: "./src/default-entry.ts",
                },
                "./tool": {
                    "node-addons": "./src/tool-addons.cjs",
                    require: "./src/tool-require.cjs",
                    default: "./src/tool-default.ts",
                },
            },
            imports: {
                "#flavor": {
                    "node-addons": "./src/flavor-addons.cjs",
                    require: "./src/flavor-require.cjs",
                    default: "./src/flavor-default.ts",
                },
            },
        },
        files: {
            "src/default-entry.ts": 'export const label = "wrong-default-entry";\nexport function pick(value: number): string {\n    return "wrong-default:" + value;\n}\n',
            "src/require-entry.cjs": 'exports.label = "wrong-require-entry";\nexports.pick = function pick(value) { return "wrong-require:" + value; };\n',
            "src/addons-entry.cjs": 'const flavor = require("#flavor");\nexports.label = "addons:" + flavor.label;\nexports.pick = function pick(value) { return "addons-entry:" + value; };\n',
            "src/tool-default.ts": 'export const tool = "wrong-tool-default";\nexport function scale(value: number): number {\n    return value * 100;\n}\n',
            "src/tool-require.cjs": 'exports.tool = "wrong-tool-require";\nexports.scale = function scale(value) { return value * 99; };\n',
            "src/tool-addons.cjs": 'exports.tool = "addons-tool";\nexports.scale = function scale(value) { return value * 7; };\n',
            "src/flavor-default.ts": 'export const label = "wrong-flavor-default";\n',
            "src/flavor-require.cjs": 'exports.label = "wrong-flavor-require";\n',
            "src/flavor-addons.cjs": 'exports.label = "node-addons-imports";\n',
        },
    },
    "tsc2c-require-pattern-conditions-package": {
        packageJson: {
            name: "tsc2c-require-pattern-conditions-package",
            version: "1.0.0",
            type: "module",
            exports: {
                "./features/*": {
                    require: "./src/features/*.cjs",
                    default: "./src/wrong/*.ts",
                },
            },
            imports: {
                "#labels/*": {
                    require: "./src/labels/*.cjs",
                    default: "./src/wrong-labels/*.ts",
                },
            },
        },
        files: {
            "src/features/math.cjs": 'const label = require("#labels/math");\nexports.label = "pattern:" + label.name;\nexports.scale = function scale(value) { return value * 8; };\n',
            "src/features/words.cjs": 'const label = require("#labels/words");\nexports.label = "pattern:" + label.name;\nexports.join = function join(left, right) { return left + "-" + right; };\n',
            "src/labels/math.cjs": 'exports.name = "math";\n',
            "src/labels/words.cjs": 'exports.name = "words";\n',
            "src/wrong/math.ts": 'export const label = "wrong-math";\nexport function scale(value: number): number {\n    return value * 99;\n}\n',
            "src/wrong/words.ts": 'export const label = "wrong-words";\nexport function join(left: string, right: string): string {\n    return left + right;\n}\n',
            "src/wrong-labels/math.ts": 'export const name = "wrong-math-label";\n',
            "src/wrong-labels/words.ts": 'export const name = "wrong-words-label";\n',
        },
    },
    "tsc2c-require-array-conditions-package": {
        packageJson: {
            name: "tsc2c-require-array-conditions-package",
            version: "1.0.0",
            type: "module",
            exports: {
                ".": [
                    "./src/missing-entry.cjs",
                    {
                        require: [
                            "./src/missing-require.cjs",
                            "./src/require-entry.cjs",
                        ],
                        default: "./src/default-entry.ts",
                    },
                ],
                "./tool": [
                    {
                        require: [
                            "./src/missing-tool.cjs",
                            "./src/tool-require.cjs",
                        ],
                        default: "./src/tool-default.ts",
                    },
                ],
            },
            imports: {
                "#flavor": [
                    "./src/missing-flavor.cjs",
                    {
                        require: [
                            "./src/missing-flavor-require.cjs",
                            "./src/flavor-require.cjs",
                        ],
                        default: "./src/flavor-default.ts",
                    },
                ],
            },
        },
        files: {
            "src/default-entry.ts": 'export const label = "wrong-default-entry";\nexport function pick(value: number): string {\n    return "wrong-default:" + value;\n}\n',
            "src/require-entry.cjs": 'const flavor = require("#flavor");\nexports.label = "array:" + flavor.label;\nexports.pick = function pick(value) { return "array-entry:" + value; };\n',
            "src/tool-default.ts": 'export const tool = "wrong-tool-default";\nexport function scale(value: number): number {\n    return value * 100;\n}\n',
            "src/tool-require.cjs": 'exports.tool = "array-tool";\nexports.scale = function scale(value) { return value * 9; };\n',
            "src/flavor-default.ts": 'export const label = "wrong-flavor-default";\n',
            "src/flavor-require.cjs": 'exports.label = "array-imports";\n',
        },
    },
    "tsc2c-dual-cjs-esm-package": {
        packageJson: {
            name: "tsc2c-dual-cjs-esm-package",
            version: "1.0.0",
            type: "module",
            exports: {
                ".": {
                    import: "./src/import-entry.ts",
                    require: "./src/require-entry.cjs",
                    default: "./src/default-entry.ts",
                },
            },
        },
        files: {
            "src/import-entry.ts": 'export const mode = "import";\nexport function pick(value: number): string {\n    return "import-entry:" + value;\n}\n',
            "src/require-entry.cjs": 'exports.mode = "require";\nexports.pick = function pick(value) { return "require-entry:" + value; };\n',
            "src/default-entry.ts": 'export const mode = "wrong-default";\nexport function pick(value: number): string {\n    return "wrong-default:" + value;\n}\n',
        },
    },
    "tsc2c-main-package": esmPackage("tsc2c-main-package", {
        "index.js": 'export const label = "main-pkg";\nexport function square(value) { return value * value; }\n',
    }),
    "tsc2c-namespace-package": {
        packageJson: {
            name: "tsc2c-namespace-package",
            version: "1.0.0",
            type: "module",
            exports: "./src/index.ts",
        },
        files: {
            "src/index.ts": 'export const label = "pkg-ns";\nexport const base = 7;\nexport function multiply(left: number, right: number): number {\n    return left * right;\n}\n',
        },
    },
    "tsc2c-side-effect-package": esmPackage("tsc2c-side-effect-package", {
        "index.js": 'console.log("package setup");\n',
    }),
    "tsc2c-js-package": esmPackage("tsc2c-js-package", {
        "index.js": 'export const label = "js-pkg";\nexport function add(left, right) { return left + right; }\nexport const metadata = { label, values: [1, 2, 3] };\nexport const entries = [["answer", 42]];\nexport default { label, values: [4, 5] };\n',
    }),
    "tsc2c-js-relative-package": esmPackage("tsc2c-js-relative-package", {
        "index.js": 'import { offset } from "./helper.js";\nexport const label = "relative-js";\nexport function compute(value) { return value + offset; }\n',
        "helper.js": "export const offset = 10;\n",
    }),
    "tsc2c-js-default-import-package": esmPackage("tsc2c-js-default-import-package", {
        "index.js": 'import format, { label } from "./helper.js";\nexport const message = format(label);\nexport function wrap(value) { return format(value); }\n',
        "helper.js": 'export const label = "js-default-import";\nexport default function format(value) { return "[" + value + "]"; }\n',
    }),
    "tsc2c-js-namespace-import-package": esmPackage("tsc2c-js-namespace-import-package", {
        "index.js": 'import * as helper from "./helper.js";\nexport const message = helper.label + ":" + helper.scale(5);\nexport function wrap(value) { return helper.label + ":" + helper.scale(value); }\n',
        "helper.js": 'export const label = "js-namespace-import";\nexport function scale(value) { return value * 8; }\n',
    }),
    "tsc2c-js-side-effect-import-package": esmPackage("tsc2c-js-side-effect-import-package", {
        "index.js": 'import "./setup.js";\nexport const label = "js-side-effect-import";\n',
        "setup.js": 'console.log("js package setup");\n',
    }),
    "tsc2c-js-transitive-import-package": esmPackage("tsc2c-js-transitive-import-package", {
        "index.js": 'import { label, scale } from "./helper.js";\nexport const message = label + ":" + scale(4);\nexport function wrap(value) { return label + ":" + scale(value); }\n',
        "helper.js": 'import { factor, label } from "./base.js";\nexport { label };\nexport function scale(value) { return value * factor; }\n',
        "base.js": 'export const label = "js-transitive-import";\nexport const factor = 9;\n',
    }),
    "tsc2c-js-transitive-reexport-package": esmPackage("tsc2c-js-transitive-reexport-package", {
        "index.js": 'export { label, scale } from "./bridge.js";\nexport { default as greet } from "./bridge.js";\n',
        "bridge.js": 'export { label, scale } from "./core.js";\nexport { default } from "./core.js";\n',
        "core.js": 'export const label = "js-transitive-reexport";\nexport function scale(value) { return value * 10; }\nexport default function greet(name) { return "hello " + name; }\n',
    }),
    "tsc2c-js-import-cjs-package": esmPackage("tsc2c-js-import-cjs-package", {
        "index.js": 'import helper from "./helper.cjs";\nexport const label = helper.label;\nexport function compute(value) { return helper.compute(value); }\n',
        "helper.cjs": 'module.exports = { label: "js-import-cjs", compute(value) { return value * 11; } };\n',
    }),
    "tsc2c-js-import-external-cjs-package": esmPackage("tsc2c-js-import-external-cjs-package", {
        "index.js": 'import helper from "tsc2c-js-import-external-cjs-helper";\nexport const label = helper.label;\nexport function compute(value) { return helper.compute(value); }\n',
    }),
    "tsc2c-js-import-external-cjs-helper": cjsPackage("tsc2c-js-import-external-cjs-helper", {
        "index.js": 'module.exports = { label: "js-import-external-cjs", compute(value) { return value * 21; } };\n',
    }),
    "tsc2c-js-import-external-cjs-function-package": esmPackage("tsc2c-js-import-external-cjs-function-package", {
        "index.js": 'import add from "tsc2c-js-import-external-cjs-function-helper";\nexport const label = "js-import-external-cjs-function";\nexport function compute(value) { return add(value, 9); }\n',
    }),
    "tsc2c-js-import-external-cjs-function-helper": cjsPackage("tsc2c-js-import-external-cjs-function-helper", {
        "index.js": 'module.exports = function add(left, right) { return left + right; };\n',
    }),
    "tsc2c-js-import-external-cjs-class-package": esmPackage("tsc2c-js-import-external-cjs-class-package", {
        "index.js": 'import Counter from "tsc2c-js-import-external-cjs-class-helper";\nexport const label = "js-import-external-cjs-class";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-import-external-cjs-class-helper": cjsPackage("tsc2c-js-import-external-cjs-class-helper", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-class-package": esmPackage("tsc2c-js-named-import-external-cjs-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-class-helper";\nexport const label = "js-named-import-external-cjs-class";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-class-helper", {
        "index.js": 'exports.Counter = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-object-class-package": esmPackage("tsc2c-js-named-import-external-cjs-object-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-object-class-helper";\nexport const label = "js-named-import-external-cjs-object-class";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-object-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-object-class-helper", {
        "index.js": 'module.exports = { Counter: class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } } };\n',
    }),
    "tsc2c-js-reexport-external-cjs-class-package": esmPackage("tsc2c-js-reexport-external-cjs-class-package", {
        "index.js": 'export { Counter } from "tsc2c-js-reexport-external-cjs-class-helper";\n',
    }),
    "tsc2c-js-reexport-external-cjs-class-helper": cjsPackage("tsc2c-js-reexport-external-cjs-class-helper", {
        "index.js": 'exports.Counter = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-default-forward-external-cjs-class-package": esmPackage("tsc2c-js-default-forward-external-cjs-class-package", {
        "index.js": 'export { default } from "tsc2c-js-default-forward-external-cjs-class-helper";\n',
    }),
    "tsc2c-js-default-forward-external-cjs-class-helper": cjsPackage("tsc2c-js-default-forward-external-cjs-class-helper", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-wrapper-class-package": esmPackage("tsc2c-js-named-import-external-cjs-wrapper-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-wrapper-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-wrapper-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-wrapper-class-helper", {
        "index.js": 'const Counter = require("tsc2c-js-named-import-external-cjs-wrapper-class-base");\nmodule.exports = { Counter };\n',
    }),
    "tsc2c-js-named-import-external-cjs-wrapper-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-wrapper-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-property-wrapper-class-package": esmPackage("tsc2c-js-named-import-external-cjs-property-wrapper-class-package", {
        "index.js": 'export { Counter } from "tsc2c-js-named-import-external-cjs-property-wrapper-class-helper";\n',
    }),
    "tsc2c-js-named-import-external-cjs-property-wrapper-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-property-wrapper-class-helper", {
        "index.js": 'module.exports = { Counter: require("tsc2c-js-named-import-external-cjs-property-wrapper-class-base") };\n',
    }),
    "tsc2c-js-named-import-external-cjs-property-wrapper-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-property-wrapper-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-object-assign-class-package": esmPackage("tsc2c-js-named-import-external-cjs-object-assign-class-package", {
        "index.js": 'export { Counter } from "tsc2c-js-named-import-external-cjs-object-assign-class-helper";\n',
    }),
    "tsc2c-js-named-import-external-cjs-object-assign-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-object-assign-class-helper", {
        "index.js": 'module.exports = Object.assign({}, { Counter: require("tsc2c-js-named-import-external-cjs-object-assign-class-base") });\n',
    }),
    "tsc2c-js-named-import-external-cjs-object-assign-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-object-assign-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-define-property-class-package": esmPackage("tsc2c-js-named-import-external-cjs-define-property-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-define-property-class-helper";\nexport { Counter };\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-define-property-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-define-property-class-helper", {
        "index.js": 'module.exports = Object.defineProperty({}, "Counter", { value: require("tsc2c-js-named-import-external-cjs-define-property-class-base"), enumerable: true });\n',
    }),
    "tsc2c-js-named-import-external-cjs-define-property-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-define-property-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-define-properties-class-package": esmPackage("tsc2c-js-named-import-external-cjs-define-properties-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-define-properties-class-helper";\nexport { Counter };\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-define-properties-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-define-properties-class-helper", {
        "index.js": 'module.exports = Object.defineProperties({}, { Counter: { value: require("tsc2c-js-named-import-external-cjs-define-properties-class-base"), enumerable: true } });\n',
    }),
    "tsc2c-js-named-import-external-cjs-define-properties-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-define-properties-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-from-entries-class-package": esmPackage("tsc2c-js-named-import-external-cjs-from-entries-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-from-entries-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-from-entries-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-from-entries-class-helper", {
        "index.js": 'module.exports = Object.fromEntries([["Counter", require("tsc2c-js-named-import-external-cjs-from-entries-class-base")]]);\n',
    }),
    "tsc2c-js-named-import-external-cjs-from-entries-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-from-entries-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-argument-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-argument-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-argument-class-base") });\nmodule.exports = create(require);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-seal-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-seal-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-seal-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-seal-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-seal-class-helper", {
        "index.js": 'function create() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-seal-class-base") }; }\nmodule.exports = Object.seal(create());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-seal-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-seal-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-seal-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-seal-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-seal-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-seal-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-seal-class-helper", {
        "index.js": 'const create = () => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-seal-class-base") });\nconst factory = create;\nmodule.exports = Object.seal(factory());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-seal-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-seal-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-freeze-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-freeze-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-freeze-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-freeze-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-freeze-class-helper", {
        "index.js": 'const create = () => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-freeze-class-base") });\nconst factory = create;\nmodule.exports = Object.freeze(factory());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-freeze-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-freeze-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-prevent-extensions-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-prevent-extensions-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-prevent-extensions-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-prevent-extensions-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-prevent-extensions-class-helper", {
        "index.js": 'const create = () => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-prevent-extensions-class-base") });\nconst factory = create;\nmodule.exports = Object.preventExtensions(factory());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-prevent-extensions-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-prevent-extensions-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-set-prototype-of-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-set-prototype-of-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-set-prototype-of-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-set-prototype-of-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-set-prototype-of-class-helper", {
        "index.js": 'const create = () => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-set-prototype-of-class-base") });\nconst factory = create;\nmodule.exports = Object.setPrototypeOf(factory(), null);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-set-prototype-of-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-set-prototype-of-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-invocations-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-invocations-class-package", {
        "index.js": 'import { Counter as CallCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-call-class-helper";\nimport { Counter as ApplyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-apply-class-helper";\nimport { Counter as ReflectApplyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-reflect-apply-class-helper";\nimport { Counter as BindCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-bind-class-helper";\nexport function computeCall(value) { const counter = new CallCounter(9); return counter.add(value); }\nexport function computeApply(value) { const counter = new ApplyCounter(9); return counter.add(value); }\nexport function computeReflectApply(value) { const counter = new ReflectApplyCounter(9); return counter.add(value); }\nexport function computeBind(value) { const counter = new BindCounter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-invocations-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-invocations-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-call-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-call-class-helper", {
        "index.js": 'const createCall = () => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-invocations-class-base") });\nconst factoryCall = createCall;\nmodule.exports = Object.freeze(factoryCall.call(null));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-apply-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-apply-class-helper", {
        "index.js": 'const createApply = () => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-invocations-class-base") });\nconst factoryApply = createApply;\nmodule.exports = Object.freeze(factoryApply.apply(null, []));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-reflect-apply-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-reflect-apply-class-helper", {
        "index.js": 'const createReflectApply = () => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-invocations-class-base") });\nconst factoryReflectApply = createReflectApply;\nmodule.exports = Object.freeze(Reflect.apply(factoryReflectApply, null, []));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-bind-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-bind-class-helper", {
        "index.js": 'const createBind = () => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-invocations-class-base") });\nconst factoryBind = createBind;\nmodule.exports = Object.freeze(factoryBind.bind(null)());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-compositions-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-compositions-class-package", {
        "index.js": 'import { Counter as AssignCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-assign-class-helper";\nimport { Counter as DefinePropertiesCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-define-properties-class-helper";\nimport { Counter as DefinePropertyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-define-property-class-helper";\nexport function computeAssign(value) { const counter = new AssignCounter(9); return counter.add(value); }\nexport function computeDefineProperties(value) { const counter = new DefinePropertiesCounter(9); return counter.add(value); }\nexport function computeDefineProperty(value) { const counter = new DefinePropertyCounter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-compositions-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-compositions-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-assign-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-assign-class-helper", {
        "index.js": 'const createAssign = () => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-compositions-class-base") });\nconst factoryAssign = createAssign;\nmodule.exports = Object.freeze(Object.assign({}, factoryAssign()));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-define-properties-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-define-properties-class-helper", {
        "index.js": 'const createDefineProperties = () => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-compositions-class-base") });\nconst factoryDefineProperties = createDefineProperties;\nmodule.exports = Object.freeze(Object.defineProperties(factoryDefineProperties(), {}));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-define-property-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-define-property-class-helper", {
        "index.js": 'const createDefineProperty = () => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-alias-compositions-class-base") });\nconst factoryDefineProperty = createDefineProperty;\nmodule.exports = Object.freeze(Object.defineProperty(factoryDefineProperty(), "Counter", {}));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-wrappers-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-wrappers-class-package", {
        "index.js": 'import { Counter as SealCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-seal-class-helper";\nimport { Counter as PreventExtensionsCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-prevent-extensions-class-helper";\nimport { Counter as SetPrototypeOfCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-set-prototype-of-class-helper";\nexport function computeSeal(value) { const counter = new SealCounter(9); return counter.add(value); }\nexport function computePreventExtensions(value) { const counter = new PreventExtensionsCounter(9); return counter.add(value); }\nexport function computeSetPrototypeOf(value) { const counter = new SetPrototypeOfCounter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-wrappers-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-wrappers-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-seal-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-seal-class-helper", {
        "index.js": 'function createFunctionSeal() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-wrappers-class-base") }; }\nmodule.exports = Object.seal(createFunctionSeal());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-prevent-extensions-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-prevent-extensions-class-helper", {
        "index.js": 'function createFunctionPreventExtensions() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-wrappers-class-base") }; }\nmodule.exports = Object.preventExtensions(createFunctionPreventExtensions());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-set-prototype-of-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-set-prototype-of-class-helper", {
        "index.js": 'function createFunctionSetPrototypeOf() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-wrappers-class-base") }; }\nmodule.exports = Object.setPrototypeOf(createFunctionSetPrototypeOf(), null);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-compositions-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-compositions-class-package", {
        "index.js": 'import { Counter as AssignCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-assign-class-helper";\nimport { Counter as DefinePropertiesCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-define-properties-class-helper";\nimport { Counter as DefinePropertyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-define-property-class-helper";\nexport function computeAssign(value) { const counter = new AssignCounter(9); return counter.add(value); }\nexport function computeDefineProperties(value) { const counter = new DefinePropertiesCounter(9); return counter.add(value); }\nexport function computeDefineProperty(value) { const counter = new DefinePropertyCounter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-compositions-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-compositions-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-assign-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-assign-class-helper", {
        "index.js": 'function createFunctionAssign() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-compositions-class-base") }; }\nmodule.exports = Object.freeze(Object.assign({}, createFunctionAssign()));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-define-properties-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-define-properties-class-helper", {
        "index.js": 'function createFunctionDefineProperties() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-compositions-class-base") }; }\nmodule.exports = Object.freeze(Object.defineProperties(createFunctionDefineProperties(), {}));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-define-property-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-define-property-class-helper", {
        "index.js": 'function createFunctionDefineProperty() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-compositions-class-base") }; }\nmodule.exports = Object.freeze(Object.defineProperty(createFunctionDefineProperty(), "Counter", {}));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-wrappers-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-wrappers-class-package", {
        "index.js": 'import { Counter as ArrowSealCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-seal-class-helper";\nimport { Counter as ArrowPreventExtensionsCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-prevent-extensions-class-helper";\nimport { Counter as ArrowSetPrototypeOfCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-set-prototype-of-class-helper";\nimport { Counter as FunctionSealCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-seal-class-helper";\nimport { Counter as FunctionPreventExtensionsCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-prevent-extensions-class-helper";\nimport { Counter as FunctionSetPrototypeOfCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-set-prototype-of-class-helper";\nexport function computeArrowSeal(value) { const counter = new ArrowSealCounter(9); return counter.add(value); }\nexport function computeArrowPreventExtensions(value) { const counter = new ArrowPreventExtensionsCounter(9); return counter.add(value); }\nexport function computeArrowSetPrototypeOf(value) { const counter = new ArrowSetPrototypeOfCounter(9); return counter.add(value); }\nexport function computeFunctionSeal(value) { const counter = new FunctionSealCounter(9); return counter.add(value); }\nexport function computeFunctionPreventExtensions(value) { const counter = new FunctionPreventExtensionsCounter(9); return counter.add(value); }\nexport function computeFunctionSetPrototypeOf(value) { const counter = new FunctionSetPrototypeOfCounter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-wrappers-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-wrappers-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-seal-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-seal-class-helper", {
        "index.js": 'module.exports = Object.seal((() => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-wrappers-class-base") }))());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-prevent-extensions-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-prevent-extensions-class-helper", {
        "index.js": 'module.exports = Object.preventExtensions((() => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-wrappers-class-base") }))());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-set-prototype-of-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-set-prototype-of-class-helper", {
        "index.js": 'module.exports = Object.setPrototypeOf((() => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-wrappers-class-base") }))(), null);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-seal-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-seal-class-helper", {
        "index.js": 'module.exports = Object.seal((function () { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-wrappers-class-base") }; })());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-prevent-extensions-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-prevent-extensions-class-helper", {
        "index.js": 'module.exports = Object.preventExtensions((function () { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-wrappers-class-base") }; })());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-set-prototype-of-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-set-prototype-of-class-helper", {
        "index.js": 'module.exports = Object.setPrototypeOf((function () { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-wrappers-class-base") }; })(), null);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-compositions-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-compositions-class-package", {
        "index.js": 'import { Counter as ArrowAssignCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-assign-class-helper";\nimport { Counter as ArrowDefinePropertiesCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-define-properties-class-helper";\nimport { Counter as ArrowDefinePropertyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-define-property-class-helper";\nimport { Counter as FunctionAssignCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-assign-class-helper";\nimport { Counter as FunctionDefinePropertiesCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-define-properties-class-helper";\nimport { Counter as FunctionDefinePropertyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-define-property-class-helper";\nexport function computeArrowAssign(value) { const counter = new ArrowAssignCounter(9); return counter.add(value); }\nexport function computeArrowDefineProperties(value) { const counter = new ArrowDefinePropertiesCounter(9); return counter.add(value); }\nexport function computeArrowDefineProperty(value) { const counter = new ArrowDefinePropertyCounter(9); return counter.add(value); }\nexport function computeFunctionAssign(value) { const counter = new FunctionAssignCounter(9); return counter.add(value); }\nexport function computeFunctionDefineProperties(value) { const counter = new FunctionDefinePropertiesCounter(9); return counter.add(value); }\nexport function computeFunctionDefineProperty(value) { const counter = new FunctionDefinePropertyCounter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-compositions-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-compositions-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-assign-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-assign-class-helper", {
        "index.js": 'module.exports = Object.freeze(Object.assign({}, (() => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-compositions-class-base") }))()));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-define-properties-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-define-properties-class-helper", {
        "index.js": 'module.exports = Object.freeze(Object.defineProperties((() => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-compositions-class-base") }))(), {}));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-define-property-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-define-property-class-helper", {
        "index.js": 'module.exports = Object.freeze(Object.defineProperty((() => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-compositions-class-base") }))(), "Counter", {}));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-assign-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-assign-class-helper", {
        "index.js": 'module.exports = Object.freeze(Object.assign({}, (function () { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-compositions-class-base") }; })()));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-define-properties-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-define-properties-class-helper", {
        "index.js": 'module.exports = Object.freeze(Object.defineProperties((function () { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-compositions-class-base") }; })(), {}));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-define-property-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-define-property-class-helper", {
        "index.js": 'module.exports = Object.freeze(Object.defineProperty((function () { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-compositions-class-base") }; })(), "Counter", {}));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-invocations-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-invocations-class-package", {
        "index.js": 'import { Counter as ArrowCallCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-call-class-helper";\nimport { Counter as ArrowApplyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-apply-class-helper";\nimport { Counter as ArrowReflectApplyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-reflect-apply-class-helper";\nimport { Counter as ArrowBindCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-bind-class-helper";\nimport { Counter as FunctionCallCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-call-class-helper";\nimport { Counter as FunctionApplyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-apply-class-helper";\nimport { Counter as FunctionReflectApplyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-reflect-apply-class-helper";\nimport { Counter as FunctionBindCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-bind-class-helper";\nexport function computeArrowCall(value) { const counter = new ArrowCallCounter(9); return counter.add(value); }\nexport function computeArrowApply(value) { const counter = new ArrowApplyCounter(9); return counter.add(value); }\nexport function computeArrowReflectApply(value) { const counter = new ArrowReflectApplyCounter(9); return counter.add(value); }\nexport function computeArrowBind(value) { const counter = new ArrowBindCounter(9); return counter.add(value); }\nexport function computeFunctionCall(value) { const counter = new FunctionCallCounter(9); return counter.add(value); }\nexport function computeFunctionApply(value) { const counter = new FunctionApplyCounter(9); return counter.add(value); }\nexport function computeFunctionReflectApply(value) { const counter = new FunctionReflectApplyCounter(9); return counter.add(value); }\nexport function computeFunctionBind(value) { const counter = new FunctionBindCounter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-invocations-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-invocations-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-call-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-call-class-helper", {
        "index.js": 'module.exports = Object.freeze((() => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-invocations-class-base") })).call(null));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-apply-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-apply-class-helper", {
        "index.js": 'module.exports = Object.freeze((() => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-invocations-class-base") })).apply(null, []));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-reflect-apply-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-reflect-apply-class-helper", {
        "index.js": 'module.exports = Object.freeze(Reflect.apply(() => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-invocations-class-base") }), null, []));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-bind-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-bind-class-helper", {
        "index.js": 'module.exports = Object.freeze((() => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-invocations-class-base") })).bind(null)());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-call-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-call-class-helper", {
        "index.js": 'module.exports = Object.freeze((function () { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-invocations-class-base") }; }).call(null));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-apply-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-apply-class-helper", {
        "index.js": 'module.exports = Object.freeze((function () { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-invocations-class-base") }; }).apply(null, []));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-reflect-apply-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-reflect-apply-class-helper", {
        "index.js": 'module.exports = Object.freeze(Reflect.apply(function () { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-invocations-class-base") }; }, null, []));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-bind-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-bind-class-helper", {
        "index.js": 'module.exports = Object.freeze((function () { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-invocations-class-base") }; }).bind(null)());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-class-package", {
        "index.js": 'import { Counter as ArrowCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-class-helper";\nimport { Counter as FunctionCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-class-helper";\nexport function computeArrow(value) { const counter = new ArrowCounter(9); return counter.add(value); }\nexport function computeFunction(value) { const counter = new FunctionCounter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-arrow-class-helper", {
        "index.js": 'module.exports = Object.freeze((() => ({ Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-class-base") }))());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-function-class-helper", {
        "index.js": 'module.exports = Object.freeze((function () { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-inline-class-base") }; })());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-invocations-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-invocations-class-package", {
        "index.js": 'import { Counter as CallCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-call-class-helper";\nimport { Counter as ApplyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-apply-class-helper";\nimport { Counter as ReflectApplyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-reflect-apply-class-helper";\nimport { Counter as BindCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-bind-class-helper";\nexport function computeCall(value) { const counter = new CallCounter(9); return counter.add(value); }\nexport function computeApply(value) { const counter = new ApplyCounter(9); return counter.add(value); }\nexport function computeReflectApply(value) { const counter = new ReflectApplyCounter(9); return counter.add(value); }\nexport function computeBind(value) { const counter = new BindCounter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-invocations-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-invocations-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-call-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-call-class-helper", {
        "index.js": 'function createFunctionCall() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-invocations-class-base") }; }\nmodule.exports = Object.freeze(createFunctionCall.call(null));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-apply-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-apply-class-helper", {
        "index.js": 'function createFunctionApply() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-invocations-class-base") }; }\nmodule.exports = Object.freeze(createFunctionApply.apply(null, []));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-reflect-apply-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-reflect-apply-class-helper", {
        "index.js": 'function createFunctionReflectApply() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-invocations-class-base") }; }\nmodule.exports = Object.freeze(Reflect.apply(createFunctionReflectApply, null, []));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-function-bind-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-bind-class-helper", {
        "index.js": 'function createFunctionBind() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-function-invocations-class-base") }; }\nmodule.exports = Object.freeze(createFunctionBind.bind(null)());\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-iife-alias-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-iife-alias-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-iife-alias-class-helper";\nimport { Counter as CallCounter } from "tsc2c-js-named-import-external-cjs-factory-iife-call-alias-class-helper";\nimport { Counter as ApplyCounter } from "tsc2c-js-named-import-external-cjs-factory-iife-apply-alias-class-helper";\nimport { Counter as ReflectApplyCounter } from "tsc2c-js-named-import-external-cjs-factory-iife-reflect-apply-alias-class-helper";\nimport { Counter as BindCounter } from "tsc2c-js-named-import-external-cjs-factory-iife-bind-alias-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\nexport function computeCall(value) { const counter = new CallCounter(9); return counter.add(value); }\nexport function computeApply(value) { const counter = new ApplyCounter(9); return counter.add(value); }\nexport function computeReflectApply(value) { const counter = new ReflectApplyCounter(9); return counter.add(value); }\nexport function computeBind(value) { const counter = new BindCounter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-iife-alias-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-iife-alias-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-iife-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-iife-alias-class-helper", {
        "index.js": 'function createIife() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-iife-alias-class-base") }; }\nconst factoryIife = createIife;\nmodule.exports = (function () { return Object.freeze(factoryIife()); })();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-iife-call-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-iife-call-alias-class-helper", {
        "index.js": 'function createIifeCall() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-iife-alias-class-base") }; }\nconst factoryIifeCall = createIifeCall;\nmodule.exports = (function () { return Object.freeze(factoryIifeCall.call(null)); })();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-iife-apply-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-iife-apply-alias-class-helper", {
        "index.js": 'function createIifeApply() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-iife-alias-class-base") }; }\nconst factoryIifeApply = createIifeApply;\nmodule.exports = (function () { return Object.freeze(factoryIifeApply.apply(null, [])); })();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-iife-reflect-apply-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-iife-reflect-apply-alias-class-helper", {
        "index.js": 'function createIifeReflectApply() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-iife-alias-class-base") }; }\nconst factoryIifeReflectApply = createIifeReflectApply;\nmodule.exports = (function () { return Object.freeze(Reflect.apply(factoryIifeReflectApply, null, [])); })();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-iife-bind-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-iife-bind-alias-class-helper", {
        "index.js": 'function createIifeBind() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-iife-alias-class-base") }; }\nconst factoryIifeBind = createIifeBind;\nmodule.exports = (function () { return Object.freeze(factoryIifeBind.bind(null)()); })();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-iife-alias-compositions-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-iife-alias-compositions-class-package", {
        "index.js": 'import { Counter as AssignCounter } from "tsc2c-js-named-import-external-cjs-factory-iife-alias-assign-class-helper";\nimport { Counter as DefinePropertiesCounter } from "tsc2c-js-named-import-external-cjs-factory-iife-alias-define-properties-class-helper";\nimport { Counter as DefinePropertyCounter } from "tsc2c-js-named-import-external-cjs-factory-iife-alias-define-property-class-helper";\nexport function computeAssign(value) { const counter = new AssignCounter(9); return counter.add(value); }\nexport function computeDefineProperties(value) { const counter = new DefinePropertiesCounter(9); return counter.add(value); }\nexport function computeDefineProperty(value) { const counter = new DefinePropertyCounter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-iife-alias-compositions-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-iife-alias-compositions-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-iife-alias-assign-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-iife-alias-assign-class-helper", {
        "index.js": 'function createIifeAssign() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-iife-alias-compositions-class-base") }; }\nconst factoryIifeAssign = createIifeAssign;\nmodule.exports = (function () { return Object.freeze(Object.assign({}, factoryIifeAssign())); })();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-iife-alias-define-properties-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-iife-alias-define-properties-class-helper", {
        "index.js": 'function createIifeDefineProperties() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-iife-alias-compositions-class-base") }; }\nconst factoryIifeDefineProperties = createIifeDefineProperties;\nmodule.exports = (function () { return Object.freeze(Object.defineProperties(factoryIifeDefineProperties(), {})); })();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-iife-alias-define-property-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-iife-alias-define-property-class-helper", {
        "index.js": 'function createIifeDefineProperty() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-iife-alias-compositions-class-base") }; }\nconst factoryIifeDefineProperty = createIifeDefineProperty;\nmodule.exports = (function () { return Object.freeze(Object.defineProperty(factoryIifeDefineProperty(), "Counter", {})); })();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-helper";\nimport { Counter as CallCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-call-alias-class-helper";\nimport { Counter as ApplyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-apply-alias-class-helper";\nimport { Counter as ReflectApplyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-reflect-apply-alias-class-helper";\nimport { Counter as BindCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-bind-alias-class-helper";\nimport { Counter as AssignCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-assign-alias-class-helper";\nimport { Counter as DefinePropertiesCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-define-properties-alias-class-helper";\nimport { Counter as DefinePropertyCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-define-property-alias-class-helper";\nimport { Counter as SealCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-seal-alias-class-helper";\nimport { Counter as PreventExtensionsCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-prevent-extensions-alias-class-helper";\nimport { Counter as SetPrototypeOfCounter } from "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-set-prototype-of-alias-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\nexport function computeCall(value) { const counter = new CallCounter(9); return counter.add(value); }\nexport function computeApply(value) { const counter = new ApplyCounter(9); return counter.add(value); }\nexport function computeReflectApply(value) { const counter = new ReflectApplyCounter(9); return counter.add(value); }\nexport function computeBind(value) { const counter = new BindCounter(9); return counter.add(value); }\nexport function computeAssign(value) { const counter = new AssignCounter(9); return counter.add(value); }\nexport function computeDefineProperties(value) { const counter = new DefinePropertiesCounter(9); return counter.add(value); }\nexport function computeDefineProperty(value) { const counter = new DefinePropertyCounter(9); return counter.add(value); }\nexport function computeSeal(value) { const counter = new SealCounter(9); return counter.add(value); }\nexport function computePreventExtensions(value) { const counter = new PreventExtensionsCounter(9); return counter.add(value); }\nexport function computeSetPrototypeOf(value) { const counter = new SetPrototypeOfCounter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-helper", {
        "index.js": 'module.exports = (function () {\n  function create() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base") }; }\n  const factory = create;\n  return Object.freeze(factory());\n})();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-call-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-call-alias-class-helper", {
        "index.js": 'module.exports = (function () {\n  function create() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base") }; }\n  const factory = create;\n  return Object.freeze(factory.call(null));\n})();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-apply-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-apply-alias-class-helper", {
        "index.js": 'module.exports = (function () {\n  function create() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base") }; }\n  const factory = create;\n  return Object.freeze(factory.apply(null, []));\n})();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-reflect-apply-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-reflect-apply-alias-class-helper", {
        "index.js": 'module.exports = (function () {\n  function create() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base") }; }\n  const factory = create;\n  return Object.freeze(Reflect.apply(factory, null, []));\n})();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-bind-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-bind-alias-class-helper", {
        "index.js": 'module.exports = (function () {\n  function create() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base") }; }\n  const factory = create;\n  return Object.freeze(factory.bind(null)());\n})();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-assign-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-assign-alias-class-helper", {
        "index.js": 'module.exports = (function () {\n  function create() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base") }; }\n  const factory = create;\n  return Object.freeze(Object.assign({}, factory()));\n})();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-define-properties-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-define-properties-alias-class-helper", {
        "index.js": 'module.exports = (function () {\n  function create() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base") }; }\n  const factory = create;\n  return Object.freeze(Object.defineProperties(factory(), {}));\n})();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-define-property-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-define-property-alias-class-helper", {
        "index.js": 'module.exports = (function () {\n  function create() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base") }; }\n  const factory = create;\n  return Object.freeze(Object.defineProperty(factory(), "Counter", {}));\n})();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-seal-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-seal-alias-class-helper", {
        "index.js": 'module.exports = (function () {\n  function createSeal() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base") }; }\n  const factorySeal = createSeal;\n  return Object.seal(factorySeal());\n})();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-prevent-extensions-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-prevent-extensions-alias-class-helper", {
        "index.js": 'module.exports = (function () {\n  function createPreventExtensions() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base") }; }\n  const factoryPreventExtensions = createPreventExtensions;\n  return Object.preventExtensions(factoryPreventExtensions());\n})();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-set-prototype-of-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-set-prototype-of-alias-class-helper", {
        "index.js": 'module.exports = (function () {\n  function createSetPrototypeOf() { return { Counter: require("tsc2c-js-named-import-external-cjs-factory-zero-argument-iife-local-alias-class-base") }; }\n  const factorySetPrototypeOf = createSetPrototypeOf;\n  return Object.setPrototypeOf(factorySetPrototypeOf(), null);\n})();\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-argument-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-inline-argument-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-inline-argument-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-argument-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-inline-argument-class-helper", {
        "index.js": 'module.exports = ((req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-inline-argument-class-base") }))(require);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-argument-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-inline-argument-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-call-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-inline-call-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-inline-call-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-call-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-inline-call-class-helper", {
        "index.js": 'module.exports = ((req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-inline-call-class-base") })).call(null, require);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-call-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-inline-call-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-apply-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-inline-apply-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-inline-apply-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-apply-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-inline-apply-class-helper", {
        "index.js": 'module.exports = ((req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-inline-apply-class-base") })).apply(null, [require]);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-apply-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-inline-apply-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-reflect-apply-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-inline-reflect-apply-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-inline-reflect-apply-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-reflect-apply-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-inline-reflect-apply-class-helper", {
        "index.js": 'module.exports = Reflect.apply((req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-inline-reflect-apply-class-base") }), null, [require]);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-reflect-apply-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-inline-reflect-apply-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-bind-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-inline-bind-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-inline-bind-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-bind-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-inline-bind-class-helper", {
        "index.js": 'module.exports = ((req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-inline-bind-class-base") })).bind(null)(require);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-inline-bind-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-inline-bind-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-local-binding-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-local-binding-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-local-binding-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-local-binding-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-local-binding-class-helper", {
        "index.js": 'const create = (req) => { const Counter = req("tsc2c-js-named-import-external-cjs-factory-local-binding-class-base"); return { Counter }; };\nmodule.exports = create(require);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-local-binding-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-local-binding-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-destructure-binding-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-destructure-binding-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-destructure-binding-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-destructure-binding-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-destructure-binding-class-helper", {
        "index.js": 'const create = (req) => { const { Counter } = req("tsc2c-js-named-import-external-cjs-factory-destructure-binding-class-base"); return { Counter }; };\nmodule.exports = create(require);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-destructure-binding-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-destructure-binding-class-base", {
        "index.js": 'module.exports = { Counter: class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-member-binding-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-member-binding-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-member-binding-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-member-binding-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-member-binding-class-helper", {
        "index.js": 'const create = (req) => { const Counter = req("tsc2c-js-named-import-external-cjs-factory-member-binding-class-base").Counter; return { Counter }; };\nmodule.exports = create(require);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-member-binding-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-member-binding-class-base", {
        "index.js": 'module.exports = { Counter: class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-alias-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-alias-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-alias-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-alias-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-alias-class-base") });\nconst factory = create;\nmodule.exports = factory(require);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-alias-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-alias-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-alias-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-alias-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-wrapper-alias-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-alias-class-helper", {
        "index.js": 'function create(req, mod, out) {\n  out.__esModule = true;\n  out.Counter = req("tsc2c-js-named-import-external-cjs-factory-wrapper-alias-class-base");\n}\nconst factory = create;\n(function (factory) {\n  if (typeof module === "object" && module.exports) {\n    factory(require, module, exports);\n  }\n})(factory);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-alias-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-alias-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-class-base") });\nconst factory = create;\n(function (factory) {\n  module.exports = factory(require);\n})(factory);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-freeze-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-freeze-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-freeze-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-freeze-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-freeze-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-freeze-class-base") });\nconst factory = create;\n(function (factory) {\n  module.exports = Object.freeze(factory(require));\n})(factory);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-freeze-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-freeze-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-call-freeze-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-call-freeze-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-call-freeze-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-call-freeze-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-call-freeze-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-call-freeze-class-base") });\nconst factory = create;\n(function (factory) {\n  module.exports = Object.freeze(factory.call(null, require));\n})(factory);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-call-freeze-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-call-freeze-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-properties-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-properties-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-properties-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-properties-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-properties-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-properties-class-base") });\nconst factory = create;\n(function (factory) {\n  module.exports = Object.defineProperties(factory(require), { label: { value: "wrapped-factory", enumerable: true } });\n})(factory);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-properties-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-properties-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-assign-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-assign-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-assign-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-assign-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-assign-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-assign-class-base") });\nconst factory = create;\n(function (factory) {\n  module.exports = Object.assign({}, factory(require));\n})(factory);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-assign-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-assign-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-property-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-property-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-property-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-property-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-property-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-property-class-base") });\nconst factory = create;\n(function (factory) {\n  module.exports = Object.defineProperty(factory(require), "label", { value: "wrapped-factory", enumerable: true });\n})(factory);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-property-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-define-property-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-freeze-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-freeze-class-package", {
        "index.js": 'import { CounterApply } from "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-apply-freeze-class-helper";\nexport function compute(value) { const counter = new CounterApply(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-reflect-apply-freeze-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-reflect-apply-freeze-class-package", {
        "index.js": 'import { CounterReflect } from "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-reflect-apply-freeze-class-helper";\nexport function compute(value) { const counter = new CounterReflect(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-bind-freeze-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-bind-freeze-class-package", {
        "index.js": 'import { CounterBind } from "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-bind-freeze-class-helper";\nexport function compute(value) { const counter = new CounterBind(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-apply-freeze-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-apply-freeze-class-helper", {
        "index.js": 'const createApply = (req) => ({ CounterApply: req("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-apply-freeze-class-base") });\nconst factoryApply = createApply;\n(function (factory) {\n  module.exports = Object.freeze(factory.apply(null, [require]));\n})(factoryApply);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-apply-freeze-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-apply-freeze-class-base", {
        "index.js": 'module.exports = class CounterApply { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-reflect-apply-freeze-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-reflect-apply-freeze-class-helper", {
        "index.js": 'const createReflect = (req) => ({ CounterReflect: req("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-reflect-apply-freeze-class-base") });\nconst factoryReflect = createReflect;\n(function (factory) {\n  module.exports = Object.freeze(Reflect.apply(factory, null, [require]));\n})(factoryReflect);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-reflect-apply-freeze-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-reflect-apply-freeze-class-base", {
        "index.js": 'module.exports = class CounterReflect { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-bind-freeze-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-bind-freeze-class-helper", {
        "index.js": 'const createBind = (req) => ({ CounterBind: req("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-bind-freeze-class-base") });\nconst factoryBind = createBind;\n(function (factory) {\n  module.exports = Object.freeze(factory.bind(null)(require));\n})(factoryBind);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-bind-freeze-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-wrapper-return-alias-bound-bind-freeze-class-base", {
        "index.js": 'module.exports = class CounterBind { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-wrapper-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-argument-wrapper-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-argument-wrapper-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-wrapper-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-wrapper-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-argument-wrapper-class-base") });\nmodule.exports = Object.freeze(create(require));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-wrapper-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-wrapper-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-assign-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-argument-assign-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-argument-assign-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-assign-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-assign-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-argument-assign-class-base") });\nmodule.exports = Object.assign({}, create(require));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-assign-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-assign-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-define-properties-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-argument-define-properties-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-argument-define-properties-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-define-properties-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-define-properties-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-argument-define-properties-class-base") });\nmodule.exports = Object.defineProperties(create(require), { label: { value: "factory-define-properties", enumerable: true } });\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-define-properties-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-define-properties-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-wrapped-define-properties-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-argument-wrapped-define-properties-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-argument-wrapped-define-properties-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-wrapped-define-properties-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-wrapped-define-properties-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-argument-wrapped-define-properties-class-base") });\nmodule.exports = Object.freeze(Object.defineProperties(create(require), { label: { value: "factory-wrapped-define-properties", enumerable: true } }));\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-wrapped-define-properties-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-wrapped-define-properties-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-call-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-argument-call-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-argument-call-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-call-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-call-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-argument-call-class-base") });\nmodule.exports = create.call(null, require);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-call-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-call-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-apply-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-argument-apply-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-argument-apply-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-apply-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-apply-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-argument-apply-class-base") });\nmodule.exports = create.apply(null, [require]);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-apply-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-apply-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-reflect-apply-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-argument-reflect-apply-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-argument-reflect-apply-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-reflect-apply-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-reflect-apply-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-argument-reflect-apply-class-base") });\nmodule.exports = Reflect.apply(create, null, [require]);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-reflect-apply-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-reflect-apply-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-bind-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-argument-bind-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-argument-bind-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-bind-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-bind-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-argument-bind-class-base") });\nmodule.exports = create.bind(null)(require);\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-bind-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-bind-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-define-property-class-package": esmPackage("tsc2c-js-named-import-external-cjs-factory-argument-define-property-class-package", {
        "index.js": 'import { Counter } from "tsc2c-js-named-import-external-cjs-factory-argument-define-property-class-helper";\nexport function compute(value) { const counter = new Counter(9); return counter.add(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-define-property-class-helper": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-define-property-class-helper", {
        "index.js": 'const create = (req) => ({ Counter: req("tsc2c-js-named-import-external-cjs-factory-argument-define-property-class-base") });\nmodule.exports = Object.defineProperty(create(require), "label", { value: "factory-define-property", enumerable: true });\n',
    }),
    "tsc2c-js-named-import-external-cjs-factory-argument-define-property-class-base": cjsPackage("tsc2c-js-named-import-external-cjs-factory-argument-define-property-class-base", {
        "index.js": 'module.exports = class Counter { constructor(seed) { this.seed = seed; } add(value) { return this.seed + value; } };\n',
    }),
    "tsc2c-js-named-import-external-cjs-package": esmPackage("tsc2c-js-named-import-external-cjs-package", {
        "index.js": 'import { compute, label } from "tsc2c-js-named-import-external-cjs-helper";\nexport const message = label + ":" + compute(4);\nexport function wrap(value) { return label + ":" + compute(value); }\n',
    }),
    "tsc2c-js-named-import-external-cjs-helper": cjsPackage("tsc2c-js-named-import-external-cjs-helper", {
        "index.js": 'module.exports = { label: "js-named-import-external-cjs", compute(value) { return value * 22; } };\n',
    }),
    "tsc2c-js-namespace-import-external-cjs-package": esmPackage("tsc2c-js-namespace-import-external-cjs-package", {
        "index.js": 'import * as helper from "tsc2c-js-namespace-import-external-cjs-helper";\nexport const message = helper.label + ":" + helper.compute(4);\nexport function wrap(value) { return helper.label + ":" + helper.compute(value); }\n',
    }),
    "tsc2c-js-namespace-import-external-cjs-helper": cjsPackage("tsc2c-js-namespace-import-external-cjs-helper", {
        "index.js": 'module.exports = { label: "js-namespace-import-external-cjs", compute(value) { return value * 23; } };\n',
    }),
    "tsc2c-js-reexport-external-cjs-package": esmPackage("tsc2c-js-reexport-external-cjs-package", {
        "index.js": 'export { compute, label } from "tsc2c-js-reexport-external-cjs-helper";\n',
    }),
    "tsc2c-js-reexport-external-cjs-helper": cjsPackage("tsc2c-js-reexport-external-cjs-helper", {
        "index.js": 'module.exports = { label: "js-reexport-external-cjs", compute(value) { return value * 24; } };\n',
    }),
    "tsc2c-js-aliased-reexport-external-cjs-package": esmPackage("tsc2c-js-aliased-reexport-external-cjs-package", {
        "index.js": 'export { compute as scale, label as title } from "tsc2c-js-aliased-reexport-external-cjs-helper";\n',
    }),
    "tsc2c-js-aliased-reexport-external-cjs-helper": cjsPackage("tsc2c-js-aliased-reexport-external-cjs-helper", {
        "index.js": 'module.exports = { label: "js-aliased-reexport-external-cjs", compute(value) { return value * 25; } };\n',
    }),
    "tsc2c-js-namespace-reexport-external-cjs-package": esmPackage("tsc2c-js-namespace-reexport-external-cjs-package", {
        "index.js": 'export * as helper from "tsc2c-js-namespace-reexport-external-cjs-helper";\n',
    }),
    "tsc2c-js-namespace-reexport-external-cjs-helper": cjsPackage("tsc2c-js-namespace-reexport-external-cjs-helper", {
        "index.js": 'module.exports = { label: "js-namespace-reexport-external-cjs", compute(value) { return value * 26; } };\n',
    }),
    "tsc2c-js-export-star-external-cjs-package": esmPackage("tsc2c-js-export-star-external-cjs-package", {
        "index.js": 'export * from "tsc2c-js-export-star-external-cjs-helper";\n',
    }),
    "tsc2c-js-export-star-external-cjs-helper": cjsPackage("tsc2c-js-export-star-external-cjs-helper", {
        "index.js": 'module.exports = { label: "js-export-star-external-cjs", compute(value) { return value * 27; } };\n',
    }),
    "tsc2c-js-default-reexport-external-cjs-package": esmPackage("tsc2c-js-default-reexport-external-cjs-package", {
        "index.js": 'export { default as helper } from "tsc2c-js-default-reexport-external-cjs-helper";\n',
    }),
    "tsc2c-js-default-reexport-external-cjs-helper": cjsPackage("tsc2c-js-default-reexport-external-cjs-helper", {
        "index.js": 'module.exports = { label: "js-default-reexport-external-cjs", compute(value) { return value * 28; } };\n',
    }),
    "tsc2c-js-default-forward-external-cjs-package": esmPackage("tsc2c-js-default-forward-external-cjs-package", {
        "index.js": 'export { default } from "tsc2c-js-default-forward-external-cjs-helper";\n',
    }),
    "tsc2c-js-default-forward-external-cjs-helper": cjsPackage("tsc2c-js-default-forward-external-cjs-helper", {
        "index.js": 'module.exports = { label: "js-default-forward-external-cjs", compute(value) { return value * 29; } };\n',
    }),
    "tsc2c-js-named-import-cjs-package": esmPackage("tsc2c-js-named-import-cjs-package", {
        "index.js": 'import { compute, label } from "./helper.cjs";\nexport const message = label + ":" + compute(3);\nexport function wrap(value) { return label + ":" + compute(value); }\n',
        "helper.cjs": 'module.exports = { label: "js-named-import-cjs", compute(value) { return value * 12; } };\n',
    }),
    "tsc2c-js-reexport-cjs-package": esmPackage("tsc2c-js-reexport-cjs-package", {
        "index.js": 'export { compute, label } from "./helper.cjs";\n',
        "helper.cjs": 'module.exports = { label: "js-reexport-cjs", compute(value) { return value * 13; } };\n',
    }),
    "tsc2c-js-aliased-reexport-cjs-package": esmPackage("tsc2c-js-aliased-reexport-cjs-package", {
        "index.js": 'export { compute as scale, label as title } from "./helper.cjs";\n',
        "helper.cjs": 'module.exports = { label: "js-aliased-reexport-cjs", compute(value) { return value * 17; } };\n',
    }),
    "tsc2c-js-namespace-import-cjs-package": esmPackage("tsc2c-js-namespace-import-cjs-package", {
        "index.js": 'import * as helper from "./helper.cjs";\nexport const message = helper.label + ":" + helper.compute(4);\nexport function wrap(value) { return helper.label + ":" + helper.compute(value); }\n',
        "helper.cjs": 'module.exports = { label: "js-namespace-import-cjs", compute(value) { return value * 14; } };\n',
    }),
    "tsc2c-js-default-reexport-cjs-package": esmPackage("tsc2c-js-default-reexport-cjs-package", {
        "index.js": 'export { default as helper } from "./helper.cjs";\n',
        "helper.cjs": 'module.exports = { label: "js-default-reexport-cjs", compute(value) { return value * 15; } };\n',
    }),
    "tsc2c-js-default-forward-cjs-package": esmPackage("tsc2c-js-default-forward-cjs-package", {
        "index.js": 'export { default } from "./helper.cjs";\n',
        "helper.cjs": 'module.exports = { label: "js-default-forward-cjs", compute(value) { return value * 19; } };\n',
    }),
    "tsc2c-js-export-star-cjs-package": esmPackage("tsc2c-js-export-star-cjs-package", {
        "index.js": 'export * from "./helper.cjs";\n',
        "helper.cjs": 'module.exports = { label: "js-export-star-cjs", compute(value) { return value * 16; } };\n',
    }),
    "tsc2c-js-namespace-reexport-cjs-package": esmPackage("tsc2c-js-namespace-reexport-cjs-package", {
        "index.js": 'export * as helper from "./helper.cjs";\n',
        "helper.cjs": 'module.exports = { label: "js-namespace-reexport-cjs", compute(value) { return value * 18; } };\n',
    }),
    "tsc2c-js-reexport-package": esmPackage("tsc2c-js-reexport-package", {
        "index.js": 'export { default as greet, label, compute as calc } from "./core.js";\nexport * from "./extra.js";\n',
        "core.js": 'export const label = "js-reexport";\nexport function compute(value) { return value * 4; }\nexport default function greet(name) { return "hello " + name; }\n',
        "extra.js": 'export const extra = "extra-js";\nexport function join(left, right) { return left + ":" + right; }\n',
    }),
    "tsc2c-js-default-reexport-package": esmPackage("tsc2c-js-default-reexport-package", {
        "index.js": 'export { default } from "./core.js";\nexport { label } from "./core.js";\n',
        "core.js": 'export const label = "js-default-reexport";\nexport default function greet(name) { return "hi " + name; }\n',
    }),
    "tsc2c-js-namespace-reexport-package": esmPackage("tsc2c-js-namespace-reexport-package", {
        "index.js": 'export * as tools from "./tools.js";\n',
        "tools.js": 'export const label = "js-namespace-reexport";\nexport function scale(value) { return value * 6; }\n',
    }),
    "tsc2c-cjs-named-package": cjsPackage("tsc2c-cjs-named-package", {
        "index.js": 'exports.label = "cjs";\nexports.add = function add(left, right) { return left + right; };\n',
    }),
    "tsc2c-cjs-mixed-interop-default": cjsPackage("tsc2c-cjs-mixed-interop-default", {
        "index.js": 'exports.label = "mixed-interop";\nexports.add = function add(left, right) { return left + right; };\nexports.default = { label: "explicit-default", add: function add(left, right) { return left * right; } };\n',
    }),
    "tsc2c-cjs-bracket-exports-package": cjsPackage("tsc2c-cjs-bracket-exports-package", {
        "index.js": 'exports["label"] = "bracket-cjs";\nexports["add"] = function add(left, right) { return left + right; };\n',
    }),
    "tsc2c-cjs-computed-exports-package": cjsPackage("tsc2c-cjs-computed-exports-package", {
        "index.js": 'const answerKey = "answer";\nconst labelKey = "label";\nexports[answerKey] = 42;\nmodule.exports[labelKey] = "computed-cjs";\n',
    }),
    "tsc2c-cjs-computed-numeric-boolean-exports": cjsPackage("tsc2c-cjs-computed-numeric-boolean-exports", {
        "index.js": 'exports.__esModule = true;\nconst one = 1;\nconst negTwo = -2;\nconst isTrue = true;\nexports["item_" + one] = "first";\nexports["item_" + negTwo] = "second";\nexports[`item_${isTrue}`] = "third";\nexports[1e2] = "hundred";\nexports[-0] = "zero";\n',
    }),
    "tsc2c-cjs-computed-string-exports-package": cjsPackage("tsc2c-cjs-computed-string-exports-package", {
        "index.js": 'exports.__esModule = true;\nconst answerPrefix = "ans";\nconst labelPrefix = "la";\nconst labelSuffix = "bel";\nconst comboMiddle = "bo";\nconst keys = ["extra", "mapped"];\nconst keyMap = { alias: "mapped" };\nconst joinParts = ["joined", "Key"];\nconst joinSep = "";\nexports[answerPrefix + "wer"] = 53;\nmodule.exports[`${labelPrefix}${labelSuffix}`] = "computed-static";\nexports[`com${comboMiddle}`] = true;\nexports[keys[0]] = "array-key";\nmodule.exports[keyMap.alias] = 71;\nexports[joinParts.join(joinSep)] = "joined-export";\n',
    }),
    "tsc2c-cjs-computed-keys-as-const-package": cjsPackage("tsc2c-cjs-computed-keys-as-const-package", {
        "index.js": 'exports.__esModule = true;\nconst keys = { first: { name: "value" } };\nexports[keys.first.name] = function() { return "it-works"; };\n',
    }),
    "tsc2c-cjs-computed-tuple-index-union-exports": {
        packageJson: { name: "tsc2c-cjs-computed-tuple-index-union-exports", version: "1.0.0", main: "main.js" },
        files: {
            "main.js": 'exports.__esModule = true;\n/** @type {readonly ["label", "fallbackLabel"]} */\nconst labelKeys = ["label", "fallbackLabel"];\n/** @type {readonly ["double", "triple"]} */\nconst fnKeys = ["double", "triple"];\n/** @type {0 | 1} */\nlet labelIndex = Date.now() >= 0 ? 0 : 1;\n/** @type {0 | 1} */\nlet fnIndex = Date.now() >= 0 ? 0 : 1;\nexports[labelKeys[labelIndex]] = "tuple-union-computed";\nmodule.exports[fnKeys[fnIndex]] = function double(value) { return value * 3; };\n',
        },
    },
    "tsc2c-cjs-computed-object-map-union-exports": {
        packageJson: { name: "tsc2c-cjs-computed-object-map-union-exports", version: "1.0.0", main: "main.js" },
        files: {
            "main.js": 'exports.__esModule = true;\n/** @type {{ readonly primary: "label", readonly fallback: "fallbackLabel", readonly fn: "double", readonly altFn: "triple" }} */\nconst nameMap = { primary: "label", fallback: "fallbackLabel", fn: "double", altFn: "triple" };\n/** @type {"primary" | "fallback"} */\nlet labelKey = Date.now() >= 0 ? "primary" : "fallback";\n/** @type {"fn" | "altFn"} */\nlet fnKey = Date.now() >= 0 ? "fn" : "altFn";\nexports[nameMap[labelKey]] = "object-map-computed";\nmodule.exports[nameMap[fnKey]] = function double(value) { return value * 4; };\n',
        },
    },
    "tsc2c-cjs-computed-object-keys-values-exports": {
        packageJson: { name: "tsc2c-cjs-computed-object-keys-values-exports", version: "1.0.0", main: "main.js" },
        files: {
            "main.js": 'exports.__esModule = true;\nconst keySource = { label: true, fallbackLabel: true };\nconst valueSource = { fn: "double", altFn: "triple" };\n/** @type {0 | 1} */\nlet labelIndex = Date.now() >= 0 ? 0 : 1;\n/** @type {0 | 1} */\nlet fnIndex = Date.now() >= 0 ? 0 : 1;\nexports[Object.keys(keySource)[labelIndex]] = "object-keys-computed";\nmodule.exports[Object.values(valueSource)[fnIndex]] = function double(value) { return value * 5; };\n',
        },
    },
    "tsc2c-cjs-computed-object-entries-exports": {
        packageJson: { name: "tsc2c-cjs-computed-object-entries-exports", version: "1.0.0", main: "main.js" },
        files: {
            "main.js": 'exports.__esModule = true;\nconst labelSource = { label: "primary", fallbackLabel: "fallback" };\nconst fnSource = { double: true, triple: true };\n/** @type {0 | 1} */\nlet labelIndex = Date.now() >= 0 ? 0 : 1;\n/** @type {0 | 1} */\nlet fnIndex = Date.now() >= 0 ? 0 : 1;\nexports[Object.entries(labelSource)[labelIndex][0]] = "object-entries-computed";\nmodule.exports[Object.entries(fnSource)[fnIndex][0]] = function double(value) { return value * 6; };\n',
        },
    },
    "tsc2c-cjs-computed-object-entry-values-exports": {
        packageJson: { name: "tsc2c-cjs-computed-object-entry-values-exports", version: "1.0.0", main: "main.js" },
        files: {
            "main.js": 'exports.__esModule = true;\nconst labelSource = { primary: "label", fallback: "fallbackLabel" };\nconst fnSource = { main: "double", alt: "triple" };\n/** @type {0 | 1} */\nlet labelIndex = Date.now() >= 0 ? 0 : 1;\n/** @type {0 | 1} */\nlet fnIndex = Date.now() >= 0 ? 0 : 1;\nexports[Object.entries(labelSource)[labelIndex][1]] = "object-entry-values-computed";\nmodule.exports[Object.entries(fnSource)[fnIndex][1]] = function double(value) { return value * 9; };\n',
        },
    },
    "tsc2c-cjs-computed-own-property-names-exports": {
        packageJson: { name: "tsc2c-cjs-computed-own-property-names-exports", version: "1.0.0", main: "main.js" },
        files: {
            "main.js": 'exports.__esModule = true;\nconst labelSource = { label: true, fallbackLabel: true };\nconst fnSource = { double: true, triple: true };\n/** @type {0 | 1} */\nlet labelIndex = Date.now() >= 0 ? 0 : 1;\n/** @type {0 | 1} */\nlet fnIndex = Date.now() >= 0 ? 0 : 1;\nexports[Object.getOwnPropertyNames(labelSource)[labelIndex]] = "own-property-names-computed";\nmodule.exports[Object.getOwnPropertyNames(fnSource)[fnIndex]] = function double(value) { return value * 7; };\n',
        },
    },
    "tsc2c-cjs-computed-object-wrapper-enum-exports": {
        packageJson: { name: "tsc2c-cjs-computed-object-wrapper-enum-exports", version: "1.0.0", main: "main.js" },
        files: {
            "main.js": 'exports.__esModule = true;\nconst keySource = Object.freeze({ label: true, fallbackLabel: true });\nconst valueSource = Object.seal({ fn: "double", altFn: "triple" });\nconst entrySource = Object.preventExtensions({ entryLabel: true, fallbackEntryLabel: true });\nconst nameSource = Object.setPrototypeOf({ nameLabel: true, fallbackNameLabel: true }, null);\n/** @type {0 | 1} */\nlet labelIndex = Date.now() >= 0 ? 0 : 1;\n/** @type {0 | 1} */\nlet fnIndex = Date.now() >= 0 ? 0 : 1;\n/** @type {0 | 1} */\nlet entryIndex = Date.now() >= 0 ? 0 : 1;\n/** @type {0 | 1} */\nlet nameIndex = Date.now() >= 0 ? 0 : 1;\nexports[Object.keys(keySource)[labelIndex]] = "wrapped-object-keys";\nmodule.exports[Object.values(valueSource)[fnIndex]] = function double(value) { return value * 8; };\nexports[Object.entries(entrySource)[entryIndex][0]] = "wrapped-object-entries";\nmodule.exports[Object.getOwnPropertyNames(nameSource)[nameIndex]] = "wrapped-object-names";\n',
        },
    },
    "tsc2c-cjs-conditional-whole-object-exports": cjsPackage("tsc2c-cjs-conditional-whole-object-exports", {
        "index.js": 'const isProd = true;\nmodule.exports = isProd ? { label: "conditional-prod", count: 88 } : { label: "conditional-dev", count: 12 };\n',
    }),
    "tsc2c-cjs-computed-conditional-exports": cjsPackage("tsc2c-cjs-computed-conditional-exports", {
        "index.js": 'const isProd = true;\nconst labelKey = isProd ? "label" : "devLabel";\nexports[labelKey] = "computed-conditional";\n',
    }),
    "tsc2c-cjs-dynamic-computed-exports": cjsPackage("tsc2c-cjs-dynamic-computed-exports", {
        "index.js": 'let enabled = true;\nconst labelKey = enabled ? "label" : "fallbackLabel";\nconst fnKey = enabled ? "double" : "triple";\nexports[labelKey] = "dynamic-computed";\nmodule.exports[fnKey] = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-computed-array-index-exports": cjsPackage("tsc2c-cjs-computed-array-index-exports", {
        "index.js": 'exports.__esModule = true;\nconst labelKeys = ["label", "fallbackLabel"];\nconst fnKeys = ["double", "triple"];\nconst labelIndex = Date.now() >= 0 ? 0 : 1;\nconst fnIndex = Date.now() >= 0 ? 0 : 1;\nexports[labelKeys[labelIndex]] = "array-index-computed";\nmodule.exports[fnKeys[fnIndex]] = function double(value) { return value * 11; };\n',
    }),
    "tsc2c-cjs-jsdoc-union-computed-exports": cjsPackage("tsc2c-cjs-jsdoc-union-computed-exports", {
        "index.js": 'exports.__esModule = true;\n/** @type {"label" | "fallbackLabel"} */\nlet labelKey;\n/** @type {"double" | "triple"} */\nlet fnKey;\nif (Date.now() >= 0) {\n  labelKey = "label";\n  fnKey = "double";\n} else {\n  labelKey = "fallbackLabel";\n  fnKey = "triple";\n}\nexports[labelKey] = "jsdoc-union-computed";\nmodule.exports[fnKey] = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-jsdoc-single-computed-exports": cjsPackage("tsc2c-cjs-jsdoc-single-computed-exports", {
        "index.js": 'exports.__esModule = true;\n/** @type {"label"} */\nlet labelKey = "label";\n/** @type {"double"} */\nlet fnKey = "double";\nexports[labelKey] = "jsdoc-single-computed";\nmodule.exports[fnKey] = function double(value) { return value * 4; };\n',
    }),
    "tsc2c-cjs-define-properties-exports": cjsPackage("tsc2c-cjs-define-properties-exports", {
        "index.js": 'exports.__esModule = true;\nObject.defineProperties(exports, {\n  default: { value: function greet(name) { return "hello " + name; }, enumerable: true },\n  label: { value: "define-properties", enumerable: true },\n  count: { value: 45, enumerable: true }\n});\n',
    }),
    "tsc2c-cjs-define-properties-identifier-exports": cjsPackage("tsc2c-cjs-define-properties-identifier-exports", {
        "index.js": 'exports.__esModule = true;\nconst descriptors = {\n  default: { value: function greet(name) { return "hello " + name; }, enumerable: true },\n  label: { value: "define-properties-identifier", enumerable: true },\n  count: { value: 49, enumerable: true }\n};\nObject.defineProperties(exports, descriptors);\n',
    }),
    "tsc2c-cjs-define-properties-descriptor-identifier-exports": cjsPackage("tsc2c-cjs-define-properties-descriptor-identifier-exports", {
        "index.js": 'exports.__esModule = true;\nconst labelDescriptor = { get: function() { return "descriptor-identifier"; }, enumerable: true };\nconst countDescriptor = { get: () => 52, enumerable: true };\nconst doubleDescriptor = { get() { return function double(value) { return value * 2; }; }, enumerable: true };\nObject.defineProperties(exports, {\n  label: labelDescriptor,\n  count: countDescriptor,\n  double: doubleDescriptor\n});\n',
    }),
    "tsc2c-cjs-define-property-require-member-exports": cjsPackage("tsc2c-cjs-define-property-require-member-exports", {
        "index.js": 'exports.__esModule = true;\nObject.defineProperty(exports, "default", { value: require("./default.js"), enumerable: true });\nObject.defineProperty(exports, "label", { value: require("./local.js").label, enumerable: true });\nObject.defineProperties(exports, {\n  count: { value: require("./local.js").count, enumerable: true },\n  double: { value: require("./local.js").double, enumerable: true }\n});\n',
        "default.js": 'module.exports = function greet(name) { return "hello " + name; };\n',
        "local.js": 'exports.label = "define-require-member";\nexports.count = 56;\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-define-property-require-binding-exports": cjsPackage("tsc2c-cjs-define-property-require-binding-exports", {
        "index.js": 'exports.__esModule = true;\nconst defaultValue = require("./default.js");\nconst local = require("./local.js");\nconst labelDescriptor = { value: local.label, enumerable: true };\nObject.defineProperty(exports, "default", { value: defaultValue, enumerable: true });\nObject.defineProperty(exports, "label", labelDescriptor);\nObject.defineProperties(exports, {\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n});\n',
        "default.js": 'module.exports = function greet(name) { return "hello " + name; };\n',
        "local.js": 'exports.label = "define-require-binding";\nexports.count = 57;\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-define-properties-require-binding-descriptors": cjsPackage("tsc2c-cjs-define-properties-require-binding-descriptors", {
        "index.js": 'exports.__esModule = true;\nconst defaultValue = require("./default.js");\nconst local = require("./local.js");\nconst defaultDescriptor = { value: defaultValue, enumerable: true };\nconst labelDescriptor = { value: local.label, enumerable: true };\nconst descriptors = {\n  default: defaultDescriptor,\n  label: labelDescriptor,\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nObject.defineProperties(exports, descriptors);\n',
        "default.js": 'module.exports = function greet(name) { return "hello " + name; };\n',
        "local.js": 'exports.label = "define-properties-require-binding";\nexports.count = 61;\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-define-properties-own-descriptors": cjsPackage("tsc2c-cjs-define-properties-own-descriptors", {
        "index.js": 'const api = {\n  default: function greet(name) { return "own-descriptors " + name; },\n  label: "own-descriptors",\n  count: 131,\n  double: function double(value) { return value * 31; }\n};\nObject.defineProperties(exports, Object.getOwnPropertyDescriptors(api));\n',
    }),
    "tsc2c-cjs-define-properties-own-descriptors-accessors": cjsPackage("tsc2c-cjs-define-properties-own-descriptors-accessors", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: function greet(name) { return "own-descriptors-accessors " + name; },\n  get label() { return local.label; },\n  get count() { return 133; },\n  double(value) { return value * 33; }\n};\nObject.defineProperties(exports, Object.getOwnPropertyDescriptors(api));\n',
        "local.js": 'exports.label = "own-descriptors-accessors";\n',
    }),
    "tsc2c-cjs-define-property-default-export": cjsPackage("tsc2c-cjs-define-property-default-export", {
        "index.js": 'Object.defineProperty(exports, "default", { value: function greet(name) { return "hi " + name; }, enumerable: true });\nObject.defineProperty(exports, "label", { value: "define-default", enumerable: true });\n',
    }),
    "tsc2c-cjs-define-property-identifier-exports": cjsPackage("tsc2c-cjs-define-property-identifier-exports", {
        "index.js": 'const defaultDescriptor = { value: function greet(name) { return "hello " + name; }, enumerable: true };\nconst labelDescriptor = { value: "define-property-identifier", enumerable: true };\nObject.defineProperty(exports, "default", defaultDescriptor);\nObject.defineProperty(exports, "label", labelDescriptor);\nObject.defineProperty(exports, "count", { value: 50, enumerable: true });\n',
    }),
    "tsc2c-cjs-define-property-computed-exports": cjsPackage("tsc2c-cjs-define-property-computed-exports", {
        "index.js": 'exports.__esModule = true;\nconst defaultKey = "def" + "ault";\nconst labelPrefix = "la";\nconst countKey = `count`;\nconst doubleKey = "dou" + "ble";\nconst keys = ["extra", "mapped"];\nconst keyMap = { alias: "mapped" };\nObject.defineProperty(exports, defaultKey, { value: function greet(name) { return "hello " + name; }, enumerable: true });\nObject.defineProperty(exports, keys[0], { value: "define-array-key", enumerable: true });\nObject.defineProperties(module.exports, {\n  [`${labelPrefix}bel`]: { value: "define-computed", enumerable: true },\n  [countKey]: { value: 65, enumerable: true },\n  [doubleKey]: { value: function double(value) { return value * 2; }, enumerable: true },\n  [keyMap.alias]: { value: 72, enumerable: true }\n});\n',
    }),
    "tsc2c-cjs-define-properties-from-entries-computed": cjsPackage("tsc2c-cjs-define-properties-from-entries-computed", {
        "index.js": 'exports.__esModule = true;\nconst defaultKey = "def" + "ault";\nconst labelSuffix = "bel";\nconst countKey = `count`;\nconst doubleKey = "dou" + "ble";\nObject.defineProperties(exports, Object.fromEntries([\n  [defaultKey, { value: function greet(name) { return "entries " + name; }, enumerable: true }],\n  ["la" + labelSuffix, { value: "define-properties-from-entries", enumerable: true }],\n  [countKey, { value: 73, enumerable: true }],\n  [doubleKey, { value: function double(value) { return value * 3; }, enumerable: true }]\n]));\n',
    }),
    "tsc2c-cjs-define-properties-from-entries-finite-keys": cjsPackage("tsc2c-cjs-define-properties-from-entries-finite-keys", {
        "index.js": 'exports.__esModule = true;\nconst labelKey = Date.now() >= 0 ? "label" : "fallbackLabel";\nconst countKey = Math.random() >= 0 ? "count" : "otherCount";\nObject.defineProperties(exports, Object.fromEntries([\n  [labelKey, { value: "define-properties-finite-keys", enumerable: true }],\n  [countKey, { value: 173, enumerable: true }]\n]));\n',
    }),
    "tsc2c-cjs-numeric-boolean-exports": cjsPackage("tsc2c-cjs-numeric-boolean-exports", {
        "index.js": 'exports.__esModule = true;\nexports[1.0] = "one";\nexports[1e2] = "hundred";\nexports[-0] = "zero";\nexports[true] = "yes";\nexports[false] = "no";\n',
    }),
    "tsc2c-cjs-null-undefined-exports": cjsPackage("tsc2c-cjs-null-undefined-exports", {
        "index.js": 'exports.__esModule = true;\nconst keyMap = { empty: null, alias: undefined };\nconst keys = [null, undefined];\nexports[null] = "nil";\nexports[undefined] = "none";\nexports[keyMap.empty] = "nil-map";\nexports[keyMap.alias] = "none-map";\nexports[keys[0]] = "nil-arr";\nexports[keys[1]] = "none-arr";\n',
    }),
    "tsc2c-cjs-bigint-exports": cjsPackage("tsc2c-cjs-bigint-exports", {
        "index.js": 'exports.__esModule = true;\nconst ten = 10n;\nconst negTwo = -2n;\nexports[10n] = "ten-bigint";\nexports[-2n] = "negative-two-bigint";\nexports[ten] = "ten-bigint-var";\nexports[negTwo] = "negative-two-bigint-var";\n',
    }),
    "tsc2c-cjs-define-properties-from-entries-object-entries": cjsPackage("tsc2c-cjs-define-properties-from-entries-object-entries", {
        "index.js": 'exports.__esModule = true;\nconst defaultKey = "def" + "ault";\nconst labelSuffix = "bel";\nconst descriptors = {\n  [defaultKey]: { value: function greet(name) { return "object-entries " + name; }, enumerable: true },\n  ["la" + labelSuffix]: { value: "define-properties-object-entries", enumerable: true },\n  count: { value: 83, enumerable: true },\n  double: { value: function double(value) { return value * 4; }, enumerable: true }\n};\nconst entries = Object.entries(descriptors);\nObject.defineProperties(module.exports, Object.fromEntries(entries));\n',
    }),
    "tsc2c-cjs-define-properties-from-entries-map-object-entries": cjsPackage("tsc2c-cjs-define-properties-from-entries-map-object-entries", {
        "index.js": 'exports.__esModule = true;\nconst descriptors = {\n  default: { value: function greet(name) { return "map-object-entries " + name; }, enumerable: true },\n  label: { value: "define-properties-map-object-entries", enumerable: true },\n  count: { value: 164, enumerable: true },\n  double: { value: function double(value) { return value * 22; }, enumerable: true }\n};\nObject.defineProperties(module.exports, Object.fromEntries(new Map(Object.entries(descriptors))));\n',
    }),
    "tsc2c-cjs-module-exports-static-metadata": cjsPackage("tsc2c-cjs-module-exports-static-metadata", {
        "index.js": 'module.exports.__esModule = true;\nconst defaultDescriptor = { value: function greet(name) { return "hello " + name; }, enumerable: true };\nconst descriptors = {\n  label: { value: "module-static-metadata", enumerable: true }\n};\nconst api = { count: 51 };\nObject.defineProperty(module.exports, "default", defaultDescriptor);\nObject.defineProperties(module.exports, descriptors);\nObject.assign(module.exports, api);\n',
    }),
    "tsc2c-cjs-module-exports-define-properties-from-entries": cjsPackage("tsc2c-cjs-module-exports-define-properties-from-entries", {
        "index.js": 'const defaultKey = "def" + "ault";\nconst labelKey = `label`;\nconst descriptors = {\n  [defaultKey]: { value: function greet(name) { return "whole-from-entries " + name; }, enumerable: true },\n  [labelKey]: { value: "module-define-properties-from-entries", enumerable: true },\n  count: { value: 93, enumerable: true },\n  double: { value: function double(value) { return value * 5; }, enumerable: true }\n};\nmodule.exports = Object.defineProperties({}, Object.fromEntries(Object.entries(descriptors)));\n',
    }),
    "tsc2c-cjs-module-exports-define-properties-from-entries-map": cjsPackage("tsc2c-cjs-module-exports-define-properties-from-entries-map", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "whole-from-entries-map " + name; }, enumerable: true },\n  label: { value: "module-define-properties-from-entries-map", enumerable: true },\n  count: { value: 165, enumerable: true },\n  double: { value: function double(value) { return value * 23; }, enumerable: true }\n};\nmodule.exports = Object.defineProperties({}, Object.fromEntries(new Map(Object.entries(descriptors))));\n',
    }),
    "tsc2c-cjs-module-define-properties-create-from-entries": cjsPackage("tsc2c-cjs-module-define-properties-create-from-entries", {
        "index.js": 'const base = { inherited: "define-properties-create-from-entries-base" };\nconst defaultKey = "def" + "ault";\nconst descriptors = {\n  [defaultKey]: { value: function greet(name) { return "define-properties-create-from-entries " + name; }, enumerable: true },\n  label: { get() { return "module-define-properties-create-from-entries"; }, enumerable: true },\n  count: { value: 132, enumerable: true },\n  double: { value: function double(value) { return value * 7; }, enumerable: true }\n};\nconst entries = Object.entries(descriptors);\nmodule.exports = Object.defineProperties(Object.create(base), Object.fromEntries(entries));\n',
    }),
    "tsc2c-cjs-module-define-properties-create-from-entries-map": cjsPackage("tsc2c-cjs-module-define-properties-create-from-entries-map", {
        "index.js": 'const base = { inherited: "define-properties-create-from-entries-map-base" };\nconst descriptors = {\n  default: { value: function greet(name) { return "define-properties-create-from-entries-map " + name; }, enumerable: true },\n  label: { get() { return "module-define-properties-create-from-entries-map"; }, enumerable: true },\n  count: { value: 153, enumerable: true },\n  double: { value: function double(value) { return value * 19; }, enumerable: true }\n};\nmodule.exports = Object.defineProperties(Object.create(base), Object.fromEntries(new Map(Object.entries(descriptors))));\n',
    }),
    "tsc2c-cjs-module-exports-create-from-entries": cjsPackage("tsc2c-cjs-module-exports-create-from-entries", {
        "index.js": 'const proto = { inherited: "create-from-entries-base" };\nconst defaultKey = "def" + "ault";\nconst descriptors = {\n  [defaultKey]: { value: function greet(name) { return "create-from-entries " + name; }, enumerable: true },\n  label: { value: "module-create-from-entries", enumerable: true },\n  count: { value: 123, enumerable: true },\n  double: { value: function double(value) { return value * 6; }, enumerable: true }\n};\nmodule.exports = Object.create(proto, Object.fromEntries(Object.entries(descriptors)));\n',
    }),
    "tsc2c-cjs-module-exports-create-from-entries-map": cjsPackage("tsc2c-cjs-module-exports-create-from-entries-map", {
        "index.js": 'const proto = { inherited: "create-from-entries-map-base" };\nconst descriptors = {\n  default: { value: function greet(name) { return "create-from-entries-map " + name; }, enumerable: true },\n  label: { value: "module-create-from-entries-map", enumerable: true },\n  count: { value: 154, enumerable: true },\n  double: { value: function double(value) { return value * 20; }, enumerable: true }\n};\nmodule.exports = Object.create(proto, Object.fromEntries(new Map(Object.entries(descriptors))));\n',
    }),
    "tsc2c-cjs-define-property-exports": cjsPackage("tsc2c-cjs-define-property-exports", {
        "index.js": 'Object.defineProperty(exports, "label", { value: "defined", enumerable: true });\nObject.defineProperty(exports, "count", { value: 42, enumerable: true });\nObject.defineProperty(exports, "double", { value: function double(value) { return value * 2; }, enumerable: true });\n',
    }),
    "tsc2c-cjs-define-property-getter-exports": cjsPackage("tsc2c-cjs-define-property-getter-exports", {
        "index.js": 'Object.defineProperty(exports, "label", { get: function() { return "getter"; }, enumerable: true });\nObject.defineProperty(exports, "count", { get: function() { return 43; }, enumerable: true });\nObject.defineProperty(exports, "double", { get: function() { return function double(value) { return value * 2; }; }, enumerable: true });\n',
    }),
    "tsc2c-cjs-assignment-esmodule-marker": cjsPackage("tsc2c-cjs-assignment-esmodule-marker", {
        "index.js": 'exports.__esModule = true;\nexports.default = function greet(name) { return "hello " + name; };\nexports.label = "assignment marker";\n',
    }),
    "tsc2c-cjs-exports-alias": cjsPackage("tsc2c-cjs-exports-alias", {
        "index.js": 'const out = exports;\nconst mod = module.exports;\nout.__esModule = true;\nout.default = function greet(name) { return "hello " + name; };\nout.label = "exports-alias";\nmod.count = 62;\nObject.defineProperty(out, "double", { value: function double(value) { return value * 2; }, enumerable: true });\nObject.assign(mod, { extra: "alias-extra" });\n',
    }),
    "tsc2c-cjs-export-assignment-chains": cjsPackage("tsc2c-cjs-export-assignment-chains", {
        "index.js": 'exports.default = module.exports.default = function greet(name) { return "hello " + name; };\nexports.label = module.exports.label = "chain";\nmodule.exports.count = exports.count = 42;\nmodule.exports.alias = exports.alias = function alias(name) { return "alias " + name; };\n',
    }),
    "tsc2c-cjs-export-placeholders": cjsPackage("tsc2c-cjs-export-placeholders", {
        "index.js": 'exports.default = void 0;\nexports.label = void 0;\nexports.count = void 0;\nexports.alias = void 0;\nexports.default = function greet(name) { return "hello " + name; };\nexports.label = "placeholder";\nexports.count = 64;\nexports.alias = function alias(name) { return "alias " + name; };\n',
    }),
    "tsc2c-cjs-exports-default-interop": cjsPackage("tsc2c-cjs-exports-default-interop", {
        "index.js": 'Object.defineProperty(exports, "__esModule", { value: true });\nexports.default = function greet(name) { return "hello " + name; };\nexports.label = "interop";\n',
    }),
    "tsc2c-cjs-object-assign-exports": cjsPackage("tsc2c-cjs-object-assign-exports", {
        "index.js": 'exports.__esModule = true;\nObject.assign(exports, {\n  default: function greet(name) { return "hello " + name; },\n  label: "assign-exports",\n  count: 46\n});\n',
    }),
    "tsc2c-cjs-object-assign-identifier-exports": cjsPackage("tsc2c-cjs-object-assign-identifier-exports", {
        "index.js": 'exports.__esModule = true;\nconst api = {\n  default: function greet(name) { return "hello " + name; },\n  label: "assign-identifier",\n  count: 48\n};\nObject.assign(exports, api);\n',
    }),
    "tsc2c-cjs-object-assign-spread-exports": cjsPackage("tsc2c-cjs-object-assign-spread-exports", {
        "index.js": 'exports.__esModule = true;\nconst api = {\n  default: function greet(name) { return "hello " + name; },\n  label: "assign-spread",\n  count: 63\n};\nObject.assign(exports, { ...api, double: function double(value) { return value * 2; } });\n',
    }),
    "tsc2c-cjs-object-assign-computed-exports": cjsPackage("tsc2c-cjs-object-assign-computed-exports", {
        "index.js": 'exports.__esModule = true;\nconst defaultKey = "def" + "ault";\nconst labelPrefix = "la";\nconst countKey = `count`;\nconst doubleKey = "dou" + "ble";\nconst api = {\n  [defaultKey]: function greet(name) { return "hello " + name; },\n  [`${labelPrefix}bel`]: "assign-computed",\n  [countKey]: 66\n};\nObject.assign(exports, { ...api, [doubleKey]: function double(value) { return value * 2; } });\n',
    }),
    "tsc2c-cjs-object-assign-computed-module-exports": cjsPackage("tsc2c-cjs-object-assign-computed-module-exports", {
        "index.js": 'module.exports.__esModule = true;\nconst defaultKey = "def" + "ault";\nconst labelKey = `label`;\nconst countKey = "co" + "unt";\nconst doubleKey = "dou" + "ble";\nObject.assign(module.exports, {\n  [defaultKey]: function greet(name) { return "hello " + name; },\n  [labelKey]: "assign-computed-module",\n  [countKey]: 68,\n  [doubleKey]: function double(value) { return value * 2; }\n});\n',
    }),
    "tsc2c-cjs-object-assign-enum-computed-exports": {
        packageJson: { name: "tsc2c-cjs-object-assign-enum-computed-exports", version: "1.0.0", main: "index.ts" },
        files: {
            "index.ts": 'declare const exports: any;\nexports.__esModule = true;\nenum ExportKey {\n  Default = "default",\n  Label = "label",\n  Count = "count",\n  Double = "double"\n}\nconst api = {\n  [ExportKey.Default]: function greet(name: string): string { return "hello " + name; },\n  [ExportKey.Label]: "assign-enum-computed",\n  [ExportKey.Count]: 70\n};\nObject.assign(exports, { ...api, [ExportKey.Double]: function double(value: number): number { return value * 2; } });\nexport {};\n',
        },
    },
    "tsc2c-cjs-object-assign-getter-exports": cjsPackage("tsc2c-cjs-object-assign-getter-exports", {
        "index.js": 'exports.__esModule = true;\nObject.assign(exports, {\n  get label() { return "assign-getter"; },\n  get count() { return 54; },\n  get double() { return function double(value) { return value * 2; }; }\n});\n',
    }),
    "tsc2c-cjs-object-assign-require-member-exports": cjsPackage("tsc2c-cjs-object-assign-require-member-exports", {
        "index.js": 'exports.__esModule = true;\nObject.assign(exports, {\n  default: require("./default.js"),\n  label: require("./local.js").label,\n  count: require("./local.js").count,\n  double: require("./local.js").double\n});\n',
        "default.js": 'module.exports = function greet(name) { return "hello " + name; };\n',
        "local.js": 'exports.label = "assign-require-member";\nexports.count = 55;\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-object-assign-require-binding-exports": cjsPackage("tsc2c-cjs-object-assign-require-binding-exports", {
        "index.js": 'exports.__esModule = true;\nconst defaultValue = require("./default.js");\nconst local = require("./local.js");\nconst api = {\n  default: defaultValue,\n  label: local.label,\n  count: local.count,\n  double: local.double\n};\nObject.assign(exports, api);\n',
        "default.js": 'module.exports = function greet(name) { return "hello " + name; };\n',
        "local.js": 'exports.label = "assign-require-binding";\nexports.count = 58;\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-object-assign-require-exports": cjsPackage("tsc2c-cjs-object-assign-require-exports", {
        "index.js": 'Object.assign(exports, require("./local.js"));\n',
        "local.js": 'exports.default = function greet(name) { return "hello " + name; };\nexports.label = "assign-require";\nexports.count = 47;\n',
    }),
    "tsc2c-cjs-object-assign-from-entries": cjsPackage("tsc2c-cjs-object-assign-from-entries", {
        "index.js": 'const local = require("./local.js");\nObject.assign(exports, Object.fromEntries([\n  ["default", function greet(name) { return "assign-from-entries " + name; }],\n  ["label", "assign-from-entries"],\n  ["count", local.count],\n  ["double", local.double]\n]));\n',
        "local.js": 'exports.count = 127;\nexports.double = function double(value) { return value * 23; };\n',
    }),
    "tsc2c-cjs-object-assign-from-entries-object-id": cjsPackage("tsc2c-cjs-object-assign-from-entries-object-id", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "assign-from-entries-object-id-default",\n  label: local.label,\n  count: 128,\n  enabled: true\n};\nconst entries = Object.entries(api);\nObject.assign(module.exports, Object.freeze(Object.fromEntries(entries)));\n',
        "local.js": 'exports.label = "assign-from-entries-object-id";\n',
    }),
    "tsc2c-cjs-object-assign-from-entries-map": cjsPackage("tsc2c-cjs-object-assign-from-entries-map", {
        "index.js": 'const api = {\n  default: "assign-from-entries-map-default",\n  label: "assign-from-entries-map",\n  count: 141,\n  enabled: true\n};\nObject.assign(exports, Object.fromEntries(new Map(Object.entries(api))));\n',
    }),
    "tsc2c-cjs-module-object-assign-exports-target": cjsPackage("tsc2c-cjs-module-object-assign-exports-target", {
        "index.js": 'exports.seed = "assign-exports-target-seed";\nmodule.exports = Object.assign(exports, {\n  default: function greet(name) { return "assign-exports-target " + name; },\n  label: "assign-exports-target",\n  count: 129,\n  double: function double(value) { return value * 29; }\n});\n',
    }),
    "tsc2c-cjs-module-object-assign-module-target-from-entries": cjsPackage("tsc2c-cjs-module-object-assign-module-target-from-entries", {
        "index.js": 'module.exports.base = "assign-module-target-base";\nconst api = {\n  default: "assign-module-target-default",\n  label: "assign-module-target",\n  count: 130,\n  enabled: true\n};\nconst entries = Object.entries(api);\nmodule.exports = Object.assign(module.exports, Object.freeze(Object.fromEntries(entries)));\n',
    }),
    "tsc2c-cjs-function-scope-named": cjsPackage("tsc2c-cjs-function-scope-named", {
        "index.js": "exports.add = function add(left, right) { return left + right; };\nexports.label = \"function-scope-rest\";\n",
    }),
    "tsc2c-cjs-function-scope-default": cjsPackage("tsc2c-cjs-function-scope-default", {
        "index.js": "module.exports = function multiply(left, right) { return left * right; };\n",
    }),
    "tsc2c-cjs-require-alias": cjsPackage("tsc2c-cjs-require-alias", {
        "index.js": 'exports.__esModule = true;\nconst req = require;\nconst moduleReq = module.require;\nconst local = req("./local.js");\nexports.default = function greet(name) { return "hello " + name; };\nexports.label = local.label;\nexports.count = moduleReq("./local.js").count;\nexports.double = function double(value) { return value * 2; };\n',
        "local.js": 'exports.label = "require-alias";\nexports.count = 64;\n',
    }),
    "tsc2c-cjs-module-require-bind-alias": cjsPackage("tsc2c-cjs-module-require-bind-alias", {
        "index.js": 'exports.__esModule = true;\nconst req = module.require.bind(module);\nconst local = req("./local.js");\nconst inline = module.require.bind(module)("./local.js");\nexports.default = function greet(name) { return "hello " + name; };\nexports.label = local.label;\nexports.count = req("./local.js").count + inline.count;\nexports.double = function double(value) { return value * 3; };\n',
        "local.js": 'exports.label = "require-bind-alias";\nexports.count = 75;\n',
    }),
    "tsc2c-cjs-module-alias-require-bind-alias": cjsPackage("tsc2c-cjs-module-alias-require-bind-alias", {
        "index.js": 'exports.__esModule = true;\nconst mod = module;\nconst req = mod.require.bind(mod);\nconst local = req("./local.js");\nexports.default = function greet(name) { return "hello " + name; };\nexports.label = local.label;\nexports.count = req("./local.js").count;\nexports.double = function double(value) { return value * 4; };\n',
        "local.js": 'exports.label = "module-alias-require-bind";\nexports.count = 76;\n',
    }),
    "tsc2c-cjs-require-alias-bind-alias": cjsPackage("tsc2c-cjs-require-alias-bind-alias", {
        "index.js": 'exports.__esModule = true;\nconst { require: req } = module;\nconst bound = req.bind(module);\nconst local = bound("./local.js");\nexports.default = function greet(name) { return "hello " + name; };\nexports.label = local.label;\nexports.count = bound("./local.js").count;\nexports.double = function double(value) { return value * 5; };\n',
        "local.js": 'exports.label = "require-alias-bind";\nexports.count = 77;\n',
    }),
    "tsc2c-cjs-module-require-call-wrapper": cjsPackage("tsc2c-cjs-module-require-call-wrapper", {
        "index.js": 'exports.__esModule = true;\nconst mod = module;\nconst local = module.require.call(module, "./local.js");\nconst directReqCall = require.call(module, "./local.js");\nconst directReqArgs = ["./local.js"];\nconst directReqApplied = require.apply(module, directReqArgs);\nconst directArgs = ["./local.js"];\nconst directApplied = module.require.apply(module, directArgs);\nconst reflectedArgs = ["./local.js"];\nconst reflected = Reflect.apply(module.require, module, reflectedArgs);\nconst modCall = mod.require.call(mod, "./local.js");\nconst modArgs = ["./local.js"];\nconst modApplied = mod.require.apply(mod, modArgs);\nconst modReflectedArgs = ["./local.js"];\nconst modReflected = Reflect.apply(mod.require, mod, modReflectedArgs);\nconst { require: req } = module;\nconst aliasCall = req.call(module, "./local.js");\nconst aliasArgs = ["./local.js"];\nconst applied = req.apply(module, aliasArgs);\nconst reflectedAliasArgs = ["./local.js"];\nconst reflectedAlias = Reflect.apply(req, module, reflectedAliasArgs);\nexports.default = function greet(name) { return "hello " + name; };\nexports.label = local.label;\nexports.count = directReqCall.count + directReqApplied.count + applied.count + directApplied.count + reflected.count + modCall.count + modApplied.count + modReflected.count + aliasCall.count + reflectedAlias.count;\nexports.double = function double(value) { return value * 6; };\n',
        "local.js": 'exports.label = "require-call-wrapper";\nexports.count = 78;\n',
    }),
    "tsc2c-cjs-iife-parameter-wrapper": cjsPackage("tsc2c-cjs-iife-parameter-wrapper", {
        "index.js": '(function (req, mod, out) {\n  out.label = "iife-parameter-wrapper";\n  mod.exports.count = 82;\n  out.double = function double(value) { return value * 8; };\n})(require, module, exports);\n',
    }),
    "tsc2c-cjs-unary-iife-wrapper": cjsPackage("tsc2c-cjs-unary-iife-wrapper", {
        "index.js": '!function (req, mod, out) {\n  const local = req("./local.js");\n  out.default = function greet(name) { return "unary-iife " + name; };\n  out.label = local.label;\n  mod.exports.count = local.count;\n  out.double = function double(value) { return value * 14; };\n}(require, module, exports);\n',
        "local.js": 'exports.label = "unary-iife-wrapper";\nexports.count = 88;\n',
    }),
    "tsc2c-cjs-factory-wrapper": cjsPackage("tsc2c-cjs-factory-wrapper", {
        "index.js": '(function (factory) {\n  if (typeof module === "object" && module.exports) {\n    factory(require, module, exports);\n  }\n})(function (req, mod, out) {\n  const local = req("./local.js");\n  out.__esModule = true;\n  out.default = function greet(name) { return "factory-wrapper " + name; };\n  out.label = local.label;\n  mod.exports.count = local.count;\n  out.double = function double(value) { return value * 9; };\n});\n',
        "local.js": 'exports.label = "factory-wrapper";\nexports.count = 83;\n',
    }),
    "tsc2c-cjs-factory-wrapper-call": cjsPackage("tsc2c-cjs-factory-wrapper-call", {
        "index.js": '(function (factory) {\n  if (typeof module === "object" && module.exports) {\n    factory.call(undefined, require, module, exports);\n  }\n})(function (req, mod, out) {\n  const local = req("./local.js");\n  out.__esModule = true;\n  out.default = function greet(name) { return "factory-wrapper-call " + name; };\n  out.label = local.label;\n  mod.exports.count = local.count;\n  out.double = function double(value) { return value * 10; };\n});\n',
        "local.js": 'exports.label = "factory-wrapper-call";\nexports.count = 84;\n',
    }),
    "tsc2c-cjs-factory-wrapper-apply": cjsPackage("tsc2c-cjs-factory-wrapper-apply", {
        "index.js": '(function (factory) {\n  if (typeof module === "object" && module.exports) {\n    factory.apply(null, [require, module, exports]);\n  }\n})(function (req, mod, out) {\n  const local = req("./local.js");\n  out.__esModule = true;\n  out.default = function greet(name) { return "factory-wrapper-apply " + name; };\n  out.label = local.label;\n  mod.exports.count = local.count;\n  out.double = function double(value) { return value * 11; };\n});\n',
        "local.js": 'exports.label = "factory-wrapper-apply";\nexports.count = 85;\n',
    }),
    "tsc2c-cjs-factory-wrapper-reflect-apply": cjsPackage("tsc2c-cjs-factory-wrapper-reflect-apply", {
        "index.js": '(function (factory) {\n  if (typeof module === "object" && module.exports) {\n    Reflect.apply(factory, null, [require, module, exports]);\n  }\n})(function (req, mod, out) {\n  const local = req("./local.js");\n  out.__esModule = true;\n  out.default = function greet(name) { return "factory-wrapper-reflect " + name; };\n  out.label = local.label;\n  mod.exports.count = local.count;\n  out.double = function double(value) { return value * 12; };\n});\n',
        "local.js": 'exports.label = "factory-wrapper-reflect";\nexports.count = 86;\n',
    }),
    "tsc2c-cjs-factory-wrapper-bind": cjsPackage("tsc2c-cjs-factory-wrapper-bind", {
        "index.js": '(function (factory) {\n  if (typeof module === "object" && module.exports) {\n    factory.bind(undefined)(require, module, exports);\n  }\n})(function (req, mod, out) {\n  const local = req("./local.js");\n  out.__esModule = true;\n  out.default = function greet(name) { return "factory-wrapper-bind " + name; };\n  out.label = local.label;\n  mod.exports.count = local.count;\n  out.double = function double(value) { return value * 13; };\n});\n',
        "local.js": 'exports.label = "factory-wrapper-bind";\nexports.count = 87;\n',
    }),
    "tsc2c-cjs-factory-wrapper-require-argument": cjsPackage("tsc2c-cjs-factory-wrapper-require-argument", {
        "index.js": '(function (factory) {\n  if (typeof module === "object" && module.exports) {\n    factory(exports, require("./local.js"));\n  }\n})(function (out, local) {\n  out.__esModule = true;\n  out.default = function greet(name) { return "factory-wrapper-require-argument " + name; };\n  out.label = local.label;\n  out.count = local.count;\n  out.double = function double(value) { return value * 18; };\n});\n',
        "local.js": 'exports.label = "factory-wrapper-require-argument";\nexports.count = 89;\n',
    }),
    "tsc2c-cjs-require-assertion-wrappers": {
        packageJson: { name: "tsc2c-cjs-require-assertion-wrappers", version: "1.0.0", main: "index.ts" },
        files: {
            "index.ts": 'const req = <any>require;\nconst local = req("./local.js");\nconst direct = (module.require satisfies any)("./local.js");\nconst bound = (module.require as any).bind(module as any);\nconst boundLocal = bound("./local.js");\nconst called = (require as any).call(module as any, "./local.js");\nconst applyArgs = ["./local.js"];\nconst applied = (module.require as any).apply(module as any, applyArgs);\nconst reflected = Reflect.apply((module.require as any), module as any, applyArgs);\nconst nonNull = (require!)("./local.js");\nmodule.exports = {\n  default: function greet(name: string) { return "hello " + name; },\n  label: local.label,\n  count: direct.count,\n  boundCount: boundLocal.count,\n  calledCount: called.count,\n  appliedCount: applied.count,\n  reflectedCount: reflected.count,\n  nonNullCount: nonNull.count,\n  double: function double(value: number) { return value * 7; }\n};\n',
            "local.js": 'exports.label = "require-assertion-wrappers";\nexports.count = 91;\n',
        },
    },
    "tsc2c-cjs-module-array": cjsPackage("tsc2c-cjs-module-array", {
        "index.js": "module.exports = [2, 4, 8];\n",
    }),
    "tsc2c-cjs-module-array-spread-default": cjsPackage("tsc2c-cjs-module-array-spread-default", {
        "index.js": 'const head = ["alpha", "beta"];\nconst tail = [3, "delta"];\nmodule.exports = ["start", ...head, ...tail, "end"];\n',
    }),
    "tsc2c-cjs-module-arrow": cjsPackage("tsc2c-cjs-module-arrow", {
        "index.js": "module.exports = (value) => value * 2;\n",
    }),
    "tsc2c-cjs-module-conditional": cjsPackage("tsc2c-cjs-module-conditional", {
        "index.js": "module.exports = true ? require('./true.js') : require('./false.js');\n",
        "true.js": "module.exports = (value) => value + 10;\n",
        "false.js": "module.exports = (value) => value + 20;\n",
    }),
    "tsc2c-cjs-module-null": cjsPackage("tsc2c-cjs-module-null", {
        "index.js": "module.exports = null;\n",
    }),
    "tsc2c-cjs-module-null-object": cjsPackage("tsc2c-cjs-module-null-object", {
        "index.js": 'module.exports = { label: "null-cjs", nil: null, nested: { value: null }, list: [null, "tail"] };\n',
    }),
    "tsc2c-cjs-function-package": cjsPackage("tsc2c-cjs-function-package", {
        "index.js": "module.exports = function add(left, right) { return left + right; };\n",
    }),
    "tsc2c-cjs-identifier-package": cjsPackage("tsc2c-cjs-identifier-package", {
        "index.js": "function add(left, right) { return left + right; }\nmodule.exports = add;\n",
    }),
    "tsc2c-cjs-nested-object-default-package": cjsPackage("tsc2c-cjs-nested-object-default-package", {
        "index.js": 'module.exports = {\n  meta: { label: "nested-cjs", flags: [true, false] },\n  values: [2, 4, 8]\n};\n',
    }),
    "tsc2c-cjs-object-package": cjsPackage("tsc2c-cjs-object-package", {
        "index.js": 'function add(left, right) { return left + right; }\nconst label = "cjs-object";\nmodule.exports = { add, label };\n',
    }),
    "tsc2c-cjs-object-arrow-package": cjsPackage("tsc2c-cjs-object-arrow-package", {
        "index.js": "module.exports = { add: (left, right) => left + right };\n",
    }),
    "tsc2c-cjs-object-function-package": cjsPackage("tsc2c-cjs-object-function-package", {
        "index.js": "module.exports = {\n  add: function add(left, right) { return left + right; },\n  double: function double(value) { return value * 2; }\n};\n",
    }),
    "tsc2c-cjs-object-method-package": cjsPackage("tsc2c-cjs-object-method-package", {
        "index.js": 'module.exports = {\n  label: "method-cjs",\n  add(left, right) { return left + right; }\n};\n',
    }),
    "tsc2c-cjs-object-literals-package": cjsPackage("tsc2c-cjs-object-literals-package", {
        "index.js": 'function add(left, right) { return left + right; }\nmodule.exports = { label: "literal-cjs", count: 42, enabled: true, add };\n',
    }),
    "tsc2c-cjs-object-default-package": cjsPackage("tsc2c-cjs-object-default-package", {
        "index.js": 'module.exports = { label: "object-default", count: 7 };\n',
    }),
    "tsc2c-cjs-module-iife-object-arrow": cjsPackage("tsc2c-cjs-module-iife-object-arrow", {
        "index.js": 'module.exports = (() => ({\n  label: "iife-arrow",\n  count: 123,\n  double: (value) => value * 2,\n  default: "iife-arrow-default"\n}))();\n',
    }),
    "tsc2c-cjs-module-iife-object-function": cjsPackage("tsc2c-cjs-module-iife-object-function", {
        "index.js": 'module.exports = (function () {\n  return {\n    label: "iife-function",\n    count: 124,\n    triple(value) { return value * 3; },\n    default: "iife-function-default"\n  };\n})();\n',
    }),
    "tsc2c-cjs-module-iife-wrapper-object": cjsPackage("tsc2c-cjs-module-iife-wrapper-object", {
        "index.js": 'module.exports = (function () {\n  return Object.freeze({\n    default: "iife-wrapper-default",\n    label: "iife-wrapper",\n    count: 129,\n    double(value) { return value * 2; }\n  });\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-object": cjsPackage("tsc2c-cjs-module-local-factory-object", {
        "index.js": 'const label = "factory-object";\nfunction makeApi() {\n  return {\n    default: "factory-default",\n    label,\n    count: 125,\n    double(value) { return value * 2; },\n    enabled: true\n  };\n}\nmodule.exports = makeApi();\n',
    }),
    "tsc2c-cjs-module-factory-argument-alias-object": cjsPackage("tsc2c-cjs-module-factory-argument-alias-object", {
        "index.js": 'const dependency = require("./dependency.js");\nconst dependencyAlias = dependency;\nconst dependencyAliasAgain = dependencyAlias;\nfunction makeApi(value) {\n  return {\n    default: value.label,\n    label: value.label,\n    count: value.count,\n    double(input) { return input * 2; }\n  };\n}\nmodule.exports = makeApi(dependencyAliasAgain);\n',
        "dependency.js": 'module.exports = { label: "factory-argument-alias", count: 159 };\n',
    }),
    "tsc2c-cjs-module-local-factory-parenthesized-object": cjsPackage("tsc2c-cjs-module-local-factory-parenthesized-object", {
        "index.js": 'function createApi() {\n  return ({\n    default: "factory-paren-default",\n    label: "factory-paren",\n    count: 126,\n    triple: (value) => value * 3\n  });\n}\nmodule.exports = createApi();\n',
    }),
    "tsc2c-cjs-module-local-arrow-factory-object": cjsPackage("tsc2c-cjs-module-local-arrow-factory-object", {
        "index.js": 'const makeArrowApi = () => ({\n  default: "factory-arrow-default",\n  label: "factory-arrow",\n  count: 127,\n  inc(value) { return value + 1; },\n  enabled: true\n});\nmodule.exports = makeArrowApi();\n',
    }),
    "tsc2c-cjs-module-local-function-expression-factory-object": cjsPackage("tsc2c-cjs-module-local-function-expression-factory-object", {
        "index.js": 'const makeExpressionApi = (function () {\n  return ({\n    default: "factory-expression-default",\n    label: "factory-expression",\n    count: 128,\n    quadruple: (value) => value * 4\n  });\n});\nmodule.exports = (makeExpressionApi)();\n',
    }),
    "tsc2c-cjs-module-local-wrapper-factory-object": cjsPackage("tsc2c-cjs-module-local-wrapper-factory-object", {
        "index.js": 'function makeWrappedApi() {\n  return Object.seal({\n    default: "factory-wrapper-default",\n    label: "factory-wrapper",\n    count: 130,\n    double(value) { return value * 2; }\n  });\n}\nmodule.exports = makeWrappedApi();\n',
    }),
    "tsc2c-cjs-module-local-factory-assign-object": cjsPackage("tsc2c-cjs-module-local-factory-assign-object", {
        "index.js": 'function makeAssignedApi() {\n  return {\n    default: "factory-assign-default",\n    label: "factory-assign",\n    count: 131,\n    double(value) { return value * 2; }\n  };\n}\nmodule.exports = Object.assign({}, makeAssignedApi(), { extra: "factory-assign-extra" });\n',
    }),
    "tsc2c-cjs-module-local-factory-define-properties-object": cjsPackage("tsc2c-cjs-module-local-factory-define-properties-object", {
        "index.js": 'function makeDefinedApi() {\n  return {\n    default: "factory-define-properties-default",\n    label: "factory-define-properties",\n    count: 132,\n    double(value) { return value * 2; }\n  };\n}\nmodule.exports = Object.defineProperties(makeDefinedApi(), { extra: { value: "factory-define-properties-extra", enumerable: true } });\n',
    }),
    "tsc2c-cjs-module-local-factory-define-property-object": cjsPackage("tsc2c-cjs-module-local-factory-define-property-object", {
        "index.js": 'function makeDefinedPropertyApi() {\n  return {\n    default: "factory-define-property-default",\n    label: "factory-define-property",\n    count: 133,\n    double(value) { return value * 2; }\n  };\n}\nmodule.exports = Object.defineProperty(makeDefinedPropertyApi(), "extra", { value: "factory-define-property-extra", enumerable: true });\n',
    }),
    "tsc2c-cjs-module-local-factory-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-alias-object", {
        "index.js": 'function makeAliasedApi() {\n  return {\n    default: "factory-alias-default",\n    label: "factory-alias",\n    count: 134,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makeAliasedApi;\nmodule.exports = Object.freeze(factory());\n',
    }),
    "tsc2c-cjs-module-local-factory-call-object": cjsPackage("tsc2c-cjs-module-local-factory-call-object", {
        "index.js": 'function makeCallApi() {\n  return {\n    default: "factory-call-default",\n    label: "factory-call",\n    count: 135,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makeCallApi;\nmodule.exports = Object.freeze(factory.call(null));\n',
    }),
    "tsc2c-cjs-module-local-factory-apply-object": cjsPackage("tsc2c-cjs-module-local-factory-apply-object", {
        "index.js": 'function makeApplyApi() {\n  return {\n    default: "factory-apply-default",\n    label: "factory-apply",\n    count: 136,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makeApplyApi;\nmodule.exports = Object.freeze(factory.apply(null, []));\n',
    }),
    "tsc2c-cjs-module-local-factory-reflect-apply-object": cjsPackage("tsc2c-cjs-module-local-factory-reflect-apply-object", {
        "index.js": 'function makeReflectApplyApi() {\n  return {\n    default: "factory-reflect-apply-default",\n    label: "factory-reflect-apply",\n    count: 137,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makeReflectApplyApi;\nmodule.exports = Object.freeze(Reflect.apply(factory, null, []));\n',
    }),
    "tsc2c-cjs-module-local-factory-bind-object": cjsPackage("tsc2c-cjs-module-local-factory-bind-object", {
        "index.js": 'function makeBindApi() {\n  return {\n    default: "factory-bind-default",\n    label: "factory-bind",\n    count: 138,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makeBindApi;\nmodule.exports = Object.freeze(factory.bind(null)());\n',
    }),
    "tsc2c-cjs-module-local-factory-seal-object": cjsPackage("tsc2c-cjs-module-local-factory-seal-object", {
        "index.js": 'function makeSealApi() {\n  return {\n    default: "factory-seal-default",\n    label: "factory-seal",\n    count: 139,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makeSealApi;\nmodule.exports = Object.seal(factory());\n',
    }),
    "tsc2c-cjs-module-local-factory-prevent-extensions-object": cjsPackage("tsc2c-cjs-module-local-factory-prevent-extensions-object", {
        "index.js": 'function makePreventExtensionsApi() {\n  return {\n    default: "factory-prevent-extensions-default",\n    label: "factory-prevent-extensions",\n    count: 140,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makePreventExtensionsApi;\nmodule.exports = Object.preventExtensions(factory());\n',
    }),
    "tsc2c-cjs-module-local-factory-set-prototype-of-object": cjsPackage("tsc2c-cjs-module-local-factory-set-prototype-of-object", {
        "index.js": 'function makeSetPrototypeOfApi() {\n  return {\n    default: "factory-set-prototype-of-default",\n    label: "factory-set-prototype-of",\n    count: 141,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makeSetPrototypeOfApi;\nmodule.exports = Object.setPrototypeOf(factory(), null);\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-alias-object", {
        "index.js": 'function makeIifeAliasApi() {\n  return {\n    default: "factory-iife-alias-default",\n    label: "factory-iife-alias",\n    count: 142,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makeIifeAliasApi;\nmodule.exports = (function () {\n  return Object.freeze(factory());\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-call-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-call-alias-object", {
        "index.js": 'function makeIifeCallAliasApi() {\n  return {\n    default: "factory-iife-call-alias-default",\n    label: "factory-iife-call-alias",\n    count: 143,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makeIifeCallAliasApi;\nmodule.exports = (function () {\n  return Object.freeze(factory.call(null));\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-apply-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-apply-alias-object", {
        "index.js": 'function makeIifeApplyAliasApi() {\n  return {\n    default: "factory-iife-apply-alias-default",\n    label: "factory-iife-apply-alias",\n    count: 144,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makeIifeApplyAliasApi;\nmodule.exports = (function () {\n  return Object.freeze(factory.apply(null, []));\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-reflect-apply-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-reflect-apply-alias-object", {
        "index.js": 'function makeIifeReflectApplyAliasApi() {\n  return {\n    default: "factory-iife-reflect-apply-alias-default",\n    label: "factory-iife-reflect-apply-alias",\n    count: 145,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makeIifeReflectApplyAliasApi;\nmodule.exports = (function () {\n  return Object.freeze(Reflect.apply(factory, null, []));\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-bind-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-bind-alias-object", {
        "index.js": 'function makeIifeBindAliasApi() {\n  return {\n    default: "factory-iife-bind-alias-default",\n    label: "factory-iife-bind-alias",\n    count: 146,\n    double(value) { return value * 2; }\n  };\n}\nconst factory = makeIifeBindAliasApi;\nmodule.exports = (function () {\n  return Object.freeze(factory.bind(null)());\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-local-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-local-alias-object", {
        "index.js": 'module.exports = (function () {\n  function makeIifeLocalAliasApi() {\n    return {\n      default: "factory-iife-local-alias-default",\n      label: "factory-iife-local-alias",\n      count: 147,\n      double(value) { return value * 2; }\n    };\n  }\n  const factory = makeIifeLocalAliasApi;\n  return Object.freeze(factory());\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-local-call-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-local-call-alias-object", {
        "index.js": 'module.exports = (function () {\n  function makeIifeLocalCallAliasApi() {\n    return {\n      default: "factory-iife-local-call-alias-default",\n      label: "factory-iife-local-call-alias",\n      count: 148,\n      double(value) { return value * 2; }\n    };\n  }\n  const factory = makeIifeLocalCallAliasApi;\n  return Object.freeze(factory.call(null));\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-local-apply-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-local-apply-alias-object", {
        "index.js": 'module.exports = (function () {\n  function makeIifeLocalApplyAliasApi() {\n    return {\n      default: "factory-iife-local-apply-alias-default",\n      label: "factory-iife-local-apply-alias",\n      count: 149,\n      double(value) { return value * 2; }\n    };\n  }\n  const factory = makeIifeLocalApplyAliasApi;\n  return Object.freeze(factory.apply(null, []));\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-local-reflect-apply-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-local-reflect-apply-alias-object", {
        "index.js": 'module.exports = (function () {\n  function makeIifeLocalReflectApplyAliasApi() {\n    return {\n      default: "factory-iife-local-reflect-apply-alias-default",\n      label: "factory-iife-local-reflect-apply-alias",\n      count: 150,\n      double(value) { return value * 2; }\n    };\n  }\n  const factory = makeIifeLocalReflectApplyAliasApi;\n  return Object.freeze(Reflect.apply(factory, null, []));\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-local-bind-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-local-bind-alias-object", {
        "index.js": 'module.exports = (function () {\n  function makeIifeLocalBindAliasApi() {\n    return {\n      default: "factory-iife-local-bind-alias-default",\n      label: "factory-iife-local-bind-alias",\n      count: 151,\n      double(value) { return value * 2; }\n    };\n  }\n  const factory = makeIifeLocalBindAliasApi;\n  return Object.freeze(factory.bind(null)());\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-local-seal-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-local-seal-alias-object", {
        "index.js": 'module.exports = (function () {\n  function makeIifeLocalSealAliasApi() {\n    return {\n      default: "factory-iife-local-seal-alias-default",\n      label: "factory-iife-local-seal-alias",\n      count: 152,\n      double(value) { return value * 2; }\n    };\n  }\n  const factory = makeIifeLocalSealAliasApi;\n  return Object.seal(factory());\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-local-prevent-extensions-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-local-prevent-extensions-alias-object", {
        "index.js": 'module.exports = (function () {\n  function makeIifeLocalPreventExtensionsAliasApi() {\n    return {\n      default: "factory-iife-local-prevent-extensions-alias-default",\n      label: "factory-iife-local-prevent-extensions-alias",\n      count: 153,\n      double(value) { return value * 2; }\n    };\n  }\n  const factory = makeIifeLocalPreventExtensionsAliasApi;\n  return Object.preventExtensions(factory());\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-local-set-prototype-of-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-local-set-prototype-of-alias-object", {
        "index.js": 'module.exports = (function () {\n  function makeIifeLocalSetPrototypeOfAliasApi() {\n    return {\n      default: "factory-iife-local-set-prototype-of-alias-default",\n      label: "factory-iife-local-set-prototype-of-alias",\n      count: 154,\n      double(value) { return value * 2; }\n    };\n  }\n  const factory = makeIifeLocalSetPrototypeOfAliasApi;\n  return Object.setPrototypeOf(factory(), null);\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-local-assign-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-local-assign-alias-object", {
        "index.js": 'module.exports = (function () {\n  function makeIifeLocalAssignAliasApi() {\n    return {\n      default: "factory-iife-local-assign-alias-default",\n      label: "factory-iife-local-assign-alias",\n      count: 155,\n      double(value) { return value * 2; }\n    };\n  }\n  const factory = makeIifeLocalAssignAliasApi;\n  return Object.freeze(Object.assign({}, factory()));\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-local-define-properties-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-local-define-properties-alias-object", {
        "index.js": 'module.exports = (function () {\n  function makeIifeLocalDefinePropertiesAliasApi() {\n    return {\n      default: "factory-iife-local-define-properties-alias-default",\n      label: "factory-iife-local-define-properties-alias",\n      count: 156,\n      double(value) { return value * 2; }\n    };\n  }\n  const factory = makeIifeLocalDefinePropertiesAliasApi;\n  return Object.freeze(Object.defineProperties(factory(), {}));\n})();\n',
    }),
    "tsc2c-cjs-module-local-factory-iife-local-define-property-alias-object": cjsPackage("tsc2c-cjs-module-local-factory-iife-local-define-property-alias-object", {
        "index.js": 'module.exports = (function () {\n  function makeIifeLocalDefinePropertyAliasApi() {\n    return {\n      default: "factory-iife-local-define-property-alias-default",\n      label: "factory-iife-local-define-property-alias",\n      count: 157,\n      double(value) { return value * 2; }\n    };\n  }\n  const factory = makeIifeLocalDefinePropertyAliasApi;\n  return Object.freeze(Object.defineProperty(factory(), "label", {}));\n})();\n',
    }),
    "tsc2c-cjs-module-asserted-object": {
        packageJson: { name: "tsc2c-cjs-module-asserted-object", version: "1.0.0", main: "index.ts" },
        files: {
            "index.ts": 'module.exports = ({\n  default: "asserted-default",\n  label: "asserted-object",\n  count: 131,\n  double(value: number): number { return value * 2; }\n} as const);\nexport {};\n',
        },
    },
    "tsc2c-cjs-module-asserted-factory-object": {
        packageJson: { name: "tsc2c-cjs-module-asserted-factory-object", version: "1.0.0", main: "index.ts" },
        files: {
            "index.ts": 'function makeApi() {\n  return ({\n    default: "asserted-factory-default",\n    label: "asserted-factory",\n    count: 132,\n    triple(value: number): number { return value * 3; }\n  } satisfies Record<string, any>);\n}\nmodule.exports = makeApi();\nexport {};\n',
        },
    },
    "tsc2c-cjs-module-object-assign-asserted-call": {
        packageJson: { name: "tsc2c-cjs-module-object-assign-asserted-call", version: "1.0.0", main: "index.ts" },
        files: {
            "index.ts": 'module.exports = (Object.assign({}, { default: "assign-call-default", label: "assign-call", count: 133 }, { extra: "assign-extra" }) as any);\nexport {};\n',
        },
    },
    "tsc2c-cjs-module-from-entries-asserted-call": {
        packageJson: { name: "tsc2c-cjs-module-from-entries-asserted-call", version: "1.0.0", main: "index.ts" },
        files: {
            "index.ts": 'module.exports = (<any>Object.fromEntries(([["default", "from-entries-call-default"], ["label", "from-entries-call"], ["count", 134]] as any)));\nexport {};\n',
        },
    },
    "tsc2c-cjs-module-define-property-asserted-call": {
        packageJson: { name: "tsc2c-cjs-module-define-property-asserted-call", version: "1.0.0", main: "index.ts" },
        files: {
            "index.ts": 'module.exports = (Object.defineProperty({ default: "define-property-call-default", label: "define-property-call", count: 135 }, "extra", { value: "define-property-extra", enumerable: true })!);\nexport {};\n',
        },
    },
    "tsc2c-cjs-module-define-properties-asserted-call": {
        packageJson: { name: "tsc2c-cjs-module-define-properties-asserted-call", version: "1.0.0", main: "index.ts" },
        files: {
            "index.ts": 'module.exports = (Object.defineProperties({}, {\n  default: { value: "define-properties-call-default", enumerable: true },\n  label: { value: "define-properties-call", enumerable: true },\n  count: { value: 136, enumerable: true }\n}) satisfies Record<string, any>);\nexport {};\n',
        },
    },
    "tsc2c-cjs-module-object-create-asserted-call": {
        packageJson: { name: "tsc2c-cjs-module-object-create-asserted-call", version: "1.0.0", main: "index.ts" },
        files: {
            "index.ts": 'module.exports = (Object.create(null, {\n  default: { value: "object-create-call-default", enumerable: true },\n  label: { value: "object-create-call", enumerable: true },\n  count: { value: 137, enumerable: true }\n}) as any);\nexport {};\n',
        },
    },
    "tsc2c-cjs-module-object-identifier": cjsPackage("tsc2c-cjs-module-object-identifier", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "identifier-default",\n  greet: function greet(name) { return "identifier " + name; },\n  label: local.label,\n  count: 72,\n  double: local.double,\n  enabled: true\n};\nmodule.exports = api;\n',
        "local.js": 'exports.label = "object-identifier";\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-module-object-chain": cjsPackage("tsc2c-cjs-module-object-chain", {
        "index.js": 'const local = require("./local.js");\nexports = module.exports = {\n  label: local.label,\n  count: 81,\n  triple: local.triple,\n  greet(name) { return "chain " + name; },\n  enabled: true\n};\n',
        "local.js": 'exports.label = "object-chain";\nexports.triple = function triple(value) { return value * 3; };\n',
    }),
    "tsc2c-cjs-module-object-reverse-chain": cjsPackage("tsc2c-cjs-module-object-reverse-chain", {
        "index.js": 'const local = require("./local.js");\nmodule.exports = exports = {\n  label: local.label,\n  count: 82,\n  quadruple: local.quadruple,\n  greet(name) { return "reverse " + name; },\n  enabled: false\n};\n',
        "local.js": 'exports.label = "object-reverse-chain";\nexports.quadruple = function quadruple(value) { return value * 4; };\n',
    }),
    "tsc2c-cjs-module-object-require-binding": cjsPackage("tsc2c-cjs-module-object-require-binding", {
        "index.js": 'const defaultValue = require("./default.js");\nconst local = require("./local.js");\nmodule.exports = {\n  greet: defaultValue,\n  label: local.label,\n  count: local.count,\n  double: local.double\n};\n',
        "default.js": 'module.exports = function greet(name) { return "hello " + name; };\n',
        "local.js": 'exports.label = "object-require-binding";\nexports.count = 59;\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-module-object-require-member": cjsPackage("tsc2c-cjs-module-object-require-member", {
        "index.js": 'module.exports = {\n  greet: require("./default.js"),\n  label: require("./local.js").label,\n  count: require("./local.js").count,\n  double: require("./local.js").double\n};\n',
        "default.js": 'module.exports = function greet(name) { return "hello " + name; };\n',
        "local.js": 'exports.label = "object-require-member";\nexports.count = 60;\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-module-object-computed": cjsPackage("tsc2c-cjs-module-object-computed", {
        "index.js": 'const greetKey = "gr" + "eet";\nconst labelKey = `label`;\nconst countKey = "co" + "unt";\nconst doubleKey = "dou" + "ble";\nmodule.exports = {\n  [greetKey]: function greet(name) { return "hello " + name; },\n  [labelKey]: "module-object-computed",\n  [countKey]: 67,\n  [doubleKey]: function double(value) { return value * 2; }\n};\n',
    }),
    "tsc2c-cjs-module-object-spread-named": cjsPackage("tsc2c-cjs-module-object-spread-named", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  label: local.label,\n  count: 96,\n  enabled: true\n};\nfunction double(value) { return value * 2; }\nmodule.exports = { ...api, double, extra: "object-spread-extra" };\n',
        "local.js": 'exports.label = "object-spread-named";\n',
    }),
    "tsc2c-cjs-module-object-getter-named": cjsPackage("tsc2c-cjs-module-object-getter-named", {
        "index.js": 'const local = require("./local.js");\nmodule.exports = {\n  get label() { return local.label; },\n  get count() { return 97; },\n  get double() { return local.double; },\n  extra: "object-getter-extra"\n};\n',
        "local.js": 'exports.label = "object-getter-named";\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-object-assign-default-package": cjsPackage("tsc2c-cjs-object-assign-default-package", {
        "index.js": 'module.exports = Object.assign({}, { label: "assign-default" }, { count: 42, extra: true });\n',
    }),
    "tsc2c-cjs-module-object-assign-named": cjsPackage("tsc2c-cjs-module-object-assign-named", {
        "index.js": 'const api = {\n  extra: true,\n  double: function double(value) { return value * 2; }\n};\nmodule.exports = Object.assign(\n  { default: function greet(name) { return "hello " + name; }, label: "module-assign-named" },\n  require("./local.js"),\n  api\n);\n',
        "local.js": 'exports.count = 69;\nexports.triple = function triple(value) { return value * 3; };\n',
    }),
    "tsc2c-cjs-module-object-assign-create-target-named": cjsPackage("tsc2c-cjs-module-object-assign-create-target-named", {
        "index.js": 'const base = { inherited: "assign-create-base" };\nconst local = require("./local.js");\nmodule.exports = Object.assign(Object.create(base), {\n  default: "assign-create-default",\n  label: "assign-create-target",\n  count: local.count,\n  extra: true\n});\n',
        "local.js": 'exports.count = 76;\n',
    }),
    "tsc2c-cjs-module-object-assign-create-descriptors-target-named": cjsPackage("tsc2c-cjs-module-object-assign-create-descriptors-target-named", {
        "index.js": 'const base = { inherited: "assign-create-descriptor-base" };\nconst local = require("./local.js");\nconst defaultDescriptor = { value: "assign-create-descriptor-default", enumerable: true };\nmodule.exports = Object.assign(\n  Object.create(base, {\n    default: defaultDescriptor,\n    label: { get() { return "assign-create-descriptor-target"; }, enumerable: true },\n    count: { value: local.count, enumerable: true }\n  }),\n  { extra: true }\n);\n',
        "local.js": 'exports.count = 77;\n',
    }),
    "tsc2c-cjs-module-object-assign-create-descriptors-identifier-target-named": cjsPackage("tsc2c-cjs-module-object-assign-create-descriptors-identifier-target-named", {
        "index.js": 'const base = { inherited: "assign-create-descriptor-identifier-base" };\nconst local = require("./local.js");\nconst defaultDescriptor = { value: "assign-create-descriptor-identifier-default", enumerable: true };\nconst descriptors = {\n  default: defaultDescriptor,\n  label: { get() { return "assign-create-descriptor-identifier-target"; }, enumerable: true },\n  count: { value: local.count, enumerable: true }\n};\nmodule.exports = Object.assign(Object.create(base, descriptors), { extra: true });\n',
        "local.js": 'exports.count = 78;\n',
    }),
    "tsc2c-cjs-module-object-assign-create-from-entries-target-named": cjsPackage("tsc2c-cjs-module-object-assign-create-from-entries-target-named", {
        "index.js": 'const base = { inherited: "assign-create-from-entries-base" };\nconst local = require("./local.js");\nconst labelKey = "la" + "bel";\nconst descriptors = {\n  default: { value: "assign-create-from-entries-default", enumerable: true },\n  [labelKey]: { get() { return "assign-create-from-entries-target"; }, enumerable: true },\n  count: { value: local.count, enumerable: true }\n};\nconst entries = Object.entries(descriptors);\nmodule.exports = Object.assign(Object.create(base, Object.fromEntries(entries)), { extra: true });\n',
        "local.js": 'exports.count = 128;\n',
    }),
    "tsc2c-cjs-module-object-assign-create-from-entries-map-target-named": cjsPackage("tsc2c-cjs-module-object-assign-create-from-entries-map-target-named", {
        "index.js": 'const base = { inherited: "assign-create-from-entries-map-base" };\nconst local = require("./local.js");\nconst descriptors = {\n  default: { value: "assign-create-from-entries-map-default", enumerable: true },\n  label: { get() { return "assign-create-from-entries-map-target"; }, enumerable: true },\n  count: { value: local.count, enumerable: true }\n};\nmodule.exports = Object.assign(Object.create(base, Object.fromEntries(new Map(Object.entries(descriptors)))), { extra: true });\n',
        "local.js": 'exports.count = 143;\n',
    }),
    "tsc2c-cjs-module-define-properties-named": cjsPackage("tsc2c-cjs-module-define-properties-named", {
        "index.js": 'const local = require("./local.js");\nconst defaultDescriptor = { value: function greet(name) { return "hello " + name; }, enumerable: true };\nconst labelDescriptor = { get: function() { return "module-define-properties-named"; }, enumerable: true };\nconst descriptors = {\n  default: defaultDescriptor,\n  label: labelDescriptor,\n  count: { value: local.count, enumerable: true },\n  triple: { value: local.triple, enumerable: true },\n  double: { get() { return local.double; }, enumerable: true },\n  extra: { value: true, enumerable: true }\n};\nmodule.exports = Object.defineProperties({}, descriptors);\n',
        "local.js": 'exports.count = 70;\nexports.triple = function triple(value) { return value * 3; };\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-module-define-properties-target-named": cjsPackage("tsc2c-cjs-module-define-properties-target-named", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "define-properties-target-default",\n  label: "define-properties-target",\n  count: local.count,\n  double: local.double\n};\nconst descriptors = {\n  bonus: { value: local.bonus, enumerable: true },\n  extra: { get() { return "define-properties-target-extra"; }, enumerable: true }\n};\nmodule.exports = Object.defineProperties(api, descriptors);\n',
        "local.js": 'exports.count = 100;\nexports.bonus = "define-properties-target-bonus";\nexports.double = function double(value) { return value * 4; };\n',
    }),
    "tsc2c-cjs-module-define-properties-target-from-entries": cjsPackage("tsc2c-cjs-module-define-properties-target-from-entries", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "define-properties-target-from-entries-default",\n  label: "define-properties-target-from-entries",\n  count: local.count,\n  double: local.double\n};\nconst extraKey = "ex" + "tra";\nconst descriptors = {\n  bonus: { value: local.bonus, enumerable: true },\n  [extraKey]: { get() { return "define-properties-target-from-entries-extra"; }, enumerable: true }\n};\nconst entries = Object.entries(descriptors);\nmodule.exports = Object.defineProperties(api, Object.fromEntries(entries));\n',
        "local.js": 'exports.count = 133;\nexports.bonus = "define-properties-target-from-entries-bonus";\nexports.double = function double(value) { return value * 8; };\n',
    }),
    "tsc2c-cjs-module-define-properties-target-from-entries-map": cjsPackage("tsc2c-cjs-module-define-properties-target-from-entries-map", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "define-properties-target-from-entries-map-default",\n  label: "define-properties-target-from-entries-map",\n  count: local.count,\n  double: local.double\n};\nconst descriptors = {\n  bonus: { value: local.bonus, enumerable: true },\n  extra: { get() { return "define-properties-target-from-entries-map-extra"; }, enumerable: true }\n};\nmodule.exports = Object.defineProperties(api, Object.fromEntries(new Map(Object.entries(descriptors))));\n',
        "local.js": 'exports.count = 166;\nexports.bonus = "define-properties-target-from-entries-map-bonus";\nexports.double = function double(value) { return value * 24; };\n',
    }),
    "tsc2c-cjs-module-define-properties-wrapper-target-named": cjsPackage("tsc2c-cjs-module-define-properties-wrapper-target-named", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "define-properties-wrapper-default",\n  label: "define-properties-wrapper-target",\n  count: local.count,\n  double: local.double\n};\nconst descriptors = {\n  bonus: { value: local.bonus, enumerable: true },\n  extra: { get() { return "define-properties-wrapper-extra"; }, enumerable: true }\n};\nmodule.exports = Object.defineProperties(Object.freeze(api), descriptors);\n',
        "local.js": 'exports.count = 101;\nexports.bonus = "define-properties-wrapper-bonus";\nexports.double = function double(value) { return value * 5; };\n',
    }),
    "tsc2c-cjs-module-define-properties-wrapper-target-from-entries": cjsPackage("tsc2c-cjs-module-define-properties-wrapper-target-from-entries", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "define-properties-wrapper-target-from-entries-default",\n  label: "define-properties-wrapper-target-from-entries",\n  count: local.count,\n  double: local.double\n};\nconst bonusKey = `bonus`;\nconst descriptors = {\n  [bonusKey]: { value: local.bonus, enumerable: true },\n  extra: { get() { return "define-properties-wrapper-target-from-entries-extra"; }, enumerable: true }\n};\nconst entries = Object.entries(descriptors);\nmodule.exports = Object.defineProperties(Object.freeze(api), Object.fromEntries(entries));\n',
        "local.js": 'exports.count = 134;\nexports.bonus = "define-properties-wrapper-target-from-entries-bonus";\nexports.double = function double(value) { return value * 9; };\n',
    }),
    "tsc2c-cjs-module-define-properties-wrapper-target-from-entries-map": cjsPackage("tsc2c-cjs-module-define-properties-wrapper-target-from-entries-map", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "define-properties-wrapper-target-from-entries-map-default",\n  label: "define-properties-wrapper-target-from-entries-map",\n  count: local.count,\n  double: local.double\n};\nconst descriptors = {\n  bonus: { value: local.bonus, enumerable: true },\n  extra: { get() { return "define-properties-wrapper-target-from-entries-map-extra"; }, enumerable: true }\n};\nmodule.exports = Object.defineProperties(Object.freeze(api), Object.fromEntries(new Map(Object.entries(descriptors))));\n',
        "local.js": 'exports.count = 167;\nexports.bonus = "define-properties-wrapper-target-from-entries-map-bonus";\nexports.double = function double(value) { return value * 25; };\n',
    }),
    "tsc2c-cjs-module-define-properties-own-descriptors": cjsPackage("tsc2c-cjs-module-define-properties-own-descriptors", {
        "index.js": 'const api = {\n  default: "module-own-descriptors-default",\n  label: "module-own-descriptors",\n  count: 132,\n  enabled: true\n};\nmodule.exports = Object.defineProperties({}, Object.getOwnPropertyDescriptors(api));\n',
    }),
    "tsc2c-cjs-module-define-properties-own-descriptors-accessors": cjsPackage("tsc2c-cjs-module-define-properties-own-descriptors-accessors", {
        "index.js": 'const api = {\n  default: "module-own-accessors-default",\n  get label() { return "module-own-accessors"; },\n  count: 134,\n  flip(value) { return !value; }\n};\nmodule.exports = Object.defineProperties({}, Object.getOwnPropertyDescriptors(api));\n',
    }),
    "tsc2c-cjs-object-wrapper-define-properties-named": cjsPackage("tsc2c-cjs-object-wrapper-define-properties-named", {
        "index.js": 'const local = require("./local.js");\nconst descriptors = {\n  default: { value: function greet(name) { return "defined " + name; }, enumerable: true },\n  label: { get() { return "wrapper-define-properties"; }, enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true },\n  extra: { value: true, enumerable: true }\n};\nmodule.exports = Object.freeze(Object.defineProperties({}, descriptors));\n',
        "local.js": 'exports.count = 103;\nexports.double = function double(value) { return value * 7; };\n',
    }),
    "tsc2c-cjs-object-wrapper-define-properties-from-entries": cjsPackage("tsc2c-cjs-object-wrapper-define-properties-from-entries", {
        "index.js": 'const local = require("./local.js");\nconst defaultKey = "def" + "ault";\nconst descriptors = {\n  [defaultKey]: { value: function greet(name) { return "wrapped-from-entries " + name; }, enumerable: true },\n  label: { value: "wrapper-define-properties-from-entries", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true },\n  extra: { value: true, enumerable: true }\n};\nconst entries = Object.entries(descriptors);\nmodule.exports = Object.freeze(Object.defineProperties({}, Object.fromEntries(entries)));\n',
        "local.js": 'exports.count = 104;\nexports.double = function double(value) { return value * 9; };\n',
    }),
    "tsc2c-cjs-object-wrapper-define-properties-from-entries-map": cjsPackage("tsc2c-cjs-object-wrapper-define-properties-from-entries-map", {
        "index.js": 'const local = require("./local.js");\nconst descriptors = {\n  default: { value: function greet(name) { return "wrapped-from-entries-map " + name; }, enumerable: true },\n  label: { value: "wrapper-define-properties-from-entries-map", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true },\n  extra: { value: true, enumerable: true }\n};\nmodule.exports = Object.freeze(Object.defineProperties({}, Object.fromEntries(new Map(Object.entries(descriptors)))));\n',
        "local.js": 'exports.count = 168;\nexports.double = function double(value) { return value * 26; };\n',
    }),
    "tsc2c-cjs-object-wrapper-seal-define-properties-from-entries": cjsPackage("tsc2c-cjs-object-wrapper-seal-define-properties-from-entries", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "sealed-from-entries " + name; }, enumerable: true },\n  label: { value: "seal-define-properties-from-entries", enumerable: true },\n  count: { value: 114, enumerable: true }\n};\nmodule.exports = Object.seal(Object.defineProperties({}, Object.fromEntries(Object.entries(descriptors))));\n',
    }),
    "tsc2c-cjs-object-wrapper-seal-define-properties-from-entries-map": cjsPackage("tsc2c-cjs-object-wrapper-seal-define-properties-from-entries-map", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "sealed-from-entries-map " + name; }, enumerable: true },\n  label: { value: "seal-define-properties-from-entries-map", enumerable: true },\n  count: { value: 169, enumerable: true }\n};\nmodule.exports = Object.seal(Object.defineProperties({}, Object.fromEntries(new Map(Object.entries(descriptors)))));\n',
    }),
    "tsc2c-cjs-object-wrapper-prevent-define-properties-from-entries": cjsPackage("tsc2c-cjs-object-wrapper-prevent-define-properties-from-entries", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "prevented-from-entries " + name; }, enumerable: true },\n  label: { value: "prevent-define-properties-from-entries", enumerable: true },\n  count: { value: 115, enumerable: true }\n};\nmodule.exports = Object.preventExtensions(Object.defineProperties({}, Object.fromEntries(Object.entries(descriptors))));\n',
    }),
    "tsc2c-cjs-object-wrapper-prevent-define-properties-from-entries-map": cjsPackage("tsc2c-cjs-object-wrapper-prevent-define-properties-from-entries-map", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "prevented-from-entries-map " + name; }, enumerable: true },\n  label: { value: "prevent-define-properties-from-entries-map", enumerable: true },\n  count: { value: 170, enumerable: true }\n};\nmodule.exports = Object.preventExtensions(Object.defineProperties({}, Object.fromEntries(new Map(Object.entries(descriptors)))));\n',
    }),
    "tsc2c-cjs-object-wrapper-set-prototype-define-properties-from-entries": cjsPackage("tsc2c-cjs-object-wrapper-set-prototype-define-properties-from-entries", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "reproto-from-entries " + name; }, enumerable: true },\n  label: { value: "set-prototype-define-properties-from-entries", enumerable: true },\n  count: { value: 116, enumerable: true }\n};\nmodule.exports = Object.setPrototypeOf(Object.defineProperties({}, Object.fromEntries(Object.entries(descriptors))), { inherited: true });\n',
    }),
    "tsc2c-cjs-object-wrapper-set-prototype-define-properties-from-entries-map": cjsPackage("tsc2c-cjs-object-wrapper-set-prototype-define-properties-from-entries-map", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "reproto-from-entries-map " + name; }, enumerable: true },\n  label: { value: "set-prototype-define-properties-from-entries-map", enumerable: true },\n  count: { value: 171, enumerable: true }\n};\nmodule.exports = Object.setPrototypeOf(Object.defineProperties({}, Object.fromEntries(new Map(Object.entries(descriptors)))), { inherited: true });\n',
    }),
    "tsc2c-cjs-object-wrapper-seal-define-properties-named": cjsPackage("tsc2c-cjs-object-wrapper-seal-define-properties-named", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "sealed-defined " + name; }, enumerable: true },\n  label: { value: "seal-define-properties", enumerable: true },\n  count: { value: 107, enumerable: true }\n};\nmodule.exports = Object.seal(Object.defineProperties({}, descriptors));\n',
    }),
    "tsc2c-cjs-object-wrapper-prevent-define-properties-named": cjsPackage("tsc2c-cjs-object-wrapper-prevent-define-properties-named", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "prevented-defined " + name; }, enumerable: true },\n  label: { value: "prevent-define-properties", enumerable: true },\n  count: { value: 108, enumerable: true }\n};\nmodule.exports = Object.preventExtensions(Object.defineProperties({}, descriptors));\n',
    }),
    "tsc2c-cjs-object-wrapper-set-prototype-define-properties-named": cjsPackage("tsc2c-cjs-object-wrapper-set-prototype-define-properties-named", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "reproto-defined " + name; }, enumerable: true },\n  label: { value: "set-prototype-define-properties", enumerable: true },\n  count: { value: 109, enumerable: true }\n};\nmodule.exports = Object.setPrototypeOf(Object.defineProperties({}, descriptors), { inherited: true });\n',
    }),
    "tsc2c-cjs-object-wrapper-define-property-named": cjsPackage("tsc2c-cjs-object-wrapper-define-property-named", {
        "index.js": 'const local = require("./local.js");\nconst defaultDescriptor = { value: function greet(name) { return "defined-property " + name; }, enumerable: true };\nmodule.exports = Object.freeze(Object.defineProperty({\n  label: "wrapper-define-property",\n  count: local.count,\n  double: local.double\n}, "default", defaultDescriptor));\n',
        "local.js": 'exports.count = 110;\nexports.double = function double(value) { return value * 8; };\n',
    }),
    "tsc2c-cjs-object-wrapper-seal-define-property-named": cjsPackage("tsc2c-cjs-object-wrapper-seal-define-property-named", {
        "index.js": 'const defaultDescriptor = { value: function greet(name) { return "sealed-property " + name; }, enumerable: true };\nmodule.exports = Object.seal(Object.defineProperty({\n  label: "seal-define-property",\n  count: 111\n}, "default", defaultDescriptor));\n',
    }),
    "tsc2c-cjs-object-wrapper-prevent-define-property-named": cjsPackage("tsc2c-cjs-object-wrapper-prevent-define-property-named", {
        "index.js": 'const defaultDescriptor = { value: function greet(name) { return "prevented-property " + name; }, enumerable: true };\nmodule.exports = Object.preventExtensions(Object.defineProperty({\n  label: "prevent-define-property",\n  count: 112\n}, "default", defaultDescriptor));\n',
    }),
    "tsc2c-cjs-object-wrapper-set-prototype-define-property-named": cjsPackage("tsc2c-cjs-object-wrapper-set-prototype-define-property-named", {
        "index.js": 'const defaultDescriptor = { value: function greet(name) { return "reproto-property " + name; }, enumerable: true };\nmodule.exports = Object.setPrototypeOf(Object.defineProperty({\n  label: "set-prototype-define-property",\n  count: 113\n}, "default", defaultDescriptor), { inherited: true });\n',
    }),
    "tsc2c-cjs-object-wrapper-assign-named": cjsPackage("tsc2c-cjs-object-wrapper-assign-named", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  label: "wrapper-assign",\n  count: local.count\n};\nmodule.exports = Object.freeze(Object.assign({}, {\n  default: function greet(name) { return "assign " + name; },\n  double: local.double\n}, api));\n',
        "local.js": 'exports.count = 114;\nexports.double = function double(value) { return value * 9; };\n',
    }),
    "tsc2c-cjs-object-wrapper-seal-assign-named": cjsPackage("tsc2c-cjs-object-wrapper-seal-assign-named", {
        "index.js": 'const local = require("./local.js");\nconst api = { label: "seal-assign", count: local.count };\nmodule.exports = Object.seal(Object.assign({}, {\n  default: function greet(name) { return "sealed-assign " + name; },\n  double: local.double\n}, api));\n',
        "local.js": 'exports.count = 115;\nexports.double = function double(value) { return value * 10; };\n',
    }),
    "tsc2c-cjs-object-wrapper-prevent-assign-named": cjsPackage("tsc2c-cjs-object-wrapper-prevent-assign-named", {
        "index.js": 'const local = require("./local.js");\nconst api = { label: "prevent-assign", count: local.count };\nmodule.exports = Object.preventExtensions(Object.assign({}, {\n  default: function greet(name) { return "prevented-assign " + name; },\n  double: local.double\n}, api));\n',
        "local.js": 'exports.count = 116;\nexports.double = function double(value) { return value * 11; };\n',
    }),
    "tsc2c-cjs-object-wrapper-set-prototype-assign-named": cjsPackage("tsc2c-cjs-object-wrapper-set-prototype-assign-named", {
        "index.js": 'const local = require("./local.js");\nconst api = { label: "set-prototype-assign", count: local.count };\nmodule.exports = Object.setPrototypeOf(Object.assign({}, {\n  default: function greet(name) { return "reproto-assign " + name; },\n  double: local.double\n}, api), { inherited: true });\n',
        "local.js": 'exports.count = 117;\nexports.double = function double(value) { return value * 12; };\n',
    }),
    "tsc2c-cjs-module-object-assign-define-properties-target-named": cjsPackage("tsc2c-cjs-module-object-assign-define-properties-target-named", {
        "index.js": 'const local = require("./local.js");\nconst defaultDescriptor = { value: "assign-define-properties-default", enumerable: true };\nconst descriptors = {\n  default: defaultDescriptor,\n  label: { get() { return "assign-define-properties-target"; }, enumerable: true },\n  count: { value: local.count, enumerable: true }\n};\nmodule.exports = Object.assign(Object.defineProperties({}, descriptors), { extra: true });\n',
        "local.js": 'exports.count = 79;\n',
    }),
    "tsc2c-cjs-module-object-assign-define-properties-create-target-named": cjsPackage("tsc2c-cjs-module-object-assign-define-properties-create-target-named", {
        "index.js": 'const base = { inherited: "assign-define-properties-create-base" };\nconst local = require("./local.js");\nconst descriptors = {\n  default: { value: "assign-define-properties-create-default", enumerable: true },\n  label: { get() { return "assign-define-properties-create-target"; }, enumerable: true },\n  count: { value: local.count, enumerable: true }\n};\nmodule.exports = Object.assign(Object.defineProperties(Object.create(base), descriptors), { extra: true });\n',
        "local.js": 'exports.count = 83;\n',
    }),
    "tsc2c-cjs-module-object-assign-define-properties-create-from-entries-target-named": cjsPackage("tsc2c-cjs-module-object-assign-define-properties-create-from-entries-target-named", {
        "index.js": 'const base = { inherited: "assign-define-properties-create-from-entries-base" };\nconst local = require("./local.js");\nconst labelKey = "la" + "bel";\nconst descriptors = {\n  default: { value: "assign-define-properties-create-from-entries-default", enumerable: true },\n  [labelKey]: { get() { return "assign-define-properties-create-from-entries-target"; }, enumerable: true },\n  count: { value: local.count, enumerable: true }\n};\nconst entries = Object.entries(descriptors);\nmodule.exports = Object.assign(Object.defineProperties(Object.create(base), Object.fromEntries(entries)), { extra: true });\n',
        "local.js": 'exports.count = 131;\n',
    }),
    "tsc2c-cjs-module-object-assign-define-properties-create-from-entries-map-target-named": cjsPackage("tsc2c-cjs-module-object-assign-define-properties-create-from-entries-map-target-named", {
        "index.js": 'const base = { inherited: "assign-define-properties-create-from-entries-map-base" };\nconst local = require("./local.js");\nconst descriptors = {\n  default: { value: "assign-define-properties-create-from-entries-map-default", enumerable: true },\n  label: { get() { return "assign-define-properties-create-from-entries-map-target"; }, enumerable: true },\n  count: { value: local.count, enumerable: true }\n};\nmodule.exports = Object.assign(Object.defineProperties(Object.create(base), Object.fromEntries(new Map(Object.entries(descriptors)))), { extra: true });\n',
        "local.js": 'exports.count = 144;\n',
    }),
    "tsc2c-cjs-module-object-assign-freeze-target-named": cjsPackage("tsc2c-cjs-module-object-assign-freeze-target-named", {
        "index.js": 'const local = require("./local.js");\nmodule.exports = Object.assign(Object.freeze({\n  default: "assign-freeze-default",\n  label: "assign-freeze-target",\n  count: local.count\n}), { extra: true });\n',
        "local.js": 'exports.count = 84;\n',
    }),
    "tsc2c-cjs-module-object-assign-set-prototype-target-named": cjsPackage("tsc2c-cjs-module-object-assign-set-prototype-target-named", {
        "index.js": 'const local = require("./local.js");\nconst proto = { inherited: "assign-set-prototype-base" };\nmodule.exports = Object.assign(Object.setPrototypeOf({\n  default: "assign-set-prototype-default",\n  label: "assign-set-prototype-target",\n  count: local.count\n}, proto), { extra: true });\n',
        "local.js": 'exports.count = 85;\n',
    }),
    "tsc2c-cjs-module-object-assign-seal-target-named": cjsPackage("tsc2c-cjs-module-object-assign-seal-target-named", {
        "index.js": 'const local = require("./local.js");\nmodule.exports = Object.assign(Object.seal({\n  default: "assign-seal-default",\n  label: "assign-seal-target",\n  count: local.count\n}), { extra: true });\n',
        "local.js": 'exports.count = 86;\n',
    }),
    "tsc2c-cjs-module-object-assign-prevent-extensions-target-named": cjsPackage("tsc2c-cjs-module-object-assign-prevent-extensions-target-named", {
        "index.js": 'const local = require("./local.js");\nmodule.exports = Object.assign(Object.preventExtensions({\n  default: "assign-prevent-default",\n  label: "assign-prevent-target",\n  count: local.count\n}), { extra: true });\n',
        "local.js": 'exports.count = 87;\n',
    }),
    "tsc2c-cjs-module-object-assign-freeze-create-target-named": cjsPackage("tsc2c-cjs-module-object-assign-freeze-create-target-named", {
        "index.js": 'const local = require("./local.js");\nconst proto = { inherited: "assign-freeze-create-base" };\nmodule.exports = Object.assign(Object.freeze(Object.create(proto)), {\n  default: "assign-freeze-create-default",\n  label: "assign-freeze-create-target",\n  count: local.count,\n  extra: true\n});\n',
        "local.js": 'exports.count = 88;\n',
    }),
    "tsc2c-cjs-module-object-assign-freeze-identifier-target-named": cjsPackage("tsc2c-cjs-module-object-assign-freeze-identifier-target-named", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "assign-freeze-identifier-default",\n  label: "assign-freeze-identifier-target",\n  count: local.count\n};\nmodule.exports = Object.assign(Object.freeze(api), { extra: true });\n',
        "local.js": 'exports.count = 89;\n',
    }),
    "tsc2c-cjs-module-object-assign-define-property-target-named": cjsPackage("tsc2c-cjs-module-object-assign-define-property-target-named", {
        "index.js": 'const local = require("./local.js");\nmodule.exports = Object.assign(\n  Object.defineProperty({}, "default", { value: "assign-define-property-default", enumerable: true }),\n  { label: "assign-define-property-target", count: local.count, extra: true }\n);\n',
        "local.js": 'exports.count = 80;\n',
    }),
    "tsc2c-cjs-module-object-assign-define-property-identifier-target-named": cjsPackage("tsc2c-cjs-module-object-assign-define-property-identifier-target-named", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "assign-define-property-identifier-default",\n  label: "assign-define-property-identifier-target",\n  count: local.count\n};\nmodule.exports = Object.assign(\n  Object.defineProperty(api, "bonus", { value: local.bonus, enumerable: true }),\n  { extra: true }\n);\n',
        "local.js": 'exports.count = 90;\nexports.bonus = "assign-define-property-identifier-bonus";\n',
    }),
    "tsc2c-cjs-module-object-assign-define-property-create-descriptors-target-named": cjsPackage("tsc2c-cjs-module-object-assign-define-property-create-descriptors-target-named", {
        "index.js": 'const base = { inherited: "assign-define-property-create-base" };\nconst local = require("./local.js");\nconst descriptors = {\n  default: { value: "assign-define-property-create-default", enumerable: true },\n  label: { get() { return "assign-define-property-create-target"; }, enumerable: true },\n  count: { value: local.count, enumerable: true }\n};\nmodule.exports = Object.assign(\n  Object.defineProperty(Object.create(base, descriptors), "bonus", { value: local.bonus, enumerable: true }),\n  { extra: true }\n);\n',
        "local.js": 'exports.count = 81;\nexports.bonus = "assign-define-property-create-bonus";\n',
    }),
    "tsc2c-cjs-module-object-assign-define-property-create-from-entries-target-named": cjsPackage("tsc2c-cjs-module-object-assign-define-property-create-from-entries-target-named", {
        "index.js": 'const base = { inherited: "assign-define-property-create-from-entries-base" };\nconst local = require("./local.js");\nconst defaultKey = "def" + "ault";\nconst descriptors = {\n  [defaultKey]: { value: "assign-define-property-create-from-entries-default", enumerable: true },\n  label: { get() { return "assign-define-property-create-from-entries-target"; }, enumerable: true },\n  count: { value: local.count, enumerable: true }\n};\nmodule.exports = Object.assign(\n  Object.defineProperty(Object.create(base, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: local.bonus, enumerable: true }),\n  { extra: true }\n);\n',
        "local.js": 'exports.count = 129;\nexports.bonus = "assign-define-property-create-from-entries-bonus";\n',
    }),
    "tsc2c-cjs-module-object-assign-define-property-create-from-entries-map-target-named": cjsPackage("tsc2c-cjs-module-object-assign-define-property-create-from-entries-map-target-named", {
        "index.js": 'const base = { inherited: "assign-define-property-create-from-entries-map-base" };\nconst local = require("./local.js");\nconst descriptors = {\n  default: { value: "assign-define-property-create-from-entries-map-default", enumerable: true },\n  label: { get() { return "assign-define-property-create-from-entries-map-target"; }, enumerable: true },\n  count: { value: local.count, enumerable: true }\n};\nmodule.exports = Object.assign(\n  Object.defineProperty(Object.create(base, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: local.bonus, enumerable: true }),\n  { extra: true }\n);\n',
        "local.js": 'exports.count = 145;\nexports.bonus = "assign-define-property-create-from-entries-map-bonus";\n',
    }),
    "tsc2c-cjs-module-object-assign-define-property-define-properties-target-named": cjsPackage("tsc2c-cjs-module-object-assign-define-property-define-properties-target-named", {
        "index.js": 'const local = require("./local.js");\nconst descriptors = {\n  default: { value: "assign-define-property-properties-default", enumerable: true },\n  label: { get() { return "assign-define-property-properties-target"; }, enumerable: true },\n  count: { value: local.count, enumerable: true }\n};\nmodule.exports = Object.assign(\n  Object.defineProperty(Object.defineProperties({}, descriptors), "bonus", { value: local.bonus, enumerable: true }),\n  { extra: true }\n);\n',
        "local.js": 'exports.count = 82;\nexports.bonus = "assign-define-property-properties-bonus";\n',
    }),
    "tsc2c-cjs-module-object-assign-define-property-define-properties-from-entries-target-named": cjsPackage("tsc2c-cjs-module-object-assign-define-property-define-properties-from-entries-target-named", {
        "index.js": 'const local = require("./local.js");\nconst countKey = `count`;\nconst descriptors = {\n  default: { value: "assign-define-property-properties-from-entries-default", enumerable: true },\n  label: { get() { return "assign-define-property-properties-from-entries-target"; }, enumerable: true },\n  [countKey]: { value: local.count, enumerable: true }\n};\nconst entries = Object.entries(descriptors);\nmodule.exports = Object.assign(\n  Object.defineProperty(Object.defineProperties({}, Object.fromEntries(entries)), "bonus", { value: local.bonus, enumerable: true }),\n  { extra: true }\n);\n',
        "local.js": 'exports.count = 130;\nexports.bonus = "assign-define-property-properties-from-entries-bonus";\n',
    }),
    "tsc2c-cjs-module-object-assign-define-property-define-properties-from-entries-map-target-named": cjsPackage("tsc2c-cjs-module-object-assign-define-property-define-properties-from-entries-map-target-named", {
        "index.js": 'const local = require("./local.js");\nconst descriptors = {\n  default: { value: "assign-define-property-properties-from-entries-map-default", enumerable: true },\n  label: { get() { return "assign-define-property-properties-from-entries-map-target"; }, enumerable: true },\n  count: { value: local.count, enumerable: true }\n};\nmodule.exports = Object.assign(\n  Object.defineProperty(Object.defineProperties({}, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: local.bonus, enumerable: true }),\n  { extra: true }\n);\n',
        "local.js": 'exports.count = 146;\nexports.bonus = "assign-define-property-properties-from-entries-map-bonus";\n',
    }),
    "tsc2c-cjs-module-define-property-default": cjsPackage("tsc2c-cjs-module-define-property-default", {
        "index.js": 'const defaultDescriptor = { value: function greet(name) { return "hello " + name; }, enumerable: true };\nmodule.exports = Object.defineProperty({}, "default", defaultDescriptor);\n',
    }),
    "tsc2c-cjs-module-define-property-named": cjsPackage("tsc2c-cjs-module-define-property-named", {
        "index.js": 'module.exports = Object.defineProperty({}, "label", { get: function() { return "module-define-property-named"; }, enumerable: true });\n',
    }),
    "tsc2c-cjs-module-define-property-target-named": cjsPackage("tsc2c-cjs-module-define-property-target-named", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "define-property-target-default",\n  label: "define-property-target",\n  count: local.count,\n  double: local.double\n};\nmodule.exports = Object.defineProperty(api, "bonus", { get() { return local.bonus; }, enumerable: true });\n',
        "local.js": 'exports.count = 98;\nexports.bonus = "define-property-target-bonus";\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-module-define-property-wrapper-target-named": cjsPackage("tsc2c-cjs-module-define-property-wrapper-target-named", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "define-property-wrapper-default",\n  label: "define-property-wrapper-target",\n  count: local.count,\n  double: local.double\n};\nmodule.exports = Object.defineProperty(Object.freeze(api), "bonus", { value: local.bonus, enumerable: true });\n',
        "local.js": 'exports.count = 99;\nexports.bonus = "define-property-wrapper-bonus";\nexports.double = function double(value) { return value * 3; };\n',
    }),
    "tsc2c-cjs-module-define-property-create-from-entries": cjsPackage("tsc2c-cjs-module-define-property-create-from-entries", {
        "index.js": 'const local = require("./local.js");\nconst base = { inherited: "define-property-create-from-entries-base" };\nconst defaultKey = "def" + "ault";\nconst descriptors = {\n  [defaultKey]: { value: "define-property-create-from-entries-default", enumerable: true },\n  label: { value: "define-property-create-from-entries", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.defineProperty(Object.create(base, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: local.bonus, enumerable: true });\n',
        "local.js": 'exports.count = 135;\nexports.bonus = "define-property-create-from-entries-bonus";\nexports.double = function double(value) { return value * 10; };\n',
    }),
    "tsc2c-cjs-module-define-property-create-from-entries-map": cjsPackage("tsc2c-cjs-module-define-property-create-from-entries-map", {
        "index.js": 'const local = require("./local.js");\nconst base = { inherited: "define-property-create-from-entries-map-base" };\nconst descriptors = {\n  default: { value: "define-property-create-from-entries-map-default", enumerable: true },\n  label: { value: "define-property-create-from-entries-map", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.defineProperty(Object.create(base, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: local.bonus, enumerable: true });\n',
        "local.js": 'exports.count = 147;\nexports.bonus = "define-property-create-from-entries-map-bonus";\nexports.double = function double(value) { return value * 13; };\n',
    }),
    "tsc2c-cjs-module-define-property-create-from-entries-primitives": cjsPackage("tsc2c-cjs-module-define-property-create-from-entries-primitives", {
        "index.js": 'const base = { inherited: "define-property-create-from-entries-primitives-base" };\nconst descriptors = {\n  default: { value: "define-property-create-from-entries-primitives-default", enumerable: true },\n  label: { value: "define-property-create-from-entries-primitives", enumerable: true },\n  count: { value: 142, enumerable: true }\n};\nmodule.exports = Object.defineProperty(Object.create(base, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: "define-property-create-from-entries-primitives-bonus", enumerable: true });\n',
    }),
    "tsc2c-cjs-module-define-property-create-from-entries-map-primitives": cjsPackage("tsc2c-cjs-module-define-property-create-from-entries-map-primitives", {
        "index.js": 'const base = { inherited: "define-property-create-from-entries-map-primitives-base" };\nconst descriptors = {\n  default: { value: "define-property-create-from-entries-map-primitives-default", enumerable: true },\n  label: { value: "define-property-create-from-entries-map-primitives", enumerable: true },\n  count: { value: 159, enumerable: true }\n};\nmodule.exports = Object.defineProperty(Object.create(base, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: "define-property-create-from-entries-map-primitives-bonus", enumerable: true });\n',
    }),
    "tsc2c-cjs-module-wrapper-define-property-create-from-entries-primitives": cjsPackage("tsc2c-cjs-module-wrapper-define-property-create-from-entries-primitives", {
        "index.js": 'const base = { inherited: "wrapper-define-property-create-from-entries-primitives-base" };\nconst descriptors = {\n  default: { value: "wrapper-define-property-create-from-entries-primitives-default", enumerable: true },\n  label: { value: "wrapper-define-property-create-from-entries-primitives", enumerable: true },\n  count: { value: 143, enumerable: true }\n};\nmodule.exports = Object.freeze(Object.defineProperty(Object.create(base, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: "wrapper-define-property-create-from-entries-primitives-bonus", enumerable: true }));\n',
    }),
    "tsc2c-cjs-module-wrapper-define-property-create-from-entries-map-primitives": cjsPackage("tsc2c-cjs-module-wrapper-define-property-create-from-entries-map-primitives", {
        "index.js": 'const base = { inherited: "wrapper-define-property-create-from-entries-map-primitives-base" };\nconst descriptors = {\n  default: { value: "wrapper-define-property-create-from-entries-map-primitives-default", enumerable: true },\n  label: { value: "wrapper-define-property-create-from-entries-map-primitives", enumerable: true },\n  count: { value: 160, enumerable: true }\n};\nmodule.exports = Object.freeze(Object.defineProperty(Object.create(base, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: "wrapper-define-property-create-from-entries-map-primitives-bonus", enumerable: true }));\n',
    }),
    "tsc2c-cjs-module-wrapper-seal-define-property-create-from-entries-primitives": cjsPackage("tsc2c-cjs-module-wrapper-seal-define-property-create-from-entries-primitives", {
        "index.js": 'const base = { inherited: "seal-wrapper-define-property-create-from-entries-primitives-base" };\nconst descriptors = {\n  default: { value: "seal-wrapper-define-property-create-from-entries-primitives-default", enumerable: true },\n  label: { value: "seal-wrapper-define-property-create-from-entries-primitives", enumerable: true },\n  count: { value: 144, enumerable: true }\n};\nmodule.exports = Object.seal(Object.defineProperty(Object.create(base, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: "seal-wrapper-define-property-create-from-entries-primitives-bonus", enumerable: true }));\n',
    }),
    "tsc2c-cjs-module-wrapper-seal-define-property-create-from-entries-map-primitives": cjsPackage("tsc2c-cjs-module-wrapper-seal-define-property-create-from-entries-map-primitives", {
        "index.js": 'const base = { inherited: "seal-wrapper-define-property-create-from-entries-map-primitives-base" };\nconst descriptors = {\n  default: { value: "seal-wrapper-define-property-create-from-entries-map-primitives-default", enumerable: true },\n  label: { value: "seal-wrapper-define-property-create-from-entries-map-primitives", enumerable: true },\n  count: { value: 161, enumerable: true }\n};\nmodule.exports = Object.seal(Object.defineProperty(Object.create(base, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: "seal-wrapper-define-property-create-from-entries-map-primitives-bonus", enumerable: true }));\n',
    }),
    "tsc2c-cjs-module-wrapper-prevent-define-property-create-from-entries-primitives": cjsPackage("tsc2c-cjs-module-wrapper-prevent-define-property-create-from-entries-primitives", {
        "index.js": 'const base = { inherited: "prevent-wrapper-define-property-create-from-entries-primitives-base" };\nconst descriptors = {\n  default: { value: "prevent-wrapper-define-property-create-from-entries-primitives-default", enumerable: true },\n  label: { value: "prevent-wrapper-define-property-create-from-entries-primitives", enumerable: true },\n  count: { value: 145, enumerable: true }\n};\nmodule.exports = Object.preventExtensions(Object.defineProperty(Object.create(base, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: "prevent-wrapper-define-property-create-from-entries-primitives-bonus", enumerable: true }));\n',
    }),
    "tsc2c-cjs-module-wrapper-prevent-define-property-create-from-entries-map-primitives": cjsPackage("tsc2c-cjs-module-wrapper-prevent-define-property-create-from-entries-map-primitives", {
        "index.js": 'const base = { inherited: "prevent-wrapper-define-property-create-from-entries-map-primitives-base" };\nconst descriptors = {\n  default: { value: "prevent-wrapper-define-property-create-from-entries-map-primitives-default", enumerable: true },\n  label: { value: "prevent-wrapper-define-property-create-from-entries-map-primitives", enumerable: true },\n  count: { value: 162, enumerable: true }\n};\nmodule.exports = Object.preventExtensions(Object.defineProperty(Object.create(base, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: "prevent-wrapper-define-property-create-from-entries-map-primitives-bonus", enumerable: true }));\n',
    }),
    "tsc2c-cjs-module-wrapper-set-prototype-define-property-create-from-entries-primitives": cjsPackage("tsc2c-cjs-module-wrapper-set-prototype-define-property-create-from-entries-primitives", {
        "index.js": 'const base = { inherited: "set-prototype-wrapper-define-property-create-from-entries-primitives-base" };\nconst descriptors = {\n  default: { value: "set-prototype-wrapper-define-property-create-from-entries-primitives-default", enumerable: true },\n  label: { value: "set-prototype-wrapper-define-property-create-from-entries-primitives", enumerable: true },\n  count: { value: 146, enumerable: true }\n};\nmodule.exports = Object.setPrototypeOf(Object.defineProperty(Object.create(base, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: "set-prototype-wrapper-define-property-create-from-entries-primitives-bonus", enumerable: true }), { inherited: true });\n',
    }),
    "tsc2c-cjs-module-wrapper-set-prototype-define-property-create-from-entries-map-primitives": cjsPackage("tsc2c-cjs-module-wrapper-set-prototype-define-property-create-from-entries-map-primitives", {
        "index.js": 'const base = { inherited: "set-prototype-wrapper-define-property-create-from-entries-map-primitives-base" };\nconst descriptors = {\n  default: { value: "set-prototype-wrapper-define-property-create-from-entries-map-primitives-default", enumerable: true },\n  label: { value: "set-prototype-wrapper-define-property-create-from-entries-map-primitives", enumerable: true },\n  count: { value: 163, enumerable: true }\n};\nmodule.exports = Object.setPrototypeOf(Object.defineProperty(Object.create(base, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: "set-prototype-wrapper-define-property-create-from-entries-map-primitives-bonus", enumerable: true }), { inherited: true });\n',
    }),
    "tsc2c-cjs-module-define-property-define-properties-from-entries": cjsPackage("tsc2c-cjs-module-define-property-define-properties-from-entries", {
        "index.js": 'const local = require("./local.js");\nconst countKey = `count`;\nconst descriptors = {\n  default: { value: "define-property-properties-from-entries-default", enumerable: true },\n  label: { get() { return "define-property-properties-from-entries"; }, enumerable: true },\n  [countKey]: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.defineProperty(Object.defineProperties({}, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: local.bonus, enumerable: true });\n',
        "local.js": 'exports.count = 136;\nexports.bonus = "define-property-properties-from-entries-bonus";\nexports.double = function double(value) { return value * 11; };\n',
    }),
    "tsc2c-cjs-module-define-property-define-properties-from-entries-map": cjsPackage("tsc2c-cjs-module-define-property-define-properties-from-entries-map", {
        "index.js": 'const local = require("./local.js");\nconst descriptors = {\n  default: { value: "define-property-properties-from-entries-map-default", enumerable: true },\n  label: { get() { return "define-property-properties-from-entries-map"; }, enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.defineProperty(Object.defineProperties({}, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: local.bonus, enumerable: true });\n',
        "local.js": 'exports.count = 148;\nexports.bonus = "define-property-properties-from-entries-map-bonus";\nexports.double = function double(value) { return value * 14; };\n',
    }),
    "tsc2c-cjs-module-define-property-define-properties-from-entries-primitives": cjsPackage("tsc2c-cjs-module-define-property-define-properties-from-entries-primitives", {
        "index.js": 'const descriptors = {\n  default: { value: "define-property-properties-from-entries-primitives-default", enumerable: true },\n  label: { value: "define-property-properties-from-entries-primitives", enumerable: true },\n  count: { value: 141, enumerable: true }\n};\nmodule.exports = Object.defineProperty(Object.defineProperties({}, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: "define-property-properties-from-entries-primitives-bonus", enumerable: true });\n',
    }),
    "tsc2c-cjs-module-wrapper-define-property-define-properties-from-entries": cjsPackage("tsc2c-cjs-module-wrapper-define-property-define-properties-from-entries", {
        "index.js": 'const local = require("./local.js");\nconst labelKey = "la" + "bel";\nconst descriptors = {\n  default: { value: "wrapper-define-property-properties-from-entries-default", enumerable: true },\n  [labelKey]: { value: "wrapper-define-property-properties-from-entries", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.freeze(Object.defineProperty(Object.defineProperties({}, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: local.bonus, enumerable: true }));\n',
        "local.js": 'exports.count = 137;\nexports.bonus = "wrapper-define-property-properties-from-entries-bonus";\nexports.double = function double(value) { return value * 12; };\n',
    }),
    "tsc2c-cjs-module-wrapper-define-property-define-properties-from-entries-map": cjsPackage("tsc2c-cjs-module-wrapper-define-property-define-properties-from-entries-map", {
        "index.js": 'const local = require("./local.js");\nconst descriptors = {\n  default: { value: "wrapper-define-property-properties-from-entries-map-default", enumerable: true },\n  label: { value: "wrapper-define-property-properties-from-entries-map", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.freeze(Object.defineProperty(Object.defineProperties({}, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: local.bonus, enumerable: true }));\n',
        "local.js": 'exports.count = 149;\nexports.bonus = "wrapper-define-property-properties-from-entries-map-bonus";\nexports.double = function double(value) { return value * 15; };\n',
    }),
    "tsc2c-cjs-module-wrapper-seal-define-property-define-properties-from-entries": cjsPackage("tsc2c-cjs-module-wrapper-seal-define-property-define-properties-from-entries", {
        "index.js": 'const local = require("./local.js");\nconst descriptors = {\n  default: { value: "seal-wrapper-define-property-properties-from-entries-default", enumerable: true },\n  label: { value: "seal-wrapper-define-property-properties-from-entries", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.seal(Object.defineProperty(Object.defineProperties({}, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: "seal-wrapper-define-property-properties-from-entries-bonus", enumerable: true }));\n',
        "local.js": 'exports.count = 138;\nexports.double = function double(value) { return value * 13; };\n',
    }),
    "tsc2c-cjs-module-wrapper-seal-define-property-define-properties-from-entries-map": cjsPackage("tsc2c-cjs-module-wrapper-seal-define-property-define-properties-from-entries-map", {
        "index.js": 'const local = require("./local.js");\nconst descriptors = {\n  default: { value: "seal-wrapper-define-property-properties-from-entries-map-default", enumerable: true },\n  label: { value: "seal-wrapper-define-property-properties-from-entries-map", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.seal(Object.defineProperty(Object.defineProperties({}, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: "seal-wrapper-define-property-properties-from-entries-map-bonus", enumerable: true }));\n',
        "local.js": 'exports.count = 150;\nexports.double = function double(value) { return value * 16; };\n',
    }),
    "tsc2c-cjs-module-wrapper-prevent-define-property-define-properties-from-entries": cjsPackage("tsc2c-cjs-module-wrapper-prevent-define-property-define-properties-from-entries", {
        "index.js": 'const local = require("./local.js");\nconst descriptors = {\n  default: { value: "prevent-wrapper-define-property-properties-from-entries-default", enumerable: true },\n  label: { value: "prevent-wrapper-define-property-properties-from-entries", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.preventExtensions(Object.defineProperty(Object.defineProperties({}, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: "prevent-wrapper-define-property-properties-from-entries-bonus", enumerable: true }));\n',
        "local.js": 'exports.count = 139;\nexports.double = function double(value) { return value * 14; };\n',
    }),
    "tsc2c-cjs-module-wrapper-prevent-define-property-define-properties-from-entries-map": cjsPackage("tsc2c-cjs-module-wrapper-prevent-define-property-define-properties-from-entries-map", {
        "index.js": 'const local = require("./local.js");\nconst descriptors = {\n  default: { value: "prevent-wrapper-define-property-properties-from-entries-map-default", enumerable: true },\n  label: { value: "prevent-wrapper-define-property-properties-from-entries-map", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.preventExtensions(Object.defineProperty(Object.defineProperties({}, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: "prevent-wrapper-define-property-properties-from-entries-map-bonus", enumerable: true }));\n',
        "local.js": 'exports.count = 151;\nexports.double = function double(value) { return value * 17; };\n',
    }),
    "tsc2c-cjs-module-wrapper-set-prototype-define-property-define-properties-from-entries": cjsPackage("tsc2c-cjs-module-wrapper-set-prototype-define-property-define-properties-from-entries", {
        "index.js": 'const local = require("./local.js");\nconst descriptors = {\n  default: { value: "set-prototype-wrapper-define-property-properties-from-entries-default", enumerable: true },\n  label: { value: "set-prototype-wrapper-define-property-properties-from-entries", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.setPrototypeOf(Object.defineProperty(Object.defineProperties({}, Object.fromEntries(Object.entries(descriptors))), "bonus", { value: "set-prototype-wrapper-define-property-properties-from-entries-bonus", enumerable: true }), { inherited: true });\n',
        "local.js": 'exports.count = 140;\nexports.double = function double(value) { return value * 15; };\n',
    }),
    "tsc2c-cjs-module-wrapper-set-prototype-define-property-define-properties-from-entries-map": cjsPackage("tsc2c-cjs-module-wrapper-set-prototype-define-property-define-properties-from-entries-map", {
        "index.js": 'const local = require("./local.js");\nconst descriptors = {\n  default: { value: "set-prototype-wrapper-define-property-properties-from-entries-map-default", enumerable: true },\n  label: { value: "set-prototype-wrapper-define-property-properties-from-entries-map", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.setPrototypeOf(Object.defineProperty(Object.defineProperties({}, Object.fromEntries(new Map(Object.entries(descriptors)))), "bonus", { value: "set-prototype-wrapper-define-property-properties-from-entries-map-bonus", enumerable: true }), { inherited: true });\n',
        "local.js": 'exports.count = 152;\nexports.double = function double(value) { return value * 18; };\n',
    }),
    "tsc2c-cjs-object-create-default-package": cjsPackage("tsc2c-cjs-object-create-default-package", {
        "index.js": 'module.exports = Object.freeze(Object.create(null, {\n  visible: { value: "descriptor-hidden", enumerable: true },\n  hidden: { value: "not-enumerated", enumerable: false }\n}));\n',
    }),
    "tsc2c-cjs-object-define-property-default-package": cjsPackage("tsc2c-cjs-object-define-property-default-package", {
        "index.js": 'module.exports = Object.defineProperty({ visible: "yes" }, "hidden", { value: "secret", enumerable: false });\n',
    }),
    "tsc2c-cjs-object-from-entries-default-package": cjsPackage("tsc2c-cjs-object-from-entries-default-package", {
        "index.js": 'module.exports = Object.fromEntries([["label", "from-entries"], ["count", 42], ["enabled", true]]);\n',
    }),
    "tsc2c-cjs-object-from-entries-named-package": cjsPackage("tsc2c-cjs-object-from-entries-named-package", {
        "index.js": 'module.exports = Object.fromEntries([\n  ["default", "from-entries-default"],\n  ["label", "from-entries-named"],\n  ["count", 91],\n  ["enabled", true]\n]);\n',
    }),
    "tsc2c-cjs-object-from-entries-identifier-named-package": cjsPackage("tsc2c-cjs-object-from-entries-identifier-named-package", {
        "index.js": 'const entries = [\n  ["default", "from-entries-identifier-default"],\n  ["label", "from-entries-identifier-named"],\n  ["count", 92],\n  ["enabled", true]\n];\nmodule.exports = Object.fromEntries(entries);\n',
    }),
    "tsc2c-cjs-object-from-entries-map-named-package": cjsPackage("tsc2c-cjs-object-from-entries-map-named-package", {
        "index.js": 'const api = {\n  default: "from-entries-map-default",\n  label: "from-entries-map-named",\n  count: 96,\n  enabled: true\n};\nmodule.exports = Object.fromEntries(new Map(Object.entries(api)));\n',
    }),
    "tsc2c-cjs-object-from-entries-require-values-package": cjsPackage("tsc2c-cjs-object-from-entries-require-values-package", {
        "index.js": 'const local = require("./local.js");\nconst defaultValue = require("./default.js");\nmodule.exports = Object.fromEntries([\n  ["default", defaultValue],\n  ["label", local.label],\n  ["count", local.count],\n  ["enabled", true]\n]);\n',
        "default.js": 'module.exports = "from-entries-require-default";\n',
        "local.js": 'exports.label = "from-entries-require-values";\nexports.count = 93;\n',
    }),
    "tsc2c-cjs-object-from-entries-computed-named-package": cjsPackage("tsc2c-cjs-object-from-entries-computed-named-package", {
        "index.js": 'const defaultKey = "def" + "ault";\nconst labelKey = `label`;\nconst countPrefix = "co";\nmodule.exports = Object.fromEntries([\n  [defaultKey, "from-entries-computed-default"],\n  [labelKey, "from-entries-computed-named"],\n  [countPrefix + "unt", 94],\n  [`enabled`, true]\n]);\n',
    }),
    "tsc2c-cjs-object-from-entries-finite-keys-package": cjsPackage("tsc2c-cjs-object-from-entries-finite-keys-package", {
        "index.js": 'const labelKey = Date.now() >= 0 ? "label" : "fallbackLabel";\nconst countKey = Math.random() >= 0 ? "count" : "otherCount";\nmodule.exports = Object.fromEntries([\n  [labelKey, "from-entries-finite-keys"],\n  [countKey, 171]\n]);\n',
    }),
    "tsc2c-cjs-module-exports-dynamic-computed": cjsPackage("tsc2c-cjs-module-exports-dynamic-computed", {
        "index.js": 'const suffix = "bel";\nconst entries = [["la" + suffix, "dynamic-computed"], ["count", 71]];\nmodule.exports = Object.fromEntries(entries);\n',
    }),
    "tsc2c-cjs-module-exports-runtime-named-fallback": cjsPackage("tsc2c-cjs-module-exports-runtime-named-fallback", {
        "index.js": 'const empty = String(Date.now()).slice(9999);\nconst labelKey = "la" + empty + "bel";\nconst doubleKey = "dou" + empty + "ble";\nmodule.exports = Object.fromEntries([\n  [labelKey, "runtime-named-fallback"],\n  ["count", 184],\n  [doubleKey, function double(value) { return value * 5; }]\n]);\n',
    }),
    "tsc2c-cjs-runtime-typeof-default-package": cjsPackage("tsc2c-cjs-runtime-typeof-default-package", {
        "index.js": 'const maybeObject = { label: "typeof-default" };\nmodule.exports = typeof maybeObject;\n',
    }),
    "tsc2c-cjs-runtime-void-default-package": cjsPackage("tsc2c-cjs-runtime-void-default-package", {
        "index.js": 'console.log("void-default-init");\nmodule.exports = void "void-default";\n',
    }),
    "tsc2c-cjs-runtime-undefined-default-package": cjsPackage("tsc2c-cjs-runtime-undefined-default-package", {
        "index.js": 'module.exports = undefined;\n',
    }),
    "tsc2c-cjs-object-from-entries-object-entries-named-package": cjsPackage("tsc2c-cjs-object-from-entries-object-entries-named-package", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "from-entries-object-default",\n  label: local.label,\n  count: 95,\n  enabled: true\n};\nmodule.exports = Object.fromEntries(Object.entries(api));\n',
        "local.js": 'exports.label = "from-entries-object-named";\n',
    }),
    "tsc2c-cjs-object-from-entries-object-entries-identifier-named-package": cjsPackage("tsc2c-cjs-object-from-entries-object-entries-identifier-named-package", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "entries-id-default",\n  label: local.label,\n  count: 122,\n  enabled: true\n};\nconst entries = Object.entries(api);\nmodule.exports = Object.fromEntries(entries);\n',
        "local.js": 'exports.label = "from-entries-object-entries-id";\n',
    }),
    "tsc2c-cjs-object-from-entries-require-object-entries-package": cjsPackage("tsc2c-cjs-object-from-entries-require-object-entries-package", {
        "index.js": 'const api = require("./api.js");\nmodule.exports = Object.fromEntries(Object.entries(api));\n',
        "api.js": 'exports.default = "require-object-entries-default";\nexports.label = "require-object-entries";\nexports.count = 124;\nexports.enabled = true;\n',
    }),
    "tsc2c-cjs-object-wrapper-from-entries-named": cjsPackage("tsc2c-cjs-object-wrapper-from-entries-named", {
        "index.js": 'const local = require("./local.js");\nmodule.exports = Object.freeze(Object.fromEntries([\n  ["default", function greet(name) { return "wrapped-entries " + name; }],\n  ["label", "wrapper-from-entries"],\n  ["count", local.count],\n  ["double", local.double]\n]));\n',
        "local.js": 'exports.count = 118;\nexports.double = function double(value) { return value * 13; };\n',
    }),
    "tsc2c-cjs-object-wrapper-from-entries-object-entries-identifier-named": cjsPackage("tsc2c-cjs-object-wrapper-from-entries-object-entries-identifier-named", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "wrapped-entries-id-default",\n  label: local.label,\n  count: 123,\n  enabled: false\n};\nconst entries = Object.entries(api);\nmodule.exports = Object.freeze(Object.fromEntries(entries));\n',
        "local.js": 'exports.label = "wrapper-from-entries-object-entries-id";\n',
    }),
    "tsc2c-cjs-object-wrapper-from-entries-map-named": cjsPackage("tsc2c-cjs-object-wrapper-from-entries-map-named", {
        "index.js": 'const api = {\n  default: "wrapped-entries-map-default",\n  label: "wrapper-from-entries-map",\n  count: 142,\n  enabled: false\n};\nmodule.exports = Object.freeze(Object.fromEntries(new Map(Object.entries(api))));\n',
    }),
    "tsc2c-cjs-object-wrapper-seal-from-entries-object-entries-identifier-named": cjsPackage("tsc2c-cjs-object-wrapper-seal-from-entries-object-entries-identifier-named", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "sealed-entries-id-default",\n  label: local.label,\n  count: 124,\n  enabled: true\n};\nconst entries = Object.entries(api);\nmodule.exports = Object.seal(Object.fromEntries(entries));\n',
        "local.js": 'exports.label = "seal-from-entries-object-entries-id";\n',
    }),
    "tsc2c-cjs-object-wrapper-prevent-from-entries-object-entries-identifier-named": cjsPackage("tsc2c-cjs-object-wrapper-prevent-from-entries-object-entries-identifier-named", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "prevented-entries-id-default",\n  label: local.label,\n  count: 125,\n  enabled: false\n};\nconst entries = Object.entries(api);\nmodule.exports = Object.preventExtensions(Object.fromEntries(entries));\n',
        "local.js": 'exports.label = "prevent-from-entries-object-entries-id";\n',
    }),
    "tsc2c-cjs-object-wrapper-set-prototype-from-entries-object-entries-identifier-named": cjsPackage("tsc2c-cjs-object-wrapper-set-prototype-from-entries-object-entries-identifier-named", {
        "index.js": 'const local = require("./local.js");\nconst api = {\n  default: "reproto-entries-id-default",\n  label: local.label,\n  count: 126,\n  enabled: true\n};\nconst entries = Object.entries(api);\nmodule.exports = Object.setPrototypeOf(Object.fromEntries(entries), { inherited: true });\n',
        "local.js": 'exports.label = "set-prototype-from-entries-object-entries-id";\n',
    }),
    "tsc2c-cjs-object-wrapper-seal-from-entries-named": cjsPackage("tsc2c-cjs-object-wrapper-seal-from-entries-named", {
        "index.js": 'const local = require("./local.js");\nmodule.exports = Object.seal(Object.fromEntries([\n  ["default", function greet(name) { return "sealed-entries " + name; }],\n  ["label", "seal-from-entries"],\n  ["count", local.count],\n  ["double", local.double]\n]));\n',
        "local.js": 'exports.count = 119;\nexports.double = function double(value) { return value * 14; };\n',
    }),
    "tsc2c-cjs-object-wrapper-prevent-from-entries-named": cjsPackage("tsc2c-cjs-object-wrapper-prevent-from-entries-named", {
        "index.js": 'const local = require("./local.js");\nmodule.exports = Object.preventExtensions(Object.fromEntries([\n  ["default", function greet(name) { return "prevented-entries " + name; }],\n  ["label", "prevent-from-entries"],\n  ["count", local.count],\n  ["double", local.double]\n]));\n',
        "local.js": 'exports.count = 120;\nexports.double = function double(value) { return value * 15; };\n',
    }),
    "tsc2c-cjs-object-wrapper-set-prototype-from-entries-named": cjsPackage("tsc2c-cjs-object-wrapper-set-prototype-from-entries-named", {
        "index.js": 'const local = require("./local.js");\nmodule.exports = Object.setPrototypeOf(Object.fromEntries([\n  ["default", function greet(name) { return "reproto-entries " + name; }],\n  ["label", "set-prototype-from-entries"],\n  ["count", local.count],\n  ["double", local.double]\n]), { inherited: true });\n',
        "local.js": 'exports.count = 121;\nexports.double = function double(value) { return value * 16; };\n',
    }),
    "tsc2c-cjs-object-runtime-define-properties-default-package": cjsPackage("tsc2c-cjs-object-runtime-define-properties-default-package", {
        "index.js": 'module.exports = Object.defineProperties({}, {\n  visible: { value: "yes", enumerable: true, writable: true, configurable: true },\n  total: { value: 12, enumerable: true, writable: true, configurable: true },\n  hidden: { value: "secret", enumerable: false, writable: true, configurable: true }\n});\n',
    }),
    "tsc2c-cjs-object-runtime-set-prototype-default-package": cjsPackage("tsc2c-cjs-object-runtime-set-prototype-default-package", {
        "index.js": 'module.exports = Object.setPrototypeOf({ own: "own" }, { inherited: "base" });\n',
    }),
    "tsc2c-cjs-object-runtime-prevent-extensions-default-package": cjsPackage("tsc2c-cjs-object-runtime-prevent-extensions-default-package", {
        "index.js": 'module.exports = Object.preventExtensions({ locked: "locked" });\n',
    }),
    "tsc2c-cjs-object-runtime-seal-default-package": cjsPackage("tsc2c-cjs-object-runtime-seal-default-package", {
        "index.js": "module.exports = Object.seal({ fixed: 1 });\n",
    }),
    "tsc2c-cjs-object-runtime-freeze-default-package": cjsPackage("tsc2c-cjs-object-runtime-freeze-default-package", {
        "index.js": "module.exports = Object.freeze({ frozen: 1 });\n",
    }),
    "tsc2c-cjs-runtime-call-default-package": cjsPackage("tsc2c-cjs-runtime-call-default-package", {
        "index.js": 'function make(label, count) {\n  return { label: "call-" + label, count, nested: { ok: true } };\n}\nmodule.exports = make("default", 14);\n',
    }),
    "tsc2c-cjs-runtime-logical-default-package": cjsPackage("tsc2c-cjs-runtime-logical-default-package", {
        "index.js": 'function makeLogicalDefault(label, count) {\n  return { label, count, nested: { ok: true } };\n}\nconst disabled = false;\nconst missing = null;\nmodule.exports = (disabled && makeLogicalDefault("bad", 0)) || (missing ?? makeLogicalDefault("logical", 22));\n',
    }),
    "tsc2c-cjs-runtime-function-conditional-default-package": cjsPackage("tsc2c-cjs-runtime-function-conditional-default-package", {
        "index.js": 'const useFirst = false;\nmodule.exports = useFirst ? function first(value) { return value + 1; } : (value) => value * 3;\n',
    }),
    "tsc2c-cjs-runtime-function-logical-default-package": cjsPackage("tsc2c-cjs-runtime-function-logical-default-package", {
        "index.js": 'const disabled = false;\nmodule.exports = (disabled && function bad(value) { return value - 100; }) || (function picked(value) { return value + 5; });\n',
    }),
    "tsc2c-cjs-runtime-function-nullish-default-package": cjsPackage("tsc2c-cjs-runtime-function-nullish-default-package", {
        "index.js": 'const missing = undefined;\nmodule.exports = missing ?? ((value) => value * 4);\n',
    }),
    "tsc2c-cjs-runtime-expression-default-package": cjsPackage("tsc2c-cjs-runtime-expression-default-package", {
        "index.js": 'module.exports = {\n  label: "expr-" + "default",\n  count: +(40 + 2),\n  enabled: !false,\n  mask: ~-1,\n  nested: { sum: 20 + 2 },\n  values: [1 + 1, -(3)]\n};\n',
    }),
    "tsc2c-cjs-runtime-object-dynamic-expressions": cjsPackage("tsc2c-cjs-runtime-object-dynamic-expressions", {
        "index.js": 'const x = 5;\nconst y = 10;\nconst data = { value: 3 };\nfunction makeDynamicDefault(label) { return "made-" + label; }\nmodule.exports = {\n  binary: x + y,\n  unary: typeof x,\n  conditional: x > 2 ? "greater" : "less",\n  logical: (x > 0) && true,\n  nullish: null ?? makeDynamicDefault("nullish"),\n  call: makeDynamicDefault("value"),\n  member: data.value,\n  nested: { pick: y > 5 ? x * 2 : 0, made: makeDynamicDefault("nested") },\n  values: [typeof y, x < y ? "lt" : "ge", makeDynamicDefault("array")]\n};\n',
    }),
    "tsc2c-cjs-runtime-binary-default-package": cjsPackage("tsc2c-cjs-runtime-binary-default-package", {
        "index.js": 'module.exports = "binary-" + (20 + 2);\n',
    }),
    "tsc2c-cjs-runtime-computed-binary-default-package": cjsPackage("tsc2c-cjs-runtime-computed-binary-default-package", {
        "index.js": 'function base() { return 20; }\nconst offset = 2;\nmodule.exports = "computed-binary-" + (base() + offset);\n',
    }),
    "tsc2c-cjs-runtime-computed-conditional-default-package": cjsPackage("tsc2c-cjs-runtime-computed-conditional-default-package", {
        "index.js": 'function enabled() { return Date.now() >= 0; }\nmodule.exports = enabled() ? "computed-conditional-yes" : "computed-conditional-no";\n',
    }),
    "tsc2c-cjs-runtime-computed-prefix-number-default-package": cjsPackage("tsc2c-cjs-runtime-computed-prefix-number-default-package", {
        "index.js": 'function value() { return 42; }\nmodule.exports = +value();\n',
    }),
    "tsc2c-cjs-runtime-computed-prefix-boolean-default-package": cjsPackage("tsc2c-cjs-runtime-computed-prefix-boolean-default-package", {
        "index.js": 'function enabled() { return 0; }\nmodule.exports = !enabled();\n',
    }),
    "tsc2c-cjs-runtime-postfix-default-package": cjsPackage("tsc2c-cjs-runtime-postfix-default-package", {
        "index.js": "let counter = 4;\nmodule.exports = counter++;\n",
    }),
    "tsc2c-cjs-runtime-prefix-update-default-package": cjsPackage("tsc2c-cjs-runtime-prefix-update-default-package", {
        "index.js": "let counter = 4;\nmodule.exports = ++counter;\n",
    }),
    "tsc2c-cjs-runtime-assignment-default-package": cjsPackage("tsc2c-cjs-runtime-assignment-default-package", {
        "index.js": "let counter = 4;\nmodule.exports = (counter += 3);\n",
    }),
    "tsc2c-cjs-runtime-delete-default-package": cjsPackage("tsc2c-cjs-runtime-delete-default-package", {
        "index.js": "const target = { present: 1 };\nmodule.exports = delete target.present;\n",
    }),
    "tsc2c-cjs-runtime-in-default-package": cjsPackage("tsc2c-cjs-runtime-in-default-package", {
        "index.js": 'module.exports = "present" in { present: 1 };\n',
    }),
    "tsc2c-cjs-runtime-instanceof-default-package": cjsPackage("tsc2c-cjs-runtime-instanceof-default-package", {
        "index.js": "class Widget {}\nconst item = new Widget();\nmodule.exports = item instanceof Widget;\n",
    }),
    "tsc2c-cjs-object-wrapper-freeze-named": cjsPackage("tsc2c-cjs-object-wrapper-freeze-named", {
        "index.js": 'const api = {\n  count: 71,\n  extra: true\n};\nmodule.exports = Object.freeze({\n  default: function greet(name) { return "hello " + name; },\n  label: "freeze-named",\n  double(value) { return value * 2; },\n  ...api\n});\n',
    }),
    "tsc2c-cjs-object-wrapper-seal-named": cjsPackage("tsc2c-cjs-object-wrapper-seal-named", {
        "index.js": 'module.exports = Object.seal({ default: function greet(name) { return "sealed " + name; }, label: "seal-named", count: 72 });\n',
    }),
    "tsc2c-cjs-object-wrapper-prevent-named": cjsPackage("tsc2c-cjs-object-wrapper-prevent-named", {
        "index.js": 'module.exports = Object.preventExtensions({ default: function greet(name) { return "locked " + name; }, label: "prevent-named", count: 73 });\n',
    }),
    "tsc2c-cjs-object-wrapper-create-descriptors-named": cjsPackage("tsc2c-cjs-object-wrapper-create-descriptors-named", {
        "local.js": 'exports.count = 102;\nexports.double = function double(value) { return value * 6; };\n',
        "index.js": 'const local = require("./local.js");\nconst base = { inherited: "wrapper-create-base" };\nconst descriptors = {\n  default: { value: function greet(name) { return "wrapped " + name; }, enumerable: true },\n  label: { value: "wrapper-create-named", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { get() { return local.double; }, enumerable: true },\n  extra: { value: true, enumerable: true }\n};\nmodule.exports = Object.freeze(Object.create(base, descriptors));\n',
    }),
    "tsc2c-cjs-object-wrapper-create-from-entries": cjsPackage("tsc2c-cjs-object-wrapper-create-from-entries", {
        "local.js": 'exports.count = 124;\nexports.double = function double(value) { return value * 17; };\n',
        "index.js": 'const local = require("./local.js");\nconst base = { inherited: "wrapper-create-from-entries-base" };\nconst defaultKey = "def" + "ault";\nconst descriptors = {\n  [defaultKey]: { value: function greet(name) { return "wrapped-create-from-entries " + name; }, enumerable: true },\n  label: { value: "wrapper-create-from-entries", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { get() { return local.double; }, enumerable: true },\n  extra: { value: true, enumerable: true }\n};\nconst entries = Object.entries(descriptors);\nmodule.exports = Object.freeze(Object.create(base, Object.fromEntries(entries)));\n',
    }),
    "tsc2c-cjs-object-wrapper-create-from-entries-map": cjsPackage("tsc2c-cjs-object-wrapper-create-from-entries-map", {
        "local.js": 'exports.count = 155;\nexports.double = function double(value) { return value * 21; };\n',
        "index.js": 'const local = require("./local.js");\nconst base = { inherited: "wrapper-create-from-entries-map-base" };\nconst descriptors = {\n  default: { value: function greet(name) { return "wrapped-create-from-entries-map " + name; }, enumerable: true },\n  label: { value: "wrapper-create-from-entries-map", enumerable: true },\n  count: { value: local.count, enumerable: true },\n  double: { get() { return local.double; }, enumerable: true },\n  extra: { value: true, enumerable: true }\n};\nmodule.exports = Object.freeze(Object.create(base, Object.fromEntries(new Map(Object.entries(descriptors)))));\n',
    }),
    "tsc2c-cjs-object-wrapper-seal-create-descriptors-named": cjsPackage("tsc2c-cjs-object-wrapper-seal-create-descriptors-named", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "sealed " + name; }, enumerable: true },\n  label: { value: "seal-create-descriptors", enumerable: true },\n  count: { value: 104, enumerable: true }\n};\nmodule.exports = Object.seal(Object.create({ inherited: true }, descriptors));\n',
    }),
    "tsc2c-cjs-object-wrapper-seal-create-from-entries": cjsPackage("tsc2c-cjs-object-wrapper-seal-create-from-entries", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "sealed-create-from-entries " + name; }, enumerable: true },\n  label: { value: "seal-create-from-entries", enumerable: true },\n  count: { value: 125, enumerable: true }\n};\nmodule.exports = Object.seal(Object.create({ inherited: true }, Object.fromEntries(Object.entries(descriptors))));\n',
    }),
    "tsc2c-cjs-object-wrapper-seal-create-from-entries-map": cjsPackage("tsc2c-cjs-object-wrapper-seal-create-from-entries-map", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "sealed-create-from-entries-map " + name; }, enumerable: true },\n  label: { value: "seal-create-from-entries-map", enumerable: true },\n  count: { value: 156, enumerable: true }\n};\nmodule.exports = Object.seal(Object.create({ inherited: true }, Object.fromEntries(new Map(Object.entries(descriptors)))));\n',
    }),
    "tsc2c-cjs-object-wrapper-prevent-create-descriptors-named": cjsPackage("tsc2c-cjs-object-wrapper-prevent-create-descriptors-named", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "prevented " + name; }, enumerable: true },\n  label: { value: "prevent-create-descriptors", enumerable: true },\n  count: { value: 105, enumerable: true }\n};\nmodule.exports = Object.preventExtensions(Object.create({ inherited: true }, descriptors));\n',
    }),
    "tsc2c-cjs-object-wrapper-prevent-create-from-entries": cjsPackage("tsc2c-cjs-object-wrapper-prevent-create-from-entries", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "prevented-create-from-entries " + name; }, enumerable: true },\n  label: { value: "prevent-create-from-entries", enumerable: true },\n  count: { value: 126, enumerable: true }\n};\nconst entries = Object.entries(descriptors);\nmodule.exports = Object.preventExtensions(Object.create({ inherited: true }, Object.fromEntries(entries)));\n',
    }),
    "tsc2c-cjs-object-wrapper-prevent-create-from-entries-map": cjsPackage("tsc2c-cjs-object-wrapper-prevent-create-from-entries-map", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "prevented-create-from-entries-map " + name; }, enumerable: true },\n  label: { value: "prevent-create-from-entries-map", enumerable: true },\n  count: { value: 157, enumerable: true }\n};\nmodule.exports = Object.preventExtensions(Object.create({ inherited: true }, Object.fromEntries(new Map(Object.entries(descriptors)))));\n',
    }),
    "tsc2c-cjs-object-wrapper-set-prototype-create-descriptors-named": cjsPackage("tsc2c-cjs-object-wrapper-set-prototype-create-descriptors-named", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "reproto " + name; }, enumerable: true },\n  label: { value: "set-prototype-create-descriptors", enumerable: true },\n  count: { value: 106, enumerable: true }\n};\nmodule.exports = Object.setPrototypeOf(Object.create(null, descriptors), { inherited: true });\n',
    }),
    "tsc2c-cjs-object-wrapper-set-prototype-create-from-entries": cjsPackage("tsc2c-cjs-object-wrapper-set-prototype-create-from-entries", {
        "index.js": 'const labelKey = "la" + "bel";\nconst descriptors = {\n  default: { value: function greet(name) { return "reproto-create-from-entries " + name; }, enumerable: true },\n  [labelKey]: { value: "set-prototype-create-from-entries", enumerable: true },\n  count: { value: 127, enumerable: true }\n};\nmodule.exports = Object.setPrototypeOf(Object.create(null, Object.fromEntries(Object.entries(descriptors))), { inherited: true });\n',
    }),
    "tsc2c-cjs-object-wrapper-set-prototype-create-from-entries-map": cjsPackage("tsc2c-cjs-object-wrapper-set-prototype-create-from-entries-map", {
        "index.js": 'const descriptors = {\n  default: { value: function greet(name) { return "reproto-create-from-entries-map " + name; }, enumerable: true },\n  label: { value: "set-prototype-create-from-entries-map", enumerable: true },\n  count: { value: 158, enumerable: true }\n};\nmodule.exports = Object.setPrototypeOf(Object.create(null, Object.fromEntries(new Map(Object.entries(descriptors)))), { inherited: true });\n',
    }),
    "tsc2c-cjs-object-set-prototype-named": cjsPackage("tsc2c-cjs-object-set-prototype-named", {
        "index.js": 'module.exports = Object.setPrototypeOf({\n  default: function greet(name) { return "hello " + name; },\n  label: "set-prototype-named",\n  count: 74,\n  double(value) { return value * 2; }\n}, { inherited: "base" });\n',
    }),
    "tsc2c-cjs-object-create-descriptors-named": cjsPackage("tsc2c-cjs-object-create-descriptors-named", {
        "local.js": 'exports.count = 75;\nexports.double = function double(value) { return value * 2; };\n',
        "index.js": 'const local = require("./local.js");\nconst defaultDescriptor = { value: function greet(name) { return "hello " + name; }, enumerable: true };\nconst labelDescriptor = { get() { return "object-create-descriptors"; }, enumerable: true };\nconst descriptors = {\n  default: defaultDescriptor,\n  label: labelDescriptor,\n  count: { value: local.count, enumerable: true },\n  double: { value: local.double, enumerable: true }\n};\nmodule.exports = Object.create({ inherited: "base" }, descriptors);\n',
    }),
    "tsc2c-cjs-object-spread-default-package": cjsPackage("tsc2c-cjs-object-spread-default-package", {
        "index.js": 'const base = { label: "spread-default", nested: { ready: true } };\nmodule.exports = { ...base, count: 42, extra: true };\n',
    }),
    "tsc2c-cjs-module-string": cjsPackage("tsc2c-cjs-module-string", {
        "index.js": 'module.exports = "whole-cjs";\n',
    }),
    "tsc2c-cjs-module-number": cjsPackage("tsc2c-cjs-module-number", {
        "index.js": "module.exports = 42;\n",
    }),
    "tsc2c-cjs-module-boolean": cjsPackage("tsc2c-cjs-module-boolean", {
        "index.js": "module.exports = true;\n",
    }),
    "tsc2c-cjs-module-bigint": cjsPackage("tsc2c-cjs-module-bigint", {
        "index.js": "module.exports = 9007199254740993n;\n",
    }),
    "tsc2c-cjs-module-regexp": cjsPackage("tsc2c-cjs-module-regexp", {
        "index.js": "module.exports = /foo+/i;\n",
    }),
    "tsc2c-cjs-module-exports-value-chains": cjsPackage("tsc2c-cjs-module-exports-value-chains", {
        "index.js": 'module.exports = exports.default = function() { return "first chain"; };\n',
        "second.js": 'module.exports = exports.default = function() { return "second chain"; };\n',
    }),
    "tsc2c-cjs-module-exports-object-value-chain": cjsPackage("tsc2c-cjs-module-exports-object-value-chain", {
        "index.js": 'module.exports = exports.default = {\n  label: "object value chain",\n  count: 91,\n  enabled: true\n};\n',
    }),
    "tsc2c-cjs-module-exports-object-reverse-value-chain": cjsPackage("tsc2c-cjs-module-exports-object-reverse-value-chain", {
        "index.js": 'exports.default = module.exports = {\n  label: "object reverse value chain",\n  count: 92,\n  enabled: false\n};\n',
    }),
    "tsc2c-cjs-module-metadata-package": cjsPackage("tsc2c-cjs-module-metadata-package", {
        "index.js": 'exports.filenameMatches = module.filename.endsWith("index.js");\nexports.pathMatches = module.path.endsWith("tsc2c-cjs-module-metadata-package");\nexports.idMatches = module.id.endsWith("index.js");\nexports.loaded = module.loaded;\n',
    }),
    "tsc2c-cjs-module-metadata-more-package": cjsPackage("tsc2c-cjs-module-metadata-more-package", {
        "index.js": 'exports.parentIsNull = module.parent === null;\nexports.childrenLength = module.children.length;\nexports.isPreloading = module.isPreloading;\n',
    }),
    "tsc2c-cjs-module-paths-package": cjsPackage("tsc2c-cjs-module-paths-package", {
        "index.js": 'exports.pathsLength = module.paths.length;\nexports.firstPathMatches = module.paths[0].endsWith("tsc2c-cjs-module-paths-package/node_modules");\n',
    }),
    "tsc2c-cjs-module-require-package": cjsPackage("tsc2c-cjs-module-require-package", {
        "index.js": 'exports.label = "module-require";\nexports.count = 7;\nexports.add = function add(left, right) { return left + right; };\n',
    }),
    "tsc2c-cjs-module-alias-wrapper-package": cjsPackage("tsc2c-cjs-module-alias-wrapper-package", {
        "index.js": 'const mod = module;\nconst req = mod.require;\nconst local = mod.require("./local.js");\nmod.exports.label = local.label;\nmod.exports.count = req("./local.js").count;\nmod.exports.add = local.add;\nmod.exports.filenameMatches = mod.filename.endsWith("index.js");\nmod.exports.pathMatches = mod.path.endsWith("tsc2c-cjs-module-alias-wrapper-package");\nmod.exports.loaded = mod.loaded;\nmod.exports.pathsLength = mod.paths.length;\n',
        "local.js": 'exports.label = "module-alias";\nexports.count = 11;\nexports.add = function add(left, right) { return left + right; };\n',
    }),
    "tsc2c-cjs-function-scope-module-alias": cjsPackage("tsc2c-cjs-function-scope-module-alias", {
        "index.js": 'exports.read = function read() {\n  const mod = module;\n  const req = mod.require;\n  const local = req("./local.js");\n  return local.label + ":" + local.add(20, 22) + ":" + mod.filename.endsWith("index.js") + ":" + mod.paths.length;\n};\n',
        "local.js": 'exports.label = "function-module-alias";\nexports.add = function add(left, right) { return left + right; };\n',
    }),
    "tsc2c-cjs-module-destructure-wrapper": cjsPackage("tsc2c-cjs-module-destructure-wrapper", {
        "index.js": 'const { exports: out, require: req } = module;\nconst local = req("./local.js");\nout.label = local.label;\nout.count = local.count;\nout.add = local.add;\nexports.read = function read() {\n  const { require: scopedReq } = module;\n  const scoped = scopedReq("./local.js");\n  return scoped.label + ":" + scoped.add(7, 8);\n};\n',
        "local.js": 'exports.label = "module-destructure";\nexports.count = 23;\nexports.add = function add(left, right) { return left + right; };\n',
    }),
    "tsc2c-cjs-module-metadata-destructure": cjsPackage("tsc2c-cjs-module-metadata-destructure", {
        "index.js": 'const { filename, id, path: dir, loaded, paths, parent, children } = module;\nexports.filenameOk = filename.endsWith("index.js");\nexports.idOk = id.endsWith("index.js");\nexports.pathOk = dir.endsWith("tsc2c-cjs-module-metadata-destructure");\nexports.loadedValue = loaded;\nexports.pathsLength = paths.length;\nexports.firstPathOk = paths[0].endsWith("tsc2c-cjs-module-metadata-destructure/node_modules");\nexports.parentIsNull = parent === null;\nexports.childrenLength = children.length;\nexports.read = function read() {\n  const { filename: localFile, paths: localPaths, isPreloading } = module;\n  return localFile.endsWith("index.js") + ":" + localPaths.length + ":" + isPreloading;\n};\n',
    }),
    "tsc2c-cjs-relative-require": cjsPackage("tsc2c-cjs-relative-require", {
        "index.js": 'const local = require("./local.js");\nexports.sum = local.sum;\n',
        "local.js": "exports.sum = function sum(left, right) { return left + right; };\n",
    }),
    "tsc2c-cjs-relative-require-default": cjsPackage("tsc2c-cjs-relative-require-default", {
        "index.js": 'module.exports = require("./local.js");\n',
        "local.js": "module.exports = function double(value) { return value * 2; };\n",
    }),
    "tsc2c-cjs-relative-require-object": cjsPackage("tsc2c-cjs-relative-require-object", {
        "index.js": 'module.exports = require("./local.js");\n',
        "local.js": 'exports.label = "relative-object";\nexports.count = 33;\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-relative-require-object-chain": cjsPackage("tsc2c-cjs-relative-require-object-chain", {
        "index.js": 'exports = module.exports = require("./local.js");\n',
        "local.js": 'exports.label = "relative-object-chain";\nexports.count = 34;\nexports.double = function double(value) { return value * 2; };\n',
    }),
    "tsc2c-cjs-relative-require-binding-object": cjsPackage("tsc2c-cjs-relative-require-binding-object", {
        "index.js": 'const local = require("./local.js");\nmodule.exports = local;\n',
        "local.js": 'exports.label = "relative-binding";\nexports.count = 44;\nexports.triple = function triple(value) { return value * 3; };\n',
    }),
    "tsc2c-cjs-relative-require-direct-default": cjsPackage("tsc2c-cjs-relative-require-direct-default", {
        "index.js": 'module.exports = module.require("./local.js");\n',
        "local.js": "module.exports = function triple(value) { return value * 3; };\n",
    }),
    "tsc2c-cjs-relative-require-member-default": cjsPackage("tsc2c-cjs-relative-require-member-default", {
        "index.js": 'module.exports = require("./local.js").quadruple;\n',
        "local.js": "exports.quadruple = function quadruple(value) { return value * 4; };\n",
    }),
    "tsc2c-cjs-destructure-package": cjsPackage("tsc2c-cjs-destructure-package", {
        "index.js": 'exports.label = "destructure-cjs";\nexports["item-count"] = 6;\nexports.enabled = true;\nexports.add = function add(left, right) { return left + right; };\nexports.extra = "rest-extra";\n',
    }),
    "tsc2c-cjs-direct-function-package": cjsPackage("tsc2c-cjs-direct-function-package", {
        "index.js": "module.exports = function add(left, right) { return left + right; };\n",
    }),
    "tsc2c-cjs-direct-member-package": cjsPackage("tsc2c-cjs-direct-member-package", {
        "index.js": 'exports.label = "direct-cjs";\nexports.count = 7;\nexports.add = function add(left, right) { return left + right; };\n',
    }),
    "tsc2c-cjs-direct-value-package": cjsPackage("tsc2c-cjs-direct-value-package", {
        "index.js": 'module.exports = "direct default value";\n',
    }),
    "tsc2c-cjs-require-function-package": cjsPackage("tsc2c-cjs-require-function-package", {
        "index.js": "module.exports = function add(left, right) { return left + right; };\n",
    }),
    "tsc2c-cjs-require-package": cjsPackage("tsc2c-cjs-require-package", {
        "index.js": 'exports.label = "require-cjs";\nexports.add = function add(left, right) { return left + right; };\n',
    }),
    "tsc2c-cjs-require-side-effect": cjsPackage("tsc2c-cjs-require-side-effect", {
        "index.js": 'console.log("require setup");\n',
    }),
    "tsc2c-cjs-wrapper-globals": cjsPackage("tsc2c-cjs-wrapper-globals", {
        "index.js": 'exports.fileOk = __filename.endsWith("index.js");\nexports.dirOk = __dirname.endsWith("tsc2c-cjs-wrapper-globals");\n',
    }),
    "tsc2c-cjs-module-exports-this": cjsPackage("tsc2c-cjs-module-exports-this", {
        "index.js": 'exports.label = "this-default";\nexports.count = 42;\nmodule.exports = this;\n',
    }),
};

const packageNames = Object.keys(packages);

export function referencesE2eNodeModuleFixture(source: string): boolean {
    return packageNames.some((name) => source.includes(name));
}

export async function ensureE2eNodeModuleFixtures(): Promise<void> {
    const nodeModules = path.join(rootDir, "node_modules");
    await fs.mkdir(nodeModules, { recursive: true });

    await Promise.all(
        Object.entries(packages).map(async ([name, fixture]) => {
            const packageRoot = path.join(nodeModules, name);
            await fs.mkdir(packageRoot, { recursive: true });
            if (fixture.packageJson) {
                await writeFileIfChanged(
                    path.join(packageRoot, "package.json"),
                    JSON.stringify(fixture.packageJson, null, 2) + "\n",
                );
            }
            await Promise.all(
                Object.entries(fixture.files).map(([relative, content]) =>
                    writeFileIfChanged(path.join(packageRoot, relative), content),
                ),
            );
        }),
    );
}

async function writeFileIfChanged(fileName: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(fileName), { recursive: true });
    try {
        if ((await fs.readFile(fileName, "utf8")) === content) return;
    } catch {
        // Missing files are written below.
    }
    await fs.writeFile(fileName, content, "utf8");
}
