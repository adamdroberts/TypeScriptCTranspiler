#include "tsc_internal.h"
#include <stddef.h>

/* Host URL owners use the same Realm, callable, descriptor and Reference
 * machinery as language intrinsics. Parsing stays in the shared URL kernel. */
typedef enum { URL_OWNER, PARAMS_OWNER, URL_OWNER_COUNT } url_owner_kind_t;
typedef enum { URL_FIELD, URL_PARAMS, URL_STRING, URL_CAN_PARSE, PARAMS_SIZE,
    PARAMS_APPEND, PARAMS_DELETE, PARAMS_GET, PARAMS_GET_ALL, PARAMS_HAS,
    PARAMS_SET, PARAMS_STRING, PARAMS_SORT, PARAMS_KEYS, PARAMS_VALUES,
    PARAMS_ENTRIES, PARAMS_FOREACH } url_operation_t;
typedef struct { url_owner_kind_t owner; const char* name; double length;
    url_operation_t operation; size_t offset; bool getter, writable, is_static; } url_member_t;
#define FIELD(name, writable) { URL_OWNER, #name, 0, URL_FIELD, offsetof(tsc_url_t, name), true, writable, false }
#define METHOD(owner, name, length, operation) { owner, name, length, operation, 0, false, false, false }
static const url_member_t url_members[] = {
    FIELD(href, true), FIELD(protocol, true), FIELD(host, true), FIELD(hostname, true),
    FIELD(username, true), FIELD(password, true), FIELD(port, true), FIELD(pathname, true),
    FIELD(search, true), FIELD(hash, true), FIELD(origin, false),
    { URL_OWNER, "searchParams", 0, URL_PARAMS, 0, true, false, false },
    METHOD(URL_OWNER, "toString", 0, URL_STRING), METHOD(URL_OWNER, "toJSON", 0, URL_STRING),
    { URL_OWNER, "canParse", 1, URL_CAN_PARSE, 0, false, false, true },
    { PARAMS_OWNER, "size", 0, PARAMS_SIZE, 0, true, false, false },
    METHOD(PARAMS_OWNER, "append", 2, PARAMS_APPEND), METHOD(PARAMS_OWNER, "delete", 1, PARAMS_DELETE),
    METHOD(PARAMS_OWNER, "get", 1, PARAMS_GET), METHOD(PARAMS_OWNER, "getAll", 1, PARAMS_GET_ALL),
    METHOD(PARAMS_OWNER, "has", 1, PARAMS_HAS), METHOD(PARAMS_OWNER, "set", 2, PARAMS_SET),
    METHOD(PARAMS_OWNER, "toString", 0, PARAMS_STRING), METHOD(PARAMS_OWNER, "sort", 0, PARAMS_SORT),
    METHOD(PARAMS_OWNER, "keys", 0, PARAMS_KEYS), METHOD(PARAMS_OWNER, "values", 0, PARAMS_VALUES),
    METHOD(PARAMS_OWNER, "entries", 0, PARAMS_ENTRIES), METHOD(PARAMS_OWNER, "forEach", 1, PARAMS_FOREACH),
};
#undef FIELD
#undef METHOD
typedef struct { const char* name; double length; tsc_intrinsic_default_prototype_kind_t prototype; } url_constructor_t;
static const url_constructor_t url_constructors[] = {
    { "URL", 1, TSC_INTRINSIC_DEFAULT_URL_PROTOTYPE },
    { "URLSearchParams", 0, TSC_INTRINSIC_DEFAULT_URL_SEARCH_PARAMS_PROTOTYPE },
};
typedef struct { tsc_value_t constructors[URL_OWNER_COUNT], prototypes[URL_OWNER_COUNT], iterator_prototype;
    void* constructor_roots[URL_OWNER_COUNT]; void* prototype_roots[URL_OWNER_COUNT]; void* iterator_root;
    tsc_object_t* module_namespace; tsc_object_t* module_default;
    tsc_value_t path_functions[2]; void* path_function_roots[2];
} url_realm_state_t;
static const char url_realm_key;
static url_realm_state_t* url_realm_state(void);
static tsc_str_t* key(const char* name) { return tsc_str_from_cstr(name); }
static tsc_value_t argument(tsc_array_t* args, size_t index) {
    return args && index < args->len ? TSC_ARR(tsc_value_t, args, index) : tsc_value_undefined();
}
static tsc_str_t* string_argument(tsc_array_t* args, size_t index) {
    return tsc_str_to_well_formed(tsc_value_to_string_coercion(argument(args, index)));
}
static void require_arguments(tsc_array_t* args, size_t count) {
    if (!args || args->len < count) tsc_throw_error(TSC_ERROR_TYPE, key("URL operation requires more arguments"));
}
static void define_value(tsc_value_t object, tsc_str_t* name, tsc_value_t value, bool enumerable) {
    (void)tsc_value_define_property_desc(object, name, value, true, true, true, enumerable, true, true, true);
}
static tsc_object_t* receiver_object(tsc_value_t receiver, url_owner_kind_t kind) {
    tsc_object_t* object = value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_OBJECT
        ? (tsc_object_t*)tsc_value_gc_root(receiver) : NULL;
    if (!object || !(kind == URL_OWNER ? object->is_url : object->is_url_search_params))
        tsc_throw_error(TSC_ERROR_TYPE, key("URL operation has an incompatible receiver"));
    return object;
}
static tsc_str_t* url_serialize(tsc_url_t* url) {
    tsc_str_t* authority = url->host;
    if (url->username->len || url->password->len) {
        tsc_str_t* info = url->username;
        if (url->password->len) info = tsc_str_concat(tsc_str_concat(info, key(":")), url->password);
        authority = tsc_str_concat(tsc_str_concat(info, key("@")), authority);
    }
    return tsc_str_concat(tsc_str_concat(tsc_str_concat(tsc_str_concat(tsc_str_concat(
        url->protocol, key("//")), authority), url->pathname), url->search), url->hash);
}
static void params_changed(tsc_url_search_params_t* params) {
    if (!params->owner_url) return;
    tsc_str_t* query = tsc_url_search_params_to_string(params);
    params->owner_url->search = query->len ? tsc_str_concat(key("?"), query) : key("");
    params->owner_url->href = url_serialize(params->owner_url);
}
static tsc_url_search_params_t* url_params(tsc_url_t* url) {
    if (!url->search_params) {
        url->search_params = tsc_url_search_params_new(url->search);
        url->search_params->owner_url = url;
    }
    return url->search_params;
}
static void url_replace(tsc_url_t* target, tsc_url_t* parsed) {
    tsc_object_t* object = target->object;
    tsc_url_search_params_t* params = target->search_params;
    *target = *parsed; target->object = object; target->search_params = params;
    if (params) {
        tsc_url_search_params_t* fresh = tsc_url_search_params_new(target->search);
        params->items = fresh->items; params->len = fresh->len; params->cap = fresh->cap;
    }
}
static tsc_value_t url_setter(void* env, tsc_value_t receiver, tsc_array_t* args) {
    const url_member_t* member = env;
    tsc_url_t* url = receiver_object(receiver, URL_OWNER)->class_ptr;
    tsc_str_t* value = string_argument(args, 0);
    if (member->offset == offsetof(tsc_url_t, href)) {
        if (!tsc_url_can_parse(value)) tsc_throw_error(TSC_ERROR_TYPE, key("Invalid URL"));
        url_replace(url, tsc_url_new(value));
    } else {
        tsc_url_t copy = *url;
        if (member->offset == offsetof(tsc_url_t, protocol) && value->len && value->data[value->len-1] != ':')
            value = tsc_str_concat(value, key(":"));
        if (member->offset == offsetof(tsc_url_t, pathname) && (!value->len || value->data[0] != '/'))
            value = tsc_str_concat(key("/"), value);
        if (member->offset == offsetof(tsc_url_t, search) && value->len && value->data[0] != '?') value = tsc_str_concat(key("?"), value);
        if (member->offset == offsetof(tsc_url_t, hash) && value->len && value->data[0] != '#') value = tsc_str_concat(key("#"), value);
        *(tsc_str_t**)((char*)&copy + member->offset) = value;
        if (member->offset == offsetof(tsc_url_t, hostname) || member->offset == offsetof(tsc_url_t, port))
            copy.host = copy.port->len ? tsc_str_concat(tsc_str_concat(copy.hostname,key(":")),copy.port) : copy.hostname;
        tsc_str_t* serialized = url_serialize(&copy);
        if (tsc_url_can_parse(serialized)) url_replace(url, tsc_url_new(serialized));
    }
    return tsc_value_undefined();
}
typedef struct { tsc_url_search_params_t* params; size_t index; url_operation_t mode; } url_iterator_t;
static tsc_value_t iterator_next(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;(void)args;
    tsc_object_t* object = value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_OBJECT
        ? tsc_value_gc_root(receiver) : NULL;
    if (!object || !object->is_url_search_params_iterator) tsc_throw_error(TSC_ERROR_TYPE,key("URLSearchParams iterator has an incompatible receiver"));
    url_iterator_t* iterator = object->class_ptr;
    bool done = iterator->index >= iterator->params->len;
    tsc_value_t value = tsc_value_undefined();
    if (!done) {
        const tsc_url_search_param_t* pair = &iterator->params->items[iterator->index++];
        value = tsc_value_string(iterator->mode == PARAMS_KEYS ? pair->name : pair->value);
        if (iterator->mode == PARAMS_ENTRIES) {
            tsc_value_t parts[] = {tsc_value_string(pair->name),tsc_value_string(pair->value)};
            value = tsc_value_array(tsc_array_from_buf(sizeof(tsc_value_t), parts, 2));
        }
    }
    tsc_value_t result = tsc_value_object(tsc_object_new());
    define_value(result,key("value"),value,true);define_value(result,key("done"),tsc_value_bool(done),true);return result;
}
static tsc_value_t params_iterator(tsc_url_search_params_t* params, url_operation_t mode) {
    url_iterator_t* iterator = TSC_GC_MALLOC(sizeof(*iterator));*iterator = (url_iterator_t){params,0,mode};
    tsc_object_t* object = tsc_object_new_with_prototype(url_realm_state()->iterator_prototype);
    object->class_ptr = iterator;object->is_url_search_params_iterator = true;return tsc_value_object(object);
}
static tsc_array_t* string_values(tsc_array_t* strings) {
    tsc_array_t* values = tsc_array_new(sizeof(tsc_value_t), strings->len);
    for (size_t index = 0; index < strings->len; ++index) {
        tsc_value_t value = tsc_value_string(TSC_ARR(tsc_str_t*, strings, index));
        tsc_array_push_raw(values, &value);
    }
    return values;
}
static tsc_value_t url_member_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    const url_member_t* member = env;
    if (member->operation == URL_CAN_PARSE) {
        require_arguments(args,1);tsc_str_t* input = string_argument(args,0);
        if (tsc_value_is_undefined(argument(args,1))) return tsc_value_bool(tsc_url_can_parse(input));
        tsc_str_t* base = string_argument(args,1);return tsc_value_bool(tsc_url_can_parse_base(input,base));
    }
    tsc_object_t* object = receiver_object(receiver, member->owner);
    if (member->owner == URL_OWNER) {
        tsc_url_t* url = object->class_ptr;
        if (member->operation == URL_FIELD) return tsc_value_string(*(tsc_str_t**)((char*)url + member->offset));
        if (member->operation == URL_PARAMS) return tsc_value_url_search_params(url_params(url));
        return tsc_value_string(url->href);
    }
    tsc_url_search_params_t* params = object->class_ptr;
    if (member->operation == PARAMS_SIZE) return tsc_value_num((double)params->len);
    if (member->operation == PARAMS_STRING) return tsc_value_string(tsc_url_search_params_to_string(params));
    if (member->operation == PARAMS_SORT) {tsc_url_search_params_sort(params);params_changed(params);return tsc_value_undefined();}
    if (member->operation == PARAMS_KEYS || member->operation == PARAMS_VALUES || member->operation == PARAMS_ENTRIES)
        return params_iterator(params,member->operation);
    if (member->operation == PARAMS_FOREACH) {
        require_arguments(args,1);tsc_value_t callback = argument(args,0), this_arg = argument(args,1);
        if (!tsc_value_is_callable(callback)) tsc_throw_error(TSC_ERROR_TYPE,key("URLSearchParams.forEach callback is not callable"));
        for (size_t index=0;index<params->len;++index) {
            tsc_value_t actuals[] = {tsc_value_string(params->items[index].value),tsc_value_string(params->items[index].name),receiver};
            (void)tsc_value_apply_function(callback,this_arg,tsc_value_array(tsc_array_from_buf(sizeof(tsc_value_t),actuals,3)));
        }
        return tsc_value_undefined();
    }
    require_arguments(args, member->operation == PARAMS_APPEND || member->operation == PARAMS_SET ? 2 : 1);
    tsc_str_t* name = string_argument(args,0);
    bool uses_value = member->operation == PARAMS_APPEND || member->operation == PARAMS_SET ||
        member->operation == PARAMS_DELETE || member->operation == PARAMS_HAS;
    tsc_str_t* value = !uses_value || tsc_value_is_undefined(argument(args,1)) ? NULL : string_argument(args,1);
    switch (member->operation) {
        case PARAMS_APPEND: tsc_url_search_params_append(params,name,value ? value : key("undefined"));break;
        case PARAMS_DELETE: tsc_url_search_params_delete(params,name,value);break;
        case PARAMS_GET: {tsc_str_t* found=tsc_url_search_params_get(params,name);return found?tsc_value_string(found):tsc_value_null();}
        case PARAMS_GET_ALL: return tsc_value_array(string_values(tsc_url_search_params_get_all(params,name)));
        case PARAMS_HAS: return tsc_value_bool(tsc_url_search_params_has(params,name,value));
        case PARAMS_SET: tsc_url_search_params_set(params,name,value ? value : key("undefined"));break;
        default: tsc_panic("unknown URL member descriptor");
    }
    params_changed(params);return tsc_value_undefined();
}
static void params_initialize(tsc_url_search_params_t* params, tsc_value_t input) {
    if (tsc_value_is_undefined(input)) return;
    if (!tsc_value_is_object(input)) {
        tsc_url_search_params_t* parsed=tsc_url_search_params_new(tsc_str_to_well_formed(tsc_value_to_string_coercion(input)));
        params->items=parsed->items;params->len=parsed->len;params->cap=parsed->cap;return;
    }
    tsc_value_t method=tsc_value_get_prop(input,tsc_symbol_property_key(tsc_symbol_iterator()));
    if (!tsc_value_is_nullish(method)) {
        tsc_sync_iterator_t* outer=TSC_GC_MALLOC(sizeof(*outer));
        *outer=tsc_sync_iterator_open_with_method(input,method);tsc_value_t item;
        while(tsc_sync_iterator_step(outer,&item)) {
            void* volatile item_root=tsc_value_gc_root(item);
            TSC_TRY_FRAME(outer_frame);tsc_try_push(&outer_frame);
            if(setjmp(outer_frame.jb)) {
                tsc_value_t error=tsc_current_error_value();tsc_try_pop();
                tsc_sync_iterator_close_abrupt(outer,error);
            }
            if(!tsc_value_is_object(item))tsc_throw_error(TSC_ERROR_TYPE,key("URLSearchParams entry must be an iterable object"));
            tsc_sync_iterator_t* inner=TSC_GC_MALLOC(sizeof(*inner));*inner=tsc_sync_iterator_open(item);
            tsc_array_t* pair=tsc_array_new(sizeof(tsc_str_t*),2);tsc_value_t element;
            while(tsc_sync_iterator_step(inner,&element)) {
                void* volatile element_root=tsc_value_gc_root(element);
                TSC_TRY_FRAME(inner_frame);tsc_try_push(&inner_frame);
                if(setjmp(inner_frame.jb)) {
                    tsc_value_t error=tsc_current_error_value();tsc_try_pop();
                    tsc_sync_iterator_close_abrupt(inner,error);
                }
                tsc_str_t* string=tsc_str_to_well_formed(tsc_value_to_string_coercion(element));
                tsc_array_push_raw(pair,&string);tsc_try_pop();(void)element_root;
            }
            if(pair->len!=2)tsc_throw_error(TSC_ERROR_TYPE,key("URLSearchParams entry must contain a name and value"));
            tsc_url_search_params_append(params,TSC_ARR(tsc_str_t*,pair,0),TSC_ARR(tsc_str_t*,pair,1));
            tsc_try_pop();(void)item_root;
        }
        return;
    }
    tsc_array_t* names=tsc_value_object_keys(input);
    for(size_t index=0;index<names->len;++index) {
        tsc_str_t* name=TSC_ARR(tsc_str_t*,names,index);
        tsc_url_search_params_set(params,tsc_str_to_well_formed(name),tsc_str_to_well_formed(tsc_value_to_string_coercion(tsc_value_get_prop(input,name))));
    }
}
static tsc_value_t url_constructor_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)env;(void)receiver;(void)args;tsc_throw_error(TSC_ERROR_TYPE,key("URL constructor requires new"));return tsc_value_undefined();
}
static tsc_value_t url_constructor_construct(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;const url_constructor_t* descriptor=env;url_owner_kind_t kind=(url_owner_kind_t)(descriptor-url_constructors);
    tsc_value_t result;
    if(kind==URL_OWNER) {
        require_arguments(args,1);tsc_str_t* input=string_argument(args,0),*base=NULL;
        if(!tsc_value_is_undefined(argument(args,1)))base=string_argument(args,1);
        if(!(base?tsc_url_can_parse_base(input,base):tsc_url_can_parse(input)))tsc_throw_error(TSC_ERROR_TYPE,key("Invalid URL"));
        result=tsc_value_url(base?tsc_url_new_base(input,base):tsc_url_new(input));
    } else {
        tsc_url_search_params_t* params=tsc_url_search_params_new(key(""));params_initialize(params,argument(args,0));result=tsc_value_url_search_params(params);
    }
    tsc_value_t prototype=tsc_value_get_prototype_from_constructor(tsc_value_current_new_target(),descriptor->prototype);
    (void)tsc_value_object_set_prototype_of(result,prototype);return result;
}
static url_realm_state_t* url_realm_state(void) {
    url_realm_state_t* state=tsc_realm_state_get(&url_realm_key);if(state)return state;
    state=TSC_GC_MALLOC(sizeof(*state));memset(state,0,sizeof(*state));tsc_realm_state_set(&url_realm_key,state);
    for(size_t index=0;index<URL_OWNER_COUNT;++index) {
        state->prototypes[index]=tsc_value_object(tsc_object_new());state->prototype_roots[index]=tsc_value_gc_root(state->prototypes[index]);
        const url_constructor_t* descriptor=&url_constructors[index];
        state->constructors[index]=tsc_value_function_named_kind(url_constructor_apply,url_constructor_construct,(void*)descriptor,descriptor->length,key(descriptor->name),TSC_FUNCTION_IDENTITY_BUILTIN);
        tsc_function_identity_t* identity=tsc_value_gc_root(state->constructors[index]);identity->construct_allocates_receiver=false;identity->construct_default_prototype=descriptor->prototype;
        tsc_function_identity_set_own_prototype(identity,state->prototypes[index]);identity->func_prototype_writable=false;
        state->constructor_roots[index]=identity;define_value(state->prototypes[index],key("constructor"),state->constructors[index],false);
        (void)tsc_value_define_property_desc(state->prototypes[index],tsc_symbol_property_key(tsc_symbol_to_string_tag()),tsc_value_string(key(descriptor->name)),true,false,true,false,true,true,true);
    }
    for(size_t index=0;index<sizeof(url_members)/sizeof(url_members[0]);++index) {
        const url_member_t* member=&url_members[index];tsc_value_t object=member->is_static?state->constructors[member->owner]:state->prototypes[member->owner];
        tsc_str_t* name=key(member->name);tsc_value_t function=tsc_value_function_named_kind(url_member_apply,NULL,(void*)member,member->length,member->getter?tsc_str_concat(key("get "),name):name,TSC_FUNCTION_IDENTITY_BUILTIN);
        if(member->getter) {
            tsc_value_t descriptor=tsc_value_object(tsc_object_new());define_value(descriptor,key("get"),function,true);
            if(member->writable)define_value(descriptor,key("set"),tsc_value_function_named_kind(url_setter,NULL,(void*)member,1,tsc_str_concat(key("set "),name),TSC_FUNCTION_IDENTITY_BUILTIN),true);
            define_value(descriptor,key("enumerable"),tsc_value_bool(true),true);define_value(descriptor,key("configurable"),tsc_value_bool(true),true);(void)tsc_value_define_property_descriptor(object,name,descriptor);
        } else define_value(object,name,function,true);
    }
    tsc_value_t entries=tsc_value_get_prop(state->prototypes[PARAMS_OWNER],key("entries"));define_value(state->prototypes[PARAMS_OWNER],tsc_symbol_property_key(tsc_symbol_iterator()),entries,true);
    state->iterator_prototype=tsc_value_object(tsc_object_new_with_prototype(tsc_iterator_prototype_value()));state->iterator_root=tsc_value_gc_root(state->iterator_prototype);
    define_value(state->iterator_prototype,key("next"),tsc_value_function_named_kind(iterator_next,NULL,NULL,0,key("next"),TSC_FUNCTION_IDENTITY_BUILTIN),true);
    (void)tsc_value_define_property_desc(state->iterator_prototype,tsc_symbol_property_key(tsc_symbol_to_string_tag()),tsc_value_string(key("URLSearchParams Iterator")),true,false,true,false,true,true,true);
    return state;
}
tsc_value_t tsc_url_constructor_value(void){return url_realm_state()->constructors[URL_OWNER];}
tsc_value_t tsc_url_search_params_constructor_value(void){return url_realm_state()->constructors[PARAMS_OWNER];}
tsc_value_t tsc_url_prototype_value(void){return url_realm_state()->prototypes[URL_OWNER];}
tsc_value_t tsc_url_search_params_prototype_value(void){return url_realm_state()->prototypes[PARAMS_OWNER];}
tsc_str_t* tsc_url_file_path_value(tsc_value_t value) {
    if (value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_STRING)
        return tsc_value_as_string(value);
    if (value_is_box(value) && value_tag(value) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = tsc_value_gc_root(value);
        if (object->is_url) return tsc_url_file_path(object->class_ptr);
        if (object->is_buffer) return tsc_buffer_to_string(object->class_ptr, key("utf8"));
    }
    tsc_throw_error(TSC_ERROR_TYPE, key("Filesystem path must be a string, Buffer, or file URL"));
}
static tsc_value_t path_function_apply(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;require_arguments(args,1);
    if ((uintptr_t)env == 0) {
        tsc_value_t input=argument(args,0);
        if(value_is_box(input)&&value_tag(input)==TSC_VALUE_TAG_STRING)
            return tsc_value_string(tsc_url_file_url_to_path(tsc_value_as_string(input)));
        return tsc_value_string(tsc_url_file_path(receiver_object(input,URL_OWNER)->class_ptr));
    }
    return tsc_value_url(tsc_url_path_to_file_url(string_argument(args,0)));
}
static tsc_value_t module_url(void* env,tsc_value_t receiver){(void)env;(void)receiver;return tsc_url_constructor_value();}
static tsc_value_t module_params(void* env,tsc_value_t receiver){(void)env;(void)receiver;return tsc_url_search_params_constructor_value();}
static tsc_value_t module_file_path(void* env,tsc_value_t receiver){(void)env;(void)receiver;return url_realm_state()->path_functions[0];}
static tsc_value_t module_path_url(void* env,tsc_value_t receiver){(void)env;(void)receiver;return url_realm_state()->path_functions[1];}
static tsc_value_t module_default(void* env,tsc_value_t receiver){(void)env;(void)receiver;return tsc_url_module_value(false);}
static const struct {const char* name;tsc_accessor_getter_t getter;} url_exports[] = {
    {"URL",module_url},{"URLSearchParams",module_params},
    {"fileURLToPath",module_file_path},{"pathToFileURL",module_path_url},
};
tsc_value_t tsc_url_module_value(bool namespace_object) {
    url_realm_state_t* state=url_realm_state();
    if(!state->module_default) {
        state->module_default=tsc_object_new();state->module_namespace=tsc_module_namespace_new();
        const char* path_names[]={"fileURLToPath","pathToFileURL"};
        for(size_t index=0;index<sizeof(path_names)/sizeof(path_names[0]);++index) {
            state->path_functions[index]=tsc_value_function_named_kind(path_function_apply,NULL,(void*)(uintptr_t)index,1,key(path_names[index]),TSC_FUNCTION_IDENTITY_BUILTIN);
            state->path_function_roots[index]=tsc_value_gc_root(state->path_functions[index]);
        }
        for(size_t index=0;index<sizeof(url_exports)/sizeof(url_exports[0]);++index) {
            tsc_str_t* name=key(url_exports[index].name);
            define_value(tsc_value_object(state->module_default),name,url_exports[index].getter(NULL,tsc_value_undefined()),true);
            (void)tsc_module_namespace_define(state->module_namespace,name,url_exports[index].getter);
        }
        (void)tsc_module_namespace_define(state->module_namespace,key("default"),module_default);
        tsc_module_namespace_finalize(state->module_namespace);
    }
    return tsc_value_object(namespace_object?state->module_namespace:state->module_default);
}
tsc_value_t tsc_url_module_export_value(tsc_str_t* name) {
    return tsc_value_get_prop(tsc_url_module_value(true),name);
}
