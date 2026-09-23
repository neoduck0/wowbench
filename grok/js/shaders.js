export const UNIVERSE_VS = `#version 300 es
out vec2 vUv;
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = pos;
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const UNIVERSE_FS = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
uniform float uWorld;
uniform float uShock;
uniform vec2 uShockPos;
uniform float uAudio;
uniform float uEnter;
uniform float uIdle;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x),
        mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
        mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.07 + 0.13;
    a *= 0.5;
  }
  return s;
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdSphere(vec3 p, float r) { return length(p) - r; }

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float sdOcta(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

vec3 kaleido(vec3 p, float n) {
  float an = 3.14159265 / max(n, 1.0);
  float a = atan(p.z, p.x);
  a = mod(a + an, 2.0 * an) - an;
  float r = length(p.xz);
  p.xz = vec2(cos(a), sin(a)) * r;
  p.xz = abs(p.xz);
  return p;
}

float blackSun(vec3 p) {
  float core = sdSphere(p, 0.78);
  vec3 q = p;
  q.yz = rot(1.48) * q.yz;
  float n = vnoise(q * 3.0 + vec3(uTime * 0.08));
  float disk = sdTorus(q, vec2(1.22, 0.032 + n * 0.015));
  return min(core, disk);
}

float prismSea(vec3 p) {
  p = kaleido(p, 6.0);
  p.y = abs(p.y);
  p.xz = rot(uTime * 0.12) * p.xz;
  float o = sdOcta(p - vec3(1.15, 0.15, 0.0), 0.72);
  o = min(o, sdOcta(p - vec3(0.0, 1.35, 0.2), 0.38));
  o = min(o, sdOcta(p - vec3(0.4, 0.0, 1.1), 0.28));
  float ground = p.y + 1.35 + sin(p.x * 3.0 + uTime) * 0.05;
  return smin(o, ground, 0.25);
}

float synapse(vec3 p) {
  vec3 q = p;
  q.xy = rot(uTime * 0.18) * q.xy;
  q *= 2.15;
  float g = abs(dot(sin(q), cos(q.yzx))) - 0.55;
  float shell = sdSphere(p, 2.55);
  return max(g, shell);
}

float glassNave(vec3 p) {
  p.z += uTime * 0.45;
  vec3 c = p;
  c.x = abs(c.x) - 1.55;
  c.z = mod(c.z, 3.4) - 1.7;
  float col = sdBox(c, vec3(0.2, 6.0, 0.2));
  float rib = sdBox(vec3(p.x, p.y - 2.1, c.z), vec3(1.7, 0.08, 0.08));
  float floorp = p.y + 1.35;
  float ceilp = 2.55 - p.y;
  return min(col, min(rib, min(floorp, ceilp)));
}

float irisBloom(vec3 p) {
  float r = length(p);
  float a = atan(p.z, p.x);
  float b = atan(p.y, length(p.xz));
  float petals = sin(a * 7.0 + uTime * 0.55) * 0.22 + sin(a * 14.0 - uTime * 0.2) * 0.07;
  petals += sin(b * 6.0 - uTime * 0.35) * 0.12;
  petals += vnoise(p * 3.1 + uTime * 0.15) * 0.08;
  return r - 1.12 - petals;
}

float eventide(vec3 p) {
  float waves = sin(p.x * 0.55 + uTime * 0.4) * 0.28 + cos(p.z * 0.4 + uTime * 0.55) * 0.22;
  waves += fbm(p * 0.45 + vec3(0.0, uTime * 0.08, 0.0)) * 0.18;
  float ground = p.y + 0.72 + waves;
  vec3 sp = p - vec3(0.0, 1.55, 4.2);
  float sun = sdSphere(sp, 0.62);
  return smin(ground, sun, 0.45);
}

float worldSDF(vec3 p, float idx) {
  if (idx < 0.5) return blackSun(p);
  if (idx < 1.5) return prismSea(p);
  if (idx < 2.5) return synapse(p);
  if (idx < 3.5) return glassNave(p);
  if (idx < 4.5) return irisBloom(p);
  return eventide(p);
}

float map(vec3 p) {
  float w = clamp(uWorld, 0.0, 5.0);
  float i = floor(w);
  float f = smoothstep(0.0, 1.0, fract(w));
  float warp = sin(fract(w) * 3.14159265);
  p.xy = rot(warp * 0.35) * p.xy;
  p += 0.12 * warp * sin(p.zxy * 2.2 + uTime);

  float d = mix(worldSDF(p, i), worldSDF(p, min(i + 1.0, 5.0)), f);

  if (uShock > 0.001) {
    vec3 sp = vec3((uShockPos - 0.5) * vec2(4.2, 2.6), 0.0);
    float wave = abs(length(p - sp) - uShock * 7.2);
    d -= exp(-wave * wave * 22.0) * 0.42 * (1.0 - uShock);
  }
  return d;
}

vec3 palette(float t, float w) {
  vec3 p0 = vec3(0.08, 0.04, 0.015) + vec3(0.55, 0.28, 0.07) * cos(6.28318 * (vec3(1.0, 0.72, 0.4) * t + vec3(0.0, 0.16, 0.22)));
  vec3 p1 = vec3(0.28, 0.12, 0.48) + vec3(0.62, 0.38, 0.5) * cos(6.28318 * (vec3(1.0, 1.0, 1.0) * t + vec3(0.0, 0.33, 0.67)));
  vec3 p2 = vec3(0.05, 0.18, 0.14) + vec3(0.4, 0.72, 0.28) * cos(6.28318 * (vec3(1.0, 0.8, 0.5) * t + vec3(0.18, 0.14, 0.42)));
  vec3 p3 = vec3(0.12, 0.14, 0.24) + vec3(0.48, 0.42, 0.38) * cos(6.28318 * (vec3(1.0, 0.9, 0.7) * t + vec3(0.55, 0.3, 0.2)));
  vec3 p4 = vec3(0.36, 0.1, 0.24) + vec3(0.55, 0.28, 0.48) * cos(6.28318 * (vec3(1.0, 0.7, 0.9) * t + vec3(0.1, 0.22, 0.4)));
  vec3 p5 = vec3(0.06, 0.05, 0.16) + vec3(0.8, 0.32, 0.12) * cos(6.28318 * (vec3(1.0, 0.8, 0.5) * t + vec3(0.35, 0.2, 0.15)));
  float i = clamp(w, 0.0, 5.0);
  vec3 c = mix(p0, p1, clamp(i, 0.0, 1.0));
  c = mix(c, p2, clamp(i - 1.0, 0.0, 1.0));
  c = mix(c, p3, clamp(i - 2.0, 0.0, 1.0));
  c = mix(c, p4, clamp(i - 3.0, 0.0, 1.0));
  c = mix(c, p5, clamp(i - 4.0, 0.0, 1.0));
  return c;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0016, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

float stars(vec3 rd) {
  vec3 p = rd * 110.0;
  vec3 id = floor(p);
  vec3 f = fract(p) - 0.5;
  float h = hash13(id);
  if (h < 0.976) return 0.0;
  float tw = sin(uTime * (2.0 + h * 5.0) + h * 40.0) * 0.5 + 0.5;
  return smoothstep(0.06, 0.0, length(f)) * tw * (0.7 + 1.4 * pow(h, 8.0));
}

vec3 nebula(vec3 rd) {
  float n = fbm(rd * 3.2 + vec3(uTime * 0.03, 0.2, -uTime * 0.02));
  vec3 c = palette(n + uWorld * 0.08, uWorld);
  return c * pow(n, 2.2) * 0.55;
}

vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv * uResolution - 0.5 * uResolution) / uResolution.y;
  vec2 m = (uMouse - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

  float trans = sin(fract(uWorld) * 3.14159265);
  p *= 1.0 + trans * 0.35;
  p = rot(trans * 0.4 + uIdle * 0.02) * p;

  float camZ = mix(-6.1, -4.2, smoothstep(0.0, 1.2, uWorld));
  vec3 ro = vec3(0.0, 0.08, camZ);
  ro.xz = rot((m.x) * 0.5) * ro.xz;
  ro.y += m.y * 0.35;
  vec3 ta = vec3(m * 0.35, 0.0);
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(vec3(0.0, 1.0, 0.0), ww));
  vec3 vv = cross(ww, uu);
  vec3 rd = normalize(p.x * uu + p.y * vv + 1.55 * ww);

  float aperture = smoothstep(0.0, 1.0, uEnter);
  rd = normalize(mix(vec3(0.0, 0.0, 1.0), rd, mix(0.08, 1.0, aperture)));

  float t = 0.0;
  float glow = 0.0;
  float hit = 0.0;
  vec3 pos;
  for (int i = 0; i < 72; i++) {
    pos = ro + rd * t;
    float d = map(pos);
    glow += 0.02 / (1.0 + d * d * 16.0);
    if (d < 0.0012) { hit = 1.0; break; }
    if (t > 36.0) break;
    t += d * 0.82;
  }

  vec3 accent = palette(0.35 + uAudio * 0.2, uWorld);
  vec3 col = nebula(rd) * 0.65 + stars(rd) * (0.55 + 0.45 * (1.0 - hit));
  float hole = 1.0 - smoothstep(0.4, 1.6, uWorld);
  col += glow * accent * (0.42 + uAudio * 0.3) * mix(0.12, 1.0, 1.0 - hole);

  if (hit > 0.5) {
    vec3 n = calcNormal(pos);
    vec3 l = normalize(vec3(0.55, 0.72, -0.35));
    float diff = clamp(dot(n, l), 0.0, 1.0);
    float fre = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.2);
    vec3 ref = reflect(rd, n);
    float spec = pow(clamp(dot(ref, l), 0.0, 1.0), 40.0);
    float ao = clamp(map(pos + n * 0.14) / 0.14, 0.0, 1.0);
    vec3 albedo = palette(n.y * 0.35 + length(pos) * 0.12 + vnoise(pos * 2.5), uWorld);
    float rad = length(pos);
    float core = smoothstep(1.28, 0.9, rad);
    float petals = 0.55 + 0.45 * sin(atan(pos.z, pos.x) * 7.0 + pos.y * 2.0);
    albedo = mix(albedo, albedo * petals, clamp(uWorld - 3.5, 0.0, 1.0));
    albedo = mix(albedo, vec3(0.0), core * hole);
    vec3 surf = albedo * (0.06 + diff * 0.9) * ao;
    surf += spec * vec3(1.0, 0.92, 0.75) * mix(0.15, 0.7, 1.0 - hole);
    surf += fre * mix(vec3(1.0, 0.76, 0.32) * 2.2, accent * 0.7, 1.0 - hole);
    vec3 mpos = vec3((uMouse - 0.5) * vec2(4.2, 2.6), 0.5);
    surf += accent * (0.22 / (0.3 + length(pos - mpos)));
    if (hole > 0.4 && rad < 1.08) {
      surf = vec3(0.0);
      surf += vec3(1.0, 0.74, 0.3) * pow(fre, 1.15) * 2.6;
    }
    surf += vec3(1.0, 0.7, 0.25) * hole * smoothstep(0.06, 0.0, abs(rad - 1.12)) * 1.6;
    col = mix(col, surf, 0.92);
    float fog = 1.0 - exp(-0.01 * t * t);
    col = mix(col, accent * 0.07, fog);
  }

  col += accent * uShock * 0.14 * (1.0 - uShock);

  float vig = 1.0 - dot(p, p) * 0.28;
  col *= vig;
  float ca = length(p) * 0.022;
  col.r *= 1.0 + ca * 1.4;
  col.b *= 1.0 - ca * 0.7;

  float grain = hash13(vec3(uv * uResolution.xy, uTime * 20.0)) * 0.03;
  col += grain - 0.015;

  col *= aperture;
  col = aces(col * mix(0.9, 1.12, 1.0 - hole * 0.35));
  col = pow(max(col, 0.0), vec3(0.4545));

  fragColor = vec4(col, 1.0);
}
`;

export const PARTICLE_VS = `#version 300 es
in vec3 aSeed;
uniform float uTime;
uniform float uWorld;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uEnter;
uniform float uDpr;
uniform float uAudio;
out float vAlpha;
out vec3 vColor;

vec3 pal(float t) {
  vec3 gold = vec3(0.95, 0.82, 0.55);
  vec3 ice = vec3(0.65, 0.82, 1.0);
  vec3 rose = vec3(1.0, 0.55, 0.72);
  vec3 c = mix(gold, ice, clamp(uWorld * 0.25, 0.0, 1.0));
  c = mix(c, rose, clamp((uWorld - 2.0) * 0.2, 0.0, 1.0));
  return mix(c, vec3(1.0), 0.25 + 0.2 * t);
}

vec3 formation(vec3 s, float w) {
  float a = s.x * 6.2831853;
  float b = s.y * 3.14159265;
  float r = 0.5 + s.y * 3.5;
  vec3 disk = vec3(cos(a) * r, (s.z - 0.5) * 0.14, sin(a) * r);
  vec3 sph = vec3(sin(b) * cos(a), cos(b), sin(b) * sin(a)) * (1.05 + s.z * 2.15);
  vec3 lat = (s * 2.0 - 1.0) * 2.7;
  lat += 0.18 * sin(vec3(s.y, s.z, s.x) * 18.0);
  float ht = s.x * 14.0 + uTime * 0.3;
  vec3 hel = vec3(cos(ht) * 1.25, (s.y - 0.5) * 4.2, sin(ht) * 1.25);
  hel += vec3(cos(ht + 2.094), 0.0, sin(ht + 2.094)) * 0.55 * step(0.5, s.z);
  float colx = (floor(s.x * 7.0) - 3.0) * 0.85;
  vec3 col = vec3(colx, (s.y - 0.5) * 4.2, (fract(s.z * 5.0) - 0.5) * 8.0);
  float pet = floor(s.x * 8.0);
  float pa = pet * 0.785398 + uTime * 0.05;
  float pr = 0.55 + fract(s.x * 8.0) * 2.1;
  vec3 flo = vec3(cos(pa) * pr, sin(s.y * 3.1415) * 0.45, sin(pa) * pr);
  vec3 cur = vec3((s.x - 0.5) * 6.4, (s.y - 0.28) * 2.2 + sin(s.x * 9.0 + uTime) * 0.35, (s.z - 0.5) * 2.0);

  float i = w;
  vec3 p = mix(mix(disk, sph, step(0.7, s.z)), lat, clamp(i, 0.0, 1.0));
  p = mix(p, hel, clamp(i - 1.0, 0.0, 1.0));
  p = mix(p, col, clamp(i - 2.0, 0.0, 1.0));
  p = mix(p, flo, clamp(i - 3.0, 0.0, 1.0));
  p = mix(p, cur, clamp(i - 4.0, 0.0, 1.0));
  return p;
}

void main() {
  vec3 p = formation(aSeed, uWorld);
  float t = uTime * 0.08;
  float c = cos(t), s = sin(t);
  mat2 R = mat2(c, -s, s, c);
  p.xz = R * p.xz;
  p.xy += (uMouse - 0.5) * vec2(-0.45, 0.32);

  float z = p.z + 5.6;
  float aspect = uResolution.x / uResolution.y;
  gl_Position = vec4(p.x / z / aspect * 1.75, p.y / z * 1.75, 0.0, 1.0);
  gl_PointSize = clamp((1.8 + uAudio * 1.2) / z * uDpr, 1.0, 3.0);
  vAlpha = 0.14 * uEnter * (0.2 + 0.8 * aSeed.z);
  vColor = pal(aSeed.x + uWorld * 0.14 + uTime * 0.02);
}
`;

export const PARTICLE_FS = `#version 300 es
precision highp float;
in float vAlpha;
in vec3 vColor;
out vec4 fragColor;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q);
  float a = exp(-d * d * 18.0) * vAlpha;
  if (a < 0.02) discard;
  fragColor = vec4(vColor * a, a);
}
`;
