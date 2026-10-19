// Demo 3: compatibility layer beneath the original scenario interpreter.
function Demo2Layer(num){return document.getElementById("LAYER"+num);}
function WriteLayer(lyr,str){
    if(!sts_skip){
        if(lyr===0)Demo3BackgroundBlend.write(str||"");
        else if(lyr>=1&&lyr<=3)Demo3PortraitBlend.write(lyr,str||"");
        else Demo2Layer(lyr).innerHTML=str||"";
    }
    if(lyr>=0&&lyr<=3)SV_Lay[lyr]=str||"";
}
function HideAll(){Demo3PortraitBlend.finishAll();for(let i=0;i<=9;i++)Demo2Layer(i).style.visibility="hidden";}
function HideLayer(lyr){if(!sts_skip)Demo2Layer(lyr).style.visibility="hidden";}
function ShowLayer(lyr){if(!sts_skip)Demo2Layer(lyr).style.visibility="visible";}
function MoveLayer(lyr,x,y){const el=Demo2Layer(lyr);el.style.left=Number(x)+"px";el.style.top=Number(y)+"px";}
function SetImage(pos,filename){
    const spcg=[61,41,42,51,43,50,46,49,48,83,200,201,203,205,208];let d="",fn="";
    if(pos===0){for(let i=0;i<spcg.length;i++)if(filename==spcg[i]){sfset(i);break;}}
    filename=String(filename);if(filename.indexOf("off")!==-1)filename="0000";
    if(pos===0){fn="../bg/"+filename+".jpg";d="<img src='"+fn+"' width='640' height='480' draggable='false'>";}
    if(pos>=1&&pos<=3){fn="../chr/"+filename+".png";const al=pos===1?"left":pos===2?"right":"center";d="<table border='0' width='640' height='480' cellspacing='0' cellpadding='0'><tr><td align='"+al+"' valign='bottom'><img src='"+fn+"' width='360' height='480' draggable='false'></td></tr></table>";}
    WriteLayer(pos,d);ShowLayer(pos);
}
function Demo3FinishImageBlends(){Demo3BackgroundBlend.finish();Demo3PortraitBlend.finishAll();for(let i=0;i<=3;i++){const el=Demo2Layer(i);el.dataset.blendSeconds="0";el.style.transition="none";el.style.opacity="1";}}
function SetBlend(num,sec){
    if(num>=1&&num<=3){
        const el=Demo2Layer(num);
        const duration=CGFSW&&!sts_skip&&!sts_force_skip&&!nowctrl?Number(sec)||0:0;
        el.style.transition="none";el.style.opacity="1";
        if(sts_skip||sts_force_skip)Demo3PortraitBlend.finish(num);
        else Demo3PortraitBlend.prepare(num,duration);
        return;
    }
    if(num===0){
        const el=Demo2Layer(0);
        const duration=CGFSW&&!sts_skip&&!sts_force_skip&&!nowctrl?Number(sec)||0:0;
        el.dataset.blendSeconds=String(duration);
        el.style.transition="none";el.style.opacity="1";
        if(sts_skip||sts_force_skip)Demo3BackgroundBlend.finish();
        else Demo3BackgroundBlend.prepare(duration);
        return;
    }
    if(sts_force_skip)return;const el=Demo2Layer(num);let duration=0;if(CGFSW&&!sts_skip&&!nowctrl)duration=Number(sec)||0;el.dataset.blendSeconds=String(duration);el.style.transition="none";el.style.opacity="0";
}
function GoBlend(num){
    if(num>=1&&num<=3){if(!sts_skip&&!sts_force_skip)Demo3PortraitBlend.play(num);return;}
    if(num===0){if(!sts_skip&&!sts_force_skip)Demo3BackgroundBlend.play();return;}
    if(sts_force_skip)return;const el=Demo2Layer(num),sec=Number(el.dataset.blendSeconds||0);void el.offsetWidth;el.style.transition=sec>0?`opacity ${sec}s linear`:"none";requestAnimationFrame(()=>el.style.opacity="1");
}

function Demo3NotifyRuntimeAudio(){
    try{
        if(window.parent && window.parent!==window){
            window.parent.postMessage({type:"tokifuru-demo3-runtime-audio"},location.origin);
        }
    }catch(e){}
}
function ChangeMusic(name,loopmode){
    const t=MSFSW?10:0;
    Demo3NotifyRuntimeAudio();
    // The supplied scenario uses #m 00 once as a silence sentinel even
    // though 00.mp3 does not exist. Treat it as the effective no-BGM state.
    if(String(name)==="00"){MUS_StopMusic(t);Demo3SetStatus("BGM停止");return;}
    if(BGMSW){MUS_PlayMusic(String(name)+".mp3",100,!!loopmode,t,0,false);Demo3SetStatus("BGM "+name);}
}
function StopMusic(){
    Demo3NotifyRuntimeAudio();
    MUS_StopMusic(MSFSW?10:0);
    Demo3SetStatus("BGM停止");
}
function PlaySE(name){
    // Original system.js did not loop a raw audio file.
    // It embedded the whole SWF and looped the SWF timeline itself.
    if(sts_skip || !SESW) return;

    let n=parseInt(name,10);
    if(!Number.isFinite(n) || n===0){
        StopSE();
        return;
    }

    const id=String(n).padStart(2,"0");
    const loop=(n<=31);

    // Keep the original <embed> model so Ruffle can polyfill it.
    // This preserves:
    // - SoundStream timing
    // - silent timeline spacing
    // - multiple StartSound events inside one SWF
    // - SWF-level looping for persistent ambience (01-31)
    SE.innerHTML =
        "<embed src='../se_runtime/"+id+".swf' " +
        "type='application/x-shockwave-flash' " +
        "width='4' height='4' " +
        "play='true' autoplay='true' " +
        "loop='"+(loop ? "true" : "false")+"' " +
        "repeat='"+(loop ? "true" : "false")+"'>";

    Demo3SetStatus("SE "+id+(loop?" / loop":" / one-shot")+" via Ruffle");
}

function StopSE(){
    // Destroying the embedded player is the modern equivalent of
    // the original SE.innerHTML="".
    SE.innerHTML="";
    Demo3SetStatus("SE停止");
}
function PlayMovie(name){Demo4PlayMovie(name);}
function StopMovie(){Demo4SkipMovie();}
function WaitMovie(){}
function PlayEnding(num){Demo5StartEnding(num);}
function WaitEnding(){}
function StopEnding(){Demo5StopEnding();}
function Demo3SetStatus(text){const el=document.getElementById("runtime-status");if(el)el.textContent=text||"";}
function EraseSpecial(){}
