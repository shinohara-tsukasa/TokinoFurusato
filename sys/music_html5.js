// Demo 3: HTML5 Audio replacement for the original bgsound/Flash audio layer.
var MUS_NowFading=false;
var MUS_ChannelVolume=new Array(10);
var MUS_ChannelFader=new Array(10);
var MUS_ChannelFile=new Array(10);
var MUS_ChannelNextFile=new Array(10);
var MUS_ChannelLoop=new Array(10);
var MUS_ChannelDelta=new Array(10);
var MUS_ChannelStop=new Array(10);
var MUS_ChannelPlaying=new Array(10);
var MUS_ChannelFadetime=new Array(10);
var MUS_ChannelBeforeVolume=new Array(10);
var MUS_MasterVolume=100;
var MUS_RelVolume=new Array(10);
var MUS_PlayingChannel=1;
var MUS_TID=null;
var MUS_FadeInterval=100;
var MUS_MusicFolder="../bgm";
var MUS_SEFolder="../se_audio";
var MUS_AudioChannels=new Array(10);
var MUS_PreparedAudio=new Array(10);
var MUS_BlockedByAutoplay=false;

function InitMusic(){
    for(let i=0;i<=9;i++){
        const a=new Audio();
        a.preload="auto";
        a.loop=false;
        MUS_AudioChannels[i]=a;
        MUS_PreparedAudio[i]=null;
        MUS_ChannelVolume[i]=100;
        MUS_ChannelFader[i]=0;
        MUS_ChannelFile[i]="";
        MUS_ChannelNextFile[i]="";
        MUS_ChannelLoop[i]=false;
        MUS_ChannelDelta[i]=0;
        MUS_ChannelStop[i]=0;
        MUS_ChannelPlaying[i]=false;
        MUS_ChannelFadetime[i]=0;
        MUS_ChannelBeforeVolume[i]=100;
        MUS_RelVolume[i]=100;
    }
    MUS_PlayingChannel=1;
}

function MUS_TryPlay(ch){
    const a=MUS_AudioChannels[ch];
    if(!a || !a.src) return;
    const p=a.play();
    if(p && typeof p.catch==="function"){
        p.catch(err=>{
            if(err && err.name==="NotAllowedError") MUS_BlockedByAutoplay=true;
            else console.warn("Audio play failed", ch, err);
        });
    }
}

function MUS_UnlockAudio(){
    if(!MUS_BlockedByAutoplay) return;
    MUS_BlockedByAutoplay=false;
    for(let i=0;i<=9;i++){
        if(MUS_ChannelPlaying[i] && MUS_AudioChannels[i] && MUS_AudioChannels[i].src) MUS_TryPlay(i);
    }
}


function MUS_PrepareChannel(ch,fn,loop){
    // HTML5 Audio may need a noticeable amount of time to fetch/demux an MP3
    // after src is assigned.  The original <bgsound> engine did not expose
    // that delay between tracks, so prepare the next source while the current
    // track is still fading.
    const old=MUS_PreparedAudio[ch];
    if(old){
        try{old.pause();}catch(e){}
        MUS_PreparedAudio[ch]=null;
    }

    const a=new Audio();
    a.preload="auto";
    a.loop=!!loop;
    a.volume=0;
    a._tokifuruFile=fn;
    a.src=fn;
    try{a.load();}catch(e){}
    MUS_PreparedAudio[ch]=a;
}

function MUS_PlayMusic(Filename,Volume,Loop,FadeoutTime,FadeinTime,XFade){
    if(!Filename) return;
    if(Filename.endsWith('.mid')) Filename=Filename.slice(0,-4)+'.mp3';
    if(MUS_NowFading && MUS_TID) clearTimeout(MUS_TID);
    let ch1,ch2;
    if(MUS_PlayingChannel===1){ch1=1;ch2=0;}else{ch1=0;ch2=1;}
    const full=MUS_MusicFolder+"/"+Filename;
    if(XFade && MUS_ChannelFile[ch2]===full) return;
    if(!XFade && MUS_ChannelFile[ch1]===full) return;
    MUS_ChannelNextFile[ch1]=full;
    MUS_ChannelBeforeVolume[ch1]=MUS_ChannelVolume[ch1];
    MUS_ChannelVolume[ch1]=Volume;
    MUS_ChannelLoop[ch1]=!!Loop;
    MUS_PrepareChannel(ch1,full,Loop);
    if(XFade){
        MUS_ChannelNextFile[ch2]="";
        MUS_ChannelBeforeVolume[ch2]=MUS_ChannelVolume[ch2];
        MUS_StopChannel(ch2,FadeoutTime);
        MUS_ChannelFadetime[ch1]=FadeinTime;
        MUS_StartChannel(ch1);
        MUS_PlayingChannel=(MUS_PlayingChannel===1)?2:1;
    }else{
        MUS_ChannelFadetime[ch1]=FadeinTime;
        MUS_StopChannel(ch1,FadeoutTime);
    }
    MUS_FadeActive();
}

function MUS_StopMusic(Fadetime){
    if(MUS_NowFading && MUS_TID) clearTimeout(MUS_TID);
    MUS_ChannelNextFile[0]="";
    MUS_ChannelNextFile[1]="";
    for(let i=0;i<=1;i++){
        if(MUS_PreparedAudio[i]){
            try{MUS_PreparedAudio[i].pause();}catch(e){}
            MUS_PreparedAudio[i]=null;
        }
    }
    MUS_StopChannel(0,Fadetime);
    MUS_StopChannel(1,Fadetime);
    MUS_FadeActive();
}

function MUS_PlaySE(ch1,Filename,Volume,Loop,FadeoutTime,FadeinTime){
    if(ch1<1 || ch1>8) return;
    if(MUS_NowFading && MUS_TID) clearTimeout(MUS_TID);
    ch1++;
    MUS_ChannelNextFile[ch1]=MUS_SEFolder+"/"+Filename;
    MUS_ChannelBeforeVolume[ch1]=MUS_ChannelVolume[ch1];
    MUS_ChannelVolume[ch1]=Volume;
    MUS_ChannelLoop[ch1]=!!Loop;
    MUS_ChannelFadetime[ch1]=FadeinTime;
    MUS_StopChannel(ch1,FadeoutTime);
    MUS_FadeActive();
}

function MUS_StopSE(ch,Fadetime){
    if(ch<1 || ch>8) return;
    ch++;
    if(MUS_NowFading && MUS_TID) clearTimeout(MUS_TID);
    MUS_ChannelNextFile[ch]="";
    MUS_StopChannel(ch,Fadetime);
    MUS_FadeActive();
}

function MUS_SetMasterVolume(vol){
    MUS_MasterVolume=Math.max(0,Math.min(100,Number(vol)||0));
    for(let i=0;i<=9;i++) MUS_SetVolume(i,true);
}
function MUS_SetMusicVolume(vol){
    vol=Math.max(0,Math.min(100,Number(vol)||0));
    MUS_RelVolume[0]=vol; MUS_RelVolume[1]=vol;
    MUS_SetVolume(0,true); MUS_SetVolume(1,true);
}
function MUS_SetSEVolume(ch,vol){
    if(ch<1 || ch>8) return;
    vol=Math.max(0,Math.min(100,Number(vol)||0));
    MUS_RelVolume[ch+1]=vol;
    MUS_SetVolume(ch+1,true);
}

function MUS_StartChannel(ch){
    const fn=MUS_ChannelNextFile[ch];
    const fadetime=Number(MUS_ChannelFadetime[ch])||0;
    MUS_ChannelNextFile[ch]="";
    if(!fn) return;

    let a=MUS_PreparedAudio[ch];
    if(a && a._tokifuruFile===fn){
        MUS_PreparedAudio[ch]=null;
    }else{
        if(a){
            try{a.pause();}catch(e){}
            MUS_PreparedAudio[ch]=null;
        }
        a=new Audio();
        a.preload="auto";
        a.src=fn;
        try{a.load();}catch(e){}
    }

    const previous=MUS_AudioChannels[ch];
    if(previous && previous!==a){
        try{previous.pause();}catch(e){}
    }

    MUS_AudioChannels[ch]=a;
    try{a.currentTime=0;}catch(e){}
    a.loop=!!MUS_ChannelLoop[ch];

    MUS_ChannelFile[ch]=fn;
    MUS_ChannelPlaying[ch]=true;
    if(fadetime<=0){
        MUS_ChannelStop[ch]=100;
        MUS_ChannelDelta[ch]=0;
        MUS_ChannelFader[ch]=100;
    }else{
        MUS_ChannelStop[ch]=100;
        MUS_ChannelDelta[ch]=100/fadetime;
        MUS_ChannelFader[ch]=0;
    }

    MUS_SetVolume(ch,true);
    MUS_TryPlay(ch);
}

function MUS_StopChannel(ch,Fadetime){
    const a=MUS_AudioChannels[ch];
    if(!MUS_ChannelPlaying[ch]){
        MUS_ChannelFile[ch]="";
        if(MUS_ChannelNextFile[ch]) MUS_StartChannel(ch);
        return;
    }
    Fadetime=Number(Fadetime)||0;
    if(Fadetime<=0){
        if(a){a.pause();try{a.currentTime=0;}catch(e){}}
        MUS_ChannelStop[ch]=0; MUS_ChannelDelta[ch]=0; MUS_ChannelFader[ch]=0;
        MUS_ChannelPlaying[ch]=false; MUS_ChannelFile[ch]="";
        if(MUS_ChannelNextFile[ch]) MUS_StartChannel(ch);
    }else{
        MUS_ChannelBeforeVolume[ch]=MUS_ChannelVolume[ch];
        MUS_ChannelStop[ch]=0;
        MUS_ChannelDelta[ch]=-(Math.max(MUS_ChannelFader[ch],1)/Fadetime);
        MUS_ChannelFile[ch]="";
    }
}

function MUS_FadeActive(){
    let active=false;
    MUS_NowFading=true;
    for(let i=0;i<=9;i++){
        const d=Number(MUS_ChannelDelta[i])||0;
        if(d===0) continue;
        active=true;
        MUS_ChannelFader[i]+=d;
        if(d>0){
            if(MUS_ChannelFader[i]>=MUS_ChannelStop[i]){
                MUS_ChannelFader[i]=MUS_ChannelStop[i]; MUS_ChannelDelta[i]=0;
            }
            MUS_SetVolume(i,true);
        }else{
            if(MUS_ChannelFader[i]<=MUS_ChannelStop[i]){
                MUS_ChannelFader[i]=0; MUS_ChannelDelta[i]=0; MUS_ChannelPlaying[i]=false;
                const a=MUS_AudioChannels[i];
                if(a){a.pause();try{a.currentTime=0;}catch(e){}}
                if(MUS_ChannelNextFile[i]) MUS_StartChannel(i);
            }else MUS_SetVolume(i,false);
        }
    }
    if(active) MUS_TID=setTimeout(MUS_FadeActive,MUS_FadeInterval);
    else MUS_NowFading=false;
}

function MUS_SetVolume(ch,mode){
    const a=MUS_AudioChannels[ch];
    if(!a) return;
    const v=mode?MUS_ChannelVolume[ch]:MUS_ChannelBeforeVolume[ch];
    let vv=(v/100)*(MUS_MasterVolume/100)*(MUS_RelVolume[ch]/100)*(MUS_ChannelFader[ch]/100);
    vv=Math.max(0,Math.min(1,vv));
    try{a.volume=vv;}catch(e){}
}

function MUS_StopAllImmediate(){
    if(MUS_TID) clearTimeout(MUS_TID);
    for(let i=0;i<=9;i++){
        const a=MUS_AudioChannels[i];
        if(a){a.pause();try{a.currentTime=0;}catch(e){}}
        const prep=MUS_PreparedAudio[i];
        if(prep){try{prep.pause();}catch(e){}}
        MUS_PreparedAudio[i]=null;
        MUS_ChannelPlaying[i]=false; MUS_ChannelFile[i]=""; MUS_ChannelNextFile[i]=""; MUS_ChannelDelta[i]=0;
    }
    MUS_NowFading=false;
}
