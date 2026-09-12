import {CONFIG as C} from './config.js';
import {IMAGES, VIDEO} from './assets.js';
import {createTimeline,Score} from './timeline.js';
import {AudioManager} from './audio.js';
import {createLeaderboard,isRecord,qualifiesForTop} from './leaderboard.js';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),testMode=params.has('test');
const testRecords=params.get('test')==='full'?[216,215,214,213,212].map((score,index)=>({score,nickname:`Player${index+1}`})):[];
const leaderboard=createLeaderboard({memory:testMode,records:testRecords});
const NICKNAME_KEY='tarn-star-nickname';
let leaderboardRecords=[],bestRecord=null,leaderboardReady=false,saving=false,scorePending=false,scoreSubmitted=false;
export function art(name){
 const a=IMAGES[name],el=document.createElement('div');el.className='art';const [x,y,r,b]=a.box,w=r-x,h=b-y;
 el.style.aspectRatio=`${w}/${h}`;const img=new Image();img.src=a.src;img.alt='';img.draggable=false;
 Object.assign(img.style,{width:`${a.width/w*100}%`,height:`${a.height/h*100}%`,left:`${-x/w*100}%`,top:`${-y/h*100}%`});el.append(img);return el;
}
for(const el of document.querySelectorAll('[data-art]'))el.append(art(el.dataset.art));
$('game').style.setProperty('--play-area',`${C.PLAY_AREA_RATIO*100}%`);
$('game').style.setProperty('--hitbox-size',`${11*C.HITBOX_SCALE}cqw`);
// The PNG is 15% smaller than its current 87.5% rendering. The hitbox is
// independently based on 140% of the original 11cqw visual reference.
$('game').style.setProperty('--visual-ratio',`${87.5*.85/C.HITBOX_SCALE}%`);
const video=$('background'),audio=new AudioManager();video.src=VIDEO;video.volume=.8;
let state='loading',score=new Score(),timeline=[],cursor=0,active=new Map(),effects=[],epoch=0,goAt=0,endAt=0,lastCount=-1,hurry=false,newRecord=false,recordShown=false,best=0,run=0,width=0,height=0;

$('best-value').textContent=best;
new ResizeObserver(()=>{width=$('game').clientWidth;height=$('playfield').clientHeight;}).observe($('game'));
function bindButton(id,normal,pressed,sound,action){
 const button=$(id),n=art(normal),p=art(pressed);n.classList.add('normal-art');p.classList.add('pressed-art');button.append(n,p);
 button.addEventListener('pointerdown',()=>{if(!button.disabled)button.classList.add('pressed');});
 for(const event of ['pointerup','pointercancel','pointerleave'])button.addEventListener(event,()=>button.classList.remove('pressed'));
 button.addEventListener('click',async()=>{if(button.disabled)return;button.disabled=true;button.classList.add('pressed');try{await action(sound);}finally{button.disabled=false;button.classList.remove('pressed');}});
}
function renderBest(){
 best=bestRecord?.score??0;
 for(const id of ['best-value','end-best-value'])$(id).textContent=best;
 $('best-name').textContent=bestRecord?.nickname??'';$('best-name').hidden=!bestRecord?.nickname;
 const list=$('top-five-list');list.replaceChildren();
 for(let index=0;index<5;index++){
  const entry=leaderboardRecords[index],item=document.createElement('li'),name=document.createElement('span'),value=document.createElement('span');
  name.className='top-name';value.className='top-score';name.textContent=entry?.nickname??'';value.textContent=entry?String(entry.score):'';item.append(name,value);list.append(item);
 }
}
async function refreshBest(){
 try{leaderboardRecords=await leaderboard.read();bestRecord=leaderboardRecords[0]??null;leaderboardReady=true;renderBest();$('leaderboard-status').textContent='';return true;}
 catch(error){leaderboardReady=false;$('leaderboard-status').textContent=error.message;return false;}
}
function syncScore(){$('score').textContent=score.value;renderBest();}
function readNickname(){try{return (localStorage.getItem(NICKNAME_KEY)??'').slice(0,12);}catch{return '';}}
function rememberNickname(nickname){try{localStorage.setItem(NICKNAME_KEY,nickname);}catch{}}
function setScorePending(pending){scorePending=pending;$('record-form').hidden=!pending;$('replay').disabled=pending;}
$('nickname').value=readNickname();
$('record-form').addEventListener('submit',async event=>{
 event.preventDefault();if(saving)return;saving=true;$('save-score').disabled=true;
 try{
  const nickname=$('nickname').value.trim();await leaderboard.save(score.value,nickname);rememberNickname(nickname);scoreSubmitted=true;setScorePending(false);
  await refreshBest();
 }catch(error){$('leaderboard-status').textContent=error.message;}
 finally{saving=false;$('save-score').disabled=false;}
});
$('retry-leaderboard').addEventListener('click',async()=>{
 if(await refreshBest()){
  if(state==='result'){
   setScorePending(!scoreSubmitted&&qualifiesForTop(score.value,leaderboardRecords));
  }
 }
});
function comboBreak(){audio.play('combo-break');$('combo').className='leave';effects.push({until:performance.now()+180,done:()=>{$('combo').hidden=!score.combo;}});}
function reset(){
 scoreSubmitted=false;setScorePending(false);$('nickname').value=readNickname();run++;audio.stop();active.clear();effects=[];$('playfield').replaceChildren();score=new Score();timeline=createTimeline();cursor=0;hurry=false;lastCount=-1;recordShown=false;newRecord=false;
 for(const id of ['end-screen','record','announcement','countdown','combo','resume'])$(id).hidden=true;
 $('combo').className='';$('timer').classList.remove('urgent');$('time-fill').style.transform='scaleX(1)';syncScore();
}
async function start(sound){
 if(saving)return;
 reset();state='starting';$('loading').textContent='';
 // Both media activation calls originate in the button gesture, before awaiting anything.
 const decoded=audio.unlock();video.currentTime=0;video.muted=audio.muted;const play=video.play();
 try{await Promise.all([decoded,play]);}catch{state='ready';video.pause();$('loading').textContent='Tap START to allow video and sound.';return;}
 audio.play(sound);epoch=performance.now();goAt=epoch+3000;state='countdown';$('start-screen').hidden=true;$('veil').classList.add('clear');$('hud').hidden=false;$('timer').hidden=false;$('sound').hidden=false;
}
bindButton('start','start-game-normal','start-game-pressed','button-start',start);
bindButton('replay','replay-normal','replay-pressed','button-replay',start);
$('sound').addEventListener('click',()=>{audio.mute(!audio.muted);video.muted=audio.muted;$('sound').textContent=audio.muted?'♪̸':'♪';$('sound').setAttribute('aria-label',audio.muted?'Unmute sound':'Mute sound');});
function count(n){$('countdown').hidden=false;$('countdown').textContent=n===3?'GO!':String(3-n);$('countdown').className='';void $('countdown').offsetWidth;$('countdown').className='pop';audio.play(n===3?'countown-go':'countdown-beep');}
function warning(event){const node=document.createElement('div');node.className='warning';node.style.left=`${event.x*100}%`;$('playfield').append(node);active.set(event.id,{event,node,falling:false});}
function fall(item){item.node.remove();const node=document.createElement('div');node.className=`star ${item.event.type}`;node.dataset.id=item.event.id;node.append(art(`${item.event.type}-star`));$('playfield').append(node);item.node=node;item.falling=true;audio.shooting();}
function expire(item){item.node.remove();active.delete(item.event.id);audio.play('star-ground-hit');if(score.miss(item.event.type))comboBreak();}
function catchStar(item,now){
 if(state!=='playing'||now>=goAt+C.GAME_DURATION*1000||!item.falling||!active.has(item.event.id))return;
 const elapsed=(now-goAt)/1000;if(elapsed<item.event.at||elapsed>=item.event.at+C.STAR_FALL_DURATION)return;
 active.delete(item.event.id);item.node.remove();const result=score.catch(item.event.type);syncScore();
 audio.play(item.event.type==='red'?'red-star-cach':`${item.event.type}-star-catch`);
 if(result.bonus)audio.play('combo-bonus');if(result.broken)comboBreak();
 if(result.activated){audio.play('combo-activate');$('combo').hidden=false;$('combo').className='enter';}
 const text=document.createElement('div');text.className=`feedback ${item.event.type}`;text.textContent=`${result.delta>0?'+':''}${result.delta}`;text.style.left=`${item.event.x*100}%`;text.style.top=`${item.y}px`;$('playfield').append(text);effects.push({until:now+500,done:()=>text.remove()});
}
$('playfield').addEventListener('pointerdown',event=>{
 event.preventDefault();const bounds=$('playfield').getBoundingClientRect();if(event.clientY<bounds.top||event.clientY>=bounds.bottom)return;
 const node=event.target.closest('.star');if(!node)return;const item=active.get(Number(node.dataset.id));if(item)catchStar(item,performance.now());
});
function announce(kind){$('announcement').replaceChildren(art(kind==='hurry'?'hurry-up':'time-up'));$('announcement').className='';$('announcement').setAttribute('aria-label',kind==='hurry'?'HURRY UP!':'TIME UP!');$('announcement').hidden=false;}
function finish(){state='ending';endAt=goAt+C.GAME_DURATION*1000;for(const item of active.values())item.node.remove();active.clear();$('countdown').hidden=true;$('time-fill').style.transform='scaleX(0)';announce('time');audio.play('time-up');newRecord=leaderboardReady&&isRecord(score.value,bestRecord);setScorePending(leaderboardReady&&qualifiesForTop(score.value,leaderboardRecords));}
function showResult(){state='result';$('hud').hidden=true;$('timer').hidden=true;$('announcement').hidden=true;$('final-score').textContent=score.value;$('end-best-value').textContent=best;$('end-screen').hidden=false;audio.play('end-screen');}
function tick(now){
 effects=effects.filter(e=>{if(now>=e.until){e.done();return false;}return true;});
 if(state==='countdown'){
  const n=Math.min(3,Math.floor((now-epoch)/1000));if(n!==lastCount){lastCount=n;count(n);}if(now>=goAt)state='playing';
 }
 if(state==='playing'){
  const elapsed=(now-goAt)/1000;
  if(elapsed>=C.GAME_DURATION)finish();else{
   if(elapsed>.7)$('countdown').hidden=true;
   $('time-fill').style.transform=`scaleX(${1-elapsed/C.GAME_DURATION})`;$('timer').setAttribute('aria-valuenow',String(Math.ceil(C.GAME_DURATION-elapsed)));
   if(elapsed>=C.HURRY_UP_AT&&!hurry){hurry=true;announce('hurry');audio.play('hurry-up');$('timer').classList.add('urgent');}
   if(hurry&&elapsed>=C.HURRY_UP_AT+1.4)$('announcement').hidden=true;
   while(cursor<timeline.length&&elapsed>=timeline[cursor].at-C.WARNING_DURATION)warning(timeline[cursor++]);
   for(const item of active.values()){
    const age=elapsed-item.event.at;
    if(age>=C.STAR_FALL_DURATION){expire(item);continue;}
    if(age>=0){if(!item.falling)fall(item);const p=age/C.STAR_FALL_DURATION,size=width*.11*C.HITBOX_SCALE;item.y=height*.05+(height-height*.05-size*.42)*p;item.node.style.transform=`translate(${item.event.x*width-size/2}px,${item.y-size/2}px) scale(${1-.17*p})`;item.node.firstChild.style.transform=`rotate(${item.event.rotation*p}deg)`;}
   }
  }
 }
 if(state==='ending'&&now>=endAt+1250)showResult();
 if(state==='result'&&newRecord&&!recordShown&&now>=endAt+1850){recordShown=true;$('record').hidden=false;audio.play('new-best-score');}
 requestAnimationFrame(tick);
}
// A backgrounded tab consumes real time, avoiding a paused-clock exploit. Audio is silenced while hidden.
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.context?.suspend();video.pause();}else if(['countdown','playing','ending','result'].includes(state)){
 const target=Math.min((performance.now()-epoch)/1000,Number.isFinite(video.duration)?video.duration:Infinity);video.currentTime=target;
 if(target<video.duration)video.play().catch(()=>{$('resume').hidden=false;});audio.context?.resume().catch(()=>{$('resume').hidden=false;});
}});
$('resume').addEventListener('click',()=>{audio.unlock();video.play().then(()=>{$('resume').hidden=true;}).catch(()=>{});});
async function init(){
 const images=Object.values(IMAGES).map(a=>new Promise(resolve=>{const img=new Image();img.onload=resolve;img.onerror=()=>{$('loading').textContent='Image unavailable: '+a.src;resolve();};img.src=a.src;}));
 const ready=new Promise(resolve=>{if(video.readyState>=2)resolve();else video.addEventListener('loadeddata',resolve,{once:true});});
 video.addEventListener('error',()=>{$('loading').textContent='Video unavailable. Open the game through the local server described in README.';});
 await Promise.all([ready,audio.preload(),refreshBest(),...images]);video.pause();state='ready';$('loading').textContent='';$('start').disabled=false;
}
requestAnimationFrame(tick);init();
// Read-only diagnostics for integration checks, with no way to alter game time or score.
export async function startStarsGame(){
 if(state==='loading'||state==='starting'||state==='countdown'||state==='playing')return false;
 await start('button-start');
 return state==='countdown';
}
window.startStarsGame=startStarsGame;
window.tarnStarGame={
 start:startStarsGame,
 snapshot:()=>({state,score:score.value,combo:score.combo,best,run,planned:timeline.map(e=>({...e})),active:active.size,elapsed:goAt?(performance.now()-goAt)/1000:0})
};
