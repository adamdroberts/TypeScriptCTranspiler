#include "tsc_internal.h"

/* ---------------- Symbol ---------------- */

typedef struct tsc_symbol_registry_entry {
    tsc_str_t* key;
    tsc_symbol_t* sym;
    struct tsc_symbol_registry_entry* next;
} tsc_symbol_registry_entry_t;

static uint64_t tsc_next_symbol_id = 1;
static tsc_symbol_registry_entry_t* tsc_symbol_registry = NULL;

typedef struct {
    tsc_well_known_symbol_descriptor_t descriptor;
    tsc_symbol_t* value;
} tsc_well_known_symbol_entry_t;

#define TSC_WELL_KNOWN_SYMBOL_ENTRY(property, description, internal_key) \
    { { property, sizeof(property) - 1, description, sizeof(description) - 1, \
        internal_key, sizeof(internal_key) - 1 }, NULL }

static tsc_well_known_symbol_entry_t tsc_well_known_symbols[TSC_WELL_KNOWN_SYMBOL_COUNT] = {
    [TSC_WELL_KNOWN_SYMBOL_ASYNC_ITERATOR] = TSC_WELL_KNOWN_SYMBOL_ENTRY("asyncIterator", "Symbol.asyncIterator", "__tsc_symbol_asyncIterator"),
    [TSC_WELL_KNOWN_SYMBOL_ASYNC_DISPOSE] = TSC_WELL_KNOWN_SYMBOL_ENTRY("asyncDispose", "Symbol.asyncDispose", "__tsc_symbol_asyncDispose"),
    [TSC_WELL_KNOWN_SYMBOL_DISPOSE] = TSC_WELL_KNOWN_SYMBOL_ENTRY("dispose", "Symbol.dispose", "__tsc_symbol_dispose"),
    [TSC_WELL_KNOWN_SYMBOL_HAS_INSTANCE] = TSC_WELL_KNOWN_SYMBOL_ENTRY("hasInstance", "Symbol.hasInstance", "__tsc_symbol_hasInstance"),
    [TSC_WELL_KNOWN_SYMBOL_IS_CONCAT_SPREADABLE] = TSC_WELL_KNOWN_SYMBOL_ENTRY("isConcatSpreadable", "Symbol.isConcatSpreadable", "__tsc_symbol_isConcatSpreadable"),
    [TSC_WELL_KNOWN_SYMBOL_ITERATOR] = TSC_WELL_KNOWN_SYMBOL_ENTRY("iterator", "Symbol.iterator", "__tsc_symbol_iterator"),
    [TSC_WELL_KNOWN_SYMBOL_MATCH] = TSC_WELL_KNOWN_SYMBOL_ENTRY("match", "Symbol.match", "__tsc_symbol_match"),
    [TSC_WELL_KNOWN_SYMBOL_MATCH_ALL] = TSC_WELL_KNOWN_SYMBOL_ENTRY("matchAll", "Symbol.matchAll", "__tsc_symbol_matchAll"),
    [TSC_WELL_KNOWN_SYMBOL_REPLACE] = TSC_WELL_KNOWN_SYMBOL_ENTRY("replace", "Symbol.replace", "__tsc_symbol_replace"),
    [TSC_WELL_KNOWN_SYMBOL_SEARCH] = TSC_WELL_KNOWN_SYMBOL_ENTRY("search", "Symbol.search", "__tsc_symbol_search"),
    [TSC_WELL_KNOWN_SYMBOL_SPECIES] = TSC_WELL_KNOWN_SYMBOL_ENTRY("species", "Symbol.species", "__tsc_symbol_species"),
    [TSC_WELL_KNOWN_SYMBOL_SPLIT] = TSC_WELL_KNOWN_SYMBOL_ENTRY("split", "Symbol.split", "__tsc_symbol_split"),
    [TSC_WELL_KNOWN_SYMBOL_TO_PRIMITIVE] = TSC_WELL_KNOWN_SYMBOL_ENTRY("toPrimitive", "Symbol.toPrimitive", "__tsc_symbol_toPrimitive"),
    [TSC_WELL_KNOWN_SYMBOL_TO_STRING_TAG] = TSC_WELL_KNOWN_SYMBOL_ENTRY("toStringTag", "Symbol.toStringTag", "__tsc_symbol_toStringTag"),
    [TSC_WELL_KNOWN_SYMBOL_UNSCOPABLES] = TSC_WELL_KNOWN_SYMBOL_ENTRY("unscopables", "Symbol.unscopables", "__tsc_symbol_unscopables"),
};

#undef TSC_WELL_KNOWN_SYMBOL_ENTRY

tsc_symbol_t* tsc_symbol_new(const tsc_str_t* description) {
    tsc_symbol_t* sym = (tsc_symbol_t*)TSC_GC_MALLOC(sizeof(tsc_symbol_t));
    sym->id = TSC_ID_INC(tsc_next_symbol_id) - 1;
    sym->description = (tsc_str_t*)description;
    sym->global_key = NULL;
    sym->property_key = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    sym->property_key->len = 0;
    sym->property_key->data = "";
    sym->property_key->hash = splitmix64_mix(sym->id ^ 0x53594d424f4cULL);
    if (sym->property_key->hash == 0) sym->property_key->hash = 1;
    sym->property_key->symbol_key = sym;
    sym->property_key->utf16_len_plus_one = 0;
    sym->property_key->utf16_cache = NULL;
    return sym;
}

tsc_symbol_t* tsc_symbol_for(const tsc_str_t* key) {
    tsc_runtime_lock();
    for (tsc_symbol_registry_entry_t* e = tsc_symbol_registry; e; e = e->next) {
        if (tsc_str_eq(e->key, key)) {
            tsc_runtime_unlock();
            return e->sym;
        }
    }
    tsc_symbol_t* sym = tsc_symbol_new(key);
    sym->global_key = (tsc_str_t*)key;
    tsc_symbol_registry_entry_t* entry =
        (tsc_symbol_registry_entry_t*)TSC_GC_MALLOC(sizeof(tsc_symbol_registry_entry_t));
    entry->key = (tsc_str_t*)key;
    entry->sym = sym;
    entry->next = tsc_symbol_registry;
    tsc_symbol_registry = entry;
    tsc_runtime_unlock();
    return sym;
}

tsc_str_t* tsc_symbol_key_for(const tsc_symbol_t* sym) {
    return sym ? sym->global_key : NULL;
}

tsc_str_t* tsc_symbol_property_key(tsc_symbol_t* sym) {
    return sym ? sym->property_key : NULL;
}

tsc_symbol_t* tsc_property_key_symbol(const tsc_str_t* key) {
    return key ? key->symbol_key : NULL;
}

const tsc_well_known_symbol_descriptor_t* tsc_symbol_well_known_descriptor(
    tsc_well_known_symbol_kind_t kind
) {
    if ((size_t)kind >= TSC_WELL_KNOWN_SYMBOL_COUNT) return NULL;
    return &tsc_well_known_symbols[(size_t)kind].descriptor;
}

tsc_symbol_t* tsc_symbol_well_known(tsc_well_known_symbol_kind_t kind) {
    if ((size_t)kind >= TSC_WELL_KNOWN_SYMBOL_COUNT) return NULL;
    tsc_well_known_symbol_entry_t* entry = &tsc_well_known_symbols[(size_t)kind];
    if (!entry->value) {
        tsc_runtime_lock();
        if (!entry->value) {
            entry->value = tsc_symbol_new(tsc_str_from_lit(
                entry->descriptor.description,
                entry->descriptor.description_len
            ));
        }
        tsc_runtime_unlock();
    }
    return entry->value;
}

tsc_symbol_t* tsc_symbol_async_iterator(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_ASYNC_ITERATOR); }
tsc_symbol_t* tsc_symbol_async_dispose(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_ASYNC_DISPOSE); }
tsc_symbol_t* tsc_symbol_dispose(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_DISPOSE); }
tsc_symbol_t* tsc_symbol_has_instance(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_HAS_INSTANCE); }
tsc_symbol_t* tsc_symbol_is_concat_spreadable(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_IS_CONCAT_SPREADABLE); }
tsc_symbol_t* tsc_symbol_iterator(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_ITERATOR); }
tsc_symbol_t* tsc_symbol_match(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_MATCH); }
tsc_symbol_t* tsc_symbol_match_all(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_MATCH_ALL); }
tsc_symbol_t* tsc_symbol_replace(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_REPLACE); }
tsc_symbol_t* tsc_symbol_search(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_SEARCH); }
tsc_symbol_t* tsc_symbol_species(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_SPECIES); }
tsc_symbol_t* tsc_symbol_split(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_SPLIT); }
tsc_symbol_t* tsc_symbol_to_primitive(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_TO_PRIMITIVE); }
tsc_symbol_t* tsc_symbol_to_string_tag(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_TO_STRING_TAG); }
tsc_symbol_t* tsc_symbol_unscopables(void) { return tsc_symbol_well_known(TSC_WELL_KNOWN_SYMBOL_UNSCOPABLES); }

tsc_str_t* tsc_symbol_description(const tsc_symbol_t* sym) {
    return sym ? sym->description : NULL;
}

tsc_str_t* tsc_symbol_to_string(const tsc_symbol_t* sym) {
    if (!sym || !sym->description) return tsc_str_from_lit("Symbol()", 8);
    return tsc_str_concat(
        tsc_str_concat(tsc_str_from_lit("Symbol(", 7), sym->description),
        tsc_str_from_lit(")", 1)
    );
}

/* ---------------- WeakRef ---------------- */

tsc_weakref_t* tsc_weakref_new(void* target) {
    tsc_weakref_t* ref = (tsc_weakref_t*)TSC_GC_MALLOC(sizeof(tsc_weakref_t));
    ref->target = target;
    return ref;
}

void* tsc_weakref_deref(const tsc_weakref_t* ref) {
    return ref ? ref->target : NULL;
}

/* ---------------- FinalizationRegistry ---------------- */

tsc_finregistry_t* tsc_finregistry_new(void) {
    return (tsc_finregistry_t*)TSC_GC_MALLOC(sizeof(tsc_finregistry_t));
}

void tsc_finregistry_register(tsc_finregistry_t* r, void* token) {
    if (!r) return;
    if (r->len == r->cap) {
        size_t ncap = r->cap ? r->cap * 2 : 4;
        r->entries = (tsc_finregistry_entry_t*)TSC_GC_REALLOC(
            r->entries, ncap * sizeof(tsc_finregistry_entry_t));
        r->cap = ncap;
    }
    r->entries[r->len++].unregister_token = token;
}

bool tsc_finregistry_unregister(tsc_finregistry_t* r, void* token) {
    if (!r || !token) return false;
    bool found = false;
    size_t w = 0;
    for (size_t i = 0; i < r->len; i++) {
        if (r->entries[i].unregister_token == token) {
            found = true;
        } else {
            r->entries[w++] = r->entries[i];
        }
    }
    r->len = w;
    return found;
}

/* ---------------- numbers ---------------- */
/* tsc_num_mod is defined as `static inline` in tsc_runtime.h. */

typedef enum {
    TSC_NUMERIC_PREFIX_INVALID,
    TSC_NUMERIC_PREFIX_DECIMAL,
    TSC_NUMERIC_PREFIX_INFINITY,
} tsc_numeric_prefix_kind_t;

typedef struct {
    tsc_numeric_prefix_kind_t kind;
    size_t end;
    bool negative;
} tsc_numeric_prefix_t;

static tsc_numeric_prefix_t scan_decimal_numeric_prefix(const tsc_str_t* input) {
    size_t cursor = 0;
    bool negative = false;
    if (cursor < input->len &&
        (input->data[cursor] == '+' || input->data[cursor] == '-')) {
        negative = input->data[cursor] == '-';
        cursor++;
    }
    if (cursor + 8 <= input->len &&
        memcmp(input->data + cursor, "Infinity", 8) == 0) {
        return (tsc_numeric_prefix_t) {
            .kind = TSC_NUMERIC_PREFIX_INFINITY,
            .end = cursor + 8,
            .negative = negative,
        };
    }

    size_t digits = 0;
    while (cursor < input->len &&
        input->data[cursor] >= '0' && input->data[cursor] <= '9') {
        cursor++;
        digits++;
    }
    if (cursor < input->len && input->data[cursor] == '.') {
        cursor++;
        while (cursor < input->len &&
            input->data[cursor] >= '0' && input->data[cursor] <= '9') {
            cursor++;
            digits++;
        }
    }
    if (digits == 0) {
        return (tsc_numeric_prefix_t) {
            .kind = TSC_NUMERIC_PREFIX_INVALID,
            .end = 0,
            .negative = negative,
        };
    }

    size_t prefix_end = cursor;
    if (cursor < input->len &&
        (input->data[cursor] == 'e' || input->data[cursor] == 'E')) {
        size_t exponent = cursor + 1;
        if (exponent < input->len &&
            (input->data[exponent] == '+' || input->data[exponent] == '-')) {
            exponent++;
        }
        size_t exponent_digits = exponent;
        while (exponent < input->len &&
            input->data[exponent] >= '0' && input->data[exponent] <= '9') {
            exponent++;
        }
        if (exponent > exponent_digits) prefix_end = exponent;
    }
    return (tsc_numeric_prefix_t) {
        .kind = TSC_NUMERIC_PREFIX_DECIMAL,
        .end = prefix_end,
        .negative = negative,
    };
}

static double validated_ascii_decimal_to_number(const char* data, size_t length) {
    if (length == SIZE_MAX) tsc_panic("numeric literal is too large");
    char* literal = (char*)malloc(length + 1);
    if (!literal) tsc_panic("numeric literal allocation failed");
    memcpy(literal, data, length);
    literal[length] = '\0';

    locale_t c_locale = newlocale(LC_NUMERIC_MASK, "C", (locale_t)0);
    if (!c_locale) tsc_panic("numeric conversion could not create the C locale");
    locale_t previous_locale = uselocale(c_locale);
    if (!previous_locale) tsc_panic("numeric conversion could not select the C locale");
    char* end = NULL;
    double result = strtod(literal, &end);
    if (!uselocale(previous_locale)) tsc_panic("numeric conversion could not restore the locale");
    freelocale(c_locale);
    if (end != literal + length) tsc_panic("validated numeric literal was not fully consumed");
    free(literal);
    return result;
}

static size_t accumulate_integer_digits(
    const tsc_str_t* input,
    size_t cursor,
    int32_t base,
    mpz_t integer,
    size_t* digit_count
) {
    size_t digits = 0;
    while (cursor < input->len) {
        unsigned char value = (unsigned char)input->data[cursor];
        int digit = value >= '0' && value <= '9'
            ? (int)(value - '0')
            : value >= 'a' && value <= 'z'
                ? (int)(value - 'a') + 10
                : value >= 'A' && value <= 'Z'
                    ? (int)(value - 'A') + 10
                    : -1;
        if (digit < 0 || digit >= base) break;
        mpz_mul_ui(integer, integer, (unsigned long)base);
        mpz_add_ui(integer, integer, (unsigned long)digit);
        cursor++;
        digits++;
    }
    if (digit_count) *digit_count = digits;
    return cursor;
}

double tsc_parse_float(const tsc_str_t* s) {
    if (!s) return NAN;
    const tsc_str_t* input = tsc_str_trim_start(s);
    tsc_numeric_prefix_t prefix = scan_decimal_numeric_prefix(input);
    if (prefix.kind == TSC_NUMERIC_PREFIX_INVALID) return NAN;
    if (prefix.kind == TSC_NUMERIC_PREFIX_INFINITY) {
        return prefix.negative ? -INFINITY : INFINITY;
    }
    return validated_ascii_decimal_to_number(input->data, prefix.end);
}

double tsc_string_to_number(const tsc_str_t* s) {
    if (!s) return NAN;
    const tsc_str_t* input = tsc_str_trim(s);
    if (input->len == 0) return 0.0;

    if (input->len >= 2 && input->data[0] == '0') {
        int32_t base = 0;
        switch (input->data[1]) {
            case 'b': case 'B': base = 2; break;
            case 'o': case 'O': base = 8; break;
            case 'x': case 'X': base = 16; break;
            default: break;
        }
        if (base != 0) {
            tsc_bigint_t integer;
            mpz_init_set_ui(integer.value, 0u);
            size_t digits = 0;
            size_t end = accumulate_integer_digits(input, 2, base, integer.value, &digits);
            if (digits == 0 || end != input->len) {
                mpz_clear(integer.value);
                return NAN;
            }
            double result = tsc_bigint_to_number(&integer);
            mpz_clear(integer.value);
            return result;
        }
    }

    tsc_numeric_prefix_t prefix = scan_decimal_numeric_prefix(input);
    if (prefix.kind == TSC_NUMERIC_PREFIX_INVALID || prefix.end != input->len) return NAN;
    if (prefix.kind == TSC_NUMERIC_PREFIX_INFINITY) {
        return prefix.negative ? -INFINITY : INFINITY;
    }
    return validated_ascii_decimal_to_number(input->data, input->len);
}

double tsc_parse_int(const tsc_str_t* s, double radix) {
    if (!s) return NAN;
    const tsc_str_t* input = tsc_str_trim_start(s);
    size_t cursor = 0;
    bool negative = false;
    if (cursor < input->len &&
        (input->data[cursor] == '+' || input->data[cursor] == '-')) {
        negative = input->data[cursor] == '-';
        cursor++;
    }

    int32_t base = tsc_to_int32(radix);
    bool strip_prefix = base == 0 || base == 16;
    if (base == 0) base = 10;
    if (base < 2 || base > 36) return NAN;
    if (strip_prefix && cursor + 2 <= input->len &&
        input->data[cursor] == '0' &&
        (input->data[cursor + 1] == 'x' || input->data[cursor + 1] == 'X')) {
        cursor += 2;
        base = 16;
    }

    tsc_bigint_t integer;
    mpz_init_set_ui(integer.value, 0u);
    size_t digits = 0;
    cursor = accumulate_integer_digits(input, cursor, base, integer.value, &digits);
    if (digits == 0) {
        mpz_clear(integer.value);
        return NAN;
    }
    if (negative) mpz_neg(integer.value, integer.value);
    double result = tsc_bigint_to_number(&integer);
    mpz_clear(integer.value);
    return negative && result == 0.0 ? -0.0 : result;
}

double tsc_math_random(void) {
    return (double)rand() / ((double)RAND_MAX + 1.0);
}

double tsc_math_round(double x) {
    if (!isfinite(x) || trunc(x) == x) return x;
    if (x >= -0.5 && x < 0.0) return -0.0;
    double lower = floor(x);
    return x - lower < 0.5 ? lower : lower + 1.0;
}

/* Number::exponentiate prescribes exceptional values before the
 * implementation-approximated finite result. Math.pow and ** share it. */
double tsc_number_exponentiate(double base, double exponent) {
    if (isnan(exponent)) return NAN;
    if (exponent == 0.0) return 1.0;
    if (isnan(base)) return NAN;
    bool odd = isfinite(exponent) && trunc(exponent) == exponent &&
        fmod(fabs(exponent), 2.0) == 1.0;
    if (isinf(base) || base == 0.0) {
        bool infinite_base = isinf(base);
        bool infinite = infinite_base == (exponent > 0.0);
        double result = infinite ? INFINITY : 0.0;
        return signbit(base) && odd ? -result : result;
    }
    if (isinf(exponent)) {
        double magnitude = fabs(base);
        if (magnitude == 1.0) return NAN;
        return (magnitude > 1.0) == (exponent > 0.0) ? INFINITY : 0.0;
    }
    if (base < 0.0 && trunc(exponent) != exponent) return NAN;
    return pow(base, exponent);
}

double tsc_math_sign(double x) {
    if (isnan(x) || x == 0.0) return x;
    return x > 0.0 ? 1.0 : -1.0;
}

uint32_t tsc_to_uint32(double n) {
    if (!isfinite(n) || n == 0.0) return 0;
    double i = n < 0.0 ? ceil(n) : floor(n);
    double mod = fmod(i, 4294967296.0);
    if (mod < 0.0) mod += 4294967296.0;
    return (uint32_t)mod;
}

int32_t tsc_to_int32(double n) {
    uint32_t u = tsc_to_uint32(n);
    return u >= 0x80000000u ? (int32_t)((int64_t)u - 4294967296LL) : (int32_t)u;
}

int32_t tsc_int32_from_uint32(uint32_t u) {
    return u >= 0x80000000u ? (int32_t)((int64_t)u - 4294967296LL) : (int32_t)u;
}

int32_t tsc_shift_right_int32(int32_t value, uint32_t shift) {
    if (shift == 0) return value;
    uint32_t u = (uint32_t)value;
    uint32_t shifted = u >> shift;
    if (value < 0) shifted |= ~(UINT32_MAX >> shift);
    return tsc_int32_from_uint32(shifted);
}

double tsc_math_imul(double a, double b) {
    uint32_t ua = (uint32_t)tsc_to_int32(a);
    uint32_t ub = (uint32_t)tsc_to_int32(b);
    uint32_t product = (uint32_t)((uint64_t)ua * (uint64_t)ub);
    int32_t signed_product =
        product >= 0x80000000u ? (int32_t)((int64_t)product - 4294967296LL) : (int32_t)product;
    return (double)signed_product;
}

double tsc_math_clz32(double x) {
    uint32_t u = tsc_to_uint32(x);
    if (u == 0) return 32.0;
    double count = 0.0;
    for (int bit = 31; bit >= 0; bit--) {
        if ((u & (1u << bit)) != 0) break;
        count += 1.0;
    }
    return count;
}

double tsc_math_fround(double x) {
    return (double)(float)x;
}

double tsc_math_f16round(double x) {
    union { float f; uint32_t u; } in;
    in.f = (float)x;

    uint32_t f32 = in.u;
    uint32_t sign = (f32 >> 16) & 0x8000u;
    uint32_t exp = (f32 >> 23) & 0xffu;
    uint32_t mant = f32 & 0x7fffffu;
    uint32_t f16;

    if (exp == 0xffu) {
        f16 = sign | 0x7c00u | (mant ? 0x0200u : 0u);
    } else {
        int32_t exp16 = (int32_t)exp - 127 + 15;
        if (exp16 >= 0x1f) {
            f16 = sign | 0x7c00u;
        } else if (exp16 <= 0) {
            if (exp16 < -10) {
                f16 = sign;
            } else {
                mant |= 0x800000u;
                uint32_t shift = (uint32_t)(14 - exp16);
                uint32_t halfMant = mant >> shift;
                uint32_t roundBit = (mant >> (shift - 1u)) & 1u;
                uint32_t sticky = mant & ((1u << (shift - 1u)) - 1u);
                if (roundBit && (sticky || (halfMant & 1u))) halfMant++;
                f16 = sign | halfMant;
            }
        } else {
            uint32_t halfExp = (uint32_t)exp16 << 10;
            uint32_t halfMant = mant >> 13;
            uint32_t roundBit = (mant >> 12) & 1u;
            uint32_t sticky = mant & 0xfffu;
            if (roundBit && (sticky || (halfMant & 1u))) {
                halfMant++;
                if (halfMant == 0x400u) {
                    halfMant = 0;
                    halfExp += 0x400u;
                    if (halfExp >= 0x7c00u) {
                        f16 = sign | 0x7c00u;
                        goto decode;
                    }
                }
            }
            f16 = sign | halfExp | halfMant;
        }
    }

decode:
    sign = (f16 & 0x8000u) << 16;
    exp = (f16 >> 10) & 0x1fu;
    mant = f16 & 0x03ffu;
    uint32_t out;
    if (exp == 0x1fu) {
        out = sign | 0x7f800000u | (mant ? (mant << 13) : 0u);
    } else if (exp == 0u) {
        if (mant == 0u) {
            out = sign;
        } else {
            int32_t e = -14;
            while ((mant & 0x0400u) == 0u) {
                mant <<= 1;
                e--;
            }
            mant &= 0x03ffu;
            out = sign | ((uint32_t)(e + 127) << 23) | (mant << 13);
        }
    } else {
        out = sign | ((exp - 15u + 127u) << 23) | (mant << 13);
    }
    union { uint32_t u; float f; } result;
    result.u = out;
    return (double)result.f;
}

/* ---------------- BigInt (GMP-backed) ---------------- */

tsc_bigint_t* bigint_alloc(void) {
    tsc_bigint_t* b = (tsc_bigint_t*)TSC_GC_MALLOC(sizeof(tsc_bigint_t));
    mpz_init(b->value);
    return b;
}

const char* bigint_digits_for(const char* s, int* base) {
    if (!s) {
        *base = 10;
        return "";
    }
    const char* p = s;
    char sign = '\0';
    if (*p == '-' || *p == '+') {
        sign = *p;
        p++;
    }
    if (p[0] == '0' && (p[1] == 'x' || p[1] == 'X' || p[1] == 'o' || p[1] == 'O' || p[1] == 'b' || p[1] == 'B')) {
        *base = (p[1] == 'x' || p[1] == 'X') ? 16 : (p[1] == 'o' || p[1] == 'O') ? 8 : 2;
        p += 2;
        size_t len = strlen(p);
        char* out = (char*)TSC_GC_MALLOC_ATOMIC(len + (sign ? 2 : 1));
        size_t pos = 0;
        if (sign) out[pos++] = sign;
        memcpy(out + pos, p, len);
        out[pos + len] = '\0';
        return out;
    }
    *base = 10;
    return s;
}

tsc_bigint_t* tsc_bigint_from_lit(const char* lit) {
    tsc_bigint_t* b = bigint_alloc();
    int base = 10;
    const char* digits = bigint_digits_for(lit, &base);
    if (mpz_set_str(b->value, digits, base) != 0) {
        tsc_throw_str(tsc_str_from_cstr("BigInt: invalid literal"));
    }
    return b;
}

tsc_bigint_t* tsc_bigint_try_from_str(const tsc_str_t* string) {
    const tsc_str_t* input = tsc_str_trim(string);
    tsc_bigint_t* result = bigint_alloc();
    if (input->len == 0) return result;
    size_t cursor = 0;
    bool negative = false;
    int32_t base = 10;
    if (input->data[0] == '+' || input->data[0] == '-') {
        negative = input->data[0] == '-';
        cursor = 1;
    } else if (input->len >= 2 && input->data[0] == '0') {
        switch (input->data[1]) {
            case 'b': case 'B': base = 2; break;
            case 'o': case 'O': base = 8; break;
            case 'x': case 'X': base = 16; break;
            default: break;
        }
        if (base != 10) cursor = 2;
    }
    size_t digits = 0;
    cursor = accumulate_integer_digits(input, cursor, base, result->value, &digits);
    if (digits == 0 || cursor != input->len) {
        mpz_clear(result->value);
        return NULL;
    }
    if (negative) mpz_neg(result->value, result->value);
    return result;
}

tsc_bigint_t* tsc_bigint_from_str(const tsc_str_t* string) {
    tsc_bigint_t* result = tsc_bigint_try_from_str(string);
    if (!result) tsc_throw_error(TSC_ERROR_SYNTAX, tsc_str_from_cstr("Cannot convert String to a BigInt"));
    return result;
}

tsc_bigint_t* tsc_bigint_from_num(double n) {
    if (isnan(n) || isinf(n) || floor(n) != n) {
        tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("BigInt: number must be a finite integer"));
    }
    tsc_bigint_t* b = bigint_alloc();
    mpz_set_d(b->value, n);
    return b;
}

tsc_bigint_t* tsc_bigint_from_bool(bool v) {
    tsc_bigint_t* b = bigint_alloc();
    mpz_set_ui(b->value, v ? 1u : 0u);
    return b;
}

/* Both fixed-width BigInt intrinsics borrow the same arbitrary-precision
 * modular reduction. Large widths preserve an already representable input. */
tsc_bigint_t* tsc_bigint_as_n(const tsc_bigint_t* value, double bits, bool is_signed) {
    int sign = mpz_sgn(value->value);
    size_t width = mpz_sizeinbase(value->value, 2);
    if (sign == 0 || (is_signed && bits >= (double)width + 1.0) ||
        (!is_signed && sign >= 0 && bits >= (double)width)) return (tsc_bigint_t*)value;
    tsc_bigint_t* result = bigint_alloc();
    if (bits == 0.0) return result;
    if (bits >= (double)ULONG_MAX) tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("BigInt width exceeds native storage"));
    mp_bitcnt_t count = (mp_bitcnt_t)bits;
    mpz_fdiv_r_2exp(result->value, value->value, count);
    if (is_signed && mpz_tstbit(result->value, count - 1)) {
        mpz_t modulus;
        mpz_init_set_ui(modulus, 0);
        mpz_setbit(modulus, count);
        mpz_sub(result->value, result->value, modulus);
        mpz_clear(modulus);
    }
    return result;
}

double tsc_bigint_to_number(const tsc_bigint_t* value) {
    if (!value || mpz_sgn(value->value) == 0) return 0.0;

    const int sign = mpz_sgn(value->value);
    mpz_t magnitude;
    mpz_init(magnitude);
    mpz_abs(magnitude, value->value);
    const size_t bit_length = mpz_sizeinbase(magnitude, 2);

    if (bit_length <= 53) {
        const double exact = mpz_get_d(magnitude);
        mpz_clear(magnitude);
        return sign < 0 ? -exact : exact;
    }
    if (bit_length > 1024) {
        mpz_clear(magnitude);
        return sign < 0 ? -INFINITY : INFINITY;
    }

    mp_bitcnt_t shift = (mp_bitcnt_t)(bit_length - 53);
    mpz_t significand;
    mpz_t remainder;
    mpz_t halfway;
    mpz_init(significand);
    mpz_init(remainder);
    mpz_init_set_ui(halfway, 1u);
    mpz_fdiv_q_2exp(significand, magnitude, shift);
    mpz_fdiv_r_2exp(remainder, magnitude, shift);
    mpz_mul_2exp(halfway, halfway, shift - 1);

    const int halfway_comparison = mpz_cmp(remainder, halfway);
    if (
        halfway_comparison > 0 ||
        (halfway_comparison == 0 && mpz_odd_p(significand))
    ) {
        mpz_add_ui(significand, significand, 1u);
    }
    if (mpz_sizeinbase(significand, 2) > 53) {
        mpz_fdiv_q_2exp(significand, significand, 1);
        shift++;
    }

    const double rounded = ldexp(mpz_get_d(significand), (int)shift);
    mpz_clear(halfway);
    mpz_clear(remainder);
    mpz_clear(significand);
    mpz_clear(magnitude);
    return sign < 0 ? -rounded : rounded;
}

tsc_bigint_t* tsc_bigint_neg(const tsc_bigint_t* a) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_neg(r->value, a->value);
    return r;
}

tsc_bigint_t* tsc_bigint_add(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_add(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_sub(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_sub(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_mul(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_mul(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_div(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    if (mpz_sgn(b->value) == 0) tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("BigInt: division by zero"));
    tsc_bigint_t* r = bigint_alloc();
    mpz_tdiv_q(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_mod(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    if (mpz_sgn(b->value) == 0) tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("BigInt: modulo by zero"));
    tsc_bigint_t* r = bigint_alloc();
    mpz_tdiv_r(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_pow(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    if (mpz_sgn(b->value) < 0) tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("BigInt: negative exponent"));
    if (!mpz_fits_ulong_p(b->value)) tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("BigInt: exponent too large"));
    tsc_bigint_t* r = bigint_alloc();
    mpz_pow_ui(r->value, a->value, mpz_get_ui(b->value));
    return r;
}

tsc_bigint_t* tsc_bigint_bit_not(const tsc_bigint_t* a) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_com(r->value, a->value);
    return r;
}

tsc_bigint_t* tsc_bigint_bit_and(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_and(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_bit_or(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_ior(r->value, a->value, b->value);
    return r;
}

tsc_bigint_t* tsc_bigint_bit_xor(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    tsc_bigint_t* r = bigint_alloc();
    mpz_xor(r->value, a->value, b->value);
    return r;
}

static tsc_bigint_t* bigint_shift(
    const tsc_bigint_t* value,
    const tsc_bigint_t* count,
    bool left
) {
    bool negative = mpz_sgn(count->value) < 0;
    mpz_t magnitude;
    mpz_init(magnitude);
    mpz_abs(magnitude, count->value);
    bool effective_left = left != negative;
    if (!mpz_fits_ulong_p(magnitude)) {
        mpz_clear(magnitude);
        if (effective_left) {
            tsc_throw_error(
                TSC_ERROR_RANGE,
                tsc_str_from_cstr("BigInt shift count exceeds runtime limit")
            );
        }
        tsc_bigint_t* saturated = bigint_alloc();
        mpz_set_si(saturated->value, mpz_sgn(value->value) < 0 ? -1 : 0);
        return saturated;
    }
    unsigned long bits = mpz_get_ui(magnitude);
    mpz_clear(magnitude);
    tsc_bigint_t* result = bigint_alloc();
    if (effective_left) {
        mpz_mul_2exp(result->value, value->value, bits);
    } else {
        mpz_fdiv_q_2exp(result->value, value->value, bits);
    }
    return result;
}

tsc_bigint_t* tsc_bigint_shl(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    return bigint_shift(a, b, true);
}

tsc_bigint_t* tsc_bigint_shr(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    return bigint_shift(a, b, false);
}

int tsc_bigint_cmp(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    return mpz_cmp(a->value, b->value);
}

bool tsc_bigint_eq(const tsc_bigint_t* a, const tsc_bigint_t* b) {
    return mpz_cmp(a->value, b->value) == 0;
}

tsc_str_t* tsc_bigint_to_string(const tsc_bigint_t* a, double radix) {
    double integer = isnan(radix) ? 0.0 : trunc(radix);
    if (integer < 2.0 || integer > 36.0)
        tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("BigInt.toString: radix must be 2..36"));
    int base = (int)integer;
    char* raw = mpz_get_str(NULL, base, a->value);
    tsc_str_t* out = tsc_str_from_cstr(raw);
    free(raw);
    return out;
}

tsc_bigint_t* tsc_process_hrtime_bigint(void) {
    struct timespec now;
    if (clock_gettime(CLOCK_MONOTONIC, &now) != 0) {
        now.tv_sec = 0;
        now.tv_nsec = 0;
    }
    tsc_bigint_t* out = bigint_alloc();
    mpz_set_ui(out->value, (unsigned long)now.tv_sec);
    mpz_mul_ui(out->value, out->value, 1000000000ul);
    mpz_add_ui(out->value, out->value, (unsigned long)now.tv_nsec);
    return out;
}

void replace_append(char** out, size_t* pos, size_t* cap, const char* data, size_t len) {
    if (len == 0) return;
    if (*pos + len >= *cap) {
        *cap = *pos + len + 64;
        *out = (char*)realloc(*out, *cap);
    }
    memcpy(*out + *pos, data, len);
    *pos += len;
}

/* ---------------- JSON helpers ---------------- */

tsc_str_t* tsc_json_escape_string(const tsc_str_t* s) {
    /* Upper bound: 6x expansion for \uXXXX of every byte. */
    size_t cap = s->len * 6 + 3;
    tsc_str_t* out = (tsc_str_t*)TSC_GC_MALLOC(sizeof(tsc_str_t));
    char* buf = (char*)TSC_GC_MALLOC_ATOMIC(cap);
    size_t pos = 0;
    buf[pos++] = '"';
    for (size_t i = 0; i < s->len; i++) {
        unsigned char c = (unsigned char)s->data[i];
        switch (c) {
            case '"':  buf[pos++] = '\\'; buf[pos++] = '"'; break;
            case '\\': buf[pos++] = '\\'; buf[pos++] = '\\'; break;
            case '\n': buf[pos++] = '\\'; buf[pos++] = 'n'; break;
            case '\r': buf[pos++] = '\\'; buf[pos++] = 'r'; break;
            case '\t': buf[pos++] = '\\'; buf[pos++] = 't'; break;
            case '\b': buf[pos++] = '\\'; buf[pos++] = 'b'; break;
            case '\f': buf[pos++] = '\\'; buf[pos++] = 'f'; break;
            default:
                if (c < 0x20) {
                    pos += (size_t)snprintf(buf + pos, cap - pos, "\\u%04x", c);
                } else {
                    buf[pos++] = (char)c;
                }
        }
    }
    buf[pos++] = '"';
    buf[pos] = '\0';
    out->data = buf;
    out->len = pos;
    out->hash = 0;
    out->symbol_key = NULL;
    out->utf16_len_plus_one = 0;
    out->utf16_cache = NULL;
    return out;
}

tsc_str_t* tsc_json_num(double n) {
    /* NaN and Infinity are invalid in JSON — emit "null" (matches JS). */
    if (isnan(n) || isinf(n)) return tsc_str_from_lit("null", 4);
    return tsc_str_from_num(n);
}

/* ---------------- Buffer ---------------- */

uint8_t byte_from_double(double n) {
    if (isnan(n) || isinf(n)) return 0;
    double byte = fmod(trunc(n), 256.0);
    if (byte < 0) byte += 256.0;
    return (uint8_t)byte;
}

tsc_buffer_t* buffer_alloc_len(size_t len) {
    tsc_buffer_t* b = (tsc_buffer_t*)TSC_GC_MALLOC(sizeof(tsc_buffer_t));
    b->len = len;
    b->object = NULL;
    b->data = (uint8_t*)TSC_GC_MALLOC_ATOMIC(len ? len : 1);
    b->data_owner = b->data;
    if (len == 0) b->data[0] = 0;
    return b;
}

static size_t array_buffer_to_index(double n, const char* label) {
    if (isnan(n) || isinf(n) || n < 0.0 || floor(n) != n || n > (double)SIZE_MAX) {
        tsc_throw_str(tsc_str_from_cstr(label));
    }
    return (size_t)n;
}

tsc_array_buffer_t* tsc_array_buffer_new(double byte_length) {
    size_t len = array_buffer_to_index(byte_length, "ArrayBuffer byteLength must be a non-negative finite integer");
    tsc_array_buffer_t* b = (tsc_array_buffer_t*)TSC_GC_MALLOC(sizeof(tsc_array_buffer_t));
    b->byte_length = len;
    b->data = (uint8_t*)TSC_GC_MALLOC_ATOMIC(len ? len : 1);
    b->detached = false;
    b->object = NULL;
    if (len == 0) b->data[0] = 0;
    return b;
}

double tsc_array_buffer_byte_length(const tsc_array_buffer_t* b) {
    return b ? (double)b->byte_length : 0.0;
}

void tsc_array_buffer_detach(tsc_array_buffer_t* b) {
    if (!b || b->detached) return;
    b->byte_length = 0;
    b->data = NULL;
    b->detached = true;
}

static void data_view_require_attached(const tsc_data_view_t* view) {
    if (!view || !view->buffer || view->buffer->detached) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("DataView buffer is detached"));
    }
}

tsc_data_view_t* tsc_data_view_new(tsc_array_buffer_t* buffer, double byte_offset, double byte_length, bool has_byte_length) {
    if (!buffer) tsc_throw_str(tsc_str_from_cstr("DataView buffer must be an ArrayBuffer"));
    if (buffer->detached) {
        tsc_throw_error(TSC_ERROR_TYPE, tsc_str_from_cstr("DataView buffer is detached"));
    }
    size_t offset = array_buffer_to_index(byte_offset, "DataView byteOffset must be a non-negative finite integer");
    if (offset > buffer->byte_length) {
        tsc_throw_str(tsc_str_from_cstr("DataView byteOffset is outside the ArrayBuffer"));
    }
    size_t remaining = buffer->byte_length - offset;
    size_t length = has_byte_length
        ? array_buffer_to_index(byte_length, "DataView byteLength must be a non-negative finite integer")
        : remaining;
    if (length > remaining) {
        tsc_throw_str(tsc_str_from_cstr("DataView byteLength is outside the ArrayBuffer"));
    }
    tsc_data_view_t* v = (tsc_data_view_t*)TSC_GC_MALLOC(sizeof(tsc_data_view_t));
    v->buffer = buffer;
    v->byte_offset = offset;
    v->byte_length = length;
    v->object = NULL;
    return v;
}

tsc_array_buffer_t* tsc_data_view_buffer(const tsc_data_view_t* v) {
    return v ? v->buffer : NULL;
}

double tsc_data_view_byte_offset(const tsc_data_view_t* v) {
    data_view_require_attached(v);
    return v ? (double)v->byte_offset : 0.0;
}

double tsc_data_view_byte_length(const tsc_data_view_t* v) {
    data_view_require_attached(v);
    return v ? (double)v->byte_length : 0.0;
}

int hex_value(unsigned char c) {
    if (c >= '0' && c <= '9') return (int)(c - '0');
    if (c >= 'a' && c <= 'f') return 10 + (int)(c - 'a');
    if (c >= 'A' && c <= 'F') return 10 + (int)(c - 'A');
    return -1;
}

bool buffer_encoding_is_utf8(const tsc_str_t* encoding) {
    return !encoding || str_lit_eq(encoding, "utf8") || str_lit_eq(encoding, "utf-8");
}

bool buffer_encoding_is_base64(const tsc_str_t* encoding) {
    return str_lit_eq(encoding, "base64");
}

bool buffer_encoding_is_latin1(const tsc_str_t* encoding) {
    return encoding && (str_lit_eq(encoding, "latin1") || str_lit_eq(encoding, "binary"));
}

bool buffer_encoding_is_ascii(const tsc_str_t* encoding) {
    return encoding && str_lit_eq(encoding, "ascii");
}

tsc_buffer_t* buffer_from_latin1_ascii(const tsc_str_t* input, bool is_ascii) {
    size_t len = tsc_str_utf16_length(input);
    tsc_buffer_t* b = buffer_alloc_len(len);
    size_t pos = 0;
    size_t out_idx = 0;
    uint8_t mask = is_ascii ? 0x7f : 0xff;
    while (pos < input->len) {
        uint32_t cp = 0xfffd;
        size_t adv = 1;
        decode_utf8_at(input, pos, &cp, &adv);
        if (cp > 0xffff) {
            uint32_t shifted = cp - 0x10000u;
            uint16_t hi = (uint16_t)(0xd800u + (shifted >> 10));
            uint16_t lo = (uint16_t)(0xdc00u + (shifted & 0x3ffu));
            b->data[out_idx++] = (uint8_t)(hi & mask);
            b->data[out_idx++] = (uint8_t)(lo & mask);
        } else {
            b->data[out_idx++] = (uint8_t)(cp & mask);
        }
        pos += adv;
    }
    return b;
}

tsc_str_t* string_to_latin1(const uint8_t* data, size_t len) {
    size_t utf8_len = 0;
    for (size_t i = 0; i < len; i++) {
        utf8_len += (data[i] < 0x80) ? 1 : 2;
    }
    tsc_str_t* out = str_alloc(utf8_len);
    char* p = (char*)out->data;
    size_t pos = 0;
    for (size_t i = 0; i < len; i++) {
        uint8_t b = data[i];
        if (b < 0x80) {
            p[pos++] = (char)b;
        } else {
            p[pos++] = (char)(0xc0 | (b >> 6));
            p[pos++] = (char)(0x80 | (b & 0x3f));
        }
    }
    return out;
}

tsc_str_t* string_to_ascii(const uint8_t* data, size_t len) {
    tsc_str_t* out = str_alloc(len);
    char* p = (char*)out->data;
    for (size_t i = 0; i < len; i++) {
        p[i] = (char)(data[i] & 0x7f);
    }
    return out;
}

size_t buffer_index(double raw, size_t len) {
    double index = isnan(raw) ? 0 : trunc(raw);
    if (index < 0) index += (double)len;
    if (index <= 0) return 0;
    if (index >= (double)len) return len;
    return (size_t)index;
}

int base64_value(unsigned char c) {
    if (c >= 'A' && c <= 'Z') return (int)(c - 'A');
    if (c >= 'a' && c <= 'z') return 26 + (int)(c - 'a');
    if (c >= '0' && c <= '9') return 52 + (int)(c - '0');
    if (c == '+') return 62;
    if (c == '/') return 63;
    return -1;
}

void base64_decode_group(tsc_buffer_t* out, size_t* pos, const int* q, int qlen) {
    if (qlen < 2 || q[0] < 0 || q[1] < 0) return;
    out->data[(*pos)++] = (uint8_t)(((uint32_t)q[0] << 2) | ((uint32_t)q[1] >> 4));
    if (qlen >= 3 && q[2] >= 0) {
        out->data[(*pos)++] = (uint8_t)((((uint32_t)q[1] & 0x0fu) << 4) | ((uint32_t)q[2] >> 2));
    }
    if (qlen >= 4 && q[2] >= 0 && q[3] >= 0) {
        out->data[(*pos)++] = (uint8_t)((((uint32_t)q[2] & 0x03u) << 6) | (uint32_t)q[3]);
    }
}

tsc_buffer_t* buffer_from_base64(const tsc_str_t* input) {
    tsc_buffer_t* out = buffer_alloc_len((input->len / 4) * 3 + 3);
    size_t pos = 0;
    int q[4];
    int qlen = 0;
    for (size_t i = 0; i < input->len; i++) {
        unsigned char ch = (unsigned char)input->data[i];
        if (isspace(ch)) continue;
        int v = ch == '=' ? -2 : base64_value(ch);
        if (v < 0 && v != -2) tsc_throw_str(tsc_str_from_cstr("Buffer.from base64 input contains non-base64 digit"));
        q[qlen++] = v;
        if (qlen == 4) {
            base64_decode_group(out, &pos, q, qlen);
            qlen = 0;
        }
    }
    if (qlen > 0) base64_decode_group(out, &pos, q, qlen);
    out->len = pos;
    return out;
}

tsc_str_t* str_from_base64_bytes(const uint8_t* data, size_t len) {
    static const char alphabet[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    tsc_str_t* out = str_alloc(4 * ((len + 2) / 3));
    char* p = (char*)out->data;
    size_t pos = 0;
    for (size_t i = 0; i < len; i += 3) {
        uint32_t a = data[i];
        uint32_t b = i + 1 < len ? data[i + 1] : 0;
        uint32_t c = i + 2 < len ? data[i + 2] : 0;
        p[pos++] = alphabet[a >> 2];
        p[pos++] = alphabet[((a & 0x03u) << 4) | (b >> 4)];
        p[pos++] = i + 1 < len ? alphabet[((b & 0x0fu) << 2) | (c >> 6)] : '=';
        p[pos++] = i + 2 < len ? alphabet[c & 0x3fu] : '=';
    }
    return out;
}

tsc_buffer_t* tsc_buffer_from_str(const tsc_str_t* input, const tsc_str_t* encoding) {
    if (buffer_encoding_is_utf8(encoding)) {
        tsc_buffer_t* b = buffer_alloc_len(input->len);
        if (input->len > 0) memcpy(b->data, input->data, input->len);
        return b;
    }
    if (str_lit_eq(encoding, "hex")) {
        if ((input->len % 2) != 0) tsc_throw_str(tsc_str_from_cstr("Buffer.from hex input must have even length"));
        tsc_buffer_t* b = buffer_alloc_len(input->len / 2);
        for (size_t i = 0; i < b->len; i++) {
            int hi = hex_value((unsigned char)input->data[i * 2]);
            int lo = hex_value((unsigned char)input->data[i * 2 + 1]);
            if (hi < 0 || lo < 0) tsc_throw_str(tsc_str_from_cstr("Buffer.from hex input contains non-hex digit"));
            b->data[i] = (uint8_t)((hi << 4) | lo);
        }
        return b;
    }
    if (buffer_encoding_is_base64(encoding)) {
        return buffer_from_base64(input);
    }
    if (buffer_encoding_is_latin1(encoding)) {
        return buffer_from_latin1_ascii(input, false);
    }
    if (buffer_encoding_is_ascii(encoding)) {
        return buffer_from_latin1_ascii(input, false);
    }
    tsc_throw_str(tsc_str_from_cstr("Buffer.from: only utf8, hex, base64, latin1, ascii, and binary encodings are supported"));
    return NULL;
}

tsc_buffer_t* tsc_buffer_from_array(const tsc_array_t* input) {
    tsc_buffer_t* b = buffer_alloc_len(input->len);
    for (size_t i = 0; i < input->len; i++) {
        double n = TSC_ARR(double, input, i);
        b->data[i] = byte_from_double(n);
    }
    return b;
}

tsc_buffer_t* tsc_buffer_from_buffer(const tsc_buffer_t* input) {
    tsc_buffer_t* b = buffer_alloc_len(input ? input->len : 0);
    if (input && input->len > 0) memcpy(b->data, input->data, input->len);
    return b;
}

tsc_buffer_t* tsc_buffer_alloc(double size, double fill) {
    if (isnan(size) || isinf(size) || size < 0) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.alloc size must be a non-negative finite number"));
    }
    size_t len = (size_t)size;
    uint8_t byte = byte_from_double(fill);
    tsc_buffer_t* b = buffer_alloc_len(len);
    if (len > 0) memset(b->data, byte, len);
    return b;
}

tsc_buffer_t* tsc_buffer_concat(const tsc_array_t* list) {
    size_t total = 0;
    for (size_t i = 0; i < list->len; i++) {
        tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, list, i);
        if (part) total += part->len;
    }
    tsc_buffer_t* out = buffer_alloc_len(total);
    size_t pos = 0;
    for (size_t i = 0; i < list->len; i++) {
        tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, list, i);
        if (!part || part->len == 0) continue;
        memcpy(out->data + pos, part->data, part->len);
        pos += part->len;
    }
    return out;
}

tsc_buffer_t* tsc_buffer_concat_len(const tsc_array_t* list, double total_length) {
    if (isnan(total_length) || isinf(total_length) || total_length < 0) {
        tsc_throw_str(tsc_str_from_cstr("Buffer.concat totalLength must be a non-negative finite number"));
    }
    size_t total = (size_t)total_length;
    tsc_buffer_t* out = buffer_alloc_len(total);
    if (total > 0) memset(out->data, 0, total);
    size_t pos = 0;
    for (size_t i = 0; i < list->len && pos < total; i++) {
        tsc_buffer_t* part = TSC_ARR(tsc_buffer_t*, list, i);
        if (!part || part->len == 0) continue;
        size_t n = part->len;
        if (n > total - pos) n = total - pos;
        memcpy(out->data + pos, part->data, n);
        pos += n;
    }
    return out;
}

tsc_str_t* tsc_buffer_to_string(const tsc_buffer_t* b, const tsc_str_t* encoding) {
    if (buffer_encoding_is_utf8(encoding)) {
        tsc_str_t* out = str_alloc(b->len);
        if (b->len > 0) memcpy((char*)out->data, b->data, b->len);
        return out;
    }
    if (str_lit_eq(encoding, "hex")) {
        static const char hex[] = "0123456789abcdef";
        tsc_str_t* out = str_alloc(b->len * 2);
        char* p = (char*)out->data;
        for (size_t i = 0; i < b->len; i++) {
            p[i * 2] = hex[b->data[i] >> 4];
            p[i * 2 + 1] = hex[b->data[i] & 0x0f];
        }
        return out;
    }
    if (buffer_encoding_is_base64(encoding)) {
        return str_from_base64_bytes(b->data, b->len);
    }
    if (buffer_encoding_is_latin1(encoding)) {
        return string_to_latin1(b->data, b->len);
    }
    if (buffer_encoding_is_ascii(encoding)) {
        return string_to_ascii(b->data, b->len);
    }
    tsc_throw_str(tsc_str_from_cstr("Buffer.toString: only utf8, hex, base64, latin1, ascii, and binary encodings are supported"));
    return NULL;
}

tsc_value_t tsc_buffer_to_json(const tsc_buffer_t* b) {
    tsc_object_t* out = tsc_object_new();
    tsc_array_t* data = tsc_array_new(sizeof(tsc_value_t), b->len);
    for (size_t i = 0; i < b->len; i++) {
        tsc_value_t value = tsc_value_num((double)b->data[i]);
        tsc_array_push_raw(data, &value);
    }
    tsc_object_set(out, tsc_str_from_lit("type", 4), tsc_value_string(tsc_str_from_lit("Buffer", 6)));
    tsc_object_set(out, tsc_str_from_lit("data", 4), tsc_value_array(data));
    return tsc_value_object(out);
}

tsc_str_t* tsc_btoa(const tsc_str_t* input) {
    return str_from_base64_bytes((const uint8_t*)input->data, input->len);
}

tsc_str_t* tsc_atob(const tsc_str_t* input) {
    tsc_buffer_t* decoded = buffer_from_base64(input);
    return tsc_buffer_to_string(decoded, tsc_str_from_lit("utf8", 4));
}

tsc_buffer_t* tsc_buffer_slice(const tsc_buffer_t* b, double start, double end) {
    size_t i0 = buffer_index(start, b->len);
    size_t i1 = buffer_index(end, b->len);
    size_t n = i1 > i0 ? i1 - i0 : 0;
    tsc_buffer_t* out = (tsc_buffer_t*)TSC_GC_MALLOC(sizeof(*out));
    out->len = n;
    out->data = b->data + i0;
    out->data_owner = b->data_owner;
    out->object = NULL;
    return out;
}

tsc_buffer_t* tsc_buffer_fill(tsc_buffer_t* b, double value, double start, double end) {
    size_t i0 = buffer_index(start, b->len);
    size_t i1 = buffer_index(end, b->len);
    if (i0 > i1) i0 = i1;
    if (i1 > i0) memset(b->data + i0, byte_from_double(value), i1 - i0);
    return b;
}

double tsc_buffer_write(tsc_buffer_t* b, const tsc_str_t* input, double offset, double length, const tsc_str_t* encoding) {
    size_t start = buffer_index(offset, b->len);
    if (start >= b->len) return 0.0;
    size_t max = b->len - start;
    if (!isnan(length)) {
        if (isinf(length) || length <= 0) return 0.0;
        size_t requested = (size_t)length;
        if (requested < max) max = requested;
    }
    tsc_buffer_t* source = tsc_buffer_from_str(input, encoding);
    size_t n = source->len < max ? source->len : max;
    if (n > 0) memcpy(b->data + start, source->data, n);
    return (double)n;
}

double tsc_buffer_copy(const tsc_buffer_t* source, tsc_buffer_t* target, double target_start, double source_start, double source_end) {
    size_t t0 = buffer_index(target_start, target->len);
    size_t s0 = buffer_index(source_start, source->len);
    size_t s1 = buffer_index(source_end, source->len);
    if (s0 > s1) s0 = s1;
    size_t n = s1 - s0;
    if (n > target->len - t0) n = target->len - t0;
    if (n > 0) memmove(target->data + t0, source->data + s0, n);
    return (double)n;
}

double tsc_buffer_index_of_byte(const tsc_buffer_t* b, double value, double offset) {
    int64_t start = (int64_t)offset;
    if (start < 0) start = (int64_t)b->len + start;
    if (start < 0) start = 0;
    if ((size_t)start >= b->len) return -1.0;
    uint8_t needle = byte_from_double(value);
    for (size_t i = (size_t)start; i < b->len; i++) {
        if (b->data[i] == needle) return (double)i;
    }
    return -1.0;
}

double tsc_buffer_last_index_of_byte(const tsc_buffer_t* b, double value, double offset) {
    if (b->len == 0) return -1.0;
    int64_t start;
    if (isnan(offset)) {
        start = (int64_t)b->len - 1;
    } else {
        start = (int64_t)offset;
        if (start < 0) start = (int64_t)b->len + start;
        if (start >= (int64_t)b->len) start = (int64_t)b->len - 1;
    }
    if (start < 0) return -1.0;
    uint8_t needle = byte_from_double(value);
    for (int64_t i = start; i >= 0; i--) {
        if (b->data[i] == needle) return (double)i;
    }
    return -1.0;
}

double buffer_index_of_bytes(const tsc_buffer_t* b, const uint8_t* needle, size_t needle_len, double offset) {
    int64_t start = (int64_t)offset;
    if (start < 0) start = (int64_t)b->len + start;
    if (start < 0) start = 0;
    if ((size_t)start > b->len) start = (int64_t)b->len;
    if (needle_len == 0) return (double)start;
    if (needle_len > b->len || (size_t)start > b->len - needle_len) return -1.0;
    for (size_t i = (size_t)start; i <= b->len - needle_len; i++) {
        if (memcmp(b->data + i, needle, needle_len) == 0) return (double)i;
    }
    return -1.0;
}

double buffer_last_index_of_bytes(const tsc_buffer_t* b, const uint8_t* needle, size_t needle_len, double offset) {
    int64_t start;
    if (isnan(offset)) {
        start = (int64_t)b->len;
    } else {
        start = (int64_t)offset;
        if (start < 0) start = (int64_t)b->len + start;
    }
    if (start < 0) return -1.0;
    if (needle_len == 0) {
        if (start > (int64_t)b->len) start = (int64_t)b->len;
        return (double)start;
    }
    if (needle_len > b->len) return -1.0;
    int64_t max_start = (int64_t)(b->len - needle_len);
    if (start > max_start) start = max_start;
    for (int64_t i = start; i >= 0; i--) {
        if (memcmp(b->data + i, needle, needle_len) == 0) return (double)i;
    }
    return -1.0;
}

double tsc_buffer_index_of_str(const tsc_buffer_t* b, const tsc_str_t* value, double offset) {
    return buffer_index_of_bytes(b, (const uint8_t*)value->data, value->len, offset);
}

double tsc_buffer_last_index_of_str(const tsc_buffer_t* b, const tsc_str_t* value, double offset) {
    return buffer_last_index_of_bytes(b, (const uint8_t*)value->data, value->len, offset);
}

double tsc_buffer_index_of_buffer(const tsc_buffer_t* b, const tsc_buffer_t* value, double offset) {
    if (!value) return -1.0;
    return buffer_index_of_bytes(b, value->data, value->len, offset);
}

double tsc_buffer_last_index_of_buffer(const tsc_buffer_t* b, const tsc_buffer_t* value, double offset) {
    if (!value) return -1.0;
    return buffer_last_index_of_bytes(b, value->data, value->len, offset);
}

bool tsc_buffer_equals(const tsc_buffer_t* a, const tsc_buffer_t* b) {
    if (a == b) return true;
    if (!a || !b || a->len != b->len) return false;
    return a->len == 0 || memcmp(a->data, b->data, a->len) == 0;
}

double tsc_buffer_compare(const tsc_buffer_t* a, const tsc_buffer_t* b) {
    if (a == b) return 0.0;
    if (!a) return b && b->len > 0 ? -1.0 : 0.0;
    if (!b) return a->len > 0 ? 1.0 : 0.0;
    size_t n = a->len < b->len ? a->len : b->len;
    int cmp = n > 0 ? memcmp(a->data, b->data, n) : 0;
    if (cmp < 0) return -1.0;
    if (cmp > 0) return 1.0;
    if (a->len < b->len) return -1.0;
    if (a->len > b->len) return 1.0;
    return 0.0;
}

static void check_compare_bound(double val, const char* name, double max_val) {
    if (isnan(val) || isinf(val) || floor(val) != val) {
        char err_msg[128];
        if (isnan(val)) {
            snprintf(err_msg, sizeof(err_msg), "The value of \"%s\" is out of range. It must be an integer. Received NaN", name);
        } else if (isinf(val)) {
            snprintf(err_msg, sizeof(err_msg), "The value of \"%s\" is out of range. It must be an integer. Received Infinity", name);
        } else {
            snprintf(err_msg, sizeof(err_msg), "The value of \"%s\" is out of range. It must be an integer. Received %g", name, val);
        }
        tsc_throw_str(tsc_str_from_cstr(err_msg));
    }
    if (val < 0.0 || val > max_val) {
        char err_msg[128];
        snprintf(err_msg, sizeof(err_msg), "The value of \"%s\" is out of range. It must be >= 0 and <= %.0f. Received %g", name, max_val, val);
        tsc_throw_str(tsc_str_from_cstr(err_msg));
    }
}

double tsc_buffer_compare_ranges(const tsc_buffer_t* source, const tsc_buffer_t* target,
                                 double target_start, double target_end,
                                 double source_start, double source_end) {
    if (!source || !target) {
        return 0.0;
    }

    check_compare_bound(target_start, "targetStart", 4294967296.0);
    check_compare_bound(target_end, "targetEnd", (double)target->len);
    check_compare_bound(source_start, "sourceStart", 4294967296.0);
    check_compare_bound(source_end, "sourceEnd", (double)source->len);

    size_t s_start = (size_t)source_start;
    size_t s_end = (size_t)source_end;
    size_t t_start = (size_t)target_start;
    size_t t_end = (size_t)target_end;

    if (s_start > s_end) s_start = s_end;
    if (t_start > t_end) t_start = t_end;

    size_t s_len = s_end - s_start;
    size_t t_len = t_end - t_start;

    size_t n = s_len < t_len ? s_len : t_len;
    int cmp = n > 0 ? memcmp(source->data + s_start, target->data + t_start, n) : 0;
    if (cmp < 0) return -1.0;
    if (cmp > 0) return 1.0;
    if (s_len < t_len) return -1.0;
    if (s_len > t_len) return 1.0;
    return 0.0;
}



double tsc_buffer_byte_length_str(const tsc_str_t* input, const tsc_str_t* encoding) {
    if (buffer_encoding_is_utf8(encoding)) return (double)input->len;
    if (str_lit_eq(encoding, "hex")) return floor((double)input->len / 2.0);
    if (buffer_encoding_is_base64(encoding)) return (double)buffer_from_base64(input)->len;
    if (buffer_encoding_is_latin1(encoding) || buffer_encoding_is_ascii(encoding)) return (double)tsc_str_utf16_length(input);
    tsc_throw_str(tsc_str_from_cstr("Buffer.byteLength: only utf8, hex, base64, latin1, ascii, and binary encodings are supported"));
    return 0.0;
}

bool tsc_buffer_is_encoding(const tsc_str_t* encoding) {
    return buffer_encoding_is_utf8(encoding) || str_lit_eq(encoding, "hex") || buffer_encoding_is_base64(encoding) || buffer_encoding_is_latin1(encoding) || buffer_encoding_is_ascii(encoding);
}

tsc_buffer_t* tsc_buffer_transcode(const tsc_buffer_t* source, const tsc_str_t* from_enc, const tsc_str_t* to_enc) {
    if (!source) {
        tsc_throw_str(tsc_str_from_cstr("buffer.transcode: source must not be null"));
    }

    tsc_buffer_t* raw_buf = NULL;
    if (buffer_encoding_is_utf8(from_enc)) {
        raw_buf = tsc_buffer_from_buffer(source);
    } else if (str_lit_eq(from_enc, "hex")) {
        tsc_str_t* str = tsc_buffer_to_string(source, tsc_str_from_lit("utf8", 4));
        raw_buf = tsc_buffer_from_str(str, tsc_str_from_lit("hex", 3));
    } else if (buffer_encoding_is_base64(from_enc)) {
        tsc_str_t* str = tsc_buffer_to_string(source, tsc_str_from_lit("utf8", 4));
        raw_buf = tsc_buffer_from_str(str, tsc_str_from_lit("base64", 6));
    } else {
        tsc_throw_str(tsc_str_from_cstr("buffer.transcode: unsupported fromEnc"));
    }

    tsc_buffer_t* result = NULL;
    if (buffer_encoding_is_utf8(to_enc)) {
        result = raw_buf;
    } else if (str_lit_eq(to_enc, "hex")) {
        tsc_str_t* str = tsc_buffer_to_string(raw_buf, tsc_str_from_lit("hex", 3));
        result = tsc_buffer_from_str(str, tsc_str_from_lit("utf8", 4));
    } else if (buffer_encoding_is_base64(to_enc)) {
        tsc_str_t* str = tsc_buffer_to_string(raw_buf, tsc_str_from_lit("base64", 6));
        result = tsc_buffer_from_str(str, tsc_str_from_lit("utf8", 4));
    } else {
        tsc_throw_str(tsc_str_from_cstr("buffer.transcode: unsupported toEnc"));
    }

    return result;
}
double tsc_buffer_length(const tsc_buffer_t* b) { return (double)b->len; }

double tsc_buffer_get(const tsc_buffer_t* b, double idx) {
    if (isnan(idx) || isinf(idx) || idx < 0 || (size_t)idx >= b->len) return NAN;
    return (double)b->data[(size_t)idx];
}

/* One byte traversal serves every public Number read/write operation. The
 * method descriptor supplies width, numeric interpretation and byte order. */
static size_t buffer_number_offset(const tsc_buffer_t* b, double offset, size_t width) {
    if (!b || !isfinite(offset) || offset < 0 || floor(offset) != offset ||
        offset > (double)b->len || width > b->len - (size_t)offset)
        tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Buffer offset is outside the byte range"));
    return (size_t)offset;
}

static void buffer_number_width(size_t width, tsc_buffer_number_kind_t kind) {
    if (!width || (kind == TSC_BUFFER_FLOAT ? width != 4 && width != 8 : width > 6))
        tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Buffer byteLength is outside the numeric range"));
}

double tsc_buffer_read_number(const tsc_buffer_t* b, double offset, size_t width,
    tsc_buffer_number_kind_t kind, bool little_endian) {
    buffer_number_width(width, kind);
    size_t start = buffer_number_offset(b, offset, width);
    uint64_t bits = 0;
    for (size_t index = 0; index < width; ++index) {
        size_t shift = 8 * (little_endian ? index : width - index - 1);
        bits |= (uint64_t)b->data[start + index] << shift;
    }
    if (kind == TSC_BUFFER_FLOAT) {
        if (width == 4) { uint32_t word = (uint32_t)bits; float value; memcpy(&value, &word, sizeof(value)); return (double)value; }
        double value; memcpy(&value, &bits, sizeof(value)); return value;
    }
    double value = (double)bits;
    if (kind == TSC_BUFFER_SIGNED && (bits & (UINT64_C(1) << (8 * width - 1))))
        value -= ldexp(1.0, (int)(8 * width));
    return value;
}

double tsc_buffer_write_number(tsc_buffer_t* b, double value, double offset, size_t width,
    tsc_buffer_number_kind_t kind, bool little_endian) {
    buffer_number_width(width, kind);
    uint64_t bits;
    if (kind == TSC_BUFFER_FLOAT) {
        if (width == 4) { float number = (float)value; uint32_t word; memcpy(&word, &number, sizeof(word)); bits = word; }
        else memcpy(&bits, &value, sizeof(bits));
    } else {
        double modulus = ldexp(1.0, (int)(8 * width));
        double minimum = kind == TSC_BUFFER_SIGNED ? -modulus / 2 : 0;
        double maximum = kind == TSC_BUFFER_SIGNED ? modulus / 2 - 1 : modulus - 1;
        if (value < minimum || value > maximum)
            tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Buffer value is outside the numeric range"));
        double integer = isnan(value) ? 0 : trunc(value);
        if (integer < 0) integer += modulus;
        bits = (uint64_t)integer;
    }
    size_t start = buffer_number_offset(b, offset, width);
    for (size_t index = 0; index < width; ++index) {
        size_t shift = 8 * (little_endian ? index : width - index - 1);
        b->data[start + index] = (uint8_t)(bits >> shift);
    }
    return (double)(start + width);
}

/* Existing native ABI names are thin adapters, without separate byte logic. */
double tsc_buffer_read_uint8(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 1, TSC_BUFFER_UNSIGNED, true); }
double tsc_buffer_write_uint8(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 1, TSC_BUFFER_UNSIGNED, true); }
double tsc_buffer_read_uint16_le(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 2, TSC_BUFFER_UNSIGNED, true); }
double tsc_buffer_write_uint16_le(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 2, TSC_BUFFER_UNSIGNED, true); }
double tsc_buffer_read_uint16_be(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 2, TSC_BUFFER_UNSIGNED, false); }
double tsc_buffer_write_uint16_be(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 2, TSC_BUFFER_UNSIGNED, false); }
double tsc_buffer_read_uint32_le(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 4, TSC_BUFFER_UNSIGNED, true); }
double tsc_buffer_write_uint32_le(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 4, TSC_BUFFER_UNSIGNED, true); }
double tsc_buffer_read_uint32_be(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 4, TSC_BUFFER_UNSIGNED, false); }
double tsc_buffer_write_uint32_be(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 4, TSC_BUFFER_UNSIGNED, false); }
double tsc_buffer_read_int8(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 1, TSC_BUFFER_SIGNED, true); }
double tsc_buffer_write_int8(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 1, TSC_BUFFER_SIGNED, true); }
double tsc_buffer_read_int16_le(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 2, TSC_BUFFER_SIGNED, true); }
double tsc_buffer_write_int16_le(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 2, TSC_BUFFER_SIGNED, true); }
double tsc_buffer_read_int16_be(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 2, TSC_BUFFER_SIGNED, false); }
double tsc_buffer_write_int16_be(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 2, TSC_BUFFER_SIGNED, false); }
double tsc_buffer_read_int32_le(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 4, TSC_BUFFER_SIGNED, true); }
double tsc_buffer_write_int32_le(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 4, TSC_BUFFER_SIGNED, true); }
double tsc_buffer_read_int32_be(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 4, TSC_BUFFER_SIGNED, false); }
double tsc_buffer_write_int32_be(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 4, TSC_BUFFER_SIGNED, false); }
double tsc_buffer_read_float_le(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 4, TSC_BUFFER_FLOAT, true); }
double tsc_buffer_write_float_le(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 4, TSC_BUFFER_FLOAT, true); }
double tsc_buffer_read_float_be(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 4, TSC_BUFFER_FLOAT, false); }
double tsc_buffer_write_float_be(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 4, TSC_BUFFER_FLOAT, false); }
double tsc_buffer_read_double_le(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 8, TSC_BUFFER_FLOAT, true); }
double tsc_buffer_write_double_le(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 8, TSC_BUFFER_FLOAT, true); }
double tsc_buffer_read_double_be(const tsc_buffer_t* b, double offset) { return tsc_buffer_read_number(b, offset, 8, TSC_BUFFER_FLOAT, false); }
double tsc_buffer_write_double_be(tsc_buffer_t* b, double value, double offset) { return tsc_buffer_write_number(b, value, offset, 8, TSC_BUFFER_FLOAT, false); }

static size_t buffer_variable_width(double width) {
    if (!isfinite(width) || floor(width) != width || width < 1 || width > 6)
        tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Buffer byteLength must be between 1 and 6"));
    return (size_t)width;
}
double tsc_buffer_read_uint_le(const tsc_buffer_t* b, double offset, double width) { return tsc_buffer_read_number(b, offset, buffer_variable_width(width), TSC_BUFFER_UNSIGNED, true); }
double tsc_buffer_write_uint_le(tsc_buffer_t* b, double value, double offset, double width) { return tsc_buffer_write_number(b, value, offset, buffer_variable_width(width), TSC_BUFFER_UNSIGNED, true); }
double tsc_buffer_read_uint_be(const tsc_buffer_t* b, double offset, double width) { return tsc_buffer_read_number(b, offset, buffer_variable_width(width), TSC_BUFFER_UNSIGNED, false); }
double tsc_buffer_write_uint_be(tsc_buffer_t* b, double value, double offset, double width) { return tsc_buffer_write_number(b, value, offset, buffer_variable_width(width), TSC_BUFFER_UNSIGNED, false); }
double tsc_buffer_read_int_le(const tsc_buffer_t* b, double offset, double width) { return tsc_buffer_read_number(b, offset, buffer_variable_width(width), TSC_BUFFER_SIGNED, true); }
double tsc_buffer_write_int_le(tsc_buffer_t* b, double value, double offset, double width) { return tsc_buffer_write_number(b, value, offset, buffer_variable_width(width), TSC_BUFFER_SIGNED, true); }
double tsc_buffer_read_int_be(const tsc_buffer_t* b, double offset, double width) { return tsc_buffer_read_number(b, offset, buffer_variable_width(width), TSC_BUFFER_SIGNED, false); }
double tsc_buffer_write_int_be(tsc_buffer_t* b, double value, double offset, double width) { return tsc_buffer_write_number(b, value, offset, buffer_variable_width(width), TSC_BUFFER_SIGNED, false); }

tsc_buffer_t* tsc_buffer_swap(tsc_buffer_t* b, size_t width) {
    if (width == 0 || (b->len % width) != 0) {
        tsc_throw_error(TSC_ERROR_RANGE, tsc_str_from_cstr("Buffer.swap length must be a multiple of the element size"));
    }
    for (size_t i = 0; i < b->len; i += width) {
        for (size_t j = 0; j < width / 2; j++) {
            uint8_t tmp = b->data[i + j];
            b->data[i + j] = b->data[i + width - 1 - j];
            b->data[i + width - 1 - j] = tmp;
        }
    }
    return b;
}

/* ------------- TextEncoder / TextDecoder ------------- */
tsc_text_encoder_t* tsc_text_encoder_new(void) {
    tsc_text_encoder_t* encoder = (tsc_text_encoder_t*)TSC_GC_MALLOC(sizeof(tsc_text_encoder_t));
    encoder->dummy = 0;
    return encoder;
}

tsc_buffer_t* tsc_text_encoder_encode(const tsc_text_encoder_t* encoder, const tsc_str_t* input) {
    (void)encoder;
    if (!input) {
        return tsc_buffer_alloc(0, 0);
    }
    return tsc_buffer_from_str(input, tsc_str_from_lit("utf8", 4));
}

tsc_text_decoder_t* tsc_text_decoder_new(const tsc_str_t* encoding) {
    if (encoding && !buffer_encoding_is_utf8(encoding)) {
        tsc_throw_str(tsc_str_from_cstr("TextDecoder: only utf-8 encoding is supported"));
    }
    tsc_text_decoder_t* decoder = (tsc_text_decoder_t*)TSC_GC_MALLOC(sizeof(tsc_text_decoder_t));
    decoder->dummy = 0;
    return decoder;
}

tsc_str_t* tsc_text_decoder_decode(const tsc_text_decoder_t* decoder, const tsc_buffer_t* input) {
    (void)decoder;
    if (!input) {
        return tsc_str_from_lit("", 0);
    }
    return tsc_buffer_to_string(input, tsc_str_from_lit("utf8", 4));
}

tsc_value_t tsc_proxy_new(tsc_value_t target, tsc_value_t handler) {
    if (
        !value_is_box(target) ||
        (
            value_tag(target) != TSC_VALUE_TAG_OBJECT &&
            value_tag(target) != TSC_VALUE_TAG_ARRAY &&
            value_tag(target) != TSC_VALUE_TAG_FUNCTION
        )
    ) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Cannot create proxy with a non-object as target or handler")
        );
    }
    if (
        !value_is_box(handler) ||
        (
            value_tag(handler) != TSC_VALUE_TAG_OBJECT &&
            value_tag(handler) != TSC_VALUE_TAG_ARRAY &&
            value_tag(handler) != TSC_VALUE_TAG_FUNCTION
        )
    ) {
        tsc_throw_error(
            TSC_ERROR_TYPE,
            tsc_str_from_cstr("Cannot create proxy with a non-object as target or handler")
        );
    }
    tsc_object_t* o = (tsc_object_t*)TSC_GC_MALLOC(sizeof(tsc_object_t));
    o->is_event_emitter = false;
    o->is_event_target = false;
    o->is_event = false;
    o->len = 0;
    o->cap = 0;
    o->extensible = true;
    o->class_ptr = NULL;
    o->is_proxy = true;
    o->proxy_revoked = false;
    o->is_promise = false;
    o->is_date = false;
    o->is_regexp = false;
    o->is_map = false;
    o->is_set = false;
    o->is_error = false;
    o->is_typed_array = false;
    o->shape_version = 1;
    o->shape = NULL;
    o->object_id = 0;
    o->proxy_target = target;
    o->proxy_handler = handler;
    o->proxy_target_root = value_ptr(target);
    o->proxy_handler_root = value_ptr(handler);
    o->prototype = tsc_value_null();
    o->props = NULL;
    return tsc_value_object(o);
}

tsc_value_t tsc_proxy_revoke(void* env, tsc_value_t receiver, tsc_array_t* args) {
    (void)receiver;
    (void)args;
    tsc_value_t proxy_val = *(tsc_value_t*)env;
    if (value_is_box(proxy_val) && value_tag(proxy_val) == TSC_VALUE_TAG_OBJECT) {
        tsc_object_t* o = (tsc_object_t*)value_ptr(proxy_val);
        if (o->is_proxy) {
            o->proxy_revoked = true;
            o->proxy_handler = tsc_value_null();
            o->proxy_handler_root = NULL;
        }
    }
    return tsc_value_undefined();
}

tsc_value_t tsc_proxy_revocable(tsc_value_t target, tsc_value_t handler) {
    tsc_value_t proxy = tsc_proxy_new(target, handler);
    tsc_object_t* ret = tsc_object_new();
    tsc_object_set(ret, tsc_str_from_lit("proxy", 5), proxy);

    tsc_value_t* env = (tsc_value_t*)TSC_GC_MALLOC(sizeof(tsc_value_t));
    *env = proxy;
    tsc_value_t revoke_fn = tsc_value_function_closure_named(
        tsc_proxy_revoke,
        env,
        0.0,
        tsc_str_from_lit("", 0)
    );
    tsc_object_set(ret, tsc_str_from_lit("revoke", 6), revoke_fn);

    return tsc_value_object(ret);
}
