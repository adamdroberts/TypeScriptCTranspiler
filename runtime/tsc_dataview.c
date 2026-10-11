#include "tsc_internal.h"

typedef enum {BUFFER=TSC_NUMERIC_CLAMPED+1, LENGTH, OFFSET} view_metadata_t;
#define SIGNED TSC_NUMERIC_SIGNED
#define UNSIGNED TSC_NUMERIC_UNSIGNED
#define FLOAT TSC_NUMERIC_FLOAT
#define BIG_SIGNED TSC_NUMERIC_BIG_SIGNED
#define BIG_UNSIGNED TSC_NUMERIC_BIG_UNSIGNED
typedef struct {const char* name; size_t width; int format; bool setter, getter; size_t length;} view_member_t;
static const view_member_t view_members[]={
#define TSC_DATAVIEW_ELEMENT(name, width, format)
#define TSC_DATAVIEW_GETTER(name, format) {#name,0,format,false,true,0},
#include "tsc_dataview.def"
#undef TSC_DATAVIEW_ELEMENT
#undef TSC_DATAVIEW_GETTER
#define TSC_DATAVIEW_ELEMENT(name, width, format) {"get" #name,width,format,false,false,1},{"set" #name,width,format,true,false,2},
#define TSC_DATAVIEW_GETTER(name, format)
#include "tsc_dataview.def"
#undef TSC_DATAVIEW_ELEMENT
#undef TSC_DATAVIEW_GETTER
};
typedef struct {tsc_value_t constructor,prototype;void* constructor_root;void* prototype_root;} view_realm_t;
static const char view_realm_key;
static view_realm_t* view_realm(void);
static tsc_str_t* key(const char* text){return tsc_str_from_cstr(text);}
static tsc_value_t argument(tsc_array_t* args,size_t index){return args&&index<args->len?TSC_ARR(tsc_value_t,args,index):tsc_value_undefined();}
static tsc_data_view_t* require_view(tsc_value_t receiver){
    if(value_is_box(receiver)&&value_tag(receiver)==TSC_VALUE_TAG_OBJECT){
        tsc_object_t* object=value_ptr(receiver);
        if(object->is_data_view&&object->class_ptr)return object->class_ptr;
    }
    tsc_throw_error(TSC_ERROR_TYPE,key("DataView receiver lacks its internal slots"));return NULL;
}
static tsc_array_buffer_t* require_buffer(tsc_value_t value){
    if(value_is_box(value)&&value_tag(value)==TSC_VALUE_TAG_OBJECT){
        tsc_object_t* object=value_ptr(value);
        if(object->is_array_buffer&&object->class_ptr)return object->class_ptr;
    }
    tsc_throw_error(TSC_ERROR_TYPE,key("DataView requires an ArrayBuffer"));return NULL;
}
static void require_attached(tsc_array_buffer_t* buffer){
    if(buffer->detached)tsc_throw_error(TSC_ERROR_TYPE,key("DataView buffer is detached"));
}
static tsc_value_t view_member_apply(void* environment,tsc_value_t receiver,tsc_array_t* args){
    const view_member_t* member=environment;
    void* volatile receiver_root=tsc_value_gc_root(receiver);
    tsc_array_t* volatile actuals=args;
    tsc_data_view_t* volatile view=require_view(receiver);
    if(member->getter){
        if(member->format==BUFFER)return tsc_value_array_buffer(view->buffer);
        tsc_data_view_witness_t witness=tsc_data_view_witness(view);
        return tsc_value_num((double)(member->format==LENGTH?witness.length:witness.offset));
    }
    double index=tsc_value_to_index(argument(actuals,0));
    uint64_t raw=0;
    if(member->setter){
        if(member->format==BIG_SIGNED||member->format==BIG_UNSIGNED){
            tsc_value_t integer=tsc_value_to_bigint(argument(actuals,1));
            tsc_bigint_t* volatile integer_root=tsc_value_as_bigint(integer);
            raw=tsc_bigint_to_uint64(integer_root);
        }else raw=tsc_numeric_number_to_bits(tsc_value_to_number(argument(actuals,1)),member->format,member->width);
    }
    bool little=tsc_value_is_truthy(argument(actuals,member->setter?2:1));
    tsc_data_view_witness_t witness=tsc_data_view_witness(view);
    if(member->width>witness.length||index>(double)(witness.length-member->width))
        tsc_throw_error(TSC_ERROR_RANGE,key("DataView access is outside its view bounds"));
    size_t offset=witness.offset+(size_t)index;
    if(member->setter)tsc_array_buffer_write_bits(view->buffer,offset,member->width,little,raw);
    else raw=tsc_array_buffer_read_bits(view->buffer,offset,member->width,little);
    (void)receiver_root;(void)actuals;
    return member->setter?tsc_value_undefined():tsc_numeric_bits_to_value(raw,member->format,member->width);
}
static tsc_value_t view_apply(void* environment,tsc_value_t receiver,tsc_array_t* args){
    (void)environment;(void)receiver;(void)args;
    tsc_throw_error(TSC_ERROR_TYPE,key("DataView constructor requires new"));return tsc_value_undefined();
}
static tsc_value_t view_construct(void* environment,tsc_value_t receiver,tsc_array_t* args){
    (void)environment;(void)receiver;tsc_array_t* volatile actuals=args;
    tsc_array_buffer_t* volatile buffer=require_buffer(argument(actuals,0));
    double offset=tsc_value_to_index(argument(actuals,1));require_attached(buffer);
    size_t initial_size=tsc_array_buffer_length(buffer);
    if(offset>(double)initial_size)tsc_throw_error(TSC_ERROR_RANGE,key("DataView offset is outside its buffer"));
    tsc_value_t length_value=argument(actuals,2);bool has_length=!tsc_value_is_undefined(length_value);
    double length=has_length?tsc_value_to_index(length_value):(double)initial_size-offset;
    if(length>(double)initial_size-offset)tsc_throw_error(TSC_ERROR_RANGE,key("DataView length is outside its buffer"));
    tsc_value_t prototype=tsc_value_get_prototype_from_constructor(tsc_value_current_new_target(),TSC_INTRINSIC_DEFAULT_DATA_VIEW_PROTOTYPE);
    void* volatile prototype_root=tsc_value_gc_root(prototype);
    require_attached(buffer);
    size_t current=tsc_array_buffer_length(buffer);
    if(offset>(double)current||(has_length&&length>(double)current-offset))
        tsc_throw_error(TSC_ERROR_RANGE,key("DataView is outside its buffer bounds"));
    tsc_data_view_t* volatile view=tsc_data_view_new(buffer,offset,length,has_length);
    tsc_value_t result=tsc_value_data_view(view);void* volatile result_root=tsc_value_gc_root(result);
    (void)tsc_value_object_set_prototype_of(result,prototype);
    (void)prototype_root;(void)result_root;(void)actuals;return result;
}
static void define_value(tsc_value_t object,const char* name,tsc_value_t value){
    (void)tsc_value_define_property_desc(object,key(name),value,true,true,true,false,true,true,true);
}
static view_realm_t* view_realm(void){
    view_realm_t* realm=tsc_realm_state_get(&view_realm_key);if(realm)return realm;
    realm=TSC_GC_MALLOC(sizeof(*realm));memset(realm,0,sizeof(*realm));tsc_realm_state_set(&view_realm_key,realm);
    realm->prototype=tsc_value_object(tsc_object_new());realm->prototype_root=tsc_value_gc_root(realm->prototype);
    realm->constructor=tsc_value_function_named_kind(view_apply,view_construct,NULL,1,key("DataView"),TSC_FUNCTION_IDENTITY_BUILTIN);
    tsc_function_identity_t* identity=value_ptr(realm->constructor);realm->constructor_root=identity;
    identity->construct_allocates_receiver=false;identity->construct_default_prototype=TSC_INTRINSIC_DEFAULT_DATA_VIEW_PROTOTYPE;
    tsc_function_identity_set_own_prototype(identity,realm->prototype);identity->func_prototype_writable=false;
    define_value(realm->prototype,"constructor",realm->constructor);
    for(size_t index=0;index<sizeof(view_members)/sizeof(view_members[0]);++index){
        const view_member_t* member=&view_members[index];tsc_str_t* name=key(member->name);
        tsc_value_t function=tsc_value_function_named_kind(view_member_apply,NULL,(void*)member,member->length,member->getter?tsc_str_concat(key("get "),name):name,TSC_FUNCTION_IDENTITY_BUILTIN);
        void* volatile function_root=tsc_value_gc_root(function);
        if(member->getter){
            tsc_value_t descriptor=tsc_value_object(tsc_object_new());void* volatile descriptor_root=tsc_value_gc_root(descriptor);
            define_value(descriptor,"get",function);define_value(descriptor,"enumerable",tsc_value_bool(false));define_value(descriptor,"configurable",tsc_value_bool(true));
            (void)tsc_value_define_property_descriptor(realm->prototype,name,descriptor);(void)descriptor_root;
        }else define_value(realm->prototype,member->name,function);
        (void)function_root;
    }
    (void)tsc_value_define_property_desc(realm->prototype,tsc_symbol_property_key(tsc_symbol_to_string_tag()),tsc_value_string(key("DataView")),true,true,false,false,true,true,true);
    return realm;
}
tsc_value_t tsc_data_view_constructor_value(void){return view_realm()->constructor;}
tsc_value_t tsc_data_view_prototype_value(void){return view_realm()->prototype;}
