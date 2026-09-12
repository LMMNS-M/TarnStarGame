import {SUPABASE} from './supabase-config.js';
export const isRecord=(score,record)=>record===null||score>record.score;
export const qualifiesForTop=(score,records,limit=5)=>records.length<limit||score>records.at(limit-1).score;
export function createLeaderboard({url=SUPABASE.URL,key=SUPABASE.PUBLIC_KEY,fetcher=globalThis.fetch,memory=false,records=[]}={}){
 let local=records.map(record=>({...record}));
 async function request(query,options={}){
  if(!url||!key)throw new Error('Leaderboard is not configured. See SUPABASE_SETUP.md.');
  const response=await fetcher(`${url.replace(/\/$/,'')}/rest/v1/tarn_star_scores${query}`,{
   ...options,cache:'no-store',signal:AbortSignal.timeout(8000),headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{ }),'Content-Type':'application/json',...options.headers}
  });
  if(!response.ok)throw new Error('Leaderboard unavailable. Please try again.');
  return options.method==='POST'?null:response.json();
 }
 return {
  async read(){if(memory)return local.map(record=>({...record}));return request('?select=score,nickname&order=score.desc,created_at.asc,id.asc&limit=5');},
  async save(score,nickname){
   nickname=nickname.trim();
   if(!Number.isInteger(score)||score<0||score>216||nickname.length<1||nickname.length>12)throw new Error('Enter a nickname between 1 and 12 characters.');
   if(memory){local.push({score,nickname});local.sort((a,b)=>b.score-a.score);local=local.slice(0,5);return;}
   await request('',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({score,nickname})});
  }
 };
}
