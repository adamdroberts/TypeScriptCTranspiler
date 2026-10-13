import { CBuf } from "./cbuf";

/** Every generated mutable cell belongs to one retained semantic-agent
 * storage collection. Physical field names stay outside source-name macros. */
export class AgentStoragePlan {
    private readonly fields = new Map<string,string>();

    declare(type:string,name:string):void {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || this.fields.has(name) && this.fields.get(name)!==type)
            throw new Error("generated agent storage requires a canonical declaration");
        this.fields.set(name,type);
    }

    emit():string {
        const output = new CBuf();
        output.open("typedef struct");
        for (const [name,type] of this.fields) output.line(`${type} storage_${name};`);
        output.close(" tsc_program_storage_t;");
        output.line("static const char tsc_program_storage_key;");
        output.open("static tsc_program_storage_t* tsc_program_storage(void)");
        output.line("return tsc_agent_storage(&tsc_program_storage_key, sizeof(tsc_program_storage_t));");
        output.close();
        for (const name of this.fields.keys()) output.lineRaw(`#define ${name} (tsc_program_storage()->storage_${name})`);
        output.line();
        return output.toString();
    }
}
