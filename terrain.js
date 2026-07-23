export class FlexTerrain{
  constructor(size=500, segments=128){
    this.size=size;
    this.segments=segments;
    this.heightMap = null; 
  }

  fbm(x, z){
    let h=0, amp=1, freq=0.008;
    for(let i=0;i<4;i++){
      h += Math.sin(x*freq)*Math.cos(z*freq)*amp*15;
      h += Math.sin(x*freq*1.5 + z*freq*0.7)*amp*7;
      amp*=0.5; freq*=2.0;
    }
    return h;
  }

  getHeightAt(x, z){
    return this.fbm(x, z);
  }

  createGeometry(){
    const vertCount=(this.segments+1)*(this.segments+1);
    const positions=new Float32Array(vertCount*3);
    const indices=new Uint32Array(this.segments*this.segments*6);
    const uvs=new Float32Array(vertCount*2);
    const normals=new Float32Array(vertCount*3);

    let idx=0;
    this.heightMap = new Float32Array(vertCount);

    for(let z=0;z<=this.segments;z++){
      for(let x=0;x<=this.segments;x++){
        const fx=(x/this.segments-0.5)*this.size;
        const fz=(z/this.segments-0.5)*this.size;
        const h=this.fbm(fx, fz);

        positions[idx*3]=fx;
        positions[idx*3+1]=h;
        positions[idx*3+2]=fz;
        this.heightMap[idx]=h;

        uvs[idx*2]=x/this.segments;
        uvs[idx*2+1]=z/this.segments;
        idx++;
      }
    }

    for(let z=0;z<=this.segments;z++){
      for(let x=0;x<=this.segments;x++){
        const i=z*(this.segments+1)+x;
        const hL = x>0? this.heightMap[i-1] : this.heightMap[i];
        const hR = x<this.segments? this.heightMap[i+1] : this.heightMap[i];
        const hD = z>0? this.heightMap[i-(this.segments+1)] : this.heightMap[i];
        const hU = z<this.segments? this.heightMap[i+(this.segments+1)] : this.heightMap[i];

        let nx = hL - hR;
        let nz = hD - hU;
        let ny = 2.0;
        let len = Math.hypot(nx, ny, nz);
        normals[i*3]=nx/len;
        normals[i*3+1]=ny/len;
        normals[i*3+2]=nz/len;
      }
    }

    let p=0;
    for(let z=0;z<this.segments;z++){
      for(let x=0;x<this.segments;x++){
        const a=z*(this.segments+1)+x, b=a+1, c=(z+1)*(this.segments+1)+x, d=c+1;
        indices[p++]=a; indices[p++]=c; indices[p++]=b;
        indices[p++]=b; indices[p++]=c; indices[p++]=d;
      }
    }
    return {positions, uvs, normals, indices, vertexCount: vertCount};
  }
}