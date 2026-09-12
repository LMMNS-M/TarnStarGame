import { SOUNDS } from './assets.js';
export class AudioManager {
 constructor(){this.context=null;this.buffers=new Map();this.sources=new Set();this.muted=false;this.lastShot=-1;this.data=new Map();}
 async preload(){await Promise.all(Object.entries(SOUNDS).map(async([name,url])=>{try{const r=await fetch(url);if(!r.ok)throw Error(url);this.data.set(name,await r.arrayBuffer());}catch(e){console.warn('Audio unavailable',name,e);}}));}
 unlock(){
  if(!this.context){this.context=new (window.AudioContext||window.webkitAudioContext)();this.gain=this.context.createGain();this.gain.gain.value=this.muted?0:.65;this.gain.connect(this.context.destination);}
  this.context.resume();
  if(!this.decoding)this.decoding=Promise.all([...this.data].map(async([name,data])=>{try{this.buffers.set(name,await this.context.decodeAudioData(data.slice(0)));}catch(e){console.warn(name,e);}}));
  return this.decoding;
 }
 play(name){const b=this.buffers.get(name);if(!b||!this.context)return;const source=this.context.createBufferSource();source.buffer=b;source.connect(this.gain);this.sources.add(source);source.onended=()=>this.sources.delete(source);source.start();}
 shooting(){let n;do{n=Math.floor(Math.random()*3);}while(n===this.lastShot);this.lastShot=n;this.play(`shooting-star-${n+1}`);}
 stop(){for(const s of this.sources)s.stop();this.sources.clear();}
 mute(value){this.muted=value;if(this.gain)this.gain.gain.value=value?0:.65;}
}
