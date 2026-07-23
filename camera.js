// camera.js - GTA V Style Camera - Replaces your file
import { Matrix4 } from './runder.js';

export class PerspectiveCamera{
  constructor(fov=60, aspect=1, near=0.1, far=2000){
    this.fov=fov; this.aspect=aspect; this.near=near; this.far=far;
    this.position={x:0,y:20,z:40};
    this.target={x:0,y:0,z:0};
    this.projectionMatrix=new Matrix4();
    this.viewMatrix=new Matrix4();

    // GTA V Settings
    this.distance = 8; // بعد الكاميرا عن السيارة
    this.height = 3.5; // ارتفاع الكاميرا
    this.yaw = 0; // دوران يمين يسار
    this.pitch = -15; // دوران فوق تحت
    this.followLerp = 0.08; // نعومة اللحاق - كل ما صغر كل ما صار GTA V اكثر
    this._currentPos = {x:0,y:20,z:40};
    this._currentTarget = {x:0,y:0,z:0};

    this.updateProjection();
    this.lookAt(0,0,0);
  }

  updateProjection(){
    this.projectionMatrix.perspective(this.fov*Math.PI/180, this.aspect, this.near, this.far);
  }

  // هذه هي حركة GTA V الحقيقية
  follow(targetPos, deltaTime=1/60){
    // targetPos = {x,y,z} موقع السيارة او اللاعب
    const yawRad = this.yaw * Math.PI/180;
    const pitchRad = this.pitch * Math.PI/180;

    // احسب موقع الكاميرا المطلوب حول الهدف
    const desiredX = targetPos.x + Math.sin(yawRad) * Math.cos(pitchRad) * this.distance;
    const desiredY = targetPos.y + this.height + Math.sin(pitchRad) * this.distance;
    const desiredZ = targetPos.z + Math.cos(yawRad) * Math.cos(pitchRad) * this.distance;

    // Spring Lerp - سر نعومة كاميرا GTA
    const lerp = 1 - Math.pow(1 - this.followLerp, deltaTime * 60);
    this._currentPos.x += (desiredX - this._currentPos.x) * lerp;
    this._currentPos.y += (desiredY - this._currentPos.y) * lerp;
    this._currentPos.z += (desiredZ - this._currentPos.z) * lerp;

    this._currentTarget.x += (targetPos.x - this._currentTarget.x) * lerp;
    this._currentTarget.y += (targetPos.y - this._currentTarget.y) * lerp;
    this._currentTarget.z += (targetPos.z - this._currentTarget.z) * lerp;

    this.setPosition(this._currentPos.x, this._currentPos.y, this._currentPos.z);
    this.lookAt(this._currentTarget.x, this._currentTarget.y + 1, this._currentTarget.z);
  }

  lookAt(x,y,z){
    this.target.x=x; this.target.y=y; this.target.z=z;
    const eye=this.position, center=this.target;
    const fx=center.x-eye.x, fy=center.y-eye.y, fz=center.z-eye.z;
    const len=Math.hypot(fx,fy,fz)||1;
    const fwd={x:fx/len,y:fy/len,z:fz/len};
    let rx = fwd.z, ry=0, rz=-fwd.x;
    let rlen=Math.hypot(rx,ry,rz)||1;
    if(rlen < 0.001){ rx=1; ry=0; rz=0; rlen=1; } // Fix لما تكون فوق السيارة مباشرة
    rx/=rlen; ry/=rlen; rz/=rlen;
    let ux = ry*fz - rz*fy, uy = rz*fx - rx*fz, uz = rx*fy - ry*fx;
    let ulen=Math.hypot(ux,uy,uz)||1; ux/=ulen; uy/=ulen; uz/=ulen;
    const e=this.viewMatrix.elements;
    e[0]=rx; e[4]=ry; e[8]=rz; e[12]=-(rx*eye.x+ry*eye.y+rz*eye.z);
    e[1]=ux; e[5]=uy; e[9]=uz; e[13]=-(ux*eye.x+uy*eye.y+uz*eye.z);
    e[2]=-fwd.x; e[6]=-fwd.y; e[10]=-fwd.z; e[14]=fwd.x*eye.x+fwd.y*eye.y+fwd.z*eye.z;
    e[3]=0; e[7]=0; e[11]=0; e[15]=1;
  }

  setPosition(x,y,z){ this.position.x=x; this.position.y=y; this.position.z=z; }
  addYaw(delta){ this.yaw += delta; }
  addPitch(delta){ this.pitch = Math.max(-80, Math.min(80, this.pitch + delta)); }
}