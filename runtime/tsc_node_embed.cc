#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include <limits.h>
#include <math.h>

extern "C" {
typedef uint64_t tsc_value_t;
typedef struct tsc_str {
    size_t len;
    const char* data;
    uint64_t hash;
} tsc_str_t;
typedef struct tsc_object tsc_object_t;
typedef struct tsc_array {
    size_t len;
    size_t cap;
    size_t es;
    bool extensible;
    bool sealed;
    bool frozen;
    bool length_writable;
    tsc_value_t prototype;
    size_t iter_pos;
    bool iter_has_return;
    bool iter_return_consumed;
    tsc_value_t iter_return;
    bool is_lazy_generator;
    int state;
    void* env;
    void (*lazy_next)(struct tsc_array* a, int* state, void* env, tsc_value_t next_arg, bool* done);
    bool (*lazy_close)(struct tsc_array* a, void* env, tsc_value_t arg, bool is_throw);
    bool lazy_close_yielded;
    tsc_value_t lazy_close_value;
    tsc_object_t* props;
    tsc_object_t* holes;
    void* data;
} tsc_array_t;
typedef tsc_value_t (*tsc_generic_function_t)(void* env, tsc_value_t this_arg, tsc_array_t* args);

void tsc_panic(const char* msg);
tsc_str_t* tsc_str_from_lit(const char* data, size_t len);
tsc_str_t* tsc_str_from_cstr(const char* s);
tsc_object_t* tsc_object_new(void);
bool tsc_object_set(tsc_object_t* o, tsc_str_t* key, tsc_value_t value);
tsc_value_t tsc_value_undefined(void);
tsc_value_t tsc_value_null(void);
tsc_value_t tsc_value_num(double n);
tsc_value_t tsc_value_bool(bool b);
tsc_value_t tsc_value_string(tsc_str_t* s);
tsc_value_t tsc_value_object(tsc_object_t* o);
tsc_value_t tsc_value_array(tsc_array_t* a);
tsc_value_t tsc_value_function_generic(tsc_generic_function_t fn, void* env);
tsc_value_t tsc_value_function_generic_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name);
tsc_value_t tsc_value_function_closure_named(tsc_generic_function_t fn, void* env, double length, tsc_str_t* name);
tsc_value_t tsc_value_apply_function(tsc_value_t fn, tsc_value_t this_arg, tsc_value_t args);
tsc_value_t tsc_value_construct(tsc_value_t target, tsc_value_t args);
tsc_value_t tsc_value_get_prop(tsc_value_t value, const tsc_str_t* key);
bool tsc_value_is_constructable(tsc_value_t value);
double tsc_value_as_num(tsc_value_t value);
tsc_str_t* tsc_value_to_string(tsc_value_t v);
tsc_value_t tsc_node_eval(tsc_str_t* source);
tsc_value_t tsc_node_function(tsc_str_t* body);
tsc_value_t tsc_node_function_call(tsc_value_t fn, tsc_array_t* args);
tsc_value_t tsc_node_native_addon(tsc_str_t* resolved_path);
tsc_value_t tsc_builtin_eval(void* env, tsc_value_t this_arg, tsc_array_t* args);
tsc_value_t tsc_builtin_function(void* env, tsc_value_t this_arg, tsc_array_t* args);
}

#ifndef TSC_HAS_LIBNODE

extern "C" tsc_value_t tsc_node_eval(tsc_str_t*) {
    tsc_panic("embedded Node bridge unavailable: binary was not linked with libnode");
    return tsc_value_undefined();
}

extern "C" tsc_value_t tsc_node_function(tsc_str_t*) {
    tsc_panic("embedded Node bridge unavailable: binary was not linked with libnode");
    return tsc_value_undefined();
}

extern "C" tsc_value_t tsc_node_function_call(tsc_value_t, tsc_array_t*) {
    tsc_panic("embedded Node bridge unavailable: binary was not linked with libnode");
    return tsc_value_undefined();
}

extern "C" tsc_value_t tsc_node_native_addon(tsc_str_t*) {
    tsc_panic("embedded Node bridge unavailable: binary was not linked with libnode");
    return tsc_value_undefined();
}

extern "C" tsc_value_t tsc_builtin_eval(void*, tsc_value_t, tsc_array_t*) {
    tsc_panic("embedded Node bridge unavailable: binary was not linked with libnode");
    return tsc_value_undefined();
}

extern "C" tsc_value_t tsc_builtin_function(void*, tsc_value_t, tsc_array_t*) {
    tsc_panic("embedded Node bridge unavailable: binary was not linked with libnode");
    return tsc_value_undefined();
}

#else

#include <memory>
#include <string>
#include <vector>

#include <node.h>
#include <v8.h>

namespace {

struct NodeEmbedState {
    std::unique_ptr<node::MultiIsolatePlatform> platform;
    std::unique_ptr<node::CommonEnvironmentSetup> setup;
    v8::Isolate* isolate = nullptr;
    v8::Global<v8::Context> context;
    node::Environment* env = nullptr;
};

NodeEmbedState* state = nullptr;

struct NodeFunctionEnv {
    v8::Global<v8::Function> fn;
};

struct AotFunctionEnv {
    tsc_value_t fn;
};

constexpr uint64_t TSC_VALUE_BOX_MASK = UINT64_C(0x7ffc000000000000);
constexpr uint64_t TSC_VALUE_PAYLOAD_MASK = UINT64_C(0x0000ffffffffffff);

enum TscValueTag {
    TSC_VALUE_TAG_FUNCTION = 0,
    TSC_VALUE_TAG_UNDEFINED = 1,
    TSC_VALUE_TAG_NULL = 2,
    TSC_VALUE_TAG_FALSE = 3,
    TSC_VALUE_TAG_TRUE = 4,
    TSC_VALUE_TAG_STRING = 5,
    TSC_VALUE_TAG_ARRAY = 6,
    TSC_VALUE_TAG_OBJECT = 7,
};

bool valueIsBox(tsc_value_t value) {
    return (value & TSC_VALUE_BOX_MASK) == TSC_VALUE_BOX_MASK;
}

TscValueTag valueTag(tsc_value_t value) {
    return static_cast<TscValueTag>(value & 0x7);
}

void* valuePtr(tsc_value_t value) {
    return reinterpret_cast<void*>(static_cast<uintptr_t>((value & TSC_VALUE_PAYLOAD_MASK) & ~UINT64_C(0x7)));
}

std::string tscToString(tsc_str_t* value) {
    if (!value || !value->data) return std::string();
    return std::string(value->data, value->len);
}

v8::Local<v8::String> stringToV8(v8::Isolate* isolate, tsc_str_t* value) {
    std::string text = tscToString(value);
    v8::Local<v8::String> out;
    if (!v8::String::NewFromUtf8(
             isolate,
             text.c_str(),
             v8::NewStringType::kNormal,
             static_cast<int>(text.size())
         ).ToLocal(&out)) {
        return v8::String::Empty(isolate);
    }
    return out;
}

tsc_value_t fromV8(v8::Isolate* isolate, v8::Local<v8::Value> value);
v8::Local<v8::Value> toV8(v8::Isolate* isolate, v8::Local<v8::Context> context, tsc_value_t value);
tsc_value_t callNodeFunction(void* rawEnv, tsc_value_t thisArg, tsc_array_t* args);
void aotFunctionCallback(const v8::FunctionCallbackInfo<v8::Value>& info);

tsc_value_t fromV8Function(v8::Isolate* isolate, v8::Local<v8::Function> function) {
    NodeFunctionEnv* env = new NodeFunctionEnv();
    env->fn.Reset(isolate, function);
    v8::String::Utf8Value nameUtf8(isolate, function->GetName());
    tsc_str_t* name = *nameUtf8 ? tsc_str_from_cstr(*nameUtf8) : tsc_str_from_lit("", 0);
    v8::Local<v8::Context> context = isolate->GetCurrentContext();
    v8::Local<v8::Value> lengthValue;
    double length = 0.0;
    if (
        function->Get(context, v8::String::NewFromUtf8Literal(isolate, "length")).ToLocal(&lengthValue) &&
        lengthValue->IsNumber()
    ) {
        length = lengthValue->NumberValue(context).FromMaybe(0.0);
    }
    return function->IsConstructor()
        ? tsc_value_function_generic_named(callNodeFunction, env, length, name)
        : tsc_value_function_closure_named(callNodeFunction, env, length, name);
}

v8::Local<v8::Value> toV8(v8::Isolate* isolate, v8::Local<v8::Context> context, tsc_value_t value) {
    if (!valueIsBox(value)) {
        double number;
        memcpy(&number, &value, sizeof number);
        return v8::Number::New(isolate, number).As<v8::Value>();
    }
    switch (valueTag(value)) {
        case TSC_VALUE_TAG_UNDEFINED:
            return v8::Undefined(isolate).As<v8::Value>();
        case TSC_VALUE_TAG_NULL:
            return v8::Null(isolate).As<v8::Value>();
        case TSC_VALUE_TAG_FALSE:
            return v8::Boolean::New(isolate, false).As<v8::Value>();
        case TSC_VALUE_TAG_TRUE:
            return v8::Boolean::New(isolate, true).As<v8::Value>();
        case TSC_VALUE_TAG_STRING:
            return stringToV8(isolate, static_cast<tsc_str_t*>(valuePtr(value))).As<v8::Value>();
        case TSC_VALUE_TAG_ARRAY: {
            tsc_array_t* array = static_cast<tsc_array_t*>(valuePtr(value));
            uint32_t length = array && array->len <= UINT32_MAX ? static_cast<uint32_t>(array->len) : 0;
            v8::Local<v8::Array> out = v8::Array::New(isolate, static_cast<int>(length));
            if (!array || array->es != sizeof(tsc_value_t)) return out.As<v8::Value>();
            for (uint32_t i = 0; i < length; i++) {
                tsc_value_t item = static_cast<tsc_value_t*>(array->data)[i];
                out->Set(context, i, toV8(isolate, context, item)).FromMaybe(false);
            }
            return out.As<v8::Value>();
        }
        case TSC_VALUE_TAG_FUNCTION: {
            AotFunctionEnv* env = new AotFunctionEnv{ value };
            v8::Local<v8::External> data = v8::External::New(isolate, env);
            double runtimeLength = tsc_value_as_num(
                tsc_value_get_prop(value, tsc_str_from_lit("length", 6))
            );
            int length = isfinite(runtimeLength) && runtimeLength > 0.0
                ? static_cast<int>(runtimeLength > INT_MAX ? INT_MAX : floor(runtimeLength))
                : 0;
            v8::ConstructorBehavior behavior = tsc_value_is_constructable(value)
                ? v8::ConstructorBehavior::kAllow
                : v8::ConstructorBehavior::kThrow;
            v8::Local<v8::Function> fn;
            if (v8::Function::New(context, aotFunctionCallback, data, length, behavior).ToLocal(&fn)) {
                tsc_str_t* name = tsc_value_to_string(
                    tsc_value_get_prop(value, tsc_str_from_lit("name", 4))
                );
                fn->SetName(stringToV8(isolate, name));
                return fn.As<v8::Value>();
            }
            return v8::Undefined(isolate).As<v8::Value>();
        }
        case TSC_VALUE_TAG_OBJECT:
            return stringToV8(isolate, tsc_value_to_string(value)).As<v8::Value>();
    }
    return v8::Undefined(isolate).As<v8::Value>();
}

tsc_value_t fromV8(v8::Isolate* isolate, v8::Local<v8::Value> value) {
    if (value.IsEmpty() || value->IsUndefined()) return tsc_value_undefined();
    if (value->IsNull()) return tsc_value_null();
    if (value->IsBoolean()) return tsc_value_bool(value->BooleanValue(isolate));
    v8::Local<v8::Context> context = isolate->GetCurrentContext();
    if (value->IsNumber()) {
        v8::Maybe<double> number = value->NumberValue(context);
        if (number.IsJust()) return tsc_value_num(number.FromJust());
    }
    if (value->IsFunction()) {
        return fromV8Function(isolate, v8::Local<v8::Function>::Cast(value));
    }
    if (value->IsObject()) {
        v8::Local<v8::Object> object;
        if (value->ToObject(context).ToLocal(&object)) {
            v8::Local<v8::Array> keys;
            if (object->GetOwnPropertyNames(context).ToLocal(&keys)) {
                tsc_object_t* out = tsc_object_new();
                uint32_t length = keys->Length();
                for (uint32_t i = 0; i < length; i++) {
                    v8::Local<v8::Value> keyValue;
                    if (!keys->Get(context, i).ToLocal(&keyValue)) continue;
                    v8::String::Utf8Value keyUtf8(isolate, keyValue);
                    if (!*keyUtf8) continue;
                    v8::Local<v8::Value> propValue;
                    if (!object->Get(context, keyValue).ToLocal(&propValue)) continue;
                    tsc_object_set(out, tsc_str_from_cstr(*keyUtf8), fromV8(isolate, propValue));
                }
                return tsc_value_object(out);
            }
        }
    }
    v8::String::Utf8Value utf8(isolate, value);
    if (*utf8) {
        return tsc_value_string(tsc_str_from_cstr(*utf8));
    }
    return tsc_value_undefined();
}

void aotFunctionCallback(const v8::FunctionCallbackInfo<v8::Value>& info) {
    v8::Isolate* isolate = info.GetIsolate();
    v8::HandleScope handleScope(isolate);
    v8::Local<v8::Context> context = isolate->GetCurrentContext();

    AotFunctionEnv* env = static_cast<AotFunctionEnv*>(v8::Local<v8::External>::Cast(info.Data())->Value());
    size_t argc = static_cast<size_t>(info.Length());
    std::vector<tsc_value_t> argsData(argc);
    for (size_t i = 0; i < argc; i++) {
        argsData[i] = fromV8(isolate, info[static_cast<int>(i)]);
    }

    tsc_array_t args = {};
    args.len = argc;
    args.cap = argc;
    args.es = sizeof(tsc_value_t);
    args.extensible = true;
    args.sealed = false;
    args.frozen = false;
    args.length_writable = true;
    args.prototype = tsc_value_undefined();
    args.iter_pos = 0;
    args.iter_has_return = false;
    args.iter_return_consumed = false;
    args.iter_return = tsc_value_undefined();
    args.is_lazy_generator = false;
    args.state = -1;
    args.env = nullptr;
    args.lazy_next = nullptr;
    args.lazy_close = nullptr;
    args.data = argc > 0 ? argsData.data() : nullptr;

    tsc_value_t result = info.IsConstructCall()
        ? tsc_value_construct(env->fn, tsc_value_array(&args))
        : tsc_value_apply_function(env->fn, fromV8(isolate, info.This()), tsc_value_array(&args));
    info.GetReturnValue().Set(toV8(isolate, context, result));
}

NodeEmbedState* ensureState() {
    if (state) return state;

    std::vector<std::string> args{"tsc2c-embedded-node"};
    node::InitializeOncePerProcess(
        args,
        static_cast<node::ProcessInitializationFlags::Flags>(
            node::ProcessInitializationFlags::kNoInitializeV8 |
            node::ProcessInitializationFlags::kNoInitializeNodeV8Platform)
    );
    state = new NodeEmbedState();
    state->platform = node::MultiIsolatePlatform::Create(1);
    v8::V8::InitializePlatform(state->platform.get());
    v8::V8::Initialize();

    std::vector<std::string> errors;
    state->setup = node::CommonEnvironmentSetup::Create(state->platform.get(), &errors, args, std::vector<std::string>{});
    if (!state->setup) {
        tsc_panic(errors.empty() ? "embedded Node bridge: environment setup failed" : errors[0].c_str());
    }
    state->isolate = state->setup->isolate();
    state->env = state->setup->env();
    {
        v8::Isolate::Scope isolateScope(state->isolate);
        v8::HandleScope handleScope(state->isolate);
        v8::Local<v8::Context> context = state->setup->context();
        state->context.Reset(state->isolate, context);
        v8::Context::Scope contextScope(context);
        if (node::LoadEnvironment(state->env, "globalThis.__tsc2c_require = require;\n").IsEmpty()) {
            tsc_panic("embedded Node bridge: environment load failed");
        }
    }
    return state;
}

#ifdef TSC_UNSAFE_EVAL
tsc_value_t evalSource(tsc_str_t* source) {
    NodeEmbedState* current = ensureState();
    v8::Isolate* isolate = current->isolate;
    v8::Isolate::Scope isolateScope(isolate);
    v8::HandleScope handleScope(isolate);
    v8::Local<v8::Context> context = current->context.Get(isolate);
    v8::Context::Scope contextScope(context);

    std::string src = tscToString(source);
    v8::Local<v8::String> code;
    if (!v8::String::NewFromUtf8(
             isolate,
             src.c_str(),
             v8::NewStringType::kNormal,
             (int)src.size()
         ).ToLocal(&code)) {
        tsc_panic("embedded Node bridge: could not allocate source string");
    }

    v8::TryCatch tryCatch(isolate);
    v8::Local<v8::Script> script;
    if (!v8::Script::Compile(context, code).ToLocal(&script)) {
        tsc_panic("embedded Node bridge: eval compile failed");
    }
    v8::Local<v8::Value> result;
    if (!script->Run(context).ToLocal(&result)) {
        tsc_panic("embedded Node bridge: eval execution failed");
    }
    return fromV8(isolate, result);
}
#endif

tsc_value_t callNodeFunction(void* rawEnv, tsc_value_t, tsc_array_t* args) {
    NodeEmbedState* current = ensureState();
    v8::Isolate* isolate = current->isolate;
    v8::Isolate::Scope isolateScope(isolate);
    v8::HandleScope handleScope(isolate);
    v8::Local<v8::Context> context = current->context.Get(isolate);
    v8::Context::Scope contextScope(context);

    NodeFunctionEnv* env = static_cast<NodeFunctionEnv*>(rawEnv);
    v8::Local<v8::Function> fn = env->fn.Get(isolate);
    size_t argc = args ? args->len : 0;
    std::vector<v8::Local<v8::Value>> argv;
    argv.reserve(argc);
    if (args && args->es == sizeof(tsc_value_t)) {
        for (size_t i = 0; i < argc; i++) {
            argv.push_back(toV8(isolate, context, static_cast<tsc_value_t*>(args->data)[i]));
        }
    } else {
        argc = 0;
    }
    v8::TryCatch tryCatch(isolate);
    v8::Local<v8::Value> result;
    if (!fn->Call(
             context,
             v8::Undefined(isolate).As<v8::Value>(),
             static_cast<int>(argc),
             argc > 0 ? argv.data() : nullptr
         ).ToLocal(&result)) {
        tsc_panic("embedded Node bridge: Function execution failed");
    }
    return fromV8(isolate, result);
}

} // namespace

extern "C" tsc_value_t tsc_node_eval(tsc_str_t* source) {
#ifndef TSC_UNSAFE_EVAL
    (void)source;
    tsc_panic("embedded Node unsafe eval bridge disabled: compile with --unsafe-eval");
    return tsc_value_undefined();
#else
    return evalSource(source);
#endif
}

extern "C" tsc_value_t tsc_node_function(tsc_str_t* body) {
#ifndef TSC_UNSAFE_EVAL
    (void)body;
    tsc_panic("embedded Node unsafe Function bridge disabled: compile with --unsafe-eval");
    return tsc_value_undefined();
#else
    std::string wrapped = "(function(){";
    wrapped += tscToString(body);
    wrapped += "\n})";
    tsc_str_t source = { wrapped.size(), wrapped.c_str(), 0, nullptr };
    NodeEmbedState* current = ensureState();
    v8::Isolate* isolate = current->isolate;
    v8::Isolate::Scope isolateScope(isolate);
    v8::HandleScope handleScope(isolate);
    v8::Local<v8::Context> context = current->context.Get(isolate);
    v8::Context::Scope contextScope(context);

    std::string src = tscToString(&source);
    v8::Local<v8::String> code;
    if (!v8::String::NewFromUtf8(
             isolate,
             src.c_str(),
             v8::NewStringType::kNormal,
             (int)src.size()
         ).ToLocal(&code)) {
        tsc_panic("embedded Node bridge: could not allocate Function source string");
    }
    v8::TryCatch tryCatch(isolate);
    v8::Local<v8::Script> script;
    if (!v8::Script::Compile(context, code).ToLocal(&script)) {
        tsc_panic("embedded Node bridge: Function compile failed");
    }
    v8::Local<v8::Value> result;
    if (!script->Run(context).ToLocal(&result) || !result->IsFunction()) {
        tsc_panic("embedded Node bridge: Function source did not produce a callable");
    }
    return fromV8Function(isolate, v8::Local<v8::Function>::Cast(result));
#endif
}

extern "C" tsc_value_t tsc_node_function_call(tsc_value_t fn, tsc_array_t* args) {
#ifndef TSC_UNSAFE_EVAL
    (void)fn;
    (void)args;
    tsc_panic("embedded Node unsafe Function bridge disabled: compile with --unsafe-eval");
    return tsc_value_undefined();
#else
    return tsc_value_apply_function(fn, tsc_value_undefined(), tsc_value_array(args));
#endif
}

extern "C" tsc_value_t tsc_node_native_addon(tsc_str_t* resolved_path) {
    NodeEmbedState* current = ensureState();
    v8::Isolate* isolate = current->isolate;
    v8::Isolate::Scope isolateScope(isolate);
    v8::HandleScope handleScope(isolate);
    v8::Local<v8::Context> context = current->context.Get(isolate);
    v8::Context::Scope contextScope(context);

    v8::Local<v8::String> requireKey;
    if (!v8::String::NewFromUtf8(
             isolate,
             "__tsc2c_require",
             v8::NewStringType::kNormal
         ).ToLocal(&requireKey)) {
        tsc_panic("embedded Node bridge: could not allocate require key");
    }

    v8::Local<v8::Value> requireValue;
    if (!context->Global()->Get(context, requireKey).ToLocal(&requireValue) || !requireValue->IsFunction()) {
        tsc_panic("embedded Node bridge: require hook is unavailable");
    }

    v8::Local<v8::Value> pathArg = stringToV8(isolate, resolved_path).As<v8::Value>();
    v8::Local<v8::Function> requireFn = v8::Local<v8::Function>::Cast(requireValue);
    v8::TryCatch tryCatch(isolate);
    v8::Local<v8::Value> result;
    if (!requireFn->Call(context, context->Global(), 1, &pathArg).ToLocal(&result)) {
        tsc_panic("embedded Node bridge: native addon require failed");
    }
    return fromV8(isolate, result);
}

extern "C" tsc_value_t tsc_builtin_eval(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
#ifndef TSC_UNSAFE_EVAL
    (void)args;
    tsc_panic("embedded Node unsafe eval bridge disabled: compile with --unsafe-eval");
    return tsc_value_undefined();
#else
    if (!args || args->len < 1) return tsc_value_undefined();
    tsc_value_t arg = (static_cast<tsc_value_t*>(args->data))[0];
    if (!valueIsBox(arg) || valueTag(arg) != TSC_VALUE_TAG_STRING) return arg;
    return tsc_node_eval(static_cast<tsc_str_t*>(valuePtr(arg)));
#endif
}

extern "C" tsc_value_t tsc_builtin_function(void* env, tsc_value_t this_arg, tsc_array_t* args) {
    (void)env;
    (void)this_arg;
#ifndef TSC_UNSAFE_EVAL
    (void)args;
    tsc_panic("embedded Node unsafe Function bridge disabled: compile with --unsafe-eval");
    return tsc_value_undefined();
#else
    if (!args || args->len < 1) {
        static tsc_str_t empty = { 0, "", 0, nullptr };
        return tsc_node_function(&empty);
    }
    tsc_value_t arg = (static_cast<tsc_value_t*>(args->data))[args->len - 1];
    if (valueIsBox(arg) && valueTag(arg) == TSC_VALUE_TAG_STRING) {
        return tsc_node_function(static_cast<tsc_str_t*>(valuePtr(arg)));
    }
    static tsc_str_t empty = { 0, "", 0, nullptr };
    return tsc_node_function(&empty);
#endif
}

#endif
