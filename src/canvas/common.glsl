//COMMON_START

// data types
#define NONE 0u
#define CONVEYOR 1u
#define GRABBER 2u
#define CONVERTER 3u
#define INPUT 4u
#define OUTPUT 5u
#define WALL 6u
#define COMPLETE 7u

// direction
#define UP 0u
#define DOWN 1u
#define LEFT 2u
#define RIGHT 3u

// operation
#define ADD 0u
#define SUB 1u
#define MUL 2u
#define DIV 3u

uint get_bits(uint bitfield, uint start, uint end) {
    return (bitfield >> (start - 1u)) 
        & ((1u << (end - start)) + ((1u << (end - start)) - 1u));
}

uint bitmask(uint start, uint end) {
    return ((1u << (end)) - 1u) - ((1u << (start - 1u)) - 1u);
}

void set_bits(inout uint o, uint bits, uint start, uint end) {
    o &= ~bitmask(start, end);
    o += bits << (start - 1u);
}

uvec4 getpixel(ivec2 offset) {
    return texture(in_tex, texcoord + vec2(offset) / vec2(textureSize(in_tex, 0)));
}


#define GETSET(gettername, settername, channel, start, end) \
uint gettername(uvec4 cell) { \
    return get_bits(cell.channel, start, end); \
} \
void settername(inout uvec4 cell, uint value) { \
    set_bits(cell.channel, value, start, end); \
}

//METAPROGRAMMING_START
// r channel
GETSET(g_type, s_type, r, 1u, 3u)
GETSET(g_direction, s_direction, r, 4u, 5u)
GETSET(g_grabber_length, s_grabber_length, r, 6u, 8u)
GETSET(g_operation, s_operation, r, 9u, 12u)

// g channel
GETSET(g_has_num, s_has_num, g, 1u, 1u)
GETSET(g_num, s_num, g, 2u, 16u)

// b channel
GETSET(g_score, s_score, b, 1u, 8u)
GETSET(g_required_score, s_required_score, b, 9u, 16u)

//METAPROGRAMMING_END

//COMMON_END