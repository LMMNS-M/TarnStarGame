import {SUPABASE} from './supabase-config.js';
export const isRecord=(score,record)=>record===null||score>record.score;
export const qualifiesForTop=(score,records,limit=5)=>records.length<limit||score>records.at(limit-1).score;
export function createLeaderboard({url=SUPABASE.URL,key=SUPABASE.PUBLIC_KEY,fetcher=globalThis.fetch,memory=false}={}){
 let local=null;
 async function request(query,options={}){
  if(!url||!key)throw new Error('Classement non configuré. Voir SUPABASE_SETUP.md.');
  const response=await fetcher(`${url.replace(/\/$/,'')}/rest/v1/tarn_star_scores${query}`,{
   ...options,cache:'no-store',signal:AbortSignal.timeout(8000),headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{ }),'Content-Type':'application/json',...options.headers}
  });
  if(!response.ok)throw new Error('Classement indisponible. Réessayez.');
  return options.method==='POST'?null:response.json();
 }
 return {
  async read(){if(memory)return local?[local]:[];return request('?select=score,nickname&order=score.desc,created_at.asc,id.asc&limit=5');},
  async save(score,nickname){
   nickname=nickname.trim();
   if(!Number.isInteger(score)||score<0||score>216||nickname.length<1||nickname.length>24)throw new Error('Choisissez un pseudo de 1 à 24 caractères.');
   if(memory){if(isRecord(score,local))local={score,nickname};return;}
   await request('',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({score,nickname})});
  }
 };
}
