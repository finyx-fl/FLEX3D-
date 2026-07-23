/**
 * runder.js V2 - Ultra FlexRenderer
 * All-in-One / Offline / No external dependencies
 */
export class Vector3 {
  constructor(x=0,y=0,z=0){ this.x=x; this.y=y; this.z=z; }
  set(x,y,z){ this.x=x; this.y=y; this.z=z; return this; }
  clone(){ return new Vector3(this.x,this.y,this.z); }
}
export class Matrix4 {
  constructor(){ this.elements=new Float32Array(16); this.identity(); }
  identity(){
    const e=this.elements;
    e[0]=1;e[1]=0;e[2]=0;e[3]=0;
    e[4]=0;e[5]=1;e[6]=0;e[7]=0;
    e[8]=0;e[9]=0;e[10]=1;e[11]=0;
    e[12]=0;e[13]=0;e[14]=0;e[15]=1;
    return this;
  }
  makeTranslation(x,y,z){
    this.identity();
    this.elements[12]=x; this.elements[13]=y; this.elements[14]=z;
    return this;
  }
  perspective(fov, aspect, near, far){
    const e=this.elements;
    const f=1.0/Math.tan(fov/2);
    const nf=1/(near-far);
    e[0]=f/aspect; e[1]=0; e[2]=0; e[3]=0;
    e[4]=0; e[5]=f; e[6]=0; e[7]=0;
    e[8]=0; e[9]=0; e[10]=(far+near)*nf; e[11]=-1;
    e[12]=0; e[13]=0; e[14]=(2*far*near)*nf; e[15]=0;
    return this;
  }
  multiplyMatrices(a,b){
    const ae=a.elements, be=b.elements, te=this.elements;
    const a11=ae[0],a12=ae[4],a13=ae[8],a14=ae[12];
    const a21=ae[1],a22=ae[5],a23=ae[9],a24=ae[13];
    const a31=ae[2],a32=ae[6],a33=ae[10],a34=ae[14];
    const a41=ae[3],a42=ae[7],a43=ae[11],a44=ae[15];
    const b11=be[0],b12=be[4],b13=be[8],b14=be[12];
    const b21=be[1],b22=be[5],b23=be[9],b24=be[13];
    const b31=be[2],b32=be[6],b33=be[10],b34=be[14];
    const b41=be[3],b42=be[7],b43=be[11],b44=be[15];
    te[0]=a11*b11+a12*b21+a13*b31+a14*b41;
    te[4]=a11*b12+a12*b22+a13*b32+a14*b42;
    te[8]=a11*b13+a12*b23+a13*b33+a14*b43;
    te[12]=a11*b14+a12*b24+a13*b34+a14*b44;
    te[1]=a21*b11+a22*b21+a23*b31+a24*b41;
    te[5]=a21*b12+a22*b22+a23*b32+a24*b42;
    te[9]=a21*b13+a22*b23+a23*b33+a24*b43;
    te[13]=a21*b14+a22*b24+a23*b34+a24*b44;
    te[2]=a31*b11+a32*b21+a33*b31+a34*b41;
    te[6]=a31*b12+a32*b22+a33*b32+a34*b42;
    te[10]=a31*b13+a32*b23+a33*b33+a34*b43;
    te[14]=a31*b14+a32*b24+a33*b34+a34*b44;
    te[3]=a41*b11+a42*b21+a43*b31+a44*b41;
    te[7]=a41*b12+a42*b22+a43*b32+a44*b42;
    te[11]=a41*b13+a42*b23+a43*b33+a44*b43;
    te[15]=a41*b14+a42*b24+a43*b34+a44*b44;
    return this;
  }
}
export class FlexRenderer {
  constructor(canvas, options={}){
    this.canvas=canvas;
    this.gl=canvas.getContext('webgl2',{antialias:true, alpha:false, powerPreference:'high-performance', ...options});
    if(!this.gl) throw new Error('WebGL2 required');
    const gl=this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    this.meshes=[];
    this.programCache=new Map();
    this.vaoCache=new WeakMap();
    this.stats={drawCalls:0, triangles:0};
    this._time=0;
    this.defaultShaders={
      mesh:{
        vs:`#version 300 es
        precision highp float;
        uniform mat4 projectionMatrix, viewMatrix, modelMatrix;
        in vec3 position; in vec2 uv; in vec3 normal;
        out vec2 vUv; out vec3 vNormal; out vec3 vWorldPos;
        void main(){
          vec4 worldPos=modelMatrix*vec4(position,1.0);
          vWorldPos=worldPos.xyz;
          vUv=uv;
          vNormal=mat3(modelMatrix)*normal;
          gl_Position=projectionMatrix*viewMatrix*worldPos;
        }`,
        fs:`#version 300 es
        precision highp float;
        in vec2 vUv; in vec3 vNormal; in vec3 vWorldPos;
        uniform vec3 color; uniform vec3 lightDir; uniform float time;
        out vec4 outColor;
        void main(){
          vec3 N=normalize(vNormal);
          vec3 L=normalize(lightDir);
          float diff=max(dot(N,L),0.0);
          float fresnel=pow(1.0-max(dot(N, normalize(-vWorldPos)),0.0),3.0);
          vec3 base=color*(0.35+0.65*diff);
          base+=fresnel*0.15;
          float fog=clamp(length(vWorldPos)*0.008,0.0,0.6);
          base=mix(base, vec3(0.02,0.08,0.18), fog);
          outColor=vec4(base,1.0);
        }`
      },
      ocean:{
        vs:`#version 300 es
        precision highp float;
        uniform mat4 projectionMatrix, viewMatrix, modelMatrix;
        uniform float time; uniform float waveStrength;
        in vec3 position; in vec2 uv;
        out vec2 vUv; out vec3 vWorldPos; out float vWaveHeight;
        vec3 gerstner(vec2 pos, float t, float k, float amp, vec2 dir){
          float f=k*dot(dir,pos)-t;
          return vec3(dir.x*amp*cos(f), amp*sin(f), dir.y*amp*cos(f));
        }
        void main(){
          vUv=uv;
          vec3 pos=position;
          float t=time*0.6;
          vec3 g1=gerstner(pos.xz, t, 0.12, waveStrength*1.2, vec2(0.8,0.2));
          vec3 g2=gerstner(pos.xz, t*1.3, 0.22, waveStrength*0.6, vec2(-0.3,0.7));
          vec3 g3=gerstner(pos.xz, t*0.7, 0.05, waveStrength*0.9, vec2(0.5,0.5));
          pos+=g1+g2+g3;
          vWaveHeight=pos.y;
          vec4 world=modelMatrix*vec4(pos,1.0);
          vWorldPos=world.xyz;
          gl_Position=projectionMatrix*viewMatrix*world;
        }`,
        fs:`#version 300 es
        precision highp float;
        in vec2 vUv; in vec3 vWorldPos; in float vWaveHeight;
        uniform vec3 waterColor; uniform vec3 deepWaterColor; uniform vec3 lightDir; uniform float time;
        out vec4 outColor;
        void main(){
          vec3 viewDir=normalize(-vWorldPos);
          vec3 L=normalize(lightDir);
          float depthFactor=clamp(vWorldPos.y*0.15+0.5,0.0,1.0);
          vec3 water=mix(deepWaterColor, waterColor, depthFactor);
          vec3 N=normalize(vec3(-vWaveHeight*0.2, 1.0, -vWaveHeight*0.15));
          float spec=pow(max(dot(reflect(-L,N), viewDir),0.0), 64.0)*0.8;
          float fresnel=pow(1.0-max(dot(N,viewDir),0.0),5.0);
          water+=spec*vec3(1.0);
          water=mix(water, vec3(0.6,0.85,1.0), fresnel*0.3);
          outColor=vec4(water,1.0);
        }`
      }
    };
  }
  setSize(w,h, useDevicePixelRatio=true){
    const dpr=useDevicePixelRatio? (window.devicePixelRatio||1):1;
    const cw=Math.floor(w*dpr), ch=Math.floor(h*dpr);
    if(this.canvas.width!==cw || this.canvas.height!==ch){
      this.canvas.width=cw; this.canvas.height=ch;
      if(this.canvas.style){
        this.canvas.style.width=w+'px';
        this.canvas.style.height=h+'px';
      }
    }
    this.gl.viewport(0,0,cw,ch);
    return {width:cw, height:ch, dpr};
  }
  _hash(str){ let h=0; for(let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))|0; return h; }
  createShaderProgram(vsSrc, fsSrc){
    const key=this._hash(vsSrc+fsSrc);
    if(this.programCache.has(key)) return this.programCache.get(key);
    const gl=this.gl;
    const compile=(type, src)=>{
      const s=gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
        const log=gl.getShaderInfoLog(s);
        console.error(log);
        throw new Error('Shader compile error: '+log);
      }
      return s;
    };
    const vs=compile(gl.VERTEX_SHADER, vsSrc);
    const fs=compile(gl.FRAGMENT_SHADER, fsSrc);
    const prog=gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('Program link: '+gl.getProgramInfoLog(prog));
    gl.deleteShader(vs); gl.deleteShader(fs);
    this.programCache.set(key, prog);
    return prog;
  }
  _createVAO(mesh){
    const gl=this.gl;
    const vao=gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.posBuf);
    gl.enableVertexAttribArray(mesh.attribLocs.position);
    gl.vertexAttribPointer(mesh.attribLocs.position,3,gl.FLOAT,false,0,0);
    if(mesh.uvBuf && mesh.attribLocs.uv>=0){
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uvBuf);
      gl.enableVertexAttribArray(mesh.attribLocs.uv);
      gl.vertexAttribPointer(mesh.attribLocs.uv,2,gl.FLOAT,false,0,0);
    }
    if(mesh.normBuf && mesh.attribLocs.normal>=0){
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normBuf);
      gl.enableVertexAttribArray(mesh.attribLocs.normal);
      gl.vertexAttribPointer(mesh.attribLocs.normal,3,gl.FLOAT,false,0,0);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idxBuf);
    gl.bindVertexArray(null);
    this.vaoCache.set(mesh, vao);
    return vao;
  }
  createOcean(size=500, segments=128, shaderDef=null){
    const gl=this.gl;
    const vertCount=(segments+1)*(segments+1);
    const positions=new Float32Array(vertCount*3);
    const uvs=new Float32Array(vertCount*2);
    const indices=new Uint32Array(segments*segments*6);
    let idx=0;
    for(let z=0;z<=segments;z++){
      for(let x=0;x<=segments;x++){
        positions[idx*3]=(x/segments-0.5)*size;
        positions[idx*3+1]=0;
        positions[idx*3+2]=(z/segments-0.5)*size;
        uvs[idx*2]=x/segments; uvs[idx*2+1]=z/segments;
        idx++;
      }
    }
    let p=0;
    for(let z=0;z<segments;z++){
      for(let x=0;x<segments;x++){
        const a=z*(segments+1)+x, b=a+1, c=(z+1)*(segments+1)+x, d=c+1;
        indices[p++]=a; indices[p++]=c; indices[p++]=b;
        indices[p++]=b; indices[p++]=c; indices[p++]=d;
      }
    }
    const def=shaderDef||{
      vertexShader:this.defaultShaders.ocean.vs,
      fragmentShader:this.defaultShaders.ocean.fs,
      uniforms:{time:0, waveStrength:0.9}
    };
    const program=this.createShaderProgram(def.vertexShader, def.fragmentShader);
    const posBuf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,posBuf); gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const uvBuf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,uvBuf); gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    const idxBuf=gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,idxBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    const mesh={
      type:'ocean',
      program, posBuf, uvBuf, idxBuf,
      indexCount: indices.length,
      uniforms: def.uniforms||{},
      modelMatrix: new Matrix4(),
      position: new Vector3(0,0,0),
      visible:true,
      vao:null
    };
    mesh.uniformLocs={};
    ['time','waveStrength','waterColor','deepWaterColor','lightDir','projectionMatrix','viewMatrix','modelMatrix'].forEach(n=>{
      mesh.uniformLocs[n]=gl.getUniformLocation(program,n);
    });
    mesh.attribLocs={
      position: gl.getAttribLocation(program,'position'),
      uv: gl.getAttribLocation(program,'uv'),
      normal: -1
    };
    mesh.vao=this._createVAO(mesh);
    return mesh;
  }
  createMesh(geo, shader=null, opts={}){
    const gl=this.gl;
    const vsSrc=shader?.vertexShader||this.defaultShaders.mesh.vs;
    const fsSrc=shader?.fragmentShader||this.defaultShaders.mesh.fs;
    const program=this.createShaderProgram(vsSrc, fsSrc);
    const posArr=geo.positions instanceof Float32Array ? geo.positions : new Float32Array(geo.positions);
    const uvArr=geo.uvs ? (geo.uvs instanceof Float32Array ? geo.uvs : new Float32Array(geo.uvs)) : new Float32Array(posArr.length/3*2);
    const normArr=geo.normals ? (geo.normals instanceof Float32Array ? geo.normals : new Float32Array(geo.normals)) : null;
    const idxArr=geo.indices instanceof Uint32Array ? geo.indices : new Uint32Array(geo.indices);
    let finalNormals=normArr;
    if(!finalNormals){
      finalNormals=new Float32Array(posArr.length);
      for(let i=0;i<idxArr.length;i+=3){
        const i0=idxArr[i]*3, i1=idxArr[i+1]*3, i2=idxArr[i+2]*3;
        const ax=posArr[i1]-posArr[i0], ay=posArr[i1+1]-posArr[i0+1], az=posArr[i1+2]-posArr[i0+2];
        const bx=posArr[i2]-posArr[i0], by=posArr[i2+1]-posArr[i0+1], bz=posArr[i2+2]-posArr[i0+2];
        const nx=ay*bz-az*by, ny=az*bx-ax*bz, nz=ax*by-ay*bx;
        finalNormals[i0]+=nx; finalNormals[i0+1]+=ny; finalNormals[i0+2]+=nz;
        finalNormals[i1]+=nx; finalNormals[i1+1]+=ny; finalNormals[i1+2]+=nz;
        finalNormals[i2]+=nx; finalNormals[i2+1]+=ny; finalNormals[i2+2]+=nz;
      }
      for(let i=0;i<finalNormals.length;i+=3){
        const l=Math.hypot(finalNormals[i],finalNormals[i+1],finalNormals[i+2])||1;
        finalNormals[i]/=l; finalNormals[i+1]/=l; finalNormals[i+2]/=l;
      }
    }
    const posBuf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,posBuf); gl.bufferData(gl.ARRAY_BUFFER, posArr, gl.STATIC_DRAW);
    const uvBuf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,uvBuf); gl.bufferData(gl.ARRAY_BUFFER, uvArr, gl.STATIC_DRAW);
    const normBuf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,normBuf); gl.bufferData(gl.ARRAY_BUFFER, finalNormals, gl.STATIC_DRAW);
    const idxBuf=gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,idxBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxArr, gl.STATIC_DRAW);
    const mesh={
      type:'mesh',
      program, posBuf, uvBuf, normBuf, idxBuf,
      indexCount: idxArr.length,
      modelMatrix: new Matrix4(),
      position: new Vector3(0,0,0),
      visible:true,
      color: opts.color ? [((opts.color>>16)&255)/255, ((opts.color>>8)&255)/255, (opts.color&255)/255] : [0.8,0.85,0.9],
      vao:null
    };
    mesh.uniformLocs={
      projectionMatrix: gl.getUniformLocation(program,'projectionMatrix'),
      viewMatrix: gl.getUniformLocation(program,'viewMatrix'),
      modelMatrix: gl.getUniformLocation(program,'modelMatrix'),
      color: gl.getUniformLocation(program,'color'),
      lightDir: gl.getUniformLocation(program,'lightDir'),
      time: gl.getUniformLocation(program,'time')
    };
    mesh.attribLocs={
      position: gl.getAttribLocation(program,'position'),
      uv: gl.getAttribLocation(program,'uv'),
      normal: gl.getAttribLocation(program,'normal')
    };
    mesh.vao=this._createVAO(mesh);
    return mesh;
  }
  sceneAdd(mesh){ this.meshes.push(mesh); return mesh; }
  sceneRemove(mesh){ const i=this.meshes.indexOf(mesh); if(i>=0) this.meshes.splice(i,1); }
  render(camera, time=0){
    const gl=this.gl;
    this.stats.drawCalls=0; this.stats.triangles=0;
    gl.clearColor(0.02,0.06,0.12,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    for(const mesh of this.meshes){
      if(mesh.visible===false) continue;
      gl.useProgram(mesh.program);
      gl.bindVertexArray(mesh.vao);
      if(mesh.position){
        mesh.modelMatrix.makeTranslation(mesh.position.x, mesh.position.y, mesh.position.z);
      }
      const ul=mesh.uniformLocs;
      if(ul.time) gl.uniform1f(ul.time, time*0.001);
      if(ul.waveStrength) gl.uniform1f(ul.waveStrength, mesh.uniforms?.waveStrength??0.9);
      if(ul.waterColor) gl.uniform3f(ul.waterColor, 0.04,0.48,0.62);
      if(ul.deepWaterColor) gl.uniform3f(ul.deepWaterColor, 0.015,0.09,0.20);
      if(ul.lightDir) gl.uniform3f(ul.lightDir, 0.6,1.0,0.4);
      if(ul.projectionMatrix) gl.uniformMatrix4fv(ul.projectionMatrix,false,camera.projectionMatrix.elements);
      if(ul.viewMatrix) gl.uniformMatrix4fv(ul.viewMatrix,false,camera.viewMatrix.elements);
      if(ul.modelMatrix) gl.uniformMatrix4fv(ul.modelMatrix,false,mesh.modelMatrix.elements);
      if(ul.color) gl.uniform3fv(ul.color, mesh.color);
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_INT,0);
      this.stats.drawCalls++;
      this.stats.triangles+=mesh.indexCount/3;
      gl.bindVertexArray(null);
    }
  }
}
export const FlexRendererV2 = FlexRenderer;
