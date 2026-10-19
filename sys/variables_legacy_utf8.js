//----------------------------------------------------
// セーブデータ
//----------------------------------------------------
BGMSW=true;
SESW=true;
MOVSW=true;
CGFSW=true;
MSFSW=true;
SKPSW=true;
AUTSW=false;

BK_BGMSW=true;
BK_SESW=true;
BK_MOVSW=true;
BK_MSFSW=true;
BK_SKPSW=true;
BK_AUTSW=false;

SV_Page=0;
SV_Line=0;
SV_Lay=new Array(4);
SV_Lay[0]="";
SV_Lay[1]="";
SV_Lay[2]="";
SV_Lay[3]="";
SV_Text="";
SV_Name="";
SV_Mus="";
SV_SE=00;
SV_Hist="";
//----------------------------------------------------
// システムフラグ、エンディングリスト
//----------------------------------------------------
var sflag,elist;
//----------------------------------------------------
// シナリオプレイヤー
//----------------------------------------------------
var TID;
var scn=new Array();
var sts_skip=false;
var sts_force_skip=false;
var sts_mode="";
var pre_mode="";
var sts_movie=false;
var flg=new Array(100);
var reg=new Array(20);
var anch=new Array(999);
var brn1=new Array(10);
var brn2=new Array(10);
var brn3=new Array(10);
var brn0=new Array(10);
var brover=0;
var kidok="";
var kidok0="";
var kidokfile="";
var itskidok=false;
var AutoPlayVolume=0;
var Mhistory="";
var histy,hysize;
var hpush7,hpush4,hpush5,hpush6;
var bnum;
var mvhtml="";
//----------------------------------------------------
// キー制御
//----------------------------------------------------
var nowctrl;
//----------------------------------------------------
var replay=false;
//----------------------------------------------------
// スクリーン情報
//----------------------------------------------------
var	scrx=screen.width;
var scry=screen.height;
var rez1="640,480";
var	rez2=scrx+","+scry;
var fullscreen=false;
var tdx=0;
var tdy=0;
var tdrag=false;
var winx,winy;
var NEKO=false;
var bpp=screen.colorDepth;
// -----------------------------------------------------
// IE9対策
var IE9=false;
var UA=navigator.userAgent+"";
if(UA.indexOf("Trident/5.0",0)!=-1) IE9=true;
// -----------------------------------------------------
