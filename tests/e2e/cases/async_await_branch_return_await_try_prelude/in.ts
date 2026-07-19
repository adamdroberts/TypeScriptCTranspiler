import { setTimeout as delay } from "node:timers/promises";

async function declaration(flag: boolean, prefix: string): Promise<string> {
    if (flag) {
        let label = prefix + "branch";
        try {
            label = label + "-try";
        } finally {
            label = label + "-finally";
        }
        return await delay(1, label);
    }
    let label = prefix + "fall";
    try {
        label = label + "-try";
    } finally {
        label = label + "-finally";
    }
    return await delay(2, label);
}

class Worker {
    async run(flag: boolean, prefix: string): Promise<string> {
        if (flag) {
            let label = prefix + "method-branch";
            try {
                label = label + "-try";
            } finally {
                label = label + "-finally";
            }
            return await delay(3, label);
        }
        let label = prefix + "method-fall";
        try {
            label = label + "-try";
        } finally {
            label = label + "-finally";
        }
        return await delay(4, label);
    }
}

const value = async (flag: boolean, prefix: string): Promise<string> => {
    if (flag) {
        let label = prefix + "value-branch";
        try {
            label = label + "-try";
        } finally {
            label = label + "-finally";
        }
        return await delay(5, label);
    }
    let label = prefix + "value-fall";
    try {
        label = label + "-try";
    } finally {
        label = label + "-finally";
    }
    return await delay(6, label);
};

declaration(true, "fn-").then((result) => console.log("declaration-branch:", result));
declaration(false, "fn-").then((result) => console.log("declaration-fall:", result));
new Worker().run(true, "this-").then((result) => console.log("method-branch:", result));
new Worker().run(false, "this-").then((result) => console.log("method-fall:", result));
value(true, "arrow-").then((result) => console.log("value-branch:", result));
value(false, "arrow-").then((result) => console.log("value-fall:", result));
