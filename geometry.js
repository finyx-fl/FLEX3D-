// geometry.js - Standalone / No math.js needed / Fixed for FLEX V2

export function createPlaneGeometry(size=100, segments=64){
  const vertCount=(segments+1)*(segments+1);
  const positions=new Float32Array(vertCount*3);
  const uvs=new Float32Array(vertCount*2);
  const normals=new Float32Array(vertCount*3);
  const indices=new Uint32Array(segments*segments*6);
  let idx=0;
  for(let z=0;z<=segments;z++){
    for(let x=0;x<=segments;x++){
      positions[idx*3]=(x/segments-0.5)*size;
      positions[idx*3+1]=0;
      positions[idx*3+2]=(z/segments-0.5)*size;
      uvs[idx*2]=x/segments;
      uvs[idx*2+1]=z/segments;
      normals[idx*3]=0; normals[idx*3+1]=1; normals[idx*3+2]=0;
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
  return {positions, uvs, normals, indices, vertexCount: vertCount};
}

export function createBoxGeometry(w=1,h=1,d=1){
  // 24 vertex - 4 لكل وجه - عشان النورمال والـ UV يصير صح
  const hw=w/2, hh=h/2, hd=d/2;
  const positions=new Float32Array([
    // front
    -hw,-hh, hd,  hw,-hh, hd,  hw, hh, hd, -hw, hh, hd,
    // back
    hw,-hh,-hd, -hw,-hh,-hd, -hw, hh,-hd,  hw, hh,-hd,
    // top
    -hw, hh, hd,  hw, hh, hd,  hw, hh,-hd, -hw, hh,-hd,
    // bottom
    -hw,-hh,-hd,  hw,-hh,-hd,  hw,-hh, hd, -hw,-hh, hd,
    // right
    hw,-hh, hd,  hw,-hh,-hd,  hw, hh,-hd,  hw, hh, hd,
    // left
    -hw,-hh,-hd, -hw,-hh, hd, -hw, hh, hd, -hw, hh,-hd
  ]);
  const normals=new Float32Array([
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
    0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
    0,1,0, 0,1,0, 0,1,0, 0,1,0,
    0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
    1,0,0, 1,0,0, 1,0,0, 1,0,0,
    -1,0,0, -1,0,0, -1,0,0, -1,0,0
  ]);
  const uvs=new Float32Array(24*2);
  for(let i=0;i<6;i++){ uvs[i*8]=0; uvs[i*8+1]=0; uvs[i*8+2]=1; uvs[i*8+3]=0; uvs[i*8+4]=1; uvs[i*8+5]=1; uvs[i*8+6]=0; uvs[i*8+7]=1; }
  const indices=new Uint32Array([
    0,1,2, 0,2,3,  4,5,6, 4,6,7,  8,9,10, 8,10,11,
    12,13,14, 12,14,15,  16,17,18, 16,18,19,  20,21,22, 20,22,23
  ]);
  return {positions, uvs, normals, indices, vertexCount:24};
}