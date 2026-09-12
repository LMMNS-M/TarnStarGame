import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLeaderboard,isRecord,qualifiesForTop} from '../js/leaderboard.js';
test('table vide puis premier record à zéro, égalité et reset administrateur',async()=>{
 let rows=[];const calls=[];
 const board=createLeaderboard({url:'https://tarn.example',key:'public',fetcher:async(url,options)=>{
  calls.push({url,options});
  if(options.method==='POST')rows=[JSON.parse(options.body)];
  return {ok:true,json:async()=>rows};
 }});
 assert.deepEqual(await board.read(),[]);
 assert.equal(isRecord(0,(await board.read())[0]??null),true);
 await board.save(0,'Tarn');
 assert.deepEqual(await board.read(),[{score:0,nickname:'Tarn'}]);
 assert.equal(isRecord(0,(await board.read())[0]),false);
 assert.equal(isRecord(1,(await board.read())[0]),true);
 rows=[];assert.deepEqual(await board.read(),[]);
 assert.ok(calls.every(c=>c.url.startsWith('https://tarn.example/rest/v1/tarn_star_scores')));
 assert.ok(calls.every(c=>c.options.cache==='no-store'));
 assert.ok(calls.every(c=>!c.options.method||c.options.method==='POST'));
});
test('erreur réseau distincte de table vide et sauvegarde refusée',async()=>{
 const board=createLeaderboard({url:'https://tarn.example',key:'public',fetcher:async()=>({ok:false})});
 await assert.rejects(board.read(),/indisponible/);
 await assert.rejects(board.save(1,'Tarn'),/indisponible/);
 await assert.rejects(createLeaderboard({url:'',key:''}).read(),/non configuré/);
});
test('test automatisé isolé et validation des pseudos',async()=>{
 const board=createLeaderboard({memory:true,fetcher:()=>assert.fail('Pas de réseau en mode test')});
 assert.deepEqual(await board.read(),[]);
 await assert.rejects(board.save(0,'   '));
 await assert.rejects(board.save(217,'Tarn'));
 await board.save(0,' Tarn ');
 assert.deepEqual(await board.read(),[{score:0,nickname:'Tarn'}]);
 assert.deepEqual(await createLeaderboard({memory:true}).read(),[]);
});
test('qualification TOP 5',()=>{
 const scores=[9,8,7,6,5].map(score=>({score}));
 assert.equal(qualifiesForTop(4,scores),false);
 assert.equal(qualifiesForTop(5,scores),false);
 assert.equal(qualifiesForTop(6,scores),true);
 assert.equal(qualifiesForTop(0,[]),true);
});
