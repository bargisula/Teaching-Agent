import path from 'node:path';
import pptxgen from 'pptxgenjs';

const root = process.cwd();
const course = path.join(root, 'library/courses/ai-excel-admin/versions/v0.1');
const assets = path.join(course, 'assets');
const out = path.join(course, 'deck/deck.pptx');
const slides = [
  ['行政人員的 AI＋Excel 工作管控','AI 負責整理與分析，Excel 負責保存與追蹤，人員負責確認與決策。',['AI 協助處理文字與資料','Excel 集中管理工作進度','最後結果仍需人工確認']],
  ['從需求到管控工具的工作流程','先說清楚需求，再提供資料，最後請 AI 產出指定格式。',['說明目的','貼上資料','下達 Prompt','檢查結果','回填 Excel']],
  ['案例一：用 AI 製作教材','把課程主題、對象與成果交給 AI，先取得可修改的教材大綱。',['輸入課程條件','要求產出教學流程','檢查是否適合初學者']],
  ['案例二：建立 Excel 教材進度管控表','用欄位、狀態與日期，把教材製作進度集中管理。',['單元與負責人','開始日與截止日','製作與審核狀態']],
  ['案例二實作：請 AI 分析進度','複製 Excel 資料給 AI，找出逾期、卡關與需要優先處理的項目。',['貼上 Excel 表格','輸入分析 Prompt','將結果回填 Excel']],
  ['案例三：分析學員學習成果','用出席率、作業完成率與測驗分數，找出需要補強的學員。',['貼上學員成績','設定判斷標準','取得補強建議']],
  ['綜合實作：建立自己的管控工具','選一項日常工作，建立 Excel 管控表，再請 AI 找出問題。',['決定管控主題','建立欄位並輸入資料','請 AI 分析並回填']],
  ['工作檢查表與課程總結','資料放進 Excel，清楚下達 Prompt，人工確認後再更新管控表。',['說明目的','提供完整資料','指定任務與格式','檢查 AI 結果']],
];

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Teaching Agent';
pptx.title = '行政人員的 AI＋Excel 工作管控';
pptx.lang = 'zh-TW';
const W=13.333,H=7.5, navy='14283D',cream='F4F0E8',teal='0F8B8D',coral='E76F51',muted='435566';
for(let i=0;i<slides.length;i++){
  const [title,msg,bullets]=slides[i], s=pptx.addSlide();
  s.addImage({path:path.join(assets,`slide-${String(i+1).padStart(2,'0')}.png`),x:0,y:0,w:W,h:H});
  s.addShape(pptx.ShapeType.roundRect,{x:.42,y:.43,w:5.32,h:6.63,rectRadius:.08,fill:{color:cream,transparency:5},line:{color:cream,transparency:100},shadow:{type:'outer',color:'000000',opacity:.12,blur:2,angle:45,offset:2}});
  s.addText(`${String(i+1).padStart(2,'0')}  /  AI × EXCEL`,{x:.8,y:.78,w:3.2,h:.25,fontFace:'Aptos',fontSize:10,bold:true,color:coral,charSpacing:1.4,margin:0});
  s.addText(title,{x:.8,y:1.25,w:4.5,h:1.2,fontFace:'Aptos Display',fontSize:26,bold:true,color:navy,margin:0,fit:'shrink',valign:'mid'});
  s.addShape(pptx.ShapeType.line,{x:.8,y:2.58,w:4.15,h:0,line:{color:teal,width:1.5}});
  s.addText(msg,{x:.8,y:2.88,w:4.35,h:.95,fontFace:'Aptos',fontSize:15,color:muted,margin:0,fit:'shrink',valign:'mid'});
  s.addText(bullets.map((b,n)=>({text:`${n+1}. ${b}`,options:{breakLine:n<bullets.length-1}})),{x:.82,y:4.12,w:4.25,h:1.65,fontFace:'Aptos',fontSize:14,color:navy,margin:0.02,fit:'shrink',paraSpaceAfterPt:8});
  s.addText('AI 先整理  ·  人再確認',{x:.8,y:6.45,w:2.2,h:.2,fontFace:'Aptos',fontSize:9,bold:true,color:teal,charSpacing:.5,margin:0});
  s.addText(String(i+1).padStart(2,'0'),{x:12.35,y:7.02,w:.35,h:.18,fontFace:'Aptos',fontSize:9,bold:true,color:cream,align:'right',margin:0});
}
await pptx.writeFile({fileName:out});
console.log(out);
