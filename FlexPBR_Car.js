// Converted from penumbra23/PBR-Shaders - Standard PBR for Flextd (Lambert + Cook-Torrance)
export const FlexPBRShader = {
  uniforms: {
    albedo: [0.8, 0.1, 0.1],
    metallic: 0.9,
    roughness: 0.25,
    lightDir: [0.5, 1.0, 0.3],
    lightColor: [1.0, 1.0, 0.95]
  },
  vertexShader: `#version 300 es
  precision highp float;
  uniform mat4 projectionMatrix, viewMatrix, modelMatrix;
  in vec3 position; in vec3 normal; in vec2 uv;
  out vec3 vNormal, vWorldPos; out vec2 vUv;
  void main(){
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position,1.0);
    vWorldPos = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`,
  fragmentShader: `#version 300 es
  precision highp float;
  uniform vec3 albedo, lightDir, lightColor;
  uniform float metallic, roughness;
  in vec3 vNormal, vWorldPos; in vec2 vUv;
  out vec4 outColor;
  const float PI = 3.14159265359;
  float DistributionGGX(vec3 N, vec3 H, float rough){
    float a = rough*rough; float a2 = a*a;
    float NdotH = max(dot(N,H),0.0); float NdotH2 = NdotH*NdotH;
    float nom = a2; float denom = (NdotH2*(a2-1.0)+1.0); denom = PI*denom*denom;
    return nom/denom;
  }
  float GeometrySchlickGGX(float NdotV, float rough){
    float r = (rough+1.0); float k = (r*r)/8.0;
    return NdotV/(NdotV*(1.0-k)+k);
  }
  float GeometrySmith(vec3 N, vec3 V, vec3 L, float rough){
    return GeometrySchlickGGX(max(dot(N,V),0.0),rough)*GeometrySchlickGGX(max(dot(N,L),0.0),rough);
  }
  vec3 fresnelSchlick(float cosTheta, vec3 F0){ return F0 + (1.0-F0)*pow(1.0-cosTheta,5.0); }
  void main(){
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vWorldPos);
    vec3 L = normalize(lightDir);
    vec3 H = normalize(V+L);
    vec3 F0 = mix(vec3(0.04), albedo, metallic);
    float NDF = DistributionGGX(N,H,roughness);
    float G = GeometrySmith(N,V,L,roughness);
    vec3 F = fresnelSchlick(max(dot(H,V),0.0), F0);
    vec3 kS = F; vec3 kD = vec3(1.0)-kS; kD *= 1.0-metallic;
    vec3 numerator = NDF*G*F; float denom = 4.0*max(dot(N,V),0.0)*max(dot(N,L),0.0)+0.001;
    vec3 specular = numerator/denom;
    float NdotL = max(dot(N,L),0.0);
    vec3 Lo = (kD*albedo/PI + specular)*lightColor*NdotL;
    vec3 ambient = vec3(0.03)*albedo;
    vec3 color = ambient + Lo;
    color = color/(color+vec3(1.0)); color = pow(color, vec3(1.0/2.2));
    outColor = vec4(color,1.0);
  }`
}
