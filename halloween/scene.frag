precision highp float;
uniform vec2 uRes;
uniform float uTime, uTravel, uFlash, uPhase, uIllum;
uniform vec2 uLook;

#define CELL 3.2
#define PI 3.14159265

const vec3 MOON = vec3(-0.287, 0.191, 0.957);

float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  float a = h21(i), b = h21(i + vec2(1,0)), c = h21(i + vec2(0,1)), d = h21(i + vec2(1,1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a*vnoise(p); p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float groundH(vec2 xz){ return 0.18*(vnoise(xz*0.35) - 0.5) + 0.04*(vnoise(xz*1.7) - 0.5); }
float flick(float s){ return 0.72 + 0.28*vnoise(vec2(uTime*9.0, s*97.0)) + 0.08*sin(uTime*23.0 + s*40.0); }

bool cellInfo(vec2 id, out vec3 c, out float r, out float yaw, out float seed){
  seed = h21(id + 0.37);
  c = vec3(0.0); r = 0.0; yaw = 0.0;
  if (id.x == 0.0 || abs(id.x) > 5.0 || seed > 0.58) return false;
  r = 0.42 + 0.4*h21(id*1.7 + 3.1);
  vec2 j = (vec2(h21(id + 11.3), h21(id + 5.7)) - 0.5)*(CELL - 2.3*r);
  vec2 xz = (id + 0.5)*CELL + j;
  c = vec3(xz.x, groundH(xz) + r*0.72, xz.y);
  yaw = -sign(id.x)*0.6 + (h21(id + 9.1) - 0.5)*0.7;
  return true;
}

float sdTri(vec2 p, float r){
  const float k = 1.7320508;
  p.x = abs(p.x) - r; p.y = p.y + r/k;
  if (p.x + k*p.y > 0.0) p = vec2(p.x - k*p.y, -k*p.x - p.y)/2.0;
  p.x -= clamp(p.x, -2.0*r, 0.0);
  return -length(p)*sign(p.y);
}
float sdBox2(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }

float sdFace(vec2 q, float s){
  vec2 a = vec2(abs(q.x), q.y);
  float eye = sdTri(a - vec2(0.33, 0.2), 0.13 + 0.05*s);
  float nose = sdTri(q - vec2(0.0, -0.02), 0.07);
  vec2 m = q - vec2(0.0, -0.1);
  float mouth = max(length(m) - 0.5, -(length(m - vec2(0.0, 0.22)) - 0.56));
  mouth = max(mouth, -sdBox2(a - vec2(0.2, -0.43), vec2(0.055, 0.05)));
  mouth = max(mouth, -sdBox2(q - vec2(0.0, -0.56), vec2(0.055, 0.05)));
  return min(min(eye, nose), mouth);
}

vec2 pumpkin(vec3 p, float r, float seed){
  float a = atan(p.z, p.x);
  float g = 1.0 - pow(abs(sin(a*4.0)), 0.4);
  float len = length(vec3(p.x, p.y*1.3, p.z));
  float body = (len - r*(1.0 - 0.06*g))*0.72;
  float t = 0.05*r;
  float shell = abs(body + t) - t;
  float cut = max(sdFace(p.xy/r - vec2(0.0, 0.06), seed)*r, p.z);
  shell = max(shell, -cut);
  vec3 s = p - vec3(0.0, r*0.7, 0.0);
  s.x += s.y*s.y*1.2;
  float stem = max(length(s.xz) - 0.075*r*(1.0 - s.y/r*0.8), abs(s.y - 0.13*r) - 0.15*r)*0.8;
  if (stem < shell) return vec2(stem, 3.0);
  return vec2(shell, 1.0 + clamp(-body/(2.0*t), 0.0, 1.0));
}

vec2 mapScene(vec3 p){
  vec2 res = vec2((p.y - groundH(p.xz))*0.9, 0.0);
  vec2 id = floor(p.xz/CELL);
  vec3 c; float r, yaw, seed;
  if (cellInfo(id, c, r, yaw, seed)){
    vec3 q = p - c; q.xz = rot(yaw)*q.xz;
    vec2 pk = pumpkin(q, r, seed);
    if (pk.x < res.x) res = pk;
  }
  return res;
}
// Only the pumpkin in the current cell is evaluated, so the step is capped at the cell border.
vec2 map(vec3 p){
  vec2 res = mapScene(p);
  vec2 f = fract(p.xz/CELL);
  float border = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))*CELL;
  res.x = min(res.x, max(border + 0.03, p.y - 1.75));
  return res;
}

vec3 calcNormal(vec3 p){
  const vec2 e = vec2(1.0, -1.0)*0.0015;
  return normalize(e.xyy*mapScene(p + e.xyy).x + e.yyx*mapScene(p + e.yyx).x +
                   e.yxy*mapScene(p + e.yxy).x + e.xxx*mapScene(p + e.xxx).x);
}
float shadow(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.05;
  for (int i = 0; i < 36; i++){
    float h = mapScene(ro + rd*t).x;
    res = min(res, 10.0*h/t);
    t += clamp(h, 0.05, 0.5);
    if (res < 0.01 || t > 10.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

vec3 candleLight(vec3 p, vec3 n){
  vec3 acc = vec3(0.0);
  vec2 id0 = floor(p.xz/CELL);
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++){
    vec2 id = id0 + vec2(float(i), float(j));
    vec3 c; float r, yaw, seed;
    if (!cellInfo(id, c, r, yaw, seed)) continue;
    vec3 d = p - (c - vec3(0.0, 0.1*r, 0.0));
    float dist = length(d);
    vec3 ld = d/dist;
    vec2 lq = rot(yaw)*ld.xz;
    float front = smoothstep(-0.1, -0.75, lq.y);
    float nl = max(dot(n, -ld), 0.0);
    acc += vec3(1.0, 0.48, 0.13)*flick(seed)*front*nl*r*r*3.2/(1.0 + dist*dist*1.2)*smoothstep(1.0*r, 1.25*r, dist);
  }
  return acc;
}

float bat(vec2 q, float flap, float px){
  q.x = abs(q.x);
  float body = (length(q*vec2(1.7, 1.0)) - 0.13);
  float x = q.x;
  float top = 0.06 + flap*x*0.9 - 0.15*x*x;
  float bot = top - 0.34*(1.0 - x) + 0.08*abs(sin(x*9.42)) - 0.03;
  float w = min(min(top - q.y, q.y - bot), 1.0 - x);
  return max(smoothstep(-px, px, w), smoothstep(px, -px, body));
}

vec3 sky(vec3 rd){
  float y = max(rd.y, 0.0);
  vec3 col = mix(vec3(0.085, 0.066, 0.135), vec3(0.006, 0.008, 0.026), pow(y, 0.55));
  col += uFlash*vec3(0.35, 0.38, 0.55)*(0.4 + 0.6*y);

  vec2 sp = vec2(atan(rd.x, rd.z), asin(clamp(rd.y, -1.0, 1.0)))*90.0;
  vec2 cell = floor(sp);
  float sh = h21(cell);
  if (sh > 0.965){
    vec2 jo = vec2(h21(cell + 3.1), h21(cell + 7.7)) - 0.5;
    float tw = 0.6 + 0.4*sin(uTime*(2.0 + sh*6.0) + sh*80.0);
    col += vec3(0.85, 0.88, 1.0)*smoothstep(0.12, 0.0, length(fract(sp) - 0.5 - jo*0.6))*tw*(sh - 0.965)*28.0*smoothstep(0.03, 0.25, rd.y);
  }

  float md = dot(rd, MOON);
  vec3 mr = normalize(cross(vec3(0.0, 1.0, 0.0), MOON));
  vec3 mu = cross(MOON, mr);
  vec2 uv = vec2(dot(rd, mr), dot(rd, mu))/0.055;
  float ang = sqrt(max(2.0*(1.0 - md), 0.0));
  float lightAmt = 0.15 + 0.85*uIllum;
  col += vec3(0.55, 0.6, 0.8)*(exp(-ang*18.0)*0.3 + exp(-ang*4.5)*0.035)*lightAmt;

  float rr = dot(uv, uv);
  if (md > 0.0 && rr < 1.05){
    vec3 n = vec3(uv, sqrt(max(1.0 - rr, 0.0)));
    float th = uPhase*2.0*PI;
    vec3 L = vec3(sin(th), 0.0, -cos(th));
    float lit = smoothstep(-0.03, 0.08, dot(n, L));
    float surf = 0.82 + 0.18*fbm(uv*3.0 + 5.0);
    float mare = smoothstep(0.42, 0.62, fbm(uv*1.4 + 2.0))*0.28;
    vec3 mc = vec3(1.0, 0.96, 0.86)*(surf - mare)*(lit*1.7 + 0.035);
    col = mix(col, mc, smoothstep(1.0, 0.96, rr));
  }

  if (md > 0.0){
    float px = 1.0/(uRes.y*1.5*0.055*0.6);
    for (int i = 0; i < 3; i++){
      float fi = float(i);
      vec2 pos = vec2(mod(uTime*0.22 + fi*3.1, 10.0) - 5.0, 0.55*sin(uTime*0.45 + fi*1.9) + (fi - 1.0)*0.55);
      float flap = sin(uTime*11.0 + fi*2.3)*0.55;
      vec2 q = (uv - pos)/(0.6 - fi*0.12);
      q.y -= flap*0.12;
      col = mix(col, vec3(0.01, 0.008, 0.015), bat(q, flap, px/(1.0 - fi*0.2))*0.95);
    }
  }

  float az = atan(rd.x, rd.z);
  float hl = 0.02 + 0.075*fbm(vec2(az*2.2, 1.3));
  float hl2 = 0.005 + 0.045*fbm(vec2(az*4.5 + 4.0, 7.1));
  col = mix(col, vec3(0.05, 0.042, 0.085) + uFlash*vec3(0.08, 0.08, 0.12), smoothstep(hl + 0.003, hl - 0.003, rd.y));
  col = mix(col, vec3(0.036, 0.03, 0.062) + uFlash*vec3(0.06, 0.06, 0.09), smoothstep(hl2 + 0.003, hl2 - 0.003, rd.y));
  return col;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;
  vec3 ro = vec3(CELL*0.5 + sin(uTravel*0.13)*0.35, 1.2, uTravel);
  ro.y += groundH(ro.xz);
  float yaw = uLook.x*1.1 + sin(uTravel*0.07)*0.12;
  float pitch = 0.04 + uLook.y*0.45;
  vec3 fw = normalize(vec3(sin(yaw)*cos(pitch), sin(pitch), cos(yaw)*cos(pitch)));
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(fw*1.5 + uv.x*rt + uv.y*up);

  float t = 0.05, m = -1.0, glow = 0.0;
  for (int i = 0; i < 130; i++){
    vec3 p = ro + rd*t;
    vec2 h = map(p);
    if (h.x < 0.0007*t){ m = h.y; break; }
    if (p.y < 2.0){
      vec2 id = floor(p.xz/CELL); vec3 c; float r, yw, sd;
      if (cellInfo(id, c, r, yw, sd)){
        vec3 q = p - c; q.xz = rot(yw)*q.xz;
        float d = length(q);
        float front = smoothstep(-0.2, -0.85, q.z/max(d, 1e-3));
        glow += front*flick(sd)*r*min(h.x, 0.4)/(1.0 + d*d*5.0);
      }
    }
    t += h.x;
    if (t > 70.0) break;
  }

  vec3 col;
  vec3 fogCol = vec3(0.055, 0.046, 0.095) + uFlash*vec3(0.22, 0.24, 0.32);
  float tf = m < -0.5 ? 70.0 : t;
  vec3 p = ro + rd*tf;

  if (m < -0.5){
    col = sky(rd);
  } else {
    vec3 n = calcNormal(p);
    float dif = max(dot(n, MOON), 0.0);
    float sh = dif > 0.0 ? shadow(p + n*0.01, MOON) : 0.0;
    vec3 moonCol = vec3(0.45, 0.55, 0.85)*0.6*(0.2 + 0.8*uIllum);
    vec3 amb = vec3(0.05, 0.045, 0.09)*(0.6 + 0.4*n.y);
    vec3 flashL = uFlash*vec3(0.7, 0.75, 1.0)*(0.45 + 0.55*n.y)*1.8;
    vec3 alb, emi = vec3(0.0);
    if (m < 0.5){
      float gr = fbm(p.xz*2.5);
      alb = mix(vec3(0.045, 0.04, 0.035), vec3(0.075, 0.085, 0.04), gr);
      float leaves = smoothstep(0.6, 0.72, vnoise(p.xz*5.0 + 3.0));
      alb = mix(alb, vec3(0.24, 0.1, 0.03)*(0.6 + 0.6*vnoise(p.xz*20.0)), leaves*0.8);
      float path = smoothstep(1.0, 0.55, abs(p.x - CELL*0.5 - sin(p.z*0.15)*0.3));
      alb = mix(alb, vec3(0.1, 0.085, 0.07)*(0.8 + 0.4*vnoise(p.xz*8.0)), path);
    } else if (m > 2.5){
      alb = vec3(0.14, 0.12, 0.05);
    } else {
      vec2 id = floor(p.xz/CELL); vec3 c; float r, yw, sd;
      cellInfo(id, c, r, yw, sd);
      float k = m - 1.0;
      alb = mix(vec3(0.72, 0.24, 0.03), vec3(0.88, 0.44, 0.07), h21(id + 2.2));
      alb *= 0.85 + 0.25*vnoise(vec2(atan(p.z - c.z, p.x - c.x)*12.0, p.y*6.0));
      alb = mix(alb, vec3(0.95, 0.72, 0.36), smoothstep(0.2, 0.6, k));
      emi = vec3(1.0, 0.55, 0.18)*flick(sd)*smoothstep(0.15, 0.95, k)*3.6;
    }
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 4.0)*max(dot(-rd, MOON) * -1.0 + 0.3, 0.0);
    col = alb*(amb + moonCol*dif*sh + flashL + candleLight(p, n)) + emi + moonCol*rim*0.25*(m > 0.5 ? 1.0 : 0.3);

    float hb = 0.9, ha = 0.07;
    float fy = abs(rd.y) < 1e-4 ? ha*exp(-hb*ro.y)*t : ha*exp(-hb*ro.y)*(1.0 - exp(-hb*rd.y*t))/(hb*rd.y);
    vec3 mist = fogCol*(0.75 + 0.6*fbm(p.xz*0.12 + vec2(uTime*0.04, uTime*0.02)));
    col = mix(col, mist, 1.0 - exp(-(t*0.024 + fy*0.8)));
  }
  if (m < -0.5){
    float hb = 0.9, ha = 0.07;
    float fy = rd.y < 1e-4 ? ha*exp(-hb*ro.y)*tf : ha*exp(-hb*ro.y)*(1.0 - exp(-hb*rd.y*tf))/(hb*rd.y);
    col = mix(col, fogCol, 1.0 - exp(-fy));
  }

  col += vec3(1.0, 0.5, 0.16)*glow*0.55;

  for (int i = 0; i < 4; i++){
    float fi = float(i);
    float rz = 2.5 + mod(fi*5.5 - uTime*0.5, 22.0);
    vec3 w = vec3(CELL*0.5 + sin(uTime*0.35 + fi*2.0)*2.6, 0.75 + 0.35*sin(uTime*0.9 + fi*1.3), uTravel + rz);
    float tp = dot(w - ro, rd);
    if (tp > 0.0 && tp < tf){
      vec3 dv = ro + rd*tp - w;
      float d2 = dot(dv, dv);
      float fade = smoothstep(2.5, 4.5, rz)*smoothstep(24.5, 18.0, rz)*exp(-tp*0.03);
      float pulse = 0.7 + 0.3*sin(uTime*3.0 + fi*4.0);
      col += vec3(0.35, 0.95, 0.8)*(0.00035/(d2 + 0.0002) + 0.006/(d2 + 0.05))*fade*pulse;
    }
  }

  col = 1.0 - exp(-col*1.7);
  col = pow(col, vec3(0.4545));
  vec2 q = gl_FragCoord.xy/uRes;
  col *= 0.4 + 0.6*pow(16.0*q.x*q.y*(1.0 - q.x)*(1.0 - q.y), 0.22);
  col += (h21(gl_FragCoord.xy + fract(uTime*7.0)*100.0) - 0.5)*0.025;
  gl_FragColor = vec4(col, 1.0);
}
