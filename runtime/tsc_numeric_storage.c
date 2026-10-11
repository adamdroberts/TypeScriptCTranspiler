#include "tsc_internal.h"

static uint64_t round_shift(uint64_t significand,unsigned shift){
    uint64_t result=significand>>shift,remainder=significand&((UINT64_C(1)<<shift)-1),half=UINT64_C(1)<<(shift-1);
    return result+(remainder>half||(remainder==half&&(result&1)));
}
/* Convert binary64 directly, avoiding the double rounding of a float intermediary. */
static uint16_t number_to_float16(double number){
    uint64_t raw;memcpy(&raw,&number,sizeof(raw));
    uint16_t sign=(uint16_t)((raw>>48)&0x8000);unsigned exponent=(unsigned)((raw>>52)&0x7ff);
    uint64_t fraction=raw&UINT64_C(0xfffffffffffff);
    if(exponent==0x7ff)return sign|(fraction?0x7e00:0x7c00);
    if(!exponent)return sign;
    int power=(int)exponent-1023;
    if(power>15)return sign|0x7c00;
    uint64_t significand=fraction|UINT64_C(0x10000000000000);
    if(power < -25)return sign;
    if(power < -14)return sign|(uint16_t)round_shift(significand,(unsigned)(28-power));
    uint64_t rounded=round_shift(significand,42);
    if(rounded==2048){rounded=1024;++power;}
    if(power>15)return sign|0x7c00;
    return sign|(uint16_t)((power+15)<<10)|(uint16_t)(rounded-1024);
}
static double float16_to_number(uint16_t raw){
    unsigned exponent=(raw>>10)&31,fraction=raw&1023;
    double number=exponent==31?(fraction?NAN:INFINITY):exponent?ldexp(1024.0+fraction,(int)exponent-25):ldexp((double)fraction,-24);
    return raw&0x8000?-number:number;
}
uint64_t tsc_numeric_number_to_bits(double number,tsc_numeric_format_t format, size_t width){
    if(format==TSC_NUMERIC_FLOAT){
        if(width==2)return number_to_float16(number);
        if(width==4){float narrowed=(float)number;uint32_t raw;memcpy(&raw,&narrowed,sizeof(raw));return raw;}
        uint64_t raw;memcpy(&raw,&number,sizeof(raw));return raw;
    }
    if(format==TSC_NUMERIC_CLAMPED){
        if(isnan(number)||number<=0)return 0;
        if(number>=255)return 255;
        double integral=floor(number),fraction=number-integral;
        return (uint64_t)(integral+(fraction>0.5||(fraction==0.5&&fmod(integral,2)!=0)));
    }
    if(!isfinite(number)||number==0)return 0;
    double modulus=ldexp(1.0,(int)(width*8)),reduced=fmod(trunc(number),modulus);
    if(reduced<0)reduced+=modulus;
    return (uint64_t)reduced;
}
tsc_value_t tsc_numeric_bits_to_value(uint64_t raw,tsc_numeric_format_t format, size_t width){
    if(format==TSC_NUMERIC_BIG_SIGNED||format==TSC_NUMERIC_BIG_UNSIGNED)
        return tsc_value_bigint(tsc_bigint_from_uint64(raw,format==TSC_NUMERIC_BIG_SIGNED));
    if(format==TSC_NUMERIC_FLOAT){
        double number;
        if(width==2)number=float16_to_number((uint16_t)raw);
        else if(width==4){uint32_t bits=(uint32_t)raw;float narrowed;memcpy(&narrowed,&bits,sizeof(bits));number=narrowed;}
        else memcpy(&number,&raw,sizeof(number));
        return tsc_value_num(number);
    }
    double number=(double)raw;
    if(format==TSC_NUMERIC_SIGNED&&(raw&(UINT64_C(1)<<(width*8-1))))number-=ldexp(1.0,(int)(width*8));
    return tsc_value_num(number);
}
