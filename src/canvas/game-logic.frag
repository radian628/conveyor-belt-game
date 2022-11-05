#version 300 es

precision highp float;

uniform highp usampler2D in_tex;

in vec2 texcoord;

out uvec4 out_tex;

/*
GPU Shader State:
r channel:
    bits [0-2]: block type
        - 0=none
        - 1=conveyor belt
        - 2=grabber
        - 3=converter (add, sub, mul, div)
        - 4=input
        - 5=output
    bits [3-4]: directions
        - up, down, left, right 
    bits [5-7]: lengths of grabbers
        0 through 7

g channel:
    number stored in block type
        - for inputs, this is the number they produce
        - for outputs, this is the number they accept
        - for conveyor belts and grabbers, this is the
            number that is on them
*/

//COMMON_START

// data types
#define NONE 0u
#define CONVEYOR 1u
#define GRABBER 2u
#define CONVERTER 3u
#define INPUT 4u
#define OUTPUT 5u

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
    return (bitfield >> start) & ((2u << (end - start)) - 1u);
}

uint bitmask(uint start, uint end) {
    return ((1u << (end)) - 1u) - ((1u << (start - 1u)) - 1u);
}

void set_bits(out uint o, uint bits, uint start, uint end) {
    o &= ~bitmask(start, end);
    o += bits >> start;
}

uvec4 getpixel(ivec2 offset) {
    return texture(in_tex, texcoord + vec2(offset) / vec2(textureSize(in_tex, 0)));
}


#define GETSET(gettername, settername, channel, start, end) \
uint gettername(uvec4 cell) { \
    return get_bits(cell.channel, start, end); \
} \
void settername(out uvec4 cell, uint value) { \
    set_bits(cell.channel, value, start, end); \
}

//METAPROGRAMMING_START
// r channel
GETSET(g_type, s_type, r, 0u, 2u)
GETSET(g_direction, s_direction, r, 3u, 4u)
GETSET(g_grabber_length, s_grabber_length, r, 5u, 7u)
GETSET(g_operation, s_operation, r, 8u, 11u)

// g channel
GETSET(g_num, s_num, g, 0u, 30u)
GETSET(g_has_num, s_has_num, g, 31u, 31u)

// b channel
GETSET(g_score, s_score, b, 0u, 7u)
GETSET(g_required_score, s_required_score, b, 8u, 15u)

//METAPROGRAMMING_END

//COMMON_END


ivec2 get_unit_offset_from_dir(uint dir) {
    ivec2 offset = ivec2(0);
    switch (dir) {
    case UP:
        offset.y += 1;
        break;
    case DOWN:
        offset.y -= 1;
        break;
    case LEFT:
        offset.x -= 1;
        break;
    case RIGHT:
        offset.x += 1;
        break;
    }
    return offset;
}

ivec2 get_unit_offset(uvec4 pixel) {
    uint direction = g_direction(pixel);
    return get_unit_offset_from_dir(direction);
}

void handle_conveyor(uvec4 s, out uvec4 o) {
    ivec2 offset = get_unit_offset(s);
    offset *= -1 * ((g_type(s) == GRABBER) ? int(g_grabber_length(s)) : 1);
    uvec4 past = getpixel(offset);

    switch (g_type(past)) {
    case CONVEYOR:
    case CONVERTER:
        s_num(o, g_num(past));
        s_has_num(o, g_has_num(past));
        break;
    case INPUT:
        s_num(o, g_num(past));
        s_has_num(o, 1u);
        break;
    }
}

void handle_converter(uvec4 s, out uvec4 o) {
    uint op = g_operation(s);
    ivec2 dst_offset = get_unit_offset(s);
    ivec2 src_offset1 = ivec2(-dst_offset.y, dst_offset.x);
    ivec2 src_offset2 = -1 * src_offset1;
    
    uvec4 src_pixel1 = getpixel(src_offset1);
    uvec4 src_pixel2 = getpixel(src_offset2);

    uint src_value1 = g_num(src_pixel1);
    uint src_value2 = g_num(src_pixel2);

    uint operation_result;

    switch (op) {
    case ADD:
        operation_result = src_value1 + src_value2;
        break;
    case SUB:
        operation_result = src_value1 - src_value2;
        break;
    case MUL:
        operation_result = src_value1 * src_value2;
        break;
    case DIV:
        operation_result = src_value1 / src_value2;
        break;
    }

    s_num(o, operation_result);
    s_has_num(o, ((g_has_num(src_pixel1) == 1u) && (g_has_num(src_pixel2) == 1u)) ? 1u : 0u);
}

void handle_output(uvec4 s, out uvec4 o) {
    uint delta_score = 0u;
    
    for (uint dir = 0u; dir < 4u; dir++) {
        ivec2 offset = get_unit_offset_from_dir(dir);
        uvec4 pixel = getpixel(-offset);
        
        if (g_direction(pixel) != dir) {
            continue;
        }

        if (g_num(pixel) != g_num(s)) {
            continue;
        }

        delta_score++;
    }

    s_score(o, g_score(s) + delta_score);
}

void main() {
    uvec4 s = texture(in_tex, texcoord);

    // r channel
    uint type = g_type(s);
    uint direction = g_direction(s);
    uint grabber_length = g_grabber_length(s);

    // g channel
    uint num_val = g_num(s);

    uvec4 o = uvec4(0);

    switch (type) {
    case NONE:
        s_type(o, NONE);
        break;

    case GRABBER:
    case CONVEYOR:
        handle_conveyor(s, o);
        break;

    case CONVERTER:
        handle_converter(s, o);
        break;

    case INPUT:
        break;

    case OUTPUT:
        handle_output(s, o);
        break;
    }

    out_tex = o;
}