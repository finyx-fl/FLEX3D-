export class FlexGLTFConverter{
  async convertFile(file){
    const name=file.name.toLowerCase();
    if(name.endsWith('.glb')) return await this.convertGLB(file);
    if(name.endsWith('.gltf')) return await this.convertGLTF(file);
    throw new Error('Only .glb and .gltf supported');
  }

  async convertGLB(file){
    const buffer=await file.arrayBuffer();
    const dv=new DataView(buffer);
    const magic=dv.getUint32(0,true);
    if(magic!==0x46546C67) throw new Error('Not a valid GLB');
    const length=dv.getUint32(8,true);
    let offset=12, jsonChunk=null, binChunk=null;
    while(offset < length){
      const chunkLength=dv.getUint32(offset,true);
      const chunkType=dv.getUint32(offset+4,true);
      const chunkData=buffer.slice(offset+8, offset+8+chunkLength);
      if(chunkType===0x4E4F534A) jsonChunk=JSON.parse(new TextDecoder().decode(chunkData));
      else if(chunkType===0x004E4942) binChunk=chunkData;
      offset+=8+chunkLength;
    }
    if(!jsonChunk) throw new Error('No JSON chunk');
    return this.parseGLTF(jsonChunk, binChunk);
  }

  async convertGLTF(file){
    const text=await file.text();
    const json=JSON.parse(text);
    return this.parseGLTF(json, null);
  }

  parseGLTF(json, binChunk){
    const meshes=[];
    const accessors=json.accessors||[];
    const bufferViews=json.bufferViews||[];

    const getAccessorData = (accessorIndex)=>{
      const acc=accessors[accessorIndex];
      if(!acc) return null;
      const bv=bufferViews[acc.bufferView];
      if(!bv) return null;
      let arrayBuffer = binChunk;
      if(!arrayBuffer) return null;
      const byteOffset=(bv.byteOffset||0)+(acc.byteOffset||0);
      const count=acc.count;
      const type=acc.type;
      let numComponents=3;
      if(type==='SCALAR') numComponents=1;
      else if(type==='VEC2') numComponents=2;
      else if(type==='VEC3') numComponents=3;
      else if(type==='VEC4') numComponents=4;

      const comp=acc.componentType;
      const bytesPerComp = comp===5126 ? 4 : comp===5123 ? 2 : comp===5125 ? 4 : 4;
      const slice=arrayBuffer.slice(byteOffset, byteOffset+count*numComponents*bytesPerComp);

      if(comp===5126) return new Float32Array(slice);
      if(comp===5123) return new Uint16Array(slice);
      if(comp===5125) return new Uint32Array(slice);
      if(comp===5120) return new Int8Array(slice);
      if(comp===5121) return new Uint8Array(slice);
      return null;
    };

    for(const meshDef of (json.meshes||[])){
      for(const prim of (meshDef.primitives||[])){
        if(prim.extensions?.KHR_draco_mesh_compression) continue; // skip draco for same structure
        const posAcc=prim.attributes.POSITION;
        const normAcc=prim.attributes.NORMAL;
        const uvAcc=prim.attributes.TEXCOORD_0;
        const idxAcc=prim.indices;

        const positions=getAccessorData(posAcc);
        if(!positions) continue;

        const normals=normAcc!==undefined ? getAccessorData(normAcc) : null;
        const uvs=uvAcc!==undefined ? getAccessorData(uvAcc) : null;
        const indices=idxAcc!==undefined ? getAccessorData(idxAcc) : null;
        const vertexCount=positions.length/3;

        // نفس التشكيلة القديمة - Array عادي
        meshes.push({
          name: meshDef.name||'mesh',
          positions: Array.from(positions),
          normals: normals ? Array.from(normals) : new Array(vertexCount*3).fill(0).map((_,i)=> i%3===1?1:0),
          uvs: uvs ? Array.from(uvs) : new Array(vertexCount*2).fill(0),
          indices: indices ? Array.from(indices) : [...Array(vertexCount).keys()],
          vertexCount,
          indexCount: indices ? indices.length : vertexCount
        });
      }
    }

    if(meshes.length===0){
      meshes.push({
        name:'fallback_cube',
        positions: [-1,-1,-1, 1,-1,-1, 1,1,-1, -1,1,-1, -1,-1,1, 1,-1,1, 1,1,1, -1,1,1],
        normals: [0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,1,0,0,1,0,0,1,0,0,1],
        uvs: [0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1],
        indices: [0,1,2,0,2,3,4,7,6,4,6,5,0,4,5,0,5,1,2,6,7,2,7,3,0,3,7,0,7,4,1,5,6,1,6,2],
        vertexCount:8,
        indexCount:36
      });
    }

    const flexFormat={
      version:'1.0',
      generator:'FLEX GLTF Converter v1.0 - Same .flex Structure',
      created: new Date().toISOString(),
      meshes,
      info:{
        totalVertices: meshes.reduce((s,m)=>s+m.vertexCount,0),
        totalIndices: meshes.reduce((s,m)=>s+m.indexCount,0)
      }
    };
    return flexFormat;
  }

  downloadJSON(data, filename){
    const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=filename.endsWith('.flex')?filename:filename+'.flex';
    a.click();
    URL.revokeObjectURL(url);
  }

  flexToEngineBuffer(flexMesh){
    return {
      positions: new Float32Array(flexMesh.positions),
      normals: new Float32Array(flexMesh.normals),
      uvs: new Float32Array(flexMesh.uvs),
      indices: new Uint32Array(flexMesh.indices)
    };
  }
}
