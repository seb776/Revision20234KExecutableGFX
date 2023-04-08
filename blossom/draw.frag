/* framework header */
#version 430
layout(location = 0) out vec4 fragColor;
layout(location = 0) uniform vec4 iResolution;
layout(location = 1) uniform int iFrame;

 


/* vvv your shader goes here vvv */
#define sat(a) clamp(a, 0., 1.)
#define PI 3.14159265

mat2 r2d(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash11(float seed)
{
    return mod(sin(seed*123.456789)*123.456,1.);
}

vec3 getCam(vec3 rd, vec2 uv)
{
    float fov = 1.35;
    vec3 r = normalize(cross(rd, vec3(0.,1.,0.)));
    vec3 u = normalize(cross(rd, r));
    return normalize(rd+fov*(r*uv.x+u*uv.y));
}

vec2 _min(vec2 a, vec2 b)
{
    if (a.x < b.x)
        return a;
    return b;
}

float _cucube(vec3 p, vec3 s, vec3 th)
{
    vec3 l = abs(p)-s;
    float cube = max(max(l.x, l.y), l.z);
    l = abs(l)-th;
    float x = max(l.y, l.z);
    float y = max(l.x, l.z);
    float z = max(l.x, l.y);
    
    return max(min(min(x, y), z), cube);
}

float _cube(vec3 p, vec3 s)
{
    vec3 l = abs(p)-s;
    return max(l.x, max(l.y, l.z));
}
float _seed;
float rand()
{
    _seed++;
    return hash11(_seed);
}
float _grid(vec3 p, vec3 sp, float sz)
{
    p = mod(p+sp*.5,sp)-sp*.5;
    return min(length(p.xy)-sz, min(length(p.xz)-sz, length(p.yz)-sz));
}
vec2 map(vec3 p)
{
    vec2 acc = vec2(10000.,-1.);
    vec3 pp = p;
    vec3 repp = vec3(.5);
    vec3 idp = floor((pp+repp*.5)/repp);
    pp = mod(pp+repp*.5,repp)-repp*.5;
    pp += sin(idp)*.2;
    float hide = (sin(idp.x+idp.z+idp.y)*.5+.5)*.1;
    acc = _min(acc, vec2(length(pp)-.01+hide, -2.));
    acc = _min(acc, vec2(length(p)-1., 0.));

    vec3 pc= p;
    vec3 rep = vec3(1.);
    vec3 maxRep = 5.*rep;
    pc = max(-maxRep*.5, pc);
    pc = min(maxRep*.5, pc);
    vec3 id =floor((pc+rep*.5)/rep);
    pc = mod(pc+rep*.5,rep)-rep*.5;
    vec3 offcir = vec3(.5)*sign(sin(id*vec3(2.,3.,4.)));
    float shapeSel = mod(id.x+11.*id.y+id.z*2.,2.);
    float shape = mix(
    _cube(pc, vec3(.5)), 
    length(pc+offcir)-1., 
    shapeSel);
    float glob = _cube(p, maxRep-maxRep*.5);
    
    shape = max(shape, _cube(pc, vec3(.485)));
    shape = mix(shape, 100., mod(id.y+mod(id.x+id.z,2.),2.));
    shape = max(shape, glob);
    if (shapeSel == 1.)
    {
        shapeSel += mod(id.x, 2.);
    }
    acc = _min(acc, vec2(shape, shapeSel));
    
    float wires = _cucube(pc, vec3(.5), vec3(.001))+.007;
    wires = max(wires, glob);
    acc = _min(acc, vec2(wires, -2.));
    
    float ground = -p.y+maxRep.y*.5+.007;
    
    acc = _min(acc, vec2(ground, -1.));
    return acc;
}

vec3 getNorm(vec3 p, float d)
{
    vec2 e = vec2(0.01, 0.);
    return normalize(vec3(d)-vec3(map(p-e.xyy).x, map(p-e.yxy).x, map(p-e.yyx).x));
}

vec3 trace(vec3 ro, vec3 rd, int steps)
{
    vec3 p = ro;
    for (int i = 0; i < steps && distance(p, ro) < 30.; ++i)
    {
        vec2 res = map(p);
        if (res.x < 0.01)
            return vec3(res.x, distance(p, ro), res.y);
        p+=rd*res.x*.4;
    }
    return vec3(-1.);
}

vec3 getMat(vec3 p, vec3 n, vec3 rd, vec3 res)
{
    vec3 col = n*.5+.5;
    vec3 ldir = normalize(vec3(1.,-1.,1.));
    float ldotn = sat(dot(ldir, n));
    if (res.z == -1.)
        col = vec3(.1)*ldotn;
    if (res.z == -2.)
      col = vec3(1.);
    if (res.z == 0.)
        col = vec3(.2)*ldotn;
    if (res.z > 0.)
        col = mix(vec3(1.), vec3(1.,0.,0.), res.z-1.);
    col = col.xxx;
    col = mix(col, col*vec3(0.988,0.290,0.325), 1.-sat((abs(p.z)-1.)*100.));
    return col;
}

vec3 rdr(vec2 uv)
{
    vec3 col = vec3(0.);
    
    float d = 6.;
    vec3 ro = vec3(d,1,-d);
    vec3 ta = vec3(0.,1.5,0.);
    vec3 rd = normalize(ta-ro);
    vec2 dof = (vec2(rand(), rand())-.5)*.1;
    ro.xy+= dof*3.;
    rd.xy -= dof*.45;
    rd = getCam(rd, uv);
    vec3 res = trace(ro, rd, 256);
    float depth = 100.;
    if (res.y > 0.)
    {
        depth = res.y;
        vec3 p = ro+rd*res.y;
        vec3 n = getNorm(p, res.x);
        col = getMat(p, n, rd, res);
        vec3 refl = normalize(reflect(rd, n)
        +(vec3(rand(), rand(), rand())-.5)*.05);
        vec3 resrefl = trace(p+n*0.01, refl, 128);
        if (resrefl.y > 0.)
        {
            vec3 prefl = p+n*0.01+refl*resrefl.y;
            vec3 nrefl = getNorm(prefl, resrefl.x);
            col += getMat(prefl, nrefl, refl, resrefl)*vec3(0.439,0.459,1.000);
        }
    }
    vec3 red = vec3(0.604,0.071,0.710);
    col = mix(col, 2.*mix(red.xxx, red,.5)*(1.-sat(abs(uv.x*2.))), 1.-exp(-depth*0.017));
    return col;
}

vec3 rdr2(vec2 uv)
{
    vec2 off = normalize(vec2(1.))*.01*sat(length(uv));
    vec3 col = vec3(0.);
    float alea = mod(float(iFrame),3.);
        col.x = rdr(uv+off).x;
        col.y = rdr(uv).y;
        col.z = rdr(uv-off).z;
    return col;
}

void main()
{
    vec2 ouv = (gl_FragCoord.xy)/iResolution.xy;
    vec2 uv = (gl_FragCoord.xy-.5*iResolution.xy)/iResolution.xx;
    // taken frm luna // 	// seed the RNG (again taken from Devour)
    _seed = float(((iFrame*73856093)^int(gl_FragCoord.x)*19349663^int(gl_FragCoord.y)*83492791)%38069);
    vec3 col = pow(rdr2(uv), vec3(1.5))*1.5;
    col += pow(rdr(uv+(vec2(rand(), rand())-.5)*.1), vec3(2.));
    col = sat(col);
    vec2 off = vec2(1., -1.)/(iResolution.x*1.5);
    

    col = sat(col);
    //if (iFrame != 0)
    //col = mix(col, texture(iChannel1, fragCoord/iResolution.xy).xyz, .9);
    fragColor = vec4(col,1.0);
}