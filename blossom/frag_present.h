/* File generated with Shader Minifier 1.1.6
 * http://www.ctrl-alt-test.fr
 */
#ifndef FRAG_PRESENT_H_
# define FRAG_PRESENT_H_
# define VAR_ACCUMULATORTEX "l"
# define VAR_FRAGCOLOR "v"
# define VAR_IRESOLUTION "m"

const char *present_frag =
 "#version 430\n"
 "layout(location=0)out vec4 v;"
 "layout(location=0)uniform vec4 m;"
 "layout(binding=0)uniform sampler2D l;"
 "void main()"
 "{"
   "vec4 m=texelFetch(l,ivec2(gl_FragCoord.xy),0);"
   "vec3 n=m.xyz/m.w;"
   "v=vec4(n,1);"
 "}";

#endif // FRAG_PRESENT_H_
