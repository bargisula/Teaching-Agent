import fs from 'node:fs';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';

const root = process.cwd();
const outDir = path.join(root, 'styles', 'previews');
fs.mkdirSync(outDir, { recursive: true });
const teal = path.join(root, 'assets', 'test', 'test-teal-geo.png');
const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.author = 'Teaching Agent'; p.lang = 'zh-TW';
const text = (s,v,o) => s.addText(v,{margin:0,fit:'shrink',...o});
const card = (s,x,y,w,h,fill='FFFFFF') => s.addShape(p.ShapeType.roundRect,{x,y,w,h,rectRadius:.12,fill:{color:fill},line:{color:fill,transparency:100},shadow:{type:'outer',color:'203638',opacity:.12,blur:1,angle:45,distance:2}});

// Cover
{ const s=p.addSlide(); s.background={color:'F3F7F5'}; s.addShape(p.ShapeType.ellipse,{x:10.7,y:-1.3,w:4.2,h:2.8,fill:{color:'BFE2DE'},line:{color:'BFE2DE',transparency:100}}); text(s,'AI 文件處理 / TEST DECK',{x:.75,y:.55,w:3.5,h:.2,fontFace:'Arial',fontSize:11,bold:true,charSpace:2.5,color:'168A8A'}); text(s,'AI 如何幫你\n整理會議紀錄？',{x:.75,y:1.2,w:5.3,h:1.1,fontFace:'Microsoft JhengHei',fontSize:34,bold:true,breakLine:true,color:'203638'}); text(s,'把重複整理工作交給 AI，\n人負責判斷與確認。',{x:.78,y:2.7,w:4.1,h:.6,fontFace:'Microsoft JhengHei',fontSize:18,color:'647477',breakLine:true}); card(s,7.0,1.15,4.7,4.9); s.addImage({path:teal,x:7.0,y:1.15,w:4.7,h:4.9}); text(s,'01 讀懂',{x:7.35,y:5.2,w:1.15,h:.2,fontFace:'Microsoft JhengHei',fontSize:13,bold:true,color:'203638'}); text(s,'02 整理',{x:8.75,y:5.2,w:1.15,h:.2,fontFace:'Microsoft JhengHei',fontSize:13,bold:true,color:'203638'}); text(s,'03 確認',{x:10.15,y:5.2,w:1.15,h:.2,fontFace:'Microsoft JhengHei',fontSize:13,bold:true,color:'203638'}); text(s,'VISUAL DIRECTOR TEST / COVER',{x:.78,y:6.78,w:3.7,h:.16,fontFace:'Arial',fontSize:9,bold:true,charSpace:1.7,color:'718078'}); }

// Page 1
{ const s=p.addSlide(); s.background={color:'F3F7F5'}; text(s,'01 / 任務選擇',{x:.78,y:.55,w:2.2,h:.2,fontFace:'Arial',fontSize:11,bold:true,charSpace:2,color:'168A8A'}); text(s,'先選一個小任務',{x:.78,y:1.0,w:5.0,h:.45,fontFace:'Microsoft JhengHei',fontSize:30,bold:true,color:'203638'}); text(s,'從一個小任務開始，結果會更可靠。',{x:.8,y:1.65,w:5.2,h:.25,fontFace:'Microsoft JhengHei',fontSize:16,color:'647477'}); const rows=[['01','摘要','先抓住決策與重點'],['02','整理','分類成待辦與欄位'],['03','改寫','調整語氣與格式']]; rows.forEach((r,i)=>{const x=.8+i*4.05; card(s,x,2.55,3.55,2.5,i===1?'DDEBDD':'FFFFFF'); text(s,r[0],{x:x+.3,y:2.9,w:.7,h:.35,fontFace:'Arial',fontSize:27,bold:true,color:'168A8A'}); text(s,r[1],{x:x+.3,y:3.55,w:2.5,h:.28,fontFace:'Microsoft JhengHei',fontSize:22,bold:true,color:'203638'}); text(s,r[2],{x:x+.3,y:4.15,w:2.7,h:.4,fontFace:'Microsoft JhengHei',fontSize:13,color:'647477'});}); text(s,'從小任務開始，比一次處理整份文件更容易檢查。',{x:.82,y:6.3,w:7.3,h:.28,fontFace:'Microsoft JhengHei',fontSize:16,color:'477A65'}); }

// Page 2
{ const s=p.addSlide(); s.background={color:'F3F7F5'}; text(s,'02 / 具體範例',{x:.78,y:.55,w:2.2,h:.2,fontFace:'Arial',fontSize:11,bold:true,charSpace:2,color:'168A8A'}); text(s,'把會議紀錄變成待辦清單',{x:.78,y:1.0,w:6.6,h:.45,fontFace:'Microsoft JhengHei',fontSize:29,bold:true,color:'203638'}); card(s,.8,2.0,4.1,3.8); text(s,'原始會議紀錄',{x:1.15,y:2.35,w:2.1,h:.25,fontFace:'Microsoft JhengHei',fontSize:20,bold:true,color:'203638'}); text(s,'討論產品上線時間\n確認負責人與期限\n保留尚未決定的事項',{x:1.15,y:3.0,w:2.8,h:1.0,fontFace:'Microsoft JhengHei',fontSize:17,color:'647477',breakLine:true}); s.addShape(p.ShapeType.line,{x:1.15,y:4.65,w:2.9,h:0,line:{color:'BFE2DE',width:2}}); text(s,'不要讓 AI 補造資訊',{x:1.15,y:5.05,w:2.8,h:.25,fontFace:'Microsoft JhengHei',fontSize:14,bold:true,color:'C98D63'}); const steps=[['01','保留決策'],['02','標出負責人'],['03','檢查期限']]; steps.forEach((r,i)=>{const y=2.05+i*1.3; card(s,5.55,y,4.95,1.0,i===2?'F4A340':'FFFFFF'); text(s,r[0],{x:5.85,y:y+.27,w:.55,h:.25,fontFace:'Arial',fontSize:21,bold:true,color:i===2?'203638':'168A8A'}); text(s,r[1],{x:6.65,y:y+.29,w:2.2,h:.2,fontFace:'Microsoft JhengHei',fontSize:18,bold:true,color:'203638'}); text(s,'輸出成可執行的待辦項目',{x:8.5,y:y+.31,w:1.55,h:.2,fontFace:'Microsoft JhengHei',fontSize:10,color:i===2?'203638':'647477'});}); text(s,'核心：先定義欄位，再請 AI 整理。',{x:5.58,y:6.25,w:4.6,h:.25,fontFace:'Microsoft JhengHei',fontSize:16,bold:true,color:'477A65'}); }

await p.writeFile({fileName:path.join(outDir,'visual-director-test-3slides.pptx')}); console.log('Generated '+path.join(outDir,'visual-director-test-3slides.pptx'));
