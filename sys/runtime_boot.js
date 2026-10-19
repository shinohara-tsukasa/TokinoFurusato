const DEMO2_DAT_FILES = ["0.dat", "1.dat", "4.dat", "5.dat", "10.dat", "11.dat", "12.dat", "13.dat", "14.dat", "20.dat", "21.dat", "22.dat", "23.dat", "24.dat", "25.dat", "26.dat", "30.dat", "31.dat", "32.dat", "33.dat", "50.dat", "62.dat", "63.dat", "90.dat", "91.dat", "92.dat", "93.dat", "94.dat", "95.dat", "96.dat", "97.dat", "98.dat"];
(function(){"use strict";
const loading=document.getElementById("loading"),loadingText=document.getElementById("loading-text");
const params=new URLSearchParams(location.search),launchMode=params.get("mode")||"new";
let titleLoadMode=false;
function exposeLegacyElements(){
 for(let i=0;i<=9;i++)window["LAYER"+i]=document.getElementById("LAYER"+i);
 for(const id of ["CONSOLE","PF2Win","PF3Win","PF4Win","PF6Win","SE","SDISP","LDISP","CFG1","CFG2","CFG3","CFG4","CFG5","CFG6","CFG7"])window[id]=document.getElementById(id);
}
function resetNewGameState(){
 replay=false;for(let i=0;i<=95;i++)flg[i]=0;for(let i=0;i<=19;i++)reg[i]=0;if(sflag.charAt(18)==="1")flg[80]=1;
 SV_Page=0;SV_Line=0;for(let i=0;i<=3;i++)SV_Lay[i]="";SV_Text="";SV_Name="";SV_Mus="";SV_SE="off";SV_Hist="";
 nowctrl=false;sts_skip=false;sts_force_skip=false;sts_movie=false;sts_mode="";HideAll();Redraw(true);LoadChapter();Decode_Script();
}
function resetEndingViewState(index){
 index=Number(index);
 replay=true;
 for(let i=0;i<=95;i++)flg[i]=0;
 for(let i=0;i<=19;i++)reg[i]=0;
 flg[50+index]=1;
 SV_Page=62;SV_Line=0;
 for(let i=0;i<=3;i++)SV_Lay[i]="";
 SV_Text="";SV_Name="";SV_Mus="";SV_SE="off";SV_Hist="";
 nowctrl=false;sts_skip=false;sts_force_skip=false;sts_movie=false;sts_mode="";
 HideAll();Redraw(true);LoadChapter();Decode_Script();
}
function resetOmakeState(forcedEndingCode=null){
 // Exact modern equivalent of original title.js TMenu_omake().
 replay=true;

 for(let i=0;i<=95;i++)flg[i]=0;
 for(let i=0;i<=19;i++)reg[i]=0;

 let endingCode;
 if(forcedEndingCode!==null){
   endingCode=Number(forcedEndingCode);
 }else{
   const savedFlag=cload("FLAG") || "";
   endingCode=parseInt(savedFlag.substr(16,2),10);
 }

 const validEndingCodes=new Set([
   70,71,72,73,74,75,
   80,81,82,83,84,85,86,
   90,91,92,93,94
 ]);

 if(!validEndingCodes.has(endingCode)){
   console.error("Omake: invalid or missing last ending code:", endingCode);
   Demo3SetStatus("おまけ: 直前エンディング情報がありません");
   window.parent.postMessage({type:"tokifuru-demo3-return-title"},location.origin);
   return;
 }

 // Original:
 //   a0=cload("FLAG");
 //   a1=parseInt(a0.substr(16,2),10);
 //   flg[a1]=1;
 flg[endingCode]=1;

 SV_Page=63;
 SV_Line=0;
 for(let i=0;i<=3;i++)SV_Lay[i]="";
 SV_Text="";
 SV_Name="";
 SV_Mus="";
 SV_SE="off";
 SV_Hist="";

 nowctrl=false;
 sts_skip=false;
 sts_force_skip=false;
 sts_movie=false;
 sts_mode="";

 HideAll();
 Redraw(true);
 LoadChapter();
 Decode_Script();
}
function showTitleLoad(){
 titleLoadMode=true;replay=false;HideAll();
 WriteLayer(0,"<img src='../bg/tback.jpg' width='640' height='480'>");ShowLayer(0);
 WriteLayer(1,"<table border='0' width='640' height='480'><tr><td align='center' valign='top'><img src='blank.gif' width='1' height='78'><br><img src='title.gif'></td></tr></table>");ShowLayer(1);
 sts_mode="tload";PF3Win.style.visibility="visible";Demo3RefreshSlotState();
}
// v5.6.22: hidden "攻略ジャンプ" (index.html, title: hold J + P).
// Same path as title -> 続きから -> slot: showTitleLoad() then Loadit(), with
// Loadit() reading the walkthrough save point instead of a save slot.
function loadGuidePreset(id){
 const preset=(window.TOKIFURU_GUIDE_PRESETS||[]).find(p=>p.id===id);
 if(!preset){
  Demo3SetStatus("攻略ジャンプ: 地点 "+id+" がありません");
  window.parent.postMessage({type:"tokifuru-demo3-return-title"},location.origin);
  return;
 }
 showTitleLoad();
 const legacyCload=window.cload;
 window.cload=section=>section.startsWith("saveP_")?String(preset.save[section.slice(6)]??""):legacyCload(section);
 try{Loadit("P");}finally{window.cload=legacyCload;}
 Demo3SetStatus("攻略ジャンプ "+preset.no+" "+preset.scene);
}
function installOverrides(){
 window.PF5=function(){window.open("../web/help/indexhlp.htm","THELP","width=800,height=650,scrollbars=yes,resizable=yes");};
 window.CheckMenu=function(ev){
   MUS_UnlockAudio(); if(sts_mode!=="text")return; const e=ev||window.event;
   if(e){const r=document.getElementById("runtime-stage").getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(x>=285&&x<=364&&y>=450&&y<=479){ExecSysMenu();return;}}
   Decode_Script();
 };
 // v5.6.21: the text-mode click area calls Message_Off() on mouse-out. When an
 // ending roll starts straight from a text line (33.dat -> ED 13) and the mouse
 // moves, that stale mouse-out switched sts_mode from "ending" to "hide", so
 // keys no longer ended the roll and could advance the hidden scenario.
 const legacyMessageOff=window.Message_Off;
 window.Message_Off=function(){if(sts_mode==="ending")return;return legacyMessageOff.apply(this,arguments);};
 const legacyPF3Off=window.PF3Off;
 window.PF3Off=function(){if(sts_mode==="tload"||titleLoadMode&&sts_mode!=="load"){PF3Win.style.visibility="hidden";MUS_StopAllImmediate();window.parent.postMessage({type:"tokifuru-demo3-return-title"},location.origin);return;}legacyPF3Off();titleLoadMode=false;};
 window.Title=function(){clearTimeout(TID);sts_skip=false;sts_force_skip=false;KidSave();SaveConfig();cwrite(0);MUS_StopAllImmediate();
   // v5.6.18: an ending roll passes its final colour so the title fades in from it.
   const base=window.Demo5TitleReturnBase||"";window.Demo5TitleReturnBase="";
   window.parent.postMessage({type:"tokifuru-demo3-return-title",base},location.origin);};
}
function keyNumber(ev){
 // v5.6.21: only the digit keys (main row or NumLock-on keypad) are numbers.
 // Previously every non-digit key returned 0, so Enter/arrows/Shift/Esc were
 // taken as the "0" key (advance / close) before their own handling.
 return /^[0-9]$/.test(ev.key)?Number(ev.key):-1;
}

function isHistoryKey(ev){
 return ev.key==="ArrowLeft" || ev.key==="+" || ev.code==="NumpadAdd";
}

function handleContextMenu(ev){
 // Original HTA: oncontextmenu="context();return false"
 ev.preventDefault();
 MUS_UnlockAudio();

 switch(sts_mode){
  case "ending":
   break;
  case "save":
   PF2Off();
   break;
  case "tload":
  case "load":
   PF3Off();
   break;
  case "exit":
   PF6Off();
   break;
  case "config":
   PF4Off();
   break;
  case "hist":
   PF7Off();
   break;
  case "text":
  case "branch":
   RHide();
   break;
  case "rhide":
   RShow();
   break;
  case "sysmenu":
   CloseSysMenu();
   break;
  default:
   break;
 }
}

// WheelEvent.deltaY is the opposite sign of old IE event.wheelDelta:
//   deltaY < 0 == wheel up   == old wheelDelta +120
//   deltaY > 0 == wheel down == old wheelDelta -120
let demo3WheelAccumulator=0;
let demo3LastWheelAction=0;

function handleWheel(ev){
 MUS_UnlockAudio();

 const relevant = ["console","text","branch","hide","rhide","hist"].includes(sts_mode);
 if(!relevant) return;

 // Prevent the browser/page itself from scrolling.
 ev.preventDefault();

 let dy=ev.deltaY;
 if(ev.deltaMode===1) dy*=16;
 if(ev.deltaMode===2) dy*=480;
 if(!dy) return;

 // A physical mouse wheel normally gives one large event per notch, while
 // precision touchpads emit many tiny events. Accumulate small deltas so one
 // gesture does not advance several lines at once.
 demo3WheelAccumulator+=dy;
 const now=performance.now();
 const threshold=Math.abs(dy)>=40 ? Math.abs(dy) : 50;
 if(Math.abs(demo3WheelAccumulator)<threshold) return;

 const down=demo3WheelAccumulator>0;
 demo3WheelAccumulator=0;

 // Debounce only commands that change the story state.
 if(sts_mode!=="hist" && now-demo3LastWheelAction<90) return;
 demo3LastWheelAction=now;

 switch(sts_mode){
  case "console":
   Console_Off();
   // Original code falls through into text handling.
   if(down) Decode_Script();
   else PF7();
   break;

  case "text":
   if(down) Decode_Script();
   else PF7();
   break;

  case "branch":
   // The original only opens history on wheel-up while a choice is visible.
   if(!down) PF7();
   break;

  case "hide":
   Message_On();
   break;

  case "rhide":
   RShow();
   break;

  case "hist":
   // Original PF7Move step is exactly 32 px per wheel notch.
   PF7Move(down ? 32 : -32);
   break;
 }
}

function stopCtrlFast(){
 if(!nowctrl)return;
 nowctrl=false;
 // Do not let the pending 100 ms Ctrl advance show one more line.
 if(!AUTSW)clearTimeout(TID);
}

function handleKeys(ev){
 MUS_UnlockAudio();

 // v5.6.21: keep keyboard focus and the page inside the game. Tab would move
 // focus out of the game frame; F5 / Ctrl+R would reload the whole game page.
 // (Before v5.6.21 these keys were swallowed in text mode as the "0" key.)
 if(ev.key==="Tab"||ev.key==="F5"||((ev.ctrlKey||ev.metaKey)&&(ev.key==="r"||ev.key==="R"))){
  ev.preventDefault();
  return;
 }

 if(ev.key==="Enter"){
  // A held Enter must not restart skipping after reaching a choice, nor
  // close an ending/menu reached by the original key press.
  if(ev.repeat){
   ev.preventDefault();
   return;
  }
  if(!loading.hidden){
   ev.preventDefault();
   return;
  }
  const storyMode=sts_mode==="text"||sts_mode==="console"||
      sts_mode==="hide"||sts_mode==="movie"||
      (sts_mode==="rhide"&&pre_mode==="text");
  if(storyMode){
   ev.preventDefault();
   PF1(true);
   return;
  }
  if(sts_mode==="branch"||(sts_mode==="rhide"&&pre_mode==="branch")){
   ev.preventDefault();
   return;
  }
 }

 if(ev.key==="F1"){
  ev.preventDefault();
  PF5();
  return;
 }

 if(sts_mode==="ending"){
  ev.preventDefault();
  // A key held from before the roll (e.g. Ctrl fast display) must not end it.
  if(!ev.repeat) Demo5EndingInput();
  return;
 }

 if(sts_mode==="movie"){
  ev.preventDefault();
  StopMovie();
  return;
 }

 // v5.6.21: original Ctrl = fast message display (and movie skip, above).
 // While held, Decode_Script() itself re-runs every 100 ms on already-read
 // text (or on any text when unread-stop is OFF) and image fades are instant.
 if(ev.key==="Control"){
  if(ev.repeat||nowctrl||!loading.hidden) return;
  nowctrl=true;
  if(sts_mode==="hide"){Message_On();return;}
  if(sts_mode==="rhide"){RShow();return;}
  if(sts_mode==="text"||sts_mode==="console"){
   if(sts_mode==="console") Console_Off();
   Decode_Script();
  }
  return;
 }

 const n=keyNumber(ev);

 if(sts_mode==="save"){
  if(n>=1&&n<=9){
   ev.preventDefault();
   Saveit(n);
  }else if(n===0||ev.key==="Escape"){
   ev.preventDefault();
   PF2Off();
  }
  return;
 }

 if(sts_mode==="load"||sts_mode==="tload"){
  if(n>=1&&n<=9){
   ev.preventDefault();
   Loadit(n);
  }else if(n===0||ev.key==="Escape"){
   ev.preventDefault();
   PF3Off();
  }
  return;
 }

 if(sts_mode==="config"){
  if(n>=1&&n<=7){
   ev.preventDefault();
   PF4CH(n);
  }else if(n===0||ev.key==="Escape"){
   ev.preventDefault();
   PF4Off();
  }
  return;
 }

 if(sts_mode==="sysmenu"){
  if(n>=1&&n<=7){
   ev.preventDefault();
   pick(n);
  }else if(ev.key==="Escape"||n===0){
   ev.preventDefault();
   CloseSysMenu();
  }
  return;
 }

 if(sts_mode==="branch"){
  if(n>=1&&n<=bnum){
   ev.preventDefault();
   pick(n);
   return;
  }
  if(isHistoryKey(ev)){
   ev.preventDefault();
   PF7();
   return;
  }
  if(ev.key===" "||ev.key==="ArrowUp"||ev.code==="NumpadDecimal"){
   ev.preventDefault();
   RHide();
  }
  return;
 }

 if(sts_mode==="hist"){
  if(ev.key==="Escape"||n===0||ev.key==="+"||ev.code==="NumpadAdd"){
   ev.preventDefault();
   PF7Off();
  }else if(ev.key==="ArrowDown"){
   ev.preventDefault();
   PF7Move(32);
  }else if(ev.key==="ArrowUp"){
   ev.preventDefault();
   PF7Move(-32);
  }else if(ev.key==="PageDown"){
   ev.preventDefault();
   PF7Move(240);
  }else if(ev.key==="PageUp"){
   ev.preventDefault();
   PF7Move(-240);
  }
  return;
 }

 if(sts_mode==="rhide"){
  ev.preventDefault();
  RShow();
  return;
 }

 if(sts_mode==="exit"){
  if(ev.key==="Escape"||n===0){
   ev.preventDefault();
   PF6Off();
  }else if(ev.key==="Enter"){
   ev.preventDefault();
   Title();
  }
  return;
 }

 if(sts_mode==="hide"){
  // Original keyboard input while message is hidden brings it back.
  ev.preventDefault();
  Message_On();
  return;
 }

 if(sts_mode==="text"||sts_mode==="console"){
  if(n===5){
   ev.preventDefault(); ExecSysMenu(); return;
  }
  if(n===7){
   ev.preventDefault(); PF2(); return;
  }
  if(n===8){
   ev.preventDefault(); PF3(); return;
  }
  if(n===6){
   ev.preventDefault(); PF4(); return;
  }
  if(n===9){
   ev.preventDefault(); PF6(); return;
  }

  if(isHistoryKey(ev)){
   ev.preventDefault();
   PF7();
   return;
  }

  // Original: Space / Up / numpad decimal temporarily hide the message.
  if(ev.key===" "||ev.key==="ArrowUp"||ev.code==="NumpadDecimal"){
   ev.preventDefault();
   RHide();
   return;
  }

  // Original: 0 / Right advances. Enter is handled above as forced skip.
  if(n===0||ev.key==="ArrowRight"){
   ev.preventDefault();
   if(sts_mode==="console") Console_Off();
   Decode_Script();
   return;
  }

  // Keep Down on the original skip policy; Enter uses PF1(true) above.
  if(ev.key==="ArrowDown"){
   ev.preventDefault();
   PF1();
   return;
  }
 }
}
async function bootDemo5(){
 exposeLegacyElements();window.IE9=true;InitMusic();Demo3InitLegacyState();installOverrides();
 NEKO=params.get("neko")==="1";
 try{
  await Demo2PreloadScenarios(DEMO2_DAT_FILES,(done,total,filename)=>loadingText.textContent=`シナリオ読込中… ${done}/${total}  ${filename}`);
  await Demo4PreloadEvents((done,total,filename)=>loadingText.textContent=`イベントSWF読込中… ${done}/${total}  ${filename}`);
  loadingText.textContent="原作シナリオ＋イベントエンジンを起動しています…";Demo3RefreshSlotState();

  // Process the first real game state while the black loading curtain is
  // still covering the stage. For a new game this reaches:
  //   bg 17 -> #m 00 -> #p 03 -> first message
  // before the player sees anything.
  if(launchMode==="load"){
    showTitleLoad();
  }else if(launchMode.startsWith("preset:")){
    loadGuidePreset(launchMode.slice(7));
  }else if(launchMode==="omake"){
    resetOmakeState();
  }else if(launchMode.startsWith("omake-test:")){
    const endingCode=parseInt(launchMode.split(":")[1],10);
    resetOmakeState(endingCode);
  }else if(launchMode.startsWith("endingview:")){
    const endingIndex=parseInt(launchMode.split(":")[1],10);
    resetEndingViewState(endingIndex);
  }else{
    resetNewGameState();
  }

  // Give layout/compositing two animation frames to settle while the
  // opaque black curtain is still covering the stage.
  await new Promise(resolve =>
      requestAnimationFrame(() =>
          requestAnimationFrame(resolve)
      )
  );

  // Fade from black into the already-rendered first game background.
  // New-game startup has already executed #p 03, so the train ambience
  // continues naturally while the carriage fades into view.
  await new Promise(resolve => {
      let finished=false;
      const finish=()=>{
          if(finished)return;
          finished=true;
          loading.removeEventListener("transitionend",onEnd);
          resolve();
      };
      const onEnd=ev=>{
          if(ev.target===loading && ev.propertyName==="opacity") finish();
      };
      loading.addEventListener("transitionend",onEnd);
      loading.classList.add("reveal");
      setTimeout(finish,750);
  });

  loading.hidden=true;
  loading.classList.remove("reveal");
  document.getElementById("runtime-stage").focus({preventScroll:true});
  Demo3SetStatus(DEMO3_STORAGE_OK?"セーブ保存: localStorage":"セーブ保存: メモリのみ");
 }catch(err){console.error(err);loading.classList.add("error");loadingText.textContent="Demo 5 起動エラー: "+(err&&err.message?err.message:err);}
}
document.getElementById("movie-skip-catcher").addEventListener("click",()=>{MUS_UnlockAudio();StopMovie();});
document.getElementById("ending-click").addEventListener("click",()=>{MUS_UnlockAudio();Demo5EndingInput();});
document.addEventListener("pointerdown",MUS_UnlockAudio,{capture:true});
document.addEventListener("keydown",handleKeys);
document.addEventListener("keyup",ev=>{if(ev.key==="Control")stopCtrlFast();});
window.addEventListener("blur",stopCtrlFast);
document.addEventListener("wheel",handleWheel,{capture:true,passive:false});
document.addEventListener("contextmenu",handleContextMenu,{capture:true});
bootDemo5();
})();
