//----------------------------------------------------
function LoadChapter()
	{
	histinit();
	fs=GetData(basepath+"\\sys\\"+SV_Page+".dat");
	fs+="\n**";
	scn=fs.split("\n");

	kidokfile="read"+SV_Page;
	kidok0=cload(kidokfile);
	kidok="";
	i=0;
	while(1==1)
		{
		s=scn[i];
		s=s.substring(0,s.length-1);
		if (s=="**") {endline=i;break;}
		wa=s.charAt(0);
		if (wa=='#')
			{
			wb=s.charAt(1);
			wlen=s.length;
			switch (wb)
				{
				case "s":
					wc=s.charAt(2);
					i+=parseInt(wc,10);
					for(k=0;k<=parseInt(wc,10);k++) kidok+="x";
					break;
				case "a":
					wc=s.substring(3,wlen);
					j=parseInt(wc,10);
					anch[j]=i;
					kidok+="x";
					break;
				case "t":
					kidok+="0";
					break;
				default:
					kidok+="x";
					break;
				}
			}
		else{
			kidok+="0";
			}
		i++;
		}
	if (kidok0=="")
		{
		csave(kidokfile,kidok);
		}
	else	{
			if (kidok0.length!=kidok.length)	{csave(kidokfile,kidok);cwrite(0);}
										else	kidok=kidok0;
			}
	}

function Redraw(mode)
	{
	if ((mode)&&(CGFSW))
		{
		SetBlend(0,1);
		SetBlend(1,1);
		SetBlend(2,1);
		SetBlend(3,1);
		}
	ShowLayer(0);
	ShowLayer(1);
	ShowLayer(2);
	ShowLayer(3);
	WriteLayer(0,SV_Lay[0]);
	WriteLayer(1,SV_Lay[1]);
	WriteLayer(2,SV_Lay[2]);
	WriteLayer(3,SV_Lay[3]);
	if ((mode)&&(CGFSW))
		{
		GoBlend(0);
		GoBlend(1);
		GoBlend(2);
		GoBlend(3);
		}
	DrawText(SV_Name,SV_Text);
	if (BGMSW)
		{
		if ((SV_Mus!="off")&&(SV_Mus!="")) ChangeMusic(SV_Mus,true);
		if ((SV_Mus=="off")||(SV_Mus=="")) StopMusic();
		}
	else{
		StopMusic();
		}
	if (SESW)
		{
		if ((SV_SE!="off")&&(SV_SE < 32)) PlaySE(SV_SE);  // SE 01～31は持続性サウンド
			else	StopSE();
		}
	else StopSE();
	}

//----------------------------------------------------
function getstr()
	{
	var a;
	a=scn[SV_Line];
	SV_Line++;
	return a;
	}
function Skipoff()
	{
	sts_skip=false;
	sts_force_skip=false;
	sts_mode="text";
	Redraw(false);
	KidSave();
	}
function KidSave()
	{
	if (kidokfile!="")
		{
		csave(kidokfile,kidok);
		cwrite(0);
		}
	}
//----------------------------------------------------
function Decode_Script()
	{
	var wa,wb,wc,wd,wlen,wstr,wstr2;
	var a,a0,i,j,k,b1,b2;
	clearTimeout(TID);
	if ((sts_mode=="ending")||(sts_mode=="title")) return;
	while(1==1)
		{
		s=getstr();
		wlen=s.length;
			wa=s.charAt(0);
		if (wa=='#'){
			wb=s.charAt(1);
			if (wb=='#')
				{
				if ((sts_skip)&&(!sts_force_skip)) Skipoff();
				continue;
				}
			if (wb=='j')
				{
				wc=s.substring(3,wlen);
				j=parseInt(wc,10);
				SV_Line=anch[j]+1;
				continue;
				}
			if (wb=='J')
				{
				wc=s.substring(3,wlen);
				j=parseInt(wc,10);
				if ((j>=90)&&(!sts_force_skip))
					{
					sts_skip=false;
					}
				KidSave();
				SV_Page=j;
				SV_Line=0;
				LoadChapter();
				continue;
				}
			if (wb=='m')	// 音楽再生コマンド #m
				{
				wc=s.substring(3,wlen);
				SV_Mus=wc;
				if (wc=="off"){StopMusic();continue;}
				if (!sts_skip) ChangeMusic(wc,true);
				continue;
				}
			if (wb=='M')	// 音楽再生コマンド #M
				{
				wc=s.substring(3,wlen);
				SV_Mus=wc;
				if (wc=="off"){StopMusic();continue;}
				if (!sts_skip) ChangeMusic(wc,false);
				continue;
				}
			if (wb=='e')
				{
				wc=s.substring(3,wlen);
				if (sts_skip) Skipoff();
				PlayEnding(wc);
				break;
				}
			if (wb=='s')
				{
				if (sts_skip) Skipoff();
				wd=parseInt(s.charAt(2),10);
				MakeSelection(wd);
				break;
				}
			if (wb=='t')	// トークコマンド
				{
				wc=s.substring(3,wlen);
				brn1=wc.split(" ");
				kidcheck();
				a=makestring(brn1[1],itskidok);
				wstr=makelabel(brn1[0]);
				SV_Text=a;
				SV_Name=wstr;
				if (!sts_skip)
					{
					DrawText(wstr,a);
					sts_mode="text";
					DrawArea();
					if (nowctrl)
						{
						if ((itskidok)||(!SKPSW)) {TID=setTimeout("Decode_Script()",100);break;}
						}
					else
						{
						if (AUTSW) {TID=setTimeout("Decode_Script()",AutoPlayVolume);}
						}
					break;
					}
				}
			if (wb=='*')
				{
				if (SV_Page==63) csave("LastEnding","");
				KidSave();
				sts_skip=false;
				sts_force_skip=false;
				HideAll();
				sts_mode="exit";
				DrawArea();
				Title();
				break;
				}
			if (wb=='v')	// Flashムービー再生コマンド #v
				{
				wc=parseInt(s.substring(3,wlen),10);
				if (((MOVSW)&&(!sts_skip))||(wc>=70)||(SV_Page>=90)){
					if (sts_skip) Skipoff();
					if (wc>=70) seset(wc);
					if (wc>=90) sfset(18);
					if (wc==90) sfset(19);
					if (wc==73) sfset(20);
					PlayMovie(wc);
					break;
					}
				else continue;
				}
			if (wb=='g')	// ＣＧ表示コマンド #g
				{
				wd=parseInt(s.charAt(2),10);
				wc=s.substring(4,wlen);
				SetBlend(wd,0.5);
				SetImage(wd,wc);
				GoBlend(wd);
				continue;
				}
			if (wb=='p')	// 効果音再生コマンド #p
				{
				wc=s.substring(3,wlen);
				SV_SE=wc;
				if (wc=="off"){StopSE();continue;}
				PlaySE(wc);
				continue;
				}
			if (wb=='f'){  // フラグ操作コマンド
				wd=s.charAt(2);
				if (wd=='+') {wc=parseInt(s.substring(4,wlen),10);flg[wc]=1;continue;}
				if (wd=='-') {wc=parseInt(s.substring(4,wlen),10);flg[wc]=0;continue;}
				if (wd=='?')	{
						wstr=s.substring(4,wlen);
						brn1=wstr.split(" ");
						j=parseInt(brn1[1],10);
						i=detect(brn1[0]);
						if (i==true) {SV_Line=anch[j]+1;continue;}
						continue;
						}
				}
			if (wb=='r'){
				wc=s.charAt(2);
				if (wc=='+') {wd=parseInt(s.substring(4,wlen),10);if (reg[wd]<7) reg[wd]++;continue;}
				if (wc=='-') {wd=parseInt(s.substring(4,wlen),10);if (reg[wd]>0) reg[wd]--;continue;}
				if (wc=='=') 	{
						wstr=s.substring(4,wlen);
						brn0=wstr.split(" ");
						i=parseInt(brn0[0],10);
						j=parseInt(brn0[1],10);
						reg[i]=j;continue;
						}
				if (wc=='?')	{
						wstr=s.substring(4,wlen);
						brn0=wstr.split(" ");
						i=parseInt(brn0[0],10);
						j=parseInt(brn0[2],10);
						k=parseInt(brn0[3],10);
						if ((brn0[1]=="=")&&(reg[i]==j)) {SV_Line=anch[k];continue;}
						if ((brn0[1]==">")&&(reg[i]>j)) {SV_Line=anch[k];continue;}
						if ((brn0[1]=="<")&&(reg[i]<j)) {SV_Line=anch[k];continue;}
						if ((brn0[1]=="<=")&&(reg[i]<=j)) {SV_Line=anch[k];continue;}
						if ((brn0[1]==">=")&&(reg[i]>=j)) {SV_Line=anch[k];continue;}
						if ((brn0[1]=="!=")&&(reg[i]!=j)) {SV_Line=anch[k];continue;}
						continue;
						}
				}
			}
		else	{
			if (s.charAt(0)=='?')
				{
				wstr=s.substring(1,wlen);
				brn0=wstr.split(" ");
				i=detect(brn0[0]);
				if (i==false) continue;
				s=brn0[1];
				}
			if (s.charAt(0)=='$')
				{
				wstr=s.substring(1,wlen);
				brn0=wstr.split(" ");
				i=parseInt(brn0[0],10);
				j=parseInt(brn0[2],10);
				if ((brn0[1]=="=")&&(reg[i]!=j)) continue;
				if ((brn0[1]==">")&&(reg[i]<=j)) continue;
				if ((brn0[1]=="<")&&(reg[i]>=j)) continue;
				if ((brn0[1]=="<=")&&(reg[i]>j)) continue;
				if ((brn0[1]==">=")&&(reg[i]<j)) continue;
				if ((brn0[1]=="!=")&&(reg[i]==j)) continue;
				s=brn0[3];
				}
			kidcheck();
			a=makestring(s,itskidok);
			SV_Text=a;
			SV_Name="";
			if (!sts_skip)
				{
				DrawText("",a);
				sts_mode="text";
				DrawArea();
				if (nowctrl)
					{
					if ((itskidok)||(!SKPSW)) {TID=setTimeout("Decode_Script()",100);break;}
					}
				else
					{
					if (AUTSW) {TID=setTimeout("Decode_Script()",AutoPlayVolume);}
					}
				break;
				}
			}
		}
	}
//--------------------------------------------------------------------
function DrawText(lbl,str)
	{
	var s;
	if (IE9)
		{
		if (lbl!="")	s="<img src='../sys/frame.png' width=640 height=220>";
		if (lbl=="")	s="<img src='../sys/frame0.png' width=640 height=220>";
		}
	else{
		s="<img src='blank.gif' width=640 height=220 ";
		if (lbl!="")	s+="style='filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(Src=\"../sys/frame.png\",SizingMethod=crop)'>";
		if (lbl=="")	s+="style='filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(Src=\"../sys/frame0.png\",SizingMethod=crop)'>";
		}
	WriteLayer(5,s);
	WriteLayer(6,str);
	if (lbl=="")
		{
		WriteLayer(7,"");
		}
	else{
		WriteLayer(7,lbl);
		}
	MoveLayer(7,26,288);
	MoveLayer(5,0,260);
	MoveLayer(6,30,320);
	ShowLayer(5);
	ShowLayer(6);
	ShowLayer(7);
	}
//--------------------------------------------------------------------
function DrawArea()
	{
	var i,str,s1,s2,s3,cc,cl;
	var cx1,cy1,cx2,cy2;
	var str;
	switch (sts_mode)
		{
		case "text":
			str="<table border=0 cellpadding=0 cellspacing=0>";
			str+="<tr><td><img src='blank.gif' width=640 height=36 onmouseover='Console_On();'></td></tr>";
			str+="<tr><td><img src='blank.gif' width=640 height=444 onmouseout='Message_Off()' ";
			str+="onclick='CheckMenu(event)'></td></tr></table>";
			break;
		case "hide":
			str="<table border=0 cellpadding=0 cellspacing=0>";
			str+="<tr><td><img src='blank.gif' width=640 height=480 onmouseover='Message_On()'>";
			str+="</td></tr></table>";
			break;
		case "console":
			str="<table border=0 cellpadding=0 cellspacing=0>";
			str+="<tr><td><img src='blank.gif' width=640 height=480 onmouseover='Console_Off()'>";
			str+="</td></tr></table>";
			break;
		default:
			str="";
			break;
		}
	WriteLayer(8,str);
	MoveLayer(8,0,0);
	ShowLayer(8);
	}
//--------------------------------------------------------------------
function Console_On()
	{
	CONSOLE.style.visibility="visible";
	HideLayer(5);
	HideLayer(6);
	HideLayer(7);
	sts_mode="console";
	DrawArea();
	}
function Console_Off()
	{
	CONSOLE.style.visibility="hidden";
	sts_mode="hide";
	DrawArea();
	}
function Message_Off()
	{
	if (sts_movie) return;
	HideLayer(5);
	HideLayer(6);
	HideLayer(7);
	sts_mode="hide";
	DrawArea();
	}
function Message_On()
	{
	if (sts_movie) return;
	MoveLayer(7,26,288);
	MoveLayer(5,0,260);
	MoveLayer(6,30,320);
	ShowLayer(5);
	ShowLayer(6);
	ShowLayer(7);
	sts_mode="text";
	DrawArea();
	}
function RHide()
	{
	pre_mode=sts_mode;
	if (pre_mode=="text")
		{
		Message_Off();
		}
	if (pre_mode=="branch")
		{
		HideSelection();
		}
	sts_mode="rhide";
	DrawArea();
	}
function RShow()
	{
	sts_mode=pre_mode;
	if (pre_mode=="text")
		{
		Message_On();
		}
	if (pre_mode=="branch")
		{
		ShowSelection();
		}
	}
//--------------------------------------------------------------------
function PF1(force)
	{
	// Enter bypasses scene-boundary stops while suppressing presentation.
	// Every skip mode still obeys the saved unread-stop setting (SKPSW).
	sts_force_skip=(force===true);
	if (sts_force_skip) Demo3FinishImageBlends();
	sts_skip=true;
	sts_mode="skip";
	CONSOLE.style.visibility="hidden";
	DrawArea();
	if (sts_movie) StopMovie();
	else Decode_Script();
	}
function PF2()
	{
	KidSave();
	if (replay)
		{
		CONSOLE.style.visibility="hidden";
		alert("ここではセーブできません！");
		Message_On();
		return;
		}
	sts_mode="save";
	PF2Win.style.visibility="visible";
	CONSOLE.style.visibility="hidden";
	HideLayer(5);
	HideLayer(6);
	HideLayer(7);
	DrawArea();
	}
function PF2Off()
	{
	PF2Win.style.visibility="hidden";
	Message_On();
	sts_mode="text";
	DrawArea();
	}
function PF3()
	{
	KidSave();
	if (replay)
		{
		CONSOLE.style.visibility="hidden";
		alert("ここではロードできません！");
		Message_On();
		return;
		}
	sts_mode="load";
	PF3Win.style.visibility="visible";
	CONSOLE.style.visibility="hidden";
	HideLayer(5);
	HideLayer(6);
	HideLayer(7);
	DrawArea();
	}
function PF3Off()
	{
	PF3Win.style.visibility="hidden";
	if (sts_mode=="load")
		{
		Message_On();
		sts_mode="text";
		DrawArea();
		}
	else{
		sts_mode="title";
		ShowLayer(1);
		ShowLayer(2);
		ShowLayer(9);
		}
	}
function PF4()
	{
	pre_mode=sts_mode;
	if (sts_mode!="title")
		{
		KidSave();
		CONSOLE.style.visibility="hidden";
		HideLayer(4);
		HideLayer(5);
		HideLayer(6);
		HideLayer(7);
		}
	else{
		HideLayer(1);
		HideLayer(2);
		}
	sts_mode="config";
	PF4Win.style.visibility="visible";
	DrawArea();
	PF4Dsp();
	}
function PF4Dsp()
	{
	if (BGMSW) CFG1.innerHTML="<img src='on.jpg'>";else CFG1.innerHTML="<img src='off.jpg'>";
	if (SESW)  CFG2.innerHTML="<img src='on.jpg'>";else CFG2.innerHTML="<img src='off.jpg'>";
	if (MOVSW) CFG3.innerHTML="<img src='on.jpg'>";else CFG3.innerHTML="<img src='off.jpg'>";
	if (CGFSW) CFG4.innerHTML="<img src='on.jpg'>";else CFG4.innerHTML="<img src='off.jpg'>";
	if (MSFSW) CFG5.innerHTML="<img src='on.jpg'>";else CFG5.innerHTML="<img src='off.jpg'>";
	if (SKPSW) CFG6.innerHTML="<img src='on.jpg'>";else CFG6.innerHTML="<img src='off.jpg'>";
	if (AUTSW) CFG7.innerHTML="<img src='on.jpg'>";else CFG7.innerHTML="<img src='off.jpg'>";
	}
function PF4CH(num)
	{
	switch(num)
		{
		case 1:	BGMSW=(!BGMSW);
				break;
		case 2:	SESW=(!SESW);
				break;
		case 3:	MOVSW=(!MOVSW);
				break;
		case 4:	CGFSW=(!CGFSW);
				break;
		case 5:	MSFSW=(!MSFSW);
				break;
		case 6:	SKPSW=(!SKPSW);
				break;
		case 7:	AUTSW=(!AUTSW);
				break;
		}
	PF4Dsp();
	}
function PF4Off()
	{
	SaveConfig();
	cwrite(0);
	PF4Win.style.visibility="hidden";

	if (BGMSW)
		{
		if ((SV_Mus!="off")&&(SV_Mus!="")) ChangeMusic(SV_Mus,true);
		if ((SV_Mus=="off")||(SV_Mus=="")) StopMusic();
		}
	else{
		StopMusic();
		}
	if (SESW)
		{
		if ((SV_SE!="off")&&(SV_SE < 32)) PlaySE(SV_SE);  // SE 01～31は持続性サウンド
			else	StopSE();
		}
	else StopSE();

	if (!BGMSW) StopMusic();
	sts_mode=pre_mode;
	if (sts_mode!="title")
		{
		Message_On();
		sts_mode="text";
		DrawArea();
		}
	else{
		ShowLayer(1);
		ShowLayer(2);
		}
	}
function PF5()
	{
	KidSave();
	window.open("../help/indexhlp.htm","HELPWIN","width=800 scrollbars=yes resizable=yes");
	}
function PF6()
	{
	KidSave();
	sts_mode="exit";
	PF6Win.style.visibility="visible";
	CONSOLE.style.visibility="hidden";
	HideLayer(4);
	HideLayer(5);
	HideLayer(6);
	HideLayer(7);
	DrawArea();
	}
function PF6Off()
	{
	PF6Win.style.visibility="hidden";
	Message_On();
	sts_mode="text";
	DrawArea();
	}
//--------------------------------------------------------------------
function PF7()
	{
	var s,s2,h;
	KidSave();
	if (sts_mode=="console")
		{
		Console_Off();
		sts_mode="text";
		}
	pre_mode=sts_mode;
	if (pre_mode=="text")
		{
		hpush7=LAYER7.innerHTML;
		Message_Off();
		CONSOLE.style.visibility="hidden";
		}
	if (pre_mode=="branch")
		{
		hpush4=LAYER4.innerHTML;
		hpush5=LAYER5.innerHTML;
		hpush6=LAYER6.innerHTML;
		WriteLayer(4,"");
		WriteLayer(5,"");
		WriteLayer(6,"");
		}
	sts_mode="hist";
	s="<img src='../sys/black.gif' width=640 height=480 style='filter:alpha(opacity=60)'>";
	if (IE9)
		{
		s2="<img src='../sys/hist.png' width=167 height=116>";
		}
	else{
		s2="<img src='blank.gif' width=167 height=116 style='filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(Src=\"../sys/hist.png\",SizingMethod=crop)'>";
		}
	h="<table border=0 cellpadding=8 cellspacing=0>";
	h+="<tr><td width=624>"+Mhistory+"</td></tr></table>";
	WriteLayer(7,s);
	WriteLayer(8,h);
	WriteLayer(9,s2);
	hysize=LAYER8.clientHeight;
	if (hysize>480) hy=hysize-480;else hy=0;
	MoveLayer(7,0,0);
	MoveLayer(8,0,0);
	if (hysize<364) MoveLayer(9,473,364);else MoveLayer(9,473,0);
	ShowLayer(7);
	PF7Disp(hy);
	ShowLayer(8);
	ShowLayer(9);
	}
function PF7Move(delta)
	{
	hy+=delta;
	if (hy+480>hysize)
		{
		if (hysize>480) hy=hysize-480;
		else hy=0;
		}
	if (hy<0) hy=0;
	PF7Disp(hy);
	}
function PF7Disp(y)
	{
	var yy;
	yy=-y;
	MoveLayer(8,0,yy);
	}
function PF7Off()
	{
	WriteLayer(8,"");
	WriteLayer(9,"");
	if (pre_mode=="text")
		{
		WriteLayer(7,hpush7);
		MoveLayer(6,0,320);
		MoveLayer(7,30,320);
		Message_On();
		}
	if (pre_mode=="branch")
		{
		WriteLayer(4,hpush4);
		WriteLayer(5,hpush5);
		WriteLayer(6,hpush6);
		WriteLayer(7,"");
		ShowLayer(4);
		ShowLayer(5);
		ShowLayer(6);
		}
	sts_mode=pre_mode;
	}
//--------------------------------------------------------------------
function kidcheck()
	{
	var i,k,xx;
	i=SV_Line-1;
	k=kidok.charAt(i);
	if (k=="0")
		{
		itskidok=false;
		if ((sts_skip)&&(SKPSW)) Skipoff();
		xx=kidok.substring(0,i)+"1"+kidok.substring(i+1,kidok.length);
		kidok=xx;
		}
	else{
		itskidok=true;
		}
	}
function detect(dt_str)
	{
	var i,c,ps,len,res1;
	var nums="0123456789";
	var str2="";
	var fl1="";
	var fl2=true;
	var result=true;
	var fl4;

	len=dt_str.length;
	if (len==0)	return(true);
	for(i=0;i<len;i++)
		{
		c=dt_str.charAt(i);
		if (c==' ') continue;
		if (c=='!') {fl2=false;continue;}
		ps=nums.indexOf(c,0);
		if (ps != -1)
			{
			fl1=fl1+c;
			if (i!=len-1) continue;
			}
		if (fl1.length > 0)
			{
			fl3=parseInt(fl1,10);		
			if ((fl3<0)||(fl3>95))
				{ alert('Detection Error(Illegal Flag)');
				  result=false;break;
				}
			fl4=flg[fl3];
			if (fl2==false)  fl4=(fl4 ^ 1);
			str2=str2+ fl4;
			fl1="";
			fl2=true;
			if (c=='*') {str2=str2+"&";}
			if (c=='+') {str2=str2+"|";}
			if (i != len-1) continue;
			}
		}
	if (result==true)
		{
		res1=eval(str2);
		if (res1==1) result=true;
		if (res1==0) result=false;
		return(result);
		}
	else return(false);
	}
// -------------- 文字列生成 ------------------------------------
function makestring(str,kd)
	{
	var result,l,i,a,m,hstr,mojis;
	var normal,m_big,m_red,m_small;
	normal="<span style='font-size:18px;font-weight:bold;color:white;line-height:24px'>";
	m_big="<span style='font-size:24px;font-weight:bold;color:white;line-height:24px'>";
	m_red="<span style='font-size:24px;font-weight:bold;color:#ffcc44;line-height:24px'>";
	m_small="<span style='font-size:14px;font-weight:bold;color:white;line-height:24px'>";
	if (NEKO) str=nekochg(str);
	l=str.length;
	hstr="";mojis=0;

	result="<table width=596 height=80 border=0 cellpadding=0 cellspacing=0><tr><td valign=top>";
	result+=normal;
	hstr+=normal;
	if (kd)
		{
		if (IE9)
			{
			result+="<img src='../sys/read.png' width=64 height=32><br>";
			}
		else{
			result+="<img src='blank.gif' width=64 height=32 style='filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(Src=\"../sys/read.png\",SizingMethod=crop)'><br>";
			}
		}
	else	result+="<img src='blank.gif' width=64 height=32><br>";
	for(i=0;i<l;i++)
		{
		a=str.charAt(i);
		if (a=="*")	{result+="<br>";hstr+="<br>";continue;}
		if (a=="<")	{result+="</span>"+m_big;hstr+="</span>"+m_big;continue;}
		if (a=="/")	{result+="</span>"+normal;hstr+="</span>"+normal;continue;}
		if (a==">")	{result+="</span>"+m_small;hstr+="</span>"+m_small;continue;}
		if (a=="!")	{result+="</span>"+m_red;hstr+="</span>"+m_red;continue;}
		result+=a;
		hstr+=a;
		mojis++;
		}
	result=result+"</span></td></tr></table>";
	Mhistory+=hstr+"<br>";
	SV_Hist=hstr+"<br>";
	AutoPlayVolume=mojis*100;
	if (AutoPlayVolume<2500) AutoPlayVolume=2500;
	return result;
	}
function makelabel(str)
	{
	var result;
	result="<table width=100 border=0 cellspacing=0 cellpadding=0><tr><td align=center>";
	result+="<span style='color:#ffffff;font-size:18px;font-weight:bold'>"+str+"</span></td></tr></table>";
	return result;
	}
function MakeSelection(num)
	{
	var result="";
	var i,j,s,s2,wlen;
	var b1,b2,d1,d2;
	bnum=0;
	HideLayer(6);
	HideLayer(7);
	for(i=1;i<=num;i++)
		{
		s=getstr();
		wlen=s.length;
		if (s.charAt(0)=='?')
			{
			s2=s.substring(1,wlen);
			brn0=s2.split(" ");
			b1=detect(brn0[0]);
			if (b1==false) continue;
			brn1[0]=brn0[1];brn1[1]=parseInt(brn0[2],10);
			}
		else brn1=s.split(" ");
		bnum++;
		brn2[bnum]=brn1[1];
		brn3[bnum]=brn1[0];
		}
	brsel=0;
	DrawSelection(true);
	ShowLayer(4);
	ShowLayer(5);
	ShowLayer(6);
	MoveLayer(4,0,0);
	MoveLayer(5,0,0);
	MoveLayer(6,0,0);
	sts_mode="branch";
	DrawArea();
	}
function HideSelection()
	{
	var s;
	HideLayer(4);
	HideLayer(5);
	HideLayer(6);
	s="<img src='blank.gif' width=640 height=480 onmouseover='ShowSelection()'>";
	WriteLayer(8,s);
	MoveLayer(8,0,0);
	ShowLayer(8);
	}
function ShowSelection()
	{
	WriteLayer(8,"");
	HideLayer(8);
	ShowLayer(4);
	ShowLayer(5);
	ShowLayer(6);
	}
function DrawSelection(mode)
	{
	var d1,d2,d3,i;
	d1="<table border=0 width=640 height=480><tr><td align=center valign=middle>";
	d1+="<table border=0 width=441 cellspacing=0 cellpadding=0>";
	d1+="<tr><td align=center><img src='blank.gif' width=227 height=48></td></tr>";
	d1+="<tr><td align=center><img src='blank.gif' width=227 height=20></td></tr>";

	d2="<table border=0 width=640 height=480 cellspacing=0 cellpadding=0><tr><td align=center valign=middle>";
	d2+="<table border=0 width=441 cellspacing=0 cellpadding=0 style='margin:0px; padding:0px;'>";
	d2+="<tr><td align=center colspan=3>";
	if (sts_mode=="sysmenu")
		{
		if (IE9)
			{
			d2+="<img src='sysmenu.png' width=227 height=48></td></tr>";
			}
		else{
			d2+="<img src='blank.gif' width=227 height=48 ";
			d2+="style='filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(Src=\"sysmenu.png\",SizingMethod=crop)'></td></tr>";
			}
		}
	else{
		if (IE9)
			{
			d2+="<img src='sel.png' width=227 height=48></td></tr>";
			}
		else{
			d2+="<img src='blank.gif' width=227 height=48 ";
			d2+="style='filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(Src=\"sel.png\",SizingMethod=crop)'></td></tr>";
			}
		}
	d2+="<tr><td align=center colspan=3><img src='blank.gif' width=227 height=34></td></tr>";

	d3="<table border=0 width=640 height=480 cellspacing=0 cellpadding=0><tr><td align=center valign=middle>";
	d3+="<table border=0 width=441 cellspacing=0 cellpadding=0 style='margin:0px; padding:0px;'>";
	d3+="<tr><td align=center><img src='blank.gif' width=227 height=48></td></tr>";
	d3+="<tr><td align=center><img src='blank.gif' width=227 height=34></td></tr>";

	i=1;
	for(i=1;i<=bnum;i++)
		{
		d1+="<tr><td width=441>";
		if (i==brsel)
			{
			if (IE9)
				{
				d1+="<img src='../sys/sel1.png' width=441 height=43>";
				}
			else{
				d1+="<img src='blank.gif' width=441 height=43 ";
				d1+="style='filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(Src=\"../sys/sel1.png\",SizingMethod=crop)'>";
				}
			}
		else{
			if (IE9)
				{
				d1+="<img src='../sys/sel0.png' width=441 height=43>";
				}
			else{
				d1+="<img src='blank.gif' width=441 height=43 ";
				d1+="style='filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(Src=\"../sys/sel0.png\",SizingMethod=crop)'>";
				}
			}
		d1+="</td></tr>";

		d2+="<tr><td><img src='blank.gif' width=1 height=43></td>";
		d2+="<td width=30 align=center class=branch valign=top><b>"+i+"</b></td>";
		d2+="<td width=410 nowrap align=center class=branch valign=top>"+brn3[i]+"</td></tr>";

		d3+="<tr onmouseover='SelOver("+i+")' onmouseout='SelOver(0)' ";
		d3+="onClick='pick("+i+")'><td><img src='blank.gif' width=441 height=43 style='cursor:hand'></td></tr>";
		}
	d1+="<tr><td align=center><img src='blank.gif' width=227 height=40></td></tr>";
	d2+="<tr><td align=center colspan=3><img src='blank.gif' width=227 height=40></td></tr>";
	d3+="<tr><td align=center><img src='blank.gif' width=227 height=40></td></tr>";
	d1+="</table></td></tr></table>";
	d2+="</table></td></tr></table>";
	d3+="</table></td></tr></table>";
	WriteLayer(4,d1);
	if (mode) WriteLayer(5,d2);
	if (mode) WriteLayer(6,d3);
	}
function SelOver(num)
	{
	brsel=num;
	DrawSelection(false);
	}
function nekochg(str)
	{
	var i,j,s,l;
	i=0;
	while(1==1)
		{
		l=str.length;j=str.indexOf("な",i);
		if (j==-1) break;
		s=str.substring(0,j)+"ニャ"+str.substring(j+1,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("のよ",i);
		if (j==-1) break;
		s=str.substring(0,j)+"にょ"+str.substring(j+2,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("何で",i);
		if (j==-1) break;
		s=str.substring(0,j)+"ニャンで"+str.substring(j+2,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("何と",i);
		if (j==-1) break;
		s=str.substring(0,j)+"ニャンと"+str.substring(j+2,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("何",i);
		if (j==-1) break;
		s=str.substring(0,j)+"ニャニ"+str.substring(j+1,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("の",i);
		if (j==-1) break;
		s=str.substring(0,j)+"にょ"+str.substring(j+1,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("だ。",i);
		if (j==-1) break;
		s=str.substring(0,j)+"だにょ。"+str.substring(j+2,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("る。",i);
		if (j==-1) break;
		s=str.substring(0,j)+"るニャ。"+str.substring(j+2,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("よ。",i);
		if (j==-1) break;
		s=str.substring(0,j)+"にょ。"+str.substring(j+2,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("よ」",i);
		if (j==-1) break;
		s=str.substring(0,j)+"にょ」"+str.substring(j+2,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("た。",i);
		if (j==-1) break;
		s=str.substring(0,j)+"たニャ。"+str.substring(j+2,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("た…",i);
		if (j==-1) break;
		s=str.substring(0,j)+"たニャ…"+str.substring(j+2,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("だ…",i);
		if (j==-1) break;
		s=str.substring(0,j)+"だニャ…"+str.substring(j+2,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("だ」",i);
		if (j==-1) break;
		s=str.substring(0,j)+"だにょ」"+str.substring(j+2,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("ね。",i);
		if (j==-1) break;
		s=str.substring(0,j)+"にょ。"+str.substring(j+2,l);str=s;
		}
	while(1==1)
		{
		l=str.length;j=str.indexOf("ね」",i);
		if (j==-1) break;
		s=str.substring(0,j)+"にょ」"+str.substring(j+2,l);str=s;
		}
	return str;
	}
function pick(num)
	{
	var i;
	HideLayer(4);
	if (sts_mode=="sysmenu")
		{
		LAYER5.innerHTML=hpush5;
		LAYER6.innerHTML=hpush6;
		LAYER7.innerHTML=hpush7;
		Message_On();
		if (num==1) {PF2();return;}
		if (num==2) {PF3();return;}
		if (num==3) {PF4();return;}
		if (num==4) {PF5();return;}
		if (num==5) {PF6();return;}
		if (num==6) {PF7();return;}
		if (num==7) {return;}
		}
	if (sts_mode!="branch") return;
	Mhistory+="<font color=yellow><b>＞"+brn3[num]+"</b></font><br>";
	i=parseInt(brn2[num],10);
	SV_Line=anch[i];
	sts_mode="text";
	Decode_Script();
	}

function histinit()
	{
	Mhistory="";
	}
function CheckMenu()
	{
	var x,y;
	x=event.x;
	y=event.y;
	if ((x>=285)&&(x<=364)&&(y>=450)&&(y<=479)) ExecSysMenu();
	else Decode_Script();
	}
function ExecSysMenu()
	{
	var result="";
	var i,j,s,s2,wlen;
	var b1,b2,d1,d2;
	KidSave();
	hpush5=LAYER5.innerHTML;
	hpush6=LAYER6.innerHTML;
	hpush7=LAYER7.innerHTML;
	bnum=0;
	HideLayer(6);
	HideLayer(7);
	bnum=7;
	brsel=0;
	brn2[1]=1;brn3[1]="ゲームを保存する";
	brn2[2]=1;brn3[2]="続きから再開する";
	brn2[3]=1;brn3[3]="環境設定";
	brn2[4]=1;brn3[4]="操作説明を読む";
	brn2[5]=1;brn3[5]="タイトル画面に戻る";
	brn2[6]=1;brn3[6]="文章を読み返す";
	brn2[7]=1;brn3[7]="このメニューを閉じる";
	brsel=0;
	sts_mode="sysmenu";
	DrawSelection(true);
	ShowLayer(4);
	ShowLayer(5);
	ShowLayer(6);
	MoveLayer(4,0,0);
	MoveLayer(5,0,0);
	MoveLayer(6,0,0);
	sts_mode="sysmenu";
	DrawArea();
	}
function CloseSysMenu()
	{
	HideLayer(4);
	LAYER5.innerHTML=hpush5;
	LAYER6.innerHTML=hpush6;
	LAYER7.innerHTML=hpush7;
	Message_On();
	}
