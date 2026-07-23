// Converted from Nugget8/Three.js-Ocean-Scene - Optimized for Flextd
export const FlexSkyShader = {
  uniforms: {
    time: 0,
    sunPosition: [0.5, 1.0, 0.3],
    turbidity: 0.8,
  },
  vertexShader: `#version 300 es
  precision highp float;
  uniform mat4 projectionMatrix, viewMatrix, modelMatrix;
  in vec3 position;
  out vec3 vWorldPos;
  void main(){
    vec4 wp = modelMatrix * vec4(position * 500.0, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`,
  fragmentShader: `#version 300 es
  precision highp float;
  uniform vec3 sunPosition;
  uniform float time;
  in vec3 vWorldPos;
  out vec4 outColor;
  void main(){
    vec3 dir = normalize(vWorldPos);
    vec3 sunDir = normalize(sunPosition);
    float sunDot = dot(dir, sunDir);
    // Gradients from Nugget8
    float density = exp(-max(dir.y,0.0)*2.0) * 0.5;
    float luminosity = pow(max(dot(dir, vec3(0.0,1.0,0.0)),0.0), 1.2);
    float twilight = density * luminosity;
    vec3 skyDay = mix(vec3(0.02,0.05,0.2), vec3(0.2,0.5,0.95), pow(max(dir.y,0.0),0.7));
    vec3 sunsetCol = vec3(1.0,0.4,0.1) * pow(twilight,0.8) * 2.0;
    vec3 sky = skyDay + sunsetCol;
    float sun = pow(max(sunDot,0.0), 900.0) * 3.0;
    sky += vec3(1.0,0.9,0.6)*sun;
    // Moon
    float moon = pow(max(dot(dir, -sunDir),0.0), 1200.0) * 0.5 * (1.0-luminosity);
    sky += moon;
    outColor = vec4(sky, 1.0);
  }`
}
