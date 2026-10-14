#include "tsc_internal.h"

/* Every export receives the same boxed actual List. The public native fs
 * profile retains its declared UTF-8 default; no syntax-dependent option plan
 * or callback-specific module representation participates in execution. */
static tsc_str_t* fs_key(const char* text) { return tsc_str_from_cstr(text); }
static tsc_value_t fs_actual(tsc_array_t* args, size_t index) {
    return args && index < args->len ? TSC_ARR(tsc_value_t,args,index) : tsc_value_undefined();
}
static bool fs_string(tsc_value_t value) { return value_is_box(value) && value_tag(value)==TSC_VALUE_TAG_STRING; }
static tsc_value_t fs_option(tsc_value_t options, const char* name) {
    if(tsc_value_is_nullish(options)) return tsc_value_undefined();
    if(!tsc_value_is_object(options)) tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem options must be an object"));
    return tsc_value_get_prop(options,fs_key(name));
}
static bool fs_bool_option(tsc_value_t options,const char* name,bool fallback) {
    tsc_value_t value=fs_option(options,name);
    return tsc_value_is_undefined(value)?fallback:tsc_value_as_bool(value);
}
static double fs_number(tsc_value_t value,double fallback) {
    if(tsc_value_is_undefined(value)){if(isnan(fallback))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem numeric argument is required"));return fallback;}
    if(value_is_box(value))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem numeric argument must be a Number"));
    double result=tsc_value_as_num(value);
    if(!isfinite(result))tsc_throw_error(TSC_ERROR_RANGE,fs_key("filesystem numeric argument must be finite"));
    return result;
}
static double fs_number_option(tsc_value_t options,const char* name,double fallback) {
    return fs_number(fs_option(options,name),fallback);
}
static tsc_str_t* fs_path(tsc_value_t value) { return tsc_url_file_path_value(value); }
static double fs_time(tsc_value_t value) {
    if(value_is_object_value(value)) {
        tsc_object_t* object=value_ptr(value);
        if(object->is_date)return tsc_date_get_time((tsc_date_t*)object->class_ptr)/1000.0;
    }
    return fs_number(value,NAN);
}
static tsc_str_t* fs_encoding(tsc_value_t options,bool buffer_null) {
    tsc_value_t value=options;
    if(!fs_string(value))value=fs_option(options,"encoding");
    if(tsc_value_is_nullish(value))return buffer_null&&!tsc_value_is_undefined(value)?fs_key("buffer"):fs_key("utf8");
    if(!fs_string(value))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem encoding must be a String"));
    tsc_str_t* encoding=tsc_value_as_string(value);
    if(!str_lit_eq(encoding,"buffer")&&!tsc_buffer_is_encoding(encoding))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem encoding cannot be represented"));
    return encoding;
}
static tsc_value_t fs_signal(tsc_value_t options) { return tsc_value_is_object(options)?fs_option(options,"signal"):tsc_value_undefined(); }
static tsc_value_t fs_promise(tsc_promise_t* promise) { return tsc_value_promise(promise); }
static tsc_value_t fs_box_string(const void* value) { return tsc_value_string(*(tsc_str_t* const*)value); }
static bool fs_unbox_string(tsc_value_t value,void* output) { if(!fs_string(value))return false;*(tsc_str_t**)output=value_ptr(value);return true; }
static tsc_value_t fs_box_buffer(const void* value) { return tsc_value_buffer(*(tsc_buffer_t* const*)value); }
static bool fs_unbox_buffer(tsc_value_t value,void* output) { if(!value_is_object_value(value)||!((tsc_object_t*)value_ptr(value))->is_buffer)return false;*(tsc_buffer_t**)output=tsc_value_as_buffer(value);return true; }
static tsc_array_t* fs_string_array(tsc_array_t* value) { return tsc_array_set_value_codec(value,fs_box_string,fs_unbox_string); }
static tsc_array_t* fs_buffer_array(tsc_array_t* value) { return tsc_array_set_value_codec(value,fs_box_buffer,fs_unbox_buffer); }
tsc_value_t tsc_fs_native_entries_value(tsc_array_t* entries,bool buffer,bool dirents) {
    return tsc_value_array(dirents?entries:buffer?fs_buffer_array(entries):fs_string_array(entries));
}
static tsc_value_t fs_path_result(tsc_str_t* path,tsc_str_t* encoding) {
    if(str_lit_eq(encoding,"buffer"))return tsc_value_buffer(tsc_buffer_from_str(path,NULL));
    return tsc_value_string(tsc_buffer_to_string(tsc_buffer_from_str(path,NULL),encoding));
}
static int fs_path_encoding(tsc_str_t* encoding) {
    if(str_lit_eq(encoding,"buffer"))return 3;
    if(str_lit_eq(encoding,"hex"))return 1;
    if(str_lit_eq(encoding,"base64"))return 2;
    if(str_lit_eq(encoding,"utf8")||str_lit_eq(encoding,"utf-8"))return 0;
    tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem path encoding cannot be represented"));
}
static tsc_value_t fs_read_file(tsc_array_t* args,bool asynchronous) {
    tsc_str_t* path=fs_path(fs_actual(args,0));
    tsc_value_t options=fs_actual(args,1);tsc_str_t* encoding=fs_encoding(options,true);
    tsc_value_t signal=fs_signal(options);
    if(asynchronous) {
        if(tsc_abort_signal_is_aborted(signal))return fs_promise(tsc_promise_reject(tsc_value_get_prop(signal,fs_key("reason"))));
        tsc_promise_t* promise=str_lit_eq(encoding,"buffer")?tsc_fs_promises_read_file_async(path,true,signal):tsc_fs_promises_read_file_encoded_async(path,encoding,signal);
        return fs_promise(promise);
    }
    tsc_buffer_t* buffer=tsc_fs_read_file_buffer_sync(path);
    return str_lit_eq(encoding,"buffer")?tsc_value_buffer(buffer):tsc_value_string(tsc_buffer_to_string(buffer,encoding));
}
static double fs_mode(tsc_value_t value,double fallback) {
    if(tsc_value_is_nullish(value))return fallback;
    if(fs_string(value)) {
        tsc_str_t* text=tsc_value_as_string(value);double result=0;
        if(!text->len)tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem mode must be an octal String"));
        for(size_t index=0;index<text->len;++index){char digit=text->data[index];if(digit<'0'||digit>'7')tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem mode must be an octal String"));result=result*8+(digit-'0');}
        value=tsc_value_num(result);
    }
    double mode=fs_number(value,fallback);if(mode<0||mode>UINT32_MAX||floor(mode)!=mode)tsc_throw_error(TSC_ERROR_RANGE,fs_key("filesystem mode must be an unsigned integer"));return mode;
}
static tsc_value_t fs_write_options(tsc_value_t options,bool append) {
    if(tsc_value_is_nullish(options)||tsc_value_is_callable(options)||fs_string(options)) {
        tsc_value_t result=tsc_value_object(tsc_object_new());
        tsc_value_set_prop(result,fs_key("encoding"),fs_string(options)?options:tsc_value_string(fs_key("utf8")));
        tsc_value_set_prop(result,fs_key("mode"),tsc_value_num(438));
        tsc_value_set_prop(result,fs_key("flag"),tsc_value_string(fs_key(append?"a":"w")));
        if(!append)tsc_value_set_prop(result,fs_key("flush"),tsc_value_bool(false));
        options=result;
    }
    if(!tsc_value_is_object(options))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem options must be an object"));
    tsc_value_t encoding=fs_option(options,"encoding");
    if(!fs_string(encoding)||!str_lit_eq(tsc_value_as_string(encoding),"buffer")) {
        encoding=fs_option(options,"encoding");
        if(!tsc_value_is_nullish(encoding)&&(!fs_string(encoding)||!tsc_buffer_is_encoding(tsc_value_as_string(encoding))))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem encoding cannot be represented"));
    }
    tsc_value_t signal=fs_option(options,"signal");
    if(!tsc_value_is_undefined(signal)){signal=fs_option(options,"signal");if(!tsc_value_is_object(signal))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem signal must be an object"));}
    return options;
}
static tsc_value_t fs_copy_options(tsc_value_t source) {
    tsc_value_t target=tsc_value_object(tsc_object_new());void* volatile root=tsc_value_gc_root(target);
    tsc_sync_iterator_t iterator=tsc_for_in_iterator_open(source);tsc_value_t key;
    while(tsc_sync_iterator_step(&iterator,&key)){tsc_str_t* name=tsc_value_as_string(key);tsc_value_t value=tsc_value_get_prop(source,name);tsc_value_set_prop(target,name,value);}
    (void)root;return target;
}
typedef struct {tsc_promise_t* source;tsc_promise_t* target;tsc_value_t options;void* options_root;} fs_write_completion_t;
static void fs_write_completed(void* environment) {
    fs_write_completion_t* state=environment;
    if(tsc_promise_is_rejected(state->source)){tsc_promise_reject_in_place(state->target,tsc_promise_value(state->source));return;}
    TSC_TRY_FRAME(frame);tsc_try_push(&frame);
    if(setjmp(frame.jb)==0){tsc_value_t signal=fs_option(state->options,"signal");if(tsc_abort_signal_is_aborted(signal))tsc_throw_value(tsc_value_get_prop(signal,fs_key("reason")));tsc_try_pop();tsc_promise_fulfill_in_place(state->target,tsc_value_undefined());}
    else tsc_promise_reject_in_place(state->target,tsc_current_error_value());
}
static tsc_value_t fs_write_file(tsc_array_t* args,bool asynchronous,bool append) {
    tsc_value_t pathValue=fs_actual(args,0),data=fs_actual(args,1),options=fs_write_options(fs_actual(args,2),append);
    void* volatile optionsRoot=tsc_value_gc_root(options);
    if(append){(void)fs_mode(fs_option(options,"mode"),438);options=fs_copy_options(options);optionsRoot=tsc_value_gc_root(options);tsc_value_t flag=fs_option(options,"flag");if(!tsc_value_as_bool(flag))tsc_value_set_prop(options,fs_key("flag"),tsc_value_string(fs_key("a")));options=fs_write_options(options,false);}
    tsc_value_t flushValue=fs_option(options,"flush");if(tsc_value_is_nullish(flushValue))flushValue=tsc_value_bool(false);
    if(flushValue!=tsc_value_bool(false)&&flushValue!=tsc_value_bool(true))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem flush must be a Boolean"));
    bool flush=tsc_value_as_bool(flushValue);(void)fs_mode(fs_option(options,"mode"),438);
    tsc_value_t flag=fs_option(options,"flag");if(!tsc_value_as_bool(flag))flag=tsc_value_string(fs_key("w"));
    void* volatile flagRoot=tsc_value_gc_root(flag);
    tsc_str_t* encoding=NULL;bool utf8=false;
    if(!asynchronous&&fs_string(data)) {
        tsc_value_t first=fs_option(options,"encoding");utf8=fs_string(first)&&str_lit_eq(tsc_value_as_string(first),"utf8");
        if(!utf8){tsc_value_t second=fs_option(options,"encoding");utf8=fs_string(second)&&str_lit_eq(tsc_value_as_string(second),"utf-8");}
    }
    tsc_buffer_t* buffer;
    if(fs_string(data)) {encoding=utf8?fs_key("utf8"):fs_encoding(options,false);buffer=tsc_buffer_from_str(tsc_value_as_string(data),encoding);}
    else buffer=tsc_value_as_buffer(data);
    tsc_value_t signal=tsc_value_undefined();
    if(asynchronous){signal=fs_option(options,"signal");if(!tsc_value_is_undefined(signal)&&!tsc_value_is_object(signal))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem signal must be an object"));signal=fs_option(options,"signal");if(tsc_abort_signal_is_aborted(signal))tsc_throw_value(tsc_value_get_prop(signal,fs_key("reason")));}
    tsc_str_t* path=fs_path(pathValue);int flags=tsc_fs_open_flags_value(flag);double mode=fs_mode(fs_option(options,"mode"),438);
    (void)optionsRoot;(void)flagRoot;
    if(asynchronous) {
        tsc_promise_t* promise=tsc_fs_promises_write_file_buffer_flags_async(path,buffer,flags,mode,flush,signal,flush?options:tsc_value_undefined());
        if(flush)return fs_promise(promise);
        fs_write_completion_t* completion=TSC_GC_MALLOC(sizeof(*completion));*completion=(fs_write_completion_t){.source=promise,.target=tsc_promise_pending(),.options=options,.options_root=tsc_value_gc_root(options)};
        if(tsc_promise_is_pending(promise))tsc_promise_add_callback(promise,fs_write_completed,completion);else tsc_queue_microtask(fs_write_completed,completion);
        return fs_promise(completion->target);
    }
    tsc_fs_write_file_buffer_flags_sync(path,buffer,flags,mode,flush);return tsc_value_undefined();
}
static tsc_value_t fs_readdir(tsc_array_t* args,bool asynchronous) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t options=fs_actual(args,1);
    tsc_str_t* encoding=fs_encoding(options,false);bool object=tsc_value_is_object(options);
    bool recursive=object?fs_bool_option(options,"recursive",false):false;
    bool dirents=object?fs_bool_option(options,"withFileTypes",false):false;
    tsc_value_t signal=fs_signal(options);bool buffer=str_lit_eq(encoding,"buffer");
    if(asynchronous) {
        tsc_promise_t* promise;
        if(dirents)promise=recursive?tsc_fs_promises_readdir_recursive_dirents_async(path,encoding,signal):tsc_fs_promises_readdir_dirents_async(path,encoding,signal);
        else if(buffer)promise=recursive?tsc_fs_promises_readdir_recursive_async(path,true,signal):tsc_fs_promises_readdir_async(path,true,signal);
        else promise=recursive?tsc_fs_promises_readdir_recursive_encoded_async(path,encoding,signal):tsc_fs_promises_readdir_encoded_async(path,encoding,signal);
        return fs_promise(promise);
    }
    tsc_array_t* entries;
    if(dirents){entries=recursive?tsc_fs_readdir_recursive_dirents_sync(path):tsc_fs_readdir_dirents_sync(path);tsc_fs_dirents_encode_names(entries,encoding);}
    else if(buffer)entries=fs_buffer_array(recursive?tsc_fs_readdir_recursive_buffer_sync(path):tsc_fs_readdir_buffer_sync(path));
    else{entries=recursive?tsc_fs_readdir_recursive_sync(path):tsc_fs_readdir_sync(path);tsc_fs_readdir_encode_names(entries,encoding);fs_string_array(entries);}
    return tsc_value_array(entries);
}
static tsc_value_t fs_opendir(tsc_array_t* args,bool asynchronous) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t options=fs_actual(args,1);
    bool recursive=fs_bool_option(options,"recursive",false);tsc_str_t* encoding=fs_encoding(options,false);
    double size=fs_number_option(options,"bufferSize",32);if(size<1||floor(size)!=size)tsc_throw_error(TSC_ERROR_RANGE,fs_key("filesystem bufferSize must be positive"));
    tsc_value_t signal=fs_signal(options);
    return asynchronous?fs_promise(tsc_fs_promises_opendir_async(path,recursive,encoding,(size_t)size,signal)):tsc_fs_opendir_sync(path,recursive,encoding,(size_t)size);
}
static tsc_value_t fs_stat(tsc_array_t* args,bool asynchronous,bool link) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t options=fs_actual(args,1);
    if(fs_bool_option(options,"bigint",false))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem bigint stat cannot be represented"));
    bool throws=fs_bool_option(options,"throwIfNoEntry",true);tsc_value_t signal=fs_signal(options);
    if(asynchronous)return fs_promise(link?tsc_fs_promises_lstat_async(path,throws,signal):tsc_fs_promises_stat_async(path,throws,signal));
    tsc_fs_stats_t* value=link?(throws?tsc_fs_lstat_sync(path):tsc_fs_lstat_sync_no_throw(path)):(throws?tsc_fs_stat_sync(path):tsc_fs_stat_sync_no_throw(path));
    return value?tsc_value_fs_stats(value):tsc_value_undefined();
}
static tsc_value_t fs_open(tsc_array_t* args,bool asynchronous) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t flags=fs_actual(args,1);bool numeric=!value_is_box(flags);
    tsc_str_t* string=tsc_value_is_undefined(flags)?fs_key("r"):numeric?NULL:fs_string(flags)?tsc_value_as_string(flags):NULL;
    if(!numeric&&!string)tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem flags must be String or Number"));
    double number=numeric?fs_number(flags,0):0,mode=fs_mode(fs_actual(args,2),438);
    return asynchronous?fs_promise(tsc_fs_promises_open_async(path,string,number,numeric,mode)):tsc_value_num(tsc_fs_open_sync(path,string,number,numeric,mode));
}
static tsc_value_t fs_path_operation(tsc_array_t* args,bool asynchronous,int kind) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t options=fs_actual(args,1);tsc_str_t* encoding=fs_encoding(options,false);tsc_value_t signal=fs_signal(options);
    if(asynchronous){int mode=fs_path_encoding(encoding);tsc_promise_t* promise=kind==0?tsc_fs_promises_realpath_async(path,mode,signal):kind==1?tsc_fs_promises_readlink_async(path,mode,signal):tsc_fs_promises_mkdtemp_async(path,mode,signal);return fs_promise(promise);}
    return fs_path_result(kind==0?tsc_fs_realpath_sync(path):kind==1?tsc_fs_readlink_sync(path):tsc_fs_mkdtemp_sync(path),encoding);
}
static tsc_value_t fs_copy(tsc_array_t* args,bool asynchronous) {
    tsc_str_t* from=fs_path(fs_actual(args,0));tsc_str_t* to=fs_path(fs_actual(args,1));tsc_value_t options=fs_actual(args,2);
    bool recursive=fs_bool_option(options,"recursive",false),force=fs_bool_option(options,"force",true),error=fs_bool_option(options,"errorOnExist",false),dereference=fs_bool_option(options,"dereference",false),verbatim=fs_bool_option(options,"verbatimSymlinks",false);
    double mode=fs_number_option(options,"mode",0);bool preserve=fs_bool_option(options,"preserveTimestamps",false);
    if(asynchronous)return fs_promise(tsc_fs_promises_cp_async(from,to,recursive,force,error,dereference,verbatim,mode,preserve));
    tsc_fs_cp_sync_opts(from,to,recursive,force,error,dereference,verbatim,mode,preserve);return tsc_value_undefined();
}

static tsc_array_t* fs_buffer_list(tsc_value_t value) {
    tsc_array_t* source=tsc_value_as_array(value);tsc_array_t* result=tsc_array_new(sizeof(tsc_buffer_t*),source->len);
    for(size_t index=0;index<source->len;++index){tsc_buffer_t* buffer=tsc_value_as_buffer(tsc_value_get_prop(tsc_value_array(source),tsc_str_from_num((double)index)));tsc_array_push_raw(result,&buffer);}
    return result;
}
static tsc_value_t fs_write_sync(tsc_array_t* args) {
    double fd=fs_number(fs_actual(args,0),NAN);tsc_value_t data=fs_actual(args,1);
    if(fs_string(data)) {
        tsc_value_t position=fs_actual(args,2);bool current=tsc_value_is_nullish(position);double offset=current?0:fs_number(position,0);
        tsc_str_t* encoding=fs_encoding(fs_actual(args,3),false);tsc_buffer_t* buffer=tsc_buffer_from_str(tsc_value_as_string(data),encoding);
        return tsc_value_num(tsc_fs_write_buffer_sync(fd,buffer,0,tsc_buffer_length(buffer),offset,current));
    }
    tsc_buffer_t* buffer=tsc_value_as_buffer(data);double offset=fs_number(fs_actual(args,2),0),length=fs_number(fs_actual(args,3),tsc_buffer_length(buffer)-offset);
    tsc_value_t position=fs_actual(args,4);bool current=tsc_value_is_nullish(position);double at=current?0:fs_number(position,0);
    return tsc_value_num(tsc_fs_write_buffer_sync(fd,buffer,offset,length,at,current));
}
enum {
#define TSC_FS_FD_OPERATION(name, has_length, call) FS_FD_INDEX_##name,
#include "tsc_fs_operations.def"
#undef TSC_FS_FD_OPERATION
    FS_FD_INDEX_COUNT
};

static tsc_value_t fs_SYNC_readFileSync(tsc_array_t* args) {
    return fs_read_file(args,false);
}

static tsc_value_t fs_SYNC_writeFileSync(tsc_array_t* args) {
    return fs_write_file(args,false,false);
}

static tsc_value_t fs_SYNC_appendFileSync(tsc_array_t* args) {
    return fs_write_file(args,false,true);
}

static tsc_value_t fs_SYNC_existsSync(tsc_array_t* args) {
    return tsc_value_bool(tsc_fs_exists_sync_value(fs_actual(args,0)));
}

static tsc_value_t fs_SYNC_accessSync(tsc_array_t* args) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t value=fs_actual(args,1);
    double mode=tsc_value_is_object(value)?0:fs_number(value,0);
    tsc_fs_access_sync_mode(path,mode);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_readdirSync(tsc_array_t* args) {
    return fs_readdir(args,false);
}

static tsc_value_t fs_SYNC_opendirSync(tsc_array_t* args) {
    return fs_opendir(args,false);
}

static tsc_value_t fs_SYNC_statSync(tsc_array_t* args) {
    return fs_stat(args,false,false);
}

static tsc_value_t fs_SYNC_statfsSync(tsc_array_t* args) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t options=fs_actual(args,1);
    if(fs_bool_option(options,"bigint",false))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem bigint statfs cannot be represented"));
    return tsc_fs_statfs_sync(path);
}

static tsc_value_t fs_SYNC_lstatSync(tsc_array_t* args) {
    return fs_stat(args,false,true);
}

static tsc_value_t fs_SYNC_realpathSync(tsc_array_t* args) {
    return fs_path_operation(args,false,0);
}

static tsc_value_t fs_SYNC_readlinkSync(tsc_array_t* args) {
    return fs_path_operation(args,false,1);
}

static tsc_value_t fs_SYNC_symlinkSync(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    tsc_str_t* q=fs_path(fs_actual(args,1));
    tsc_value_t type=fs_actual(args,2);if(!tsc_value_is_undefined(type)&&!fs_string(type))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem symlink type must be a String"));
    tsc_fs_symlink_sync(p,q);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_linkSync(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    tsc_str_t* q=fs_path(fs_actual(args,1));
    tsc_fs_link_sync(p,q);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_mkdtempSync(tsc_array_t* args) {
    return fs_path_operation(args,false,2);
}

static tsc_value_t fs_SYNC_truncateSync(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    double n=fs_number(fs_actual(args,1),0);
    tsc_fs_truncate_sync(p,n);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_utimesSync(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    double a=fs_time(fs_actual(args,1));
    double b=fs_time(fs_actual(args,2));
    tsc_fs_utimes_sync(p,a,b);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_lutimesSync(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    double a=fs_time(fs_actual(args,1));
    double b=fs_time(fs_actual(args,2));
    tsc_fs_lutimes_sync(p,a,b);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_chownSync(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    double u=fs_number(fs_actual(args,1),NAN);
    double g=fs_number(fs_actual(args,2),NAN);
    tsc_fs_chown_sync(p,u,g);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_lchownSync(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    double u=fs_number(fs_actual(args,1),NAN);
    double g=fs_number(fs_actual(args,2),NAN);
    tsc_fs_lchown_sync(p,u,g);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_chmodSync(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    double m=fs_number(fs_actual(args,1),NAN);
    tsc_fs_chmod_sync(p,m);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_mkdirSync(tsc_array_t* args) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t options=fs_actual(args,1);
    bool object=tsc_value_is_object(options);bool recursive=object?fs_bool_option(options,"recursive",false):false;
    double mode=object?fs_mode(fs_option(options,"mode"),511):fs_mode(options,511);
    tsc_fs_mkdir_sync_opts(path,recursive,mode);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_rmSync(tsc_array_t* args) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t options=fs_actual(args,1);
    bool recursive=fs_bool_option(options,"recursive",false);bool force=fs_bool_option(options,"force",false);tsc_fs_rm_sync_opts(path,recursive,force);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_unlinkSync(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    tsc_fs_unlink_sync(p);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_rmdirSync(tsc_array_t* args) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t options=fs_actual(args,1);
    bool recursive=fs_bool_option(options,"recursive",false);tsc_fs_rmdir_sync_opts(path,recursive);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_cpSync(tsc_array_t* args) {
    return fs_copy(args,false);
}

static tsc_value_t fs_SYNC_copyFileSync(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    tsc_str_t* q=fs_path(fs_actual(args,1));
    double m=fs_number(fs_actual(args,2),0);
    tsc_fs_copy_file_sync_mode(p,q,m);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_renameSync(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    tsc_str_t* q=fs_path(fs_actual(args,1));
    tsc_fs_rename_sync(p,q);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_openSync(tsc_array_t* args) {
    return fs_open(args,false);
}

static tsc_value_t fs_SYNC_fstatSync(tsc_array_t* args) {
    double fd=fs_number(fs_actual(args,0),NAN);tsc_value_t options=fs_actual(args,1);
    if(fs_bool_option(options,"bigint",false))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem bigint fstat cannot be represented"));
    return tsc_value_fs_stats(tsc_fs_fstat_sync(fd));
}

static tsc_value_t fs_SYNC_fchmodSync(tsc_array_t* args) {
    double f=fs_number(fs_actual(args,0),NAN);
    double m=fs_number(fs_actual(args,1),NAN);
    tsc_fs_fchmod_sync(f,m);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_fchownSync(tsc_array_t* args) {
    double f=fs_number(fs_actual(args,0),NAN);
    double u=fs_number(fs_actual(args,1),NAN);
    double g=fs_number(fs_actual(args,2),NAN);
    tsc_fs_fchown_sync(f,u,g);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_futimesSync(tsc_array_t* args) {
    double f=fs_number(fs_actual(args,0),NAN);
    double a=fs_time(fs_actual(args,1));
    double b=fs_time(fs_actual(args,2));
    tsc_fs_futimes_sync(f,a,b);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_readSync(tsc_array_t* args) {
    return tsc_value_num(tsc_fs_read_sync_values(args));
}

static tsc_value_t fs_SYNC_writeSync(tsc_array_t* args) {
    return fs_write_sync(args);
}

static tsc_value_t fs_SYNC_readvSync(tsc_array_t* args) {
    double fd=fs_number(fs_actual(args,0),NAN);tsc_array_t* buffers=fs_buffer_list(fs_actual(args,1));tsc_value_t position=fs_actual(args,2);bool current=tsc_value_is_nullish(position);double at=current?0:fs_number(position,0);return tsc_value_num(tsc_fs_readv_sync(fd,buffers,at,current));
}

static tsc_value_t fs_SYNC_writevSync(tsc_array_t* args) {
    double fd=fs_number(fs_actual(args,0),NAN);tsc_array_t* buffers=fs_buffer_list(fs_actual(args,1));tsc_value_t position=fs_actual(args,2);bool current=tsc_value_is_nullish(position);double at=current?0:fs_number(position,0);return tsc_value_num(tsc_fs_writev_sync(fd,buffers,at,current));
}

static tsc_value_t fs_SYNC_closeSync(tsc_array_t* args) {
    tsc_fs_fd_sync_values(FS_FD_INDEX_closeSync,args);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_fsyncSync(tsc_array_t* args) {
    tsc_fs_fd_sync_values(FS_FD_INDEX_fsyncSync,args);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_fdatasyncSync(tsc_array_t* args) {
    tsc_fs_fd_sync_values(FS_FD_INDEX_fdatasyncSync,args);return tsc_value_undefined();
}

static tsc_value_t fs_SYNC_ftruncateSync(tsc_array_t* args) {
    tsc_fs_fd_sync_values(FS_FD_INDEX_ftruncateSync,args);return tsc_value_undefined();
}

static tsc_value_t fs_PROMISES_open(tsc_array_t* args) {
    return fs_open(args,true);
}

static tsc_value_t fs_PROMISES_opendir(tsc_array_t* args) {
    return fs_opendir(args,true);
}

static tsc_value_t fs_PROMISES_readFile(tsc_array_t* args) {
    return fs_read_file(args,true);
}

static tsc_value_t fs_PROMISES_writeFile(tsc_array_t* args) {
    return fs_write_file(args,true,false);
}

static tsc_value_t fs_PROMISES_appendFile(tsc_array_t* args) {
    return fs_write_file(args,true,true);
}

static tsc_value_t fs_PROMISES_readdir(tsc_array_t* args) {
    return fs_readdir(args,true);
}

static tsc_value_t fs_PROMISES_statfs(tsc_array_t* args) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t options=fs_actual(args,1);
    if(fs_bool_option(options,"bigint",false))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem bigint statfs cannot be represented"));
    tsc_value_t signal=fs_signal(options);return fs_promise(tsc_fs_promises_statfs_async(path,signal));
}

static tsc_value_t fs_PROMISES_fstat(tsc_array_t* args) {
    double fd=fs_number(fs_actual(args,0),NAN);tsc_value_t options=fs_actual(args,1);
    if(fs_bool_option(options,"bigint",false))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem bigint fstat cannot be represented"));
    return fs_promise(tsc_fs_promises_fstat_async(fd));
}

static tsc_value_t fs_PROMISES_ftruncate(tsc_array_t* args) {
    double fd=fs_number(fs_actual(args,0),NAN);double length=fs_number(fs_actual(args,1),0);return fs_promise(tsc_fs_promises_ftruncate_async(fd,length));
}

static tsc_value_t fs_PROMISES_fsync(tsc_array_t* args) {
    double fd=fs_number(fs_actual(args,0),NAN);return fs_promise(tsc_fs_promises_fsync_async(fd));
}

static tsc_value_t fs_PROMISES_fdatasync(tsc_array_t* args) {
    double fd=fs_number(fs_actual(args,0),NAN);return fs_promise(tsc_fs_promises_fdatasync_async(fd));
}

static tsc_value_t fs_PROMISES_fchmod(tsc_array_t* args) {
    double f=fs_number(fs_actual(args,0),NAN);
    double m=fs_number(fs_actual(args,1),NAN);
    return fs_promise(tsc_fs_promises_fchmod_async(f,m));
}

static tsc_value_t fs_PROMISES_fchown(tsc_array_t* args) {
    double f=fs_number(fs_actual(args,0),NAN);
    double u=fs_number(fs_actual(args,1),NAN);
    double g=fs_number(fs_actual(args,2),NAN);
    return fs_promise(tsc_fs_promises_fchown_async(f,u,g));
}

static tsc_value_t fs_PROMISES_futimes(tsc_array_t* args) {
    double f=fs_number(fs_actual(args,0),NAN);
    double a=fs_time(fs_actual(args,1));
    double b=fs_time(fs_actual(args,2));
    return fs_promise(tsc_fs_promises_futimes_async(f,a,b));
}

static tsc_value_t fs_PROMISES_stat(tsc_array_t* args) {
    return fs_stat(args,true,false);
}

static tsc_value_t fs_PROMISES_lstat(tsc_array_t* args) {
    return fs_stat(args,true,true);
}

static tsc_value_t fs_PROMISES_realpath(tsc_array_t* args) {
    return fs_path_operation(args,true,0);
}

static tsc_value_t fs_PROMISES_readlink(tsc_array_t* args) {
    return fs_path_operation(args,true,1);
}

static tsc_value_t fs_PROMISES_symlink(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    tsc_str_t* q=fs_path(fs_actual(args,1));
    tsc_value_t type=fs_actual(args,2);if(!tsc_value_is_undefined(type)&&!fs_string(type))tsc_throw_error(TSC_ERROR_TYPE,fs_key("filesystem symlink type must be a String"));
    return fs_promise(tsc_fs_promises_symlink_async(p,q));
}

static tsc_value_t fs_PROMISES_link(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    tsc_str_t* q=fs_path(fs_actual(args,1));
    return fs_promise(tsc_fs_promises_link_async(p,q));
}

static tsc_value_t fs_PROMISES_mkdtemp(tsc_array_t* args) {
    return fs_path_operation(args,true,2);
}

static tsc_value_t fs_PROMISES_truncate(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    double n=fs_number(fs_actual(args,1),0);
    return fs_promise(tsc_fs_promises_truncate_async(p,n));
}

static tsc_value_t fs_PROMISES_utimes(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    double a=fs_time(fs_actual(args,1));
    double b=fs_time(fs_actual(args,2));
    return fs_promise(tsc_fs_promises_utimes_async(p,a,b));
}

static tsc_value_t fs_PROMISES_lutimes(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    double a=fs_time(fs_actual(args,1));
    double b=fs_time(fs_actual(args,2));
    return fs_promise(tsc_fs_promises_lutimes_async(p,a,b));
}

static tsc_value_t fs_PROMISES_chown(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    double u=fs_number(fs_actual(args,1),NAN);
    double g=fs_number(fs_actual(args,2),NAN);
    return fs_promise(tsc_fs_promises_chown_async(p,u,g));
}

static tsc_value_t fs_PROMISES_lchown(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    double u=fs_number(fs_actual(args,1),NAN);
    double g=fs_number(fs_actual(args,2),NAN);
    return fs_promise(tsc_fs_promises_lchown_async(p,u,g));
}

static tsc_value_t fs_PROMISES_chmod(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    double m=fs_number(fs_actual(args,1),NAN);
    return fs_promise(tsc_fs_promises_chmod_async(p,m));
}

static tsc_value_t fs_PROMISES_access(tsc_array_t* args) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t value=fs_actual(args,1);
    double mode=tsc_value_is_object(value)?0:fs_number(value,0);
    tsc_value_t signal=fs_signal(value);return fs_promise(tsc_fs_promises_access_async(path,mode,signal));
}

static tsc_value_t fs_PROMISES_mkdir(tsc_array_t* args) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t options=fs_actual(args,1);
    bool object=tsc_value_is_object(options);bool recursive=object?fs_bool_option(options,"recursive",false):false;
    double mode=object?fs_mode(fs_option(options,"mode"),511):fs_mode(options,511);
    tsc_value_t signal=fs_signal(options);return fs_promise(recursive?tsc_fs_promises_mkdir_recursive_async(path,mode,signal):tsc_fs_promises_mkdir_async(path,mode,signal));
}

static tsc_value_t fs_PROMISES_rm(tsc_array_t* args) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t options=fs_actual(args,1);
    bool recursive=fs_bool_option(options,"recursive",false);bool force=fs_bool_option(options,"force",false);tsc_value_t signal=fs_signal(options);return fs_promise(recursive?tsc_fs_promises_rm_recursive_async(path,force,signal):tsc_fs_promises_rm_async(path,force,signal));
}

static tsc_value_t fs_PROMISES_unlink(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    return fs_promise(tsc_fs_promises_unlink_async(p));
}

static tsc_value_t fs_PROMISES_rmdir(tsc_array_t* args) {
    tsc_str_t* path=fs_path(fs_actual(args,0));tsc_value_t options=fs_actual(args,1);
    bool recursive=fs_bool_option(options,"recursive",false);tsc_value_t signal=fs_signal(options);return fs_promise(recursive?tsc_fs_promises_rmdir_recursive_async(path,signal):tsc_fs_promises_rmdir_async(path,signal));
}

static tsc_value_t fs_PROMISES_cp(tsc_array_t* args) {
    return fs_copy(args,true);
}

static tsc_value_t fs_PROMISES_copyFile(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    tsc_str_t* q=fs_path(fs_actual(args,1));
    double m=fs_number(fs_actual(args,2),0);
    return fs_promise(tsc_fs_promises_copy_file_async(p,q,m));
}

static tsc_value_t fs_PROMISES_rename(tsc_array_t* args) {
    tsc_str_t* p=fs_path(fs_actual(args,0));
    tsc_str_t* q=fs_path(fs_actual(args,1));
    return fs_promise(tsc_fs_promises_rename_async(p,q));
}

/* Realm-local export identities and namespace bindings share this table. */
typedef struct { const char* name; bool asynchronous; double length; tsc_value_t (*call)(tsc_array_t*); } fs_export_t;
static const fs_export_t fs_exports[] = {
#define FS_ASYNC_SYNC false
#define FS_ASYNC_PROMISES true
#define TSC_FS_EXPORT(channel,name,length) {#name,FS_ASYNC_##channel,length,fs_##channel##_##name},
#include "tsc_fs_operations.def"
#undef TSC_FS_EXPORT
};
enum {FS_CONSTANTS,FS_DIRENT,FS_PROMISES,FS_DEFAULT_SYNC,FS_DEFAULT_PROMISES,FS_BINDING_COUNT};
typedef struct { tsc_value_t values[sizeof(fs_exports)/sizeof(*fs_exports)];void* roots[sizeof(fs_exports)/sizeof(*fs_exports)];tsc_object_t* module[2];tsc_object_t* namespace_object[2];tsc_object_t* constants;tsc_value_t auxiliary[FS_BINDING_COUNT];void* auxiliary_roots[FS_BINDING_COUNT]; } fs_realm_t;
static const char fs_realm_key;
static fs_realm_t* fs_realm(void) {
    fs_realm_t* state=tsc_realm_state_get(&fs_realm_key);
    if(!state){state=TSC_GC_MALLOC(sizeof(*state));memset(state,0,sizeof(*state));tsc_realm_state_set(&fs_realm_key,state);}
    return state;
}
static tsc_value_t fs_constants_get(void* environment,tsc_value_t receiver) {
    (void)environment;(void)receiver;fs_realm_t* state=fs_realm();
    if(!state->constants){
        state->constants=tsc_object_new();state->constants->prototype=tsc_value_null();
#define TSC_FS_CONSTANT(name,value) tsc_object_define(state->constants,fs_key(#name),tsc_value_num(value),false,true,false);
#include "tsc_fs_operations.def"
#undef TSC_FS_CONSTANT
    }
    return tsc_value_object(state->constants);
}
static tsc_value_t fs_apply(void* environment,tsc_value_t receiver,tsc_array_t* arguments) {
    (void)receiver;const fs_export_t* operation=environment;
    tsc_array_t* volatile actuals=arguments;
    if(!operation->asynchronous)return operation->call(actuals);
    TSC_TRY_FRAME(frame);tsc_try_push(&frame);
    if(setjmp(frame.jb)==0){tsc_value_t result=operation->call(actuals);tsc_try_pop();return result;}
    return tsc_value_promise(tsc_promise_reject(tsc_current_error_value()));
}
static tsc_value_t fs_binding_get(void* environment,tsc_value_t receiver) {
    (void)receiver;return *(tsc_value_t*)environment;
}
static void fs_auxiliary(fs_realm_t* state,size_t slot,tsc_value_t value) {
    state->auxiliary[slot]=value;state->auxiliary_roots[slot]=tsc_value_gc_root(value);
}
tsc_value_t tsc_fs_module_value(bool promises,bool namespace_import) {
    fs_realm_t* state=fs_realm();size_t channel=promises?1:0;
    if(!state->module[channel]) {
        state->module[channel]=tsc_object_new();state->namespace_object[channel]=tsc_module_namespace_new();
        for(size_t index=0;index<sizeof(fs_exports)/sizeof(*fs_exports);++index) {
            const fs_export_t* entry=&fs_exports[index];if(entry->asynchronous!=promises)continue;
            tsc_str_t* name=fs_key(entry->name);state->values[index]=tsc_value_function_builtin_named(fs_apply,(void*)entry,entry->length,name);state->roots[index]=tsc_value_gc_root(state->values[index]);
            tsc_object_define(state->module[channel],name,state->values[index],true,true,true);
            (void)tsc_object_define_accessor(state->namespace_object[channel],name,fs_binding_get,&state->values[index],true,NULL,NULL,false,true,true,false,true);
        }
        fs_auxiliary(state,FS_CONSTANTS,fs_constants_get(NULL,tsc_value_undefined()));
        tsc_object_define(state->module[channel],fs_key("constants"),state->auxiliary[FS_CONSTANTS],promises,true,promises);
        (void)tsc_object_define_accessor(state->namespace_object[channel],fs_key("constants"),fs_binding_get,&state->auxiliary[FS_CONSTANTS],true,NULL,NULL,false,true,true,false,true);
        if(!promises) {
            fs_auxiliary(state,FS_DIRENT,tsc_fs_dirent_constructor_value());fs_auxiliary(state,FS_PROMISES,tsc_fs_module_value(true,false));
            tsc_object_define(state->module[channel],fs_key("Dirent"),state->auxiliary[FS_DIRENT],true,true,true);
            (void)tsc_object_define_accessor(state->module[channel],fs_key("promises"),fs_binding_get,&state->auxiliary[FS_PROMISES],true,NULL,NULL,false,true,true,true,true);
            (void)tsc_object_define_accessor(state->namespace_object[channel],fs_key("Dirent"),fs_binding_get,&state->auxiliary[FS_DIRENT],true,NULL,NULL,false,true,true,false,true);
            (void)tsc_object_define_accessor(state->namespace_object[channel],fs_key("promises"),fs_binding_get,&state->auxiliary[FS_PROMISES],true,NULL,NULL,false,true,true,false,true);
        }
        size_t defaultSlot=promises?FS_DEFAULT_PROMISES:FS_DEFAULT_SYNC;fs_auxiliary(state,defaultSlot,tsc_value_object(state->module[channel]));
        (void)tsc_object_define_accessor(state->namespace_object[channel],fs_key("default"),fs_binding_get,&state->auxiliary[defaultSlot],true,NULL,NULL,false,true,true,false,true);
        tsc_module_namespace_finalize(state->namespace_object[channel]);
    }
    return tsc_value_object(namespace_import?state->namespace_object[channel]:state->module[channel]);
}
tsc_value_t tsc_fs_export_value(bool promises,tsc_str_t* name) { return tsc_value_get_prop(tsc_fs_module_value(promises,true),name); }
