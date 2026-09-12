import {AudioManager} from '../js/audio.js';
const panel=document.createElement('pre');panel.id='test-report';Object.assign(panel.style,{position:'fixed',top:'0',left:'0',fontSize:'11px',background:'#000d',color:'#bfffc8',zIndex:100,pointerEvents:'none',maxWidth:'240px',whiteSpace:'pre-wrap'});document.body.append(panel);
const checks=[],sounds=[],errors=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
const original=AudioManager.prototype.play;AudioManager.prototype.play=function(name){sounds.push({name,at:performance.now()});return original.call(this,name);};
const check=(name,ok)=>{checks.push({name,ok:!!ok});panel.textContent=checks.map(c=>`${c.ok?'✓':'✗'} ${c.name}`).join('\n');};
let round=0,previousState='',firstPlan='',firstScore=0,firstBest=0,startingBest=0,seen=new Set(),doubleChecked=false,singleChecked=false,freezeScore=0,finished=false;
function tap(node,id){const r=node.getBoundingClientRect();node.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:id,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));}
function loop(){
 if(finished)return;
 const s=window.tarnStarGame?.snapshot();if(!s){requestAnimationFrame(loop);return;}
 if(s.state==='countdown'&&previousState!==s.state){
  round++;startingBest=s.best;seen=new Set();check(`Round ${round}: clean reset`,s.score===0&&!s.combo&&s.active===0);
  if(round===1)firstPlan=JSON.stringify(s.planned);else {check('Replay keeps the record',s.best===firstBest);check('Replay randomizes the timeline',JSON.stringify(s.planned)!==firstPlan);}
  check(`Round ${round}: 60/8/12 pool`,s.planned.length===80&&s.planned.filter(e=>e.type==='white').length===60&&s.planned.filter(e=>e.type==='gold').length===8&&s.planned.filter(e=>e.type==='red').length===12);
  check('Start interface is exposed',typeof window.startStarsGame==='function'&&window.tarnStarGame.start===window.startStarsGame);
  const final=s.planned.filter(e=>e.at>=45);
  const starts=[...new Set(final.map(e=>e.at))];
  const rainOk=final[0].at>=45.6&&final.every(e=>final.filter(x=>x.at<=e.at&&e.at-x.at<1).length<=4)&&starts.every(at=>{const positives=final.filter(e=>e.at===at&&e.type!=='red');if(positives.length>2)return false;if(positives.length<2)return true;const next=final.find(e=>e.at>at&&e.type!=='red');return !next||next.at-at>=.4;});
  check(`Round ${round}: constrained final rain`,rainOk);
 }
 if(s.state==='playing'){
  const visible=[...document.querySelectorAll('.star')].filter(n=>!n.classList.contains('red'));
  const nodes=visible.filter(n=>s.elapsed-s.planned.find(e=>e.id===Number(n.dataset.id)).at>=.72);
  if(!seen.has('geometry')&&visible.length){
   seen.add('geometry');const star=visible[0],png=star.firstChild,w=document.querySelector('#game').clientWidth;
   check('140% hitbox, PNG reduced 15%',Math.abs(parseFloat(getComputedStyle(star).width)/w-.154)<.001&&Math.abs(parseFloat(getComputedStyle(png).width)/parseFloat(getComputedStyle(star).width)-.875*.85/1.4)<.002);
   check('Slightly extended trail',Math.abs(parseFloat(getComputedStyle(star,'::before').height)/w-.42)<.001&&getComputedStyle(star,'::before').opacity==='0.58');
   check('Counters reduced 25%',Math.abs(document.querySelector('#wishes').offsetWidth/w-.24)<.003&&Math.abs(document.querySelector('#best').offsetWidth/w-.21)<.003);
  }
  if(s.combo&&!seen.has('combo-animation')){
   seen.add('combo-animation');const el=document.querySelector('#combo');
   check('Final combo reduced 50%, 0.9s animation',Math.abs(el.offsetWidth/document.querySelector('#game').clientWidth-.1472)<.003&&getComputedStyle(el).animationDuration==='0.9s');
  }
  // Capture two different pointer IDs in the same task; repeated pointer must not score twice.
  if(visible.length>=2&&!doubleChecked){const before=s.score;tap(visible[0],11);const one=window.tarnStarGame.snapshot().score;tap(visible[1],12);const two=window.tarnStarGame.snapshot().score;check('Two simultaneous pointers',one>before&&two>one);doubleChecked=true;}
  for(const node of nodes){if(!node.isConnected)continue;tap(node,21);if(!singleChecked){const value=window.tarnStarGame.snapshot().score;tap(node,21);check('A star is never counted twice',window.tarnStarGame.snapshot().score===value);singleChecked=true;}}
  // Observe the timer committed by the game frame, not a later performance.now() sample.
  if(Number(document.querySelector('#timer').getAttribute('aria-valuenow'))<=15&&!seen.has('hurry')){seen.add('hurry');check(`Round ${round}: Hurry at 45s`,document.querySelector('#announcement').getAttribute('aria-label')==='HURRY UP!'&&document.querySelector('#announcement img')?.getAttribute('src')==='assets/images/hud/hurry-up.png');}
  if(s.score<0&&!seen.has('negative')){seen.add('negative');check('Score never goes below zero',false);}
 }
 if(s.state==='ending'&&previousState!==s.state){freezeScore=s.score;check(`Round ${round}: ends at 60s`,s.elapsed>=60&&s.elapsed<60.2);check('Stars are removed',s.active===0&&document.querySelectorAll('.star').length===0);const v=document.querySelector('video');check('Video continues after TIME UP',!v.paused&&!v.ended);}
 if(s.state==='result'&&s.elapsed>62&&previousState!=='checked-result'){
  check(`Round ${round}: score is frozen`,s.score===freezeScore);check('Final score is displayed',Number(document.querySelector('#final-score').textContent)===s.score);
  const beeps=sounds.filter(x=>x.name==='countdown-beep');check(`Round ${round}: three beeps`,beeps.length===round*3);const b=beeps.slice(-3);check('Beeps are spaced about 1s apart',b.length===3&&b.slice(1).every((v,i)=>Math.abs(v.at-b[i].at-1000)<100));check('GO plays once',sounds.filter(x=>x.name==='countown-go').length===round);check('Bonus audio overlaps correctly',sounds.some((v,i)=>v.name==='combo-bonus'&&v.at-sounds[i-1].at<20));
  check('New best is conditional',document.querySelector('#record').hidden===(s.score<=startingBest));
  check('TOP 5 always has five rows',document.querySelectorAll('#top-five-list li').length===5);
  check('TOP 5 uses separate name and score fields',document.querySelectorAll('#top-five-list .top-name').length===5&&document.querySelectorAll('#top-five-list .top-score').length===5);
  check('Final best nickname is not duplicated',!document.querySelector('#end-best-name'));
  check('NEXT is absent',!document.querySelector('#next'));
  if(!document.querySelector('#record-form').hidden&&!seen.has('saving')){check('Replay is locked before saving',document.querySelector('#replay').disabled);if(round===2)check('Nickname is prefilled after a save',document.querySelector('#nickname').value==='Test1');seen.add('saving');document.querySelector('#nickname').value=`Test${round}`;document.querySelector('#record-form').requestSubmit();requestAnimationFrame(loop);return;}
  if(seen.has('saving')&&!document.querySelector('#record-form').hidden){requestAnimationFrame(loop);return;}
  if(seen.has('saving'))check('Replay unlocks after saving',!document.querySelector('#replay').disabled);
  else check('A non-qualifying score needs no nickname',!document.querySelector('#replay').disabled);
  if(round===1){firstScore=s.score;firstBest=s.best;previousState='checked-result';document.querySelector('#replay').click();requestAnimationFrame(loop);return;}
  check('No JavaScript errors',errors.length===0);
  setTimeout(()=>{
   check('Two full rounds',round===2);finished=true;panel.dataset.complete='true';panel.dataset.passed=String(checks.every(c=>c.ok));window.browserTestReport={checks,errors,sounds,final:s};
  },0);return;
 }
 previousState=s.state;requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
