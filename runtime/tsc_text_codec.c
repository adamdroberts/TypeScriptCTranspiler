#include "tsc_internal.h"

typedef enum { ENCODING, ENCODE, DECODE, FATAL, IGNORE_BOM } codec_operation_t;
typedef struct { bool encoder; const char* name; codec_operation_t operation; bool getter; size_t length; } codec_member_t;
#define encoder true
#define decoder false
static const codec_member_t codec_members[] = {
#define TSC_TEXT_CODEC_MEMBER(owner, name, operation, getter, length) {owner, #name, operation, getter, length},
#include "tsc_text_codec.def"
#undef TSC_TEXT_CODEC_MEMBER
};
#undef encoder
#undef decoder
typedef struct { tsc_value_t constructor, prototype; void *constructor_root, *prototype_root; } codec_intrinsic_t;
typedef struct { codec_intrinsic_t encoder, decoder; } codec_realm_t;
static const char codec_realm_key;
static codec_intrinsic_t* codec_intrinsic(bool encoder);
static tsc_str_t* codec_key(const char* text) { return tsc_str_from_cstr(text); }
static tsc_value_t codec_argument(tsc_array_t* args, size_t index) {
    return args && index < args->len ? TSC_ARR(tsc_value_t, args, index) : tsc_value_undefined();
}
static void codec_require_receiver(tsc_value_t receiver, bool encoder) {
    if (value_is_box(receiver) && value_tag(receiver) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* object = value_ptr(receiver);
        if (object->class_ptr && (encoder ? object->is_text_encoder : object->is_text_decoder)) return;
    }
    tsc_throw_error(TSC_ERROR_TYPE, codec_key("Text codec receiver lacks its internal slots"));
}
static void codec_require_default_options(tsc_value_t options, bool decoder) {
    if (tsc_value_is_nullish(options)) return;
    if (!tsc_value_is_object(options))
        tsc_throw_error(TSC_ERROR_TYPE, codec_key("Text codec options must be an object"));
    if (decoder) {
        bool fatal = tsc_value_is_truthy(tsc_value_get_prop(options, codec_key("fatal")));
        bool ignore_bom = tsc_value_is_truthy(tsc_value_get_prop(options, codec_key("ignoreBOM")));
        if (fatal || ignore_bom)
            tsc_throw_error(TSC_ERROR_TYPE, codec_key("Text codec option cannot be represented"));
    } else if (tsc_value_is_truthy(tsc_value_get_prop(options, codec_key("stream")))) {
        tsc_throw_error(TSC_ERROR_TYPE, codec_key("Text codec option cannot be represented"));
    }
}
static tsc_value_t codec_member_apply(void* environment, tsc_value_t receiver, tsc_array_t* args) {
    const codec_member_t* member = environment;
    void* volatile receiver_root = tsc_value_gc_root(receiver);
    tsc_array_t* volatile actuals = args;
    codec_require_receiver(receiver, member->encoder);
    switch (member->operation) {
        case ENCODING: return tsc_value_string(codec_key("utf-8"));
        case FATAL: case IGNORE_BOM: return tsc_value_bool(false);
        case ENCODE: {
            tsc_value_t input = codec_argument(actuals, 0);
            tsc_str_t* volatile text = tsc_value_is_undefined(input) ? codec_key("") : tsc_value_to_string(input);
            return tsc_value_buffer(tsc_text_encoder_encode(tsc_value_as_text_encoder(receiver), text));
        }
        case DECODE: {
            tsc_value_t input = codec_argument(actuals, 0);
            tsc_buffer_t* volatile bytes = NULL;
            if (!tsc_value_is_undefined(input)) {
                codec_require_default_options(codec_argument(actuals, 1), false);
                tsc_byte_source_t source = tsc_value_byte_source(input, true);
                if (!source.valid) tsc_throw_error(TSC_ERROR_TYPE, codec_key("TextDecoder requires an attached byte source"));
                if (source.backing && source.backing->shared) {
                    bytes = tsc_buffer_alloc((double)source.length, 0);
                    for (size_t index = 0; index < source.length; ++index)
                        bytes->data[index] = (uint8_t)tsc_array_buffer_read_bits(source.backing, source.offset + index, 1, true);
                } else {
                    bytes = TSC_GC_MALLOC(sizeof(*bytes)); memset(bytes, 0, sizeof(*bytes));
                    bytes->data = source.data; bytes->len = source.length; bytes->data_owner = source.data;
                }
            } else codec_require_default_options(codec_argument(actuals, 1), false);
            return tsc_value_string(tsc_text_decoder_decode(tsc_value_as_text_decoder(receiver), bytes));
        }
    }
    (void)receiver_root; (void)actuals; return tsc_value_undefined();
}
static tsc_value_t codec_call(void* environment, tsc_value_t receiver, tsc_array_t* args) {
    (void)environment; (void)receiver; (void)args;
    tsc_throw_error(TSC_ERROR_TYPE, codec_key("Text codec constructor requires new")); return tsc_value_undefined();
}
static tsc_value_t codec_construct(void* environment, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver; bool encoder = environment != NULL; tsc_array_t* volatile actuals = args;
    tsc_str_t* volatile label = NULL;
    if (!encoder) {
        tsc_value_t value = codec_argument(actuals, 0);
        if (!tsc_value_is_undefined(value)) label = tsc_value_to_string(value);
        tsc_text_decoder_require_encoding(label);
        codec_require_default_options(codec_argument(actuals, 1), true);
    }
    tsc_value_t prototype = tsc_value_get_prototype_from_constructor(tsc_value_current_new_target(), encoder
        ? TSC_INTRINSIC_DEFAULT_TEXT_ENCODER_PROTOTYPE : TSC_INTRINSIC_DEFAULT_TEXT_DECODER_PROTOTYPE);
    void* volatile prototype_root = tsc_value_gc_root(prototype);
    tsc_value_t result = encoder ? tsc_value_text_encoder(tsc_text_encoder_new())
        : tsc_value_text_decoder(tsc_text_decoder_new(label));
    void* volatile result_root = tsc_value_gc_root(result);
    (void)tsc_value_set_prototype_of(result, prototype);
    (void)prototype_root; (void)result_root; (void)actuals; return result;
}
static codec_intrinsic_t* codec_intrinsic(bool encoder) {
    codec_realm_t* realm = tsc_realm_state_get(&codec_realm_key);
    if (!realm) { realm = TSC_GC_MALLOC(sizeof(*realm)); memset(realm, 0, sizeof(*realm)); tsc_realm_state_set(&codec_realm_key, realm); }
    codec_intrinsic_t* intrinsic = encoder ? &realm->encoder : &realm->decoder;
    if (intrinsic->constructor_root) return intrinsic;
    intrinsic->prototype = tsc_value_object(tsc_object_new()); intrinsic->prototype_root = tsc_value_gc_root(intrinsic->prototype);
    intrinsic->constructor = tsc_value_function_named_kind(codec_call, codec_construct, encoder ? (void*)1 : NULL,
        0, codec_key(encoder ? "TextEncoder" : "TextDecoder"), TSC_FUNCTION_IDENTITY_BUILTIN);
    tsc_function_identity_t* identity = value_ptr(intrinsic->constructor); intrinsic->constructor_root = identity;
    identity->construct_allocates_receiver = false;
    identity->construct_default_prototype = encoder ? TSC_INTRINSIC_DEFAULT_TEXT_ENCODER_PROTOTYPE : TSC_INTRINSIC_DEFAULT_TEXT_DECODER_PROTOTYPE;
    tsc_function_identity_set_own_prototype(identity, intrinsic->prototype); identity->func_prototype_writable = false;
    tsc_object_t* prototype = value_ptr(intrinsic->prototype);
    tsc_object_define(prototype, codec_key("constructor"), intrinsic->constructor, true, false, true);
    for (size_t index = 0; index < sizeof(codec_members) / sizeof(*codec_members); ++index) {
        const codec_member_t* member = &codec_members[index]; if (member->encoder != encoder) continue;
        tsc_str_t* name = codec_key(member->name);
        tsc_value_t function = tsc_value_function_builtin_named(codec_member_apply, (void*)member, member->length,
            member->getter ? tsc_str_concat(codec_key("get "), name) : name);
        void* volatile function_root = tsc_value_gc_root(function);
        if (member->getter) {
            tsc_object_t* volatile descriptor = tsc_object_new();
            tsc_object_set(descriptor, codec_key("get"), function);
            tsc_object_set(descriptor, codec_key("enumerable"), tsc_value_bool(true));
            tsc_object_set(descriptor, codec_key("configurable"), tsc_value_bool(true));
            (void)tsc_value_define_property_descriptor(intrinsic->prototype, name, tsc_value_object(descriptor));
        } else tsc_object_define(prototype, name, function, true, true, true);
        (void)function_root;
    }
    tsc_object_define(prototype, tsc_symbol_property_key(tsc_symbol_to_string_tag()),
        tsc_value_string(codec_key(encoder ? "TextEncoder" : "TextDecoder")), false, false, true);
    return intrinsic;
}
tsc_value_t tsc_text_encoder_constructor_value(void) { return codec_intrinsic(true)->constructor; }
tsc_value_t tsc_text_decoder_constructor_value(void) { return codec_intrinsic(false)->constructor; }
tsc_value_t tsc_text_encoder_prototype_value(void) { return codec_intrinsic(true)->prototype; }
tsc_value_t tsc_text_decoder_prototype_value(void) { return codec_intrinsic(false)->prototype; }
