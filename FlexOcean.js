export const FlexOceanShader = {
  uniforms: {
    time: 0, waveStrength: 1.1,
    waterColor: [0.0, 0.5, 0.7],
    deepWaterColor: [0.02, 0.15, 0.35],
    lightDir: [0.5, 1.0, 0.3]
  },

  vertexShader: `#version 300 es
  precision highp float;
  uniform float time, waveStrength;
  uniform mat4 projectionMatrix, viewMatrix, modelMatrix;
  in vec3 position; in vec2 uv;
  out vec3 vPos, vNormal; out float vHeight; out vec2 vUv;

  vec3 gerstner(vec3 p, float steep, float len, float speed, vec2 dir, inout vec3 normal){
    float k=6.283185/len;
    float c=sqrt(9.8/k);
    float f=k*dot(dir,p.xz) - c*time*speed;
    float a=steep/k;
    // normal contribution
    float d = k * a;
    normal.x += dir.x * d * sin(f);
    normal.z += dir.y * d * sin(f);
    normal.y += d * cos(f);
    return vec3(dir.x*a*cos(f), a*sin(f), dir.y*a*cos(f));
  }

  void main(){
    vec3 pos=position;
    vec3 normal=vec3(0.0,1.0,0.0);
    pos+=gerstner(pos, waveStrength*0.5, 25.0, 0.6, vec2(0.9,0.3), normal);
    pos+=gerstner(pos, waveStrength*0.35, 12.0, 0.9, vec2(-0.7,0.8), normal);
    pos+=gerstner(pos, waveStrength*0.18, 5.0, 1.3, vec2(0.3,-0.8), normal);
    pos+=gerstner(pos, waveStrength*0.08, 1.8, 2.0, vec2(0.6,0.6), normal);
    vPos=pos;
    vNormal=normalize(normal);
    vHeight=pos.y;
    vUv=uv;
    gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(pos,1.0);
  }`,

  fragmentShader: `#version 300 es
  precision highp float;
  uniform vec3 waterColor, deepWaterColor, lightDir;
  uniform float time;
  in vec3 vPos, vNormal; in float vHeight; in vec2 vUv;
  out vec4 outColor;
  void main(){
    float depth=clamp((vHeight+1.5)*0.25,0.0,1.0);
    vec3 base=mix(deepWaterColor, waterColor, depth);
    
    // Fresnel + Sun specular حقيقي بالنورمال الجديد
    vec3 L = normalize(lightDir);
    float NdotL = max(dot(vNormal, L), 0.0);
    float spec = pow(NdotL, 80.0) * 0.6;
    
    float foam = smoothstep(0.7, 1.2, vHeight + dot(vNormal.xz, vec2(0.3))*0.5);
    base = mix(base, vec3(1.0), foam*0.6);
    base += spec;
    
    float fog=1.0-exp(-length(vPos)*0.006);
    base=mix(base, vec3(0.6,0.75,0.9), fog*0.25);
    outColor=vec4(base,1.0);
  }`,

  // هذه اهم دالة - نفس الشادر بس في JS عشان الفيزياء
  getHeightAt(x, z, time, strength=1.1){
    let y=0;
    function wave(px,pz,steep,len,speed,dx,dz){
      let k=6.283185/len;
      let c=Math.sqrt(9.8/k);
      let f=k*(dx*px+dz*pz) - c*time*speed;
      let a=steep/k;
      return a*Math.sin(f);
    }
    y+=wave(x,z,strength*0.5,25,0.6,0.9,0.3);
    y+=wave(x,z,strength*0.35,12,0.9,-0.7,0.8);
    y+=wave(x,z,strength*0.18,5,1.3,0.3,-0.8);
    y+=wave(x,z,strength*0.08,1.8,2.0,0.6,0.6);
    return y;
  }
};