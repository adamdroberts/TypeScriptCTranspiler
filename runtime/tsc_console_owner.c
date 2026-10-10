#include "tsc_internal.h"

static tsc_value_t console_original_method(const char* name);
#define TSC_CONSOLE_METHOD(name, error) \
    static tsc_value_t console_export_##name(void* env,tsc_value_t receiver) { \
        (void)env;(void)receiver;return console_original_method(#name); }
#include "tsc_console_methods.def"
#undef TSC_CONSOLE_METHOD
typedef struct { const char* name; bool error; tsc_accessor_getter_t getter; } console_member_t;
#define TSC_CONSOLE_METHOD(name, error) {#name,error,console_export_##name},
static const console_member_t console_members[] = {
#include "tsc_console_methods.def"
};
#undef TSC_CONSOLE_METHOD
typedef struct {
    tsc_object_t* object;
    tsc_object_t* namespace_object;
    tsc_value_t methods[sizeof(console_members)/sizeof(console_members[0])];
    void* method_roots[sizeof(console_members)/sizeof(console_members[0])];
} console_realm_t;
static const char console_realm_key;
static console_realm_t* console_realm(void);

static tsc_value_t console_apply(void* env,tsc_value_t receiver,tsc_array_t* arguments) {
    (void)receiver;
    const console_member_t* member=env;
    tsc_console_write_values(member->error,arguments);
    return tsc_value_undefined();
}
static tsc_value_t console_original_method(const char* name) {
    console_realm_t* state=console_realm();
    for(size_t index=0;index<sizeof(console_members)/sizeof(console_members[0]);++index)
        if(!strcmp(console_members[index].name,name))return state->methods[index];
    tsc_throw_error(TSC_ERROR_TYPE,tsc_str_from_cstr("Unknown console export"));
}
static tsc_value_t console_export_default(void* env,tsc_value_t receiver){(void)env;(void)receiver;return tsc_console_owner_value();}

static console_realm_t* console_realm(void) {
    console_realm_t* state=tsc_realm_state_get(&console_realm_key);
    if(state)return state;
    state=TSC_GC_MALLOC(sizeof(*state));memset(state,0,sizeof(*state));
    tsc_realm_state_set(&console_realm_key,state);
    /* Node's global console has an empty ordinary object in its prototype
     * chain. Methods are bound to the original owner and remain detachable. */
    tsc_value_t prototype=tsc_value_object(tsc_object_new());
    state->object=tsc_object_new_with_prototype(prototype);
    state->namespace_object=tsc_module_namespace_new();
    for(size_t index=0;index<sizeof(console_members)/sizeof(console_members[0]);++index) {
        const console_member_t* member=&console_members[index];
        tsc_str_t* name=tsc_str_from_cstr(member->name);
        tsc_value_t target=tsc_value_function_named_kind(console_apply,NULL,(void*)member,0,name,TSC_FUNCTION_IDENTITY_BUILTIN);
        void* volatile target_root=tsc_value_gc_root(target);
        tsc_value_t function=tsc_value_bind_function(target,tsc_value_object(state->object),tsc_array_new(sizeof(tsc_value_t),0));
        state->methods[index]=function;state->method_roots[index]=tsc_value_gc_root(function);
        (void)tsc_value_define_property_desc(function,tsc_str_from_lit("name",4),tsc_value_string(name),true,false,true,false,true,true,true);
        (void)tsc_value_define_property_desc(tsc_value_object(state->object),name,function,true,true,true,true,true,true,true);
        (void)tsc_module_namespace_define(state->namespace_object,name,member->getter);
        (void)target_root;
    }
    (void)tsc_module_namespace_define(state->namespace_object,tsc_str_from_lit("default",7),console_export_default);
    tsc_module_namespace_finalize(state->namespace_object);
    return state;
}
tsc_value_t tsc_console_owner_value(void){return tsc_value_object(console_realm()->object);}
tsc_value_t tsc_console_module_value(bool namespace_object){
    console_realm_t* state=console_realm();
    return tsc_value_object(namespace_object?state->namespace_object:state->object);
}
tsc_value_t tsc_console_module_export_value(tsc_str_t* name){return tsc_value_get_prop(tsc_console_module_value(true),name);}
