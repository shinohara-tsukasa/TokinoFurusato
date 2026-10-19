// Demo 3: browser persistence + original save/load format.
var DEMO2_SCENARIO_CACHE = new Map();
var basepath = "";
var LF_FlashReg = new Array(99);
var DEMO3_STORAGE_KEY = "tokifuru.v3.data0";
var DEMO3_STORAGE_OK = true;
var eindex = new Array(80,81,82,83,84,85,86,90,91,92,93,94,70,71,72,73,74,75);

function normalizeLegacyFilename(path){return String(path).replace(/\\/g,"/").split("/").pop();}
async function Demo2PreloadScenarios(files,onProgress){
    const decoder=new TextDecoder("shift_jis"); let done=0;
    await Promise.all(files.map(async filename=>{
        const r=await fetch(filename,{cache:"no-store"});
        if(!r.ok) throw new Error(`Scenario load failed: ${filename} (${r.status})`);
        DEMO2_SCENARIO_CACHE.set(filename,decoder.decode(await r.arrayBuffer()));
        done++; if(onProgress) onProgress(done,files.length,filename);
    }));
}
function GetData(path){
    const filename=normalizeLegacyFilename(path), t=DEMO2_SCENARIO_CACHE.get(filename);
    if(typeof t!=="string") throw new Error(`Scenario is not preloaded: ${filename}`);
    return t;
}

function Demo3LoadStorage(){
    LF_FlashReg[0]="";
    try{LF_FlashReg[0]=localStorage.getItem(DEMO3_STORAGE_KEY)||"";}
    catch(e){DEMO3_STORAGE_OK=false;console.warn("localStorage unavailable",e);}
}
function csave(section,data){
    let s=LF_FlashReg[0]||"";
    data=escape(String(data));
    const stt=s.indexOf(section+"=",0);
    if(stt===-1) s+=section+"="+data+"#";
    else{
        const end=s.indexOf("#",stt);
        s=s.substring(0,stt)+s.substring(end+1)+section+"="+data+"#";
    }
    LF_FlashReg[0]=s;
}
function cload(section){
    const s=LF_FlashReg[0]||""; if(!s) return "";
    const stt=s.indexOf(section+"=",0); if(stt===-1) return "";
    const end=s.indexOf("#",stt); if(end===-1) return "";
    return unescape(s.substring(stt+section.length+1,end));
}
function cwrite(file){
    try{localStorage.setItem(DEMO3_STORAGE_KEY,LF_FlashReg[0]||""); DEMO3_STORAGE_OK=true;}
    catch(e){DEMO3_STORAGE_OK=false;console.error("Save persistence failed",e);alert("セーブデータをブラウザに保存できませんでした。");}
}

function Saveit(num){
    csave("save"+num+"_page",SV_Page);
    csave("save"+num+"_line",SV_Line);
    csave("save"+num+"_lay0",SV_Lay[0]); csave("save"+num+"_lay1",SV_Lay[1]);
    csave("save"+num+"_lay2",SV_Lay[2]); csave("save"+num+"_lay3",SV_Lay[3]);
    csave("save"+num+"_text",SV_Text); csave("save"+num+"_name",SV_Name);
    csave("save"+num+"_music",SV_Mus); csave("save"+num+"_se",SV_SE); csave("save"+num+"_hist",SV_Hist);
    let s=""; for(let i=0;i<=95;i++) s+=""+flg[i]; csave("save"+num+"_flag",s);
    s=""; for(let i=0;i<=19;i++){let ss=Number(reg[i]).toString(16);if(ss.length<2)ss="0"+ss;s+=ss.slice(-2);} csave("save"+num+"_reg",s);
    SaveConfig(); KidSave(); cwrite(0); Demo3RefreshSlotState(); PF2Off();
}
function Loadit(num){
    const a=cload("save"+num+"_page");
    if(a===""){alert("セーブデータがありません！");return;}
    sts_mode="load";
    SV_Page=a; SV_Line=cload("save"+num+"_line");
    for(let i=0;i<=3;i++) SV_Lay[i]=cload("save"+num+"_lay"+i);
    SV_Text=cload("save"+num+"_text"); SV_Name=cload("save"+num+"_name");
    SV_Mus=cload("save"+num+"_music"); SV_SE=cload("save"+num+"_se"); SV_Hist=cload("save"+num+"_hist");
    let s=cload("save"+num+"_flag"); for(let i=0;i<=95;i++) flg[i]=Number(s.charAt(i)||0);
    s=cload("save"+num+"_reg"); for(let i=0;i<=19;i++) reg[i]=parseInt(s.substring(i*2,i*2+2)||"00",16)||0;
    LoadChapter(); Mhistory=SV_Hist; Redraw(true); PF3Off();
}

function DDISP(mode,num){
    const html=cload("save"+num+"_lay0");
    const target=document.getElementById(mode===0?"SDISP":"LDISP");
    if(!target) return;
    if(!html){target.innerHTML="<img src='../sys/nodata.jpg' width='160' height='120'>";return;}
    target.innerHTML="<div class='save-preview-crop'><div class='save-preview-scale'>"+html+"</div></div>";
}
function DHIDE(mode){
    const target=document.getElementById(mode===0?"SDISP":"LDISP");
    if(target) target.innerHTML="<img src='../sys/none.jpg' width='160' height='120'>";
}

function SaveConfig(){
    let pwd=""; pwd+=BGMSW?"1":"0";pwd+=SESW?"1":"0";pwd+=MOVSW?"1":"0";pwd+=CGFSW?"1":"0";pwd+=MSFSW?"1":"0";pwd+=SKPSW?"1":"0";pwd+=AUTSW?"1":"0"; csave("systemconfig",pwd);
}
function LoadConfig(){
    let pwd=cload("systemconfig"); if(!pwd) pwd="1111110";
    BGMSW=pwd.charAt(0)==="1"; SESW=pwd.charAt(1)==="1"; MOVSW=pwd.charAt(2)==="1"; CGFSW=pwd.charAt(3)==="1"; MSFSW=pwd.charAt(4)==="1"; SKPSW=pwd.charAt(5)==="1"; AUTSW=pwd.charAt(6)==="1";
}
function sfset(i){const a=sflag;sflag=a.substr(0,i)+"1"+a.substr(i+1,21-i);csave("FLAG",sflag);}
function seset(i){
    const a=sflag;
    // Original file.js literally called csave("LastEnding") with no second
    // argument. escape(undefined) made a non-empty marker, which is what
    // unlocks title menu item 3 after an ending.
    csave("LastEnding");
    sflag=a.substr(0,16)+i.toString(10)+a.substr(18,4);csave("FLAG",sflag);
    let x=0;for(;x<=17;x++)if(eindex[x]===i)break;
    const e=elist;elist=e.substr(0,x)+"1"+e.substr(x+1);csave("ENDLIST",elist);cwrite(0);
}
function sereset(){const a=sflag;sflag=a.substr(0,16)+"00"+a.substr(18,4);csave("FLAG",sflag);}
function Demo3InitLegacyState(){
    Demo3LoadStorage();
    sflag=cload("FLAG");if(!sflag){sflag="0000000000000000000000000";csave("FLAG",sflag);}
    elist=cload("ENDLIST");if(!elist){elist="000000000000000000000000000000";csave("ENDLIST",elist);}
    LoadConfig(); cwrite(0);
}
function Demo3HasSave(num){return cload("save"+num+"_page")!=="";}
function Demo3RefreshSlotState(){
    for(let i=1;i<=9;i++){
        document.querySelectorAll(`[data-slot='${i}']`).forEach(el=>el.classList.toggle('empty-slot',!Demo3HasSave(i)));
    }
}
