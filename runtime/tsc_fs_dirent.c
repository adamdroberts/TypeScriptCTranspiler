#include "tsc_internal.h"

typedef struct { const char* name; double type; } dirent_member_t;
static const dirent_member_t members[]={
#define TSC_FS_DIRENT_METHOD(name, field, type) {#name,type},
#include "tsc_fs_dirent.def"
#undef TSC_FS_DIRENT_METHOD
};
typedef struct {
    tsc_value_t prototype,constructor,type_symbol,exports;
    tsc_object_t* namespace_object;
    void* prototype_root;void* constructor_root;void* type_symbol_root;void* exports_root;
} dirent_realm_t;
static const char dirent_realm_key;
static dirent_realm_t* dirent_realm(void);
static tsc_value_t dirent_export_get(void* env,tsc_value_t receiver){(void)receiver;return ((dirent_realm_t*)env)->constructor;}
static tsc_value_t dirent_default_get(void* env,tsc_value_t receiver){(void)receiver;return ((dirent_realm_t*)env)->exports;}
static tsc_value_t argument(tsc_array_t* args,size_t index){return args&&index<args->len?TSC_ARR(tsc_value_t,args,index):tsc_value_undefined();}
static tsc_str_t* key(const char* text){return tsc_str_from_cstr(text);}
static tsc_value_t dirent_method(void* env,tsc_value_t receiver,tsc_array_t* args) {
    (void)args;const dirent_member_t* member=env;
    if(tsc_value_is_undefined(receiver)||(value_is_box(receiver)&&value_tag(receiver)==TSC_VALUE_TAG_NULL))
        tsc_throw_error(TSC_ERROR_TYPE,key("Dirent method requires a receiver"));
    tsc_value_t type=tsc_value_get_prop(receiver,tsc_symbol_property_key(value_ptr(dirent_realm()->type_symbol)));
    return tsc_value_bool(type==tsc_value_num(member->type));
}
static tsc_value_t dirent_apply(void* env,tsc_value_t receiver,tsc_array_t* args) {
    (void)env;(void)receiver;(void)args;tsc_throw_error(TSC_ERROR_TYPE,key("Dirent constructor requires new"));return tsc_value_undefined();
}
static void dirent_initialize(tsc_value_t receiver,tsc_value_t name,tsc_value_t type,tsc_value_t parent) {
    void* volatile roots[]={tsc_value_gc_root(receiver),tsc_value_gc_root(name),tsc_value_gc_root(type),tsc_value_gc_root(parent)};
    dirent_realm_t* realm=dirent_realm();
    (void)tsc_value_define_property_desc(receiver,key("name"),name,true,true,true,true,true,true,true);
    (void)tsc_value_define_property_desc(receiver,key("parentPath"),parent,true,true,true,true,true,true,true);
    (void)tsc_value_define_property_desc(receiver,tsc_symbol_property_key(value_ptr(realm->type_symbol)),type,true,true,true,true,true,true,true);
    (void)roots;
}
static tsc_value_t dirent_construct(void* env,tsc_value_t receiver,tsc_array_t* args) {
    (void)env;(void)receiver;
    tsc_value_t prototype=tsc_value_get_prototype_from_constructor(tsc_value_current_new_target(),TSC_INTRINSIC_DEFAULT_FS_DIRENT_PROTOTYPE);
    void* volatile prototype_root=tsc_value_gc_root(prototype);
    tsc_value_t result=tsc_value_object(tsc_object_new());void* volatile result_root=tsc_value_gc_root(result);
    (void)tsc_value_object_set_prototype_of(result,prototype);
    dirent_initialize(result,argument(args,0),argument(args,1),argument(args,2));
    (void)prototype_root;(void)result_root;return result;
}
static dirent_realm_t* dirent_realm(void) {
    dirent_realm_t* realm=tsc_realm_state_get(&dirent_realm_key);if(realm)return realm;
    realm=TSC_GC_MALLOC(sizeof(*realm));memset(realm,0,sizeof(*realm));tsc_realm_state_set(&dirent_realm_key,realm);
    realm->type_symbol=tsc_value_symbol(tsc_symbol_new(key("type")));realm->type_symbol_root=tsc_value_gc_root(realm->type_symbol);
    realm->prototype=tsc_value_object(tsc_object_new());realm->prototype_root=tsc_value_gc_root(realm->prototype);
    realm->constructor=tsc_value_function_named_kind(dirent_apply,dirent_construct,NULL,3,key("Dirent"),TSC_FUNCTION_IDENTITY_BUILTIN);
    tsc_function_identity_t* identity=tsc_value_gc_root(realm->constructor);realm->constructor_root=identity;
    identity->construct_allocates_receiver=false;identity->construct_default_prototype=TSC_INTRINSIC_DEFAULT_FS_DIRENT_PROTOTYPE;
    tsc_function_identity_set_own_prototype(identity,realm->prototype);identity->func_prototype_writable=false;
    (void)tsc_value_define_property_desc(realm->prototype,key("constructor"),realm->constructor,true,true,true,false,true,true,true);
    for(size_t index=0;index<sizeof(members)/sizeof(members[0]);++index) {
        const dirent_member_t* member=&members[index];tsc_value_t method=tsc_value_function_named_kind(dirent_method,NULL,(void*)member,0,key(member->name),TSC_FUNCTION_IDENTITY_BUILTIN);
        (void)tsc_value_define_property_desc(realm->prototype,key(member->name),method,true,true,true,false,true,true,true);
    }
    realm->exports=tsc_value_object(tsc_object_new());realm->exports_root=tsc_value_gc_root(realm->exports);
    (void)tsc_value_define_property_desc(realm->exports,key("Dirent"),realm->constructor,true,true,true,true,true,true,true);
    realm->namespace_object=tsc_module_namespace_new();
    (void)tsc_object_define_accessor(realm->namespace_object,key("Dirent"),dirent_export_get,realm,true,NULL,NULL,false,true,true,false,true);
    (void)tsc_object_define_accessor(realm->namespace_object,key("default"),dirent_default_get,realm,true,NULL,NULL,false,true,true,false,true);
    tsc_module_namespace_finalize(realm->namespace_object);
    return realm;
}
tsc_value_t tsc_fs_dirent_constructor_value(void){return dirent_realm()->constructor;}
tsc_value_t tsc_fs_dirent_prototype_value(void){return dirent_realm()->prototype;}
tsc_value_t tsc_fs_dirent_export_owner_value(void){return dirent_realm()->exports;}
tsc_value_t tsc_fs_dirent_module_value(bool namespace_import){return namespace_import?tsc_value_object(dirent_realm()->namespace_object):dirent_realm()->exports;}
tsc_value_t tsc_fs_dirent_export_value(tsc_str_t* name){return tsc_value_get_prop(tsc_fs_dirent_module_value(true),name);}
tsc_value_t tsc_fs_dirent_create_value(tsc_value_t name,tsc_value_t type,tsc_value_t parent) {
    void* volatile roots[]={tsc_value_gc_root(name),tsc_value_gc_root(type),tsc_value_gc_root(parent)};
    dirent_realm_t* realm=dirent_realm();
    tsc_value_t result=tsc_value_object(tsc_object_new());void* volatile root=tsc_value_gc_root(result);
    (void)tsc_value_object_set_prototype_of(result,realm->prototype);dirent_initialize(result,name,type,parent);
    (void)roots;(void)root;return result;
}
