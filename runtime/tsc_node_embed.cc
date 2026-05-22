#include <stddef.h>
#include <stdint.h>
#include <string.h>

extern "C" {
typedef uint64_t tsc_value_t;
typedef struct tsc_str {
    size_t len;
    const char* data;
    uint64_t hash;
} tsc_str_t;

void tsc_panic(const char* msg);
tsc_str_t* tsc_str_from_lit(const char* data, size_t len);
tsc_value_t tsc_value_undefined(void);
tsc_value_t tsc_value_null(void);
tsc_value_t tsc_value_num(double n);
tsc_value_t tsc_value_bool(bool b);
tsc_value_t tsc_value_string(tsc_str_t* s);
tsc_value_t tsc_node_eval(tsc_str_t* source);
tsc_value_t tsc_node_function(tsc_str_t* body);
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

#else

#include <memory>
#include <string>
#include <vector>

#include <node.h>
#include <v8.h>

namespace {

struct NodeEmbedState {
    std::unique_ptr<node::MultiIsolatePlatform> platform;
    v8::Isolate* isolate = nullptr;
    v8::Global<v8::Context> context;
};

NodeEmbedState* state = nullptr;

std::string tscToString(tsc_str_t* value) {
    if (!value || !value->data) return std::string();
    return std::string(value->data, value->len);
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
    v8::String::Utf8Value utf8(isolate, value);
    if (*utf8) {
        return tsc_value_string(tsc_str_from_lit(*utf8, (size_t)utf8.length()));
    }
    return tsc_value_undefined();
}

NodeEmbedState* ensureState() {
    if (state) return state;

    node::InitializeOncePerProcess(
        std::vector<std::string>{"tsc2c-embedded-node"},
        node::ProcessInitializationFlags::kNoInitializeV8 |
            node::ProcessInitializationFlags::kNoInitializeNodeV8Platform,
    );
    state = new NodeEmbedState();
    state->platform = node::MultiIsolatePlatform::Create(1);
    v8::V8::InitializePlatform(state->platform.get());
    v8::V8::Initialize();

    v8::Isolate::CreateParams params;
    params.array_buffer_allocator = node::ArrayBufferAllocator::Create().release();
    state->isolate = v8::Isolate::New(params);
    {
        v8::Isolate::Scope isolateScope(state->isolate);
        v8::HandleScope handleScope(state->isolate);
        v8::Local<v8::Context> context = v8::Context::New(state->isolate);
        state->context.Reset(state->isolate, context);
    }
    return state;
}

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
             (int)src.size(),
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

} // namespace

extern "C" tsc_value_t tsc_node_eval(tsc_str_t* source) {
    return evalSource(source);
}

extern "C" tsc_value_t tsc_node_function(tsc_str_t* body) {
    std::string wrapped = "(function(){";
    wrapped += tscToString(body);
    wrapped += "\n})";
    tsc_str_t source = { wrapped.size(), wrapped.c_str(), 0 };
    return evalSource(&source);
}

#endif
