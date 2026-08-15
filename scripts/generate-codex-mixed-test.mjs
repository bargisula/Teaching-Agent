import fs from 'node:fs';
import path from 'node:path';
import PptxGenJS from 'pptxgenjs';

const root = process.cwd();
const outDir = path.join(root, 'styles', 'previews');
fs.mkdirSync(outDir, { recursive: true });
const warm = path.join(root, 'assets', 'test', 'test-warm-bokeh.png');
const teal = path.join(root, 'assets', 'test', 'test-teal-geo.png');
const p = new PptxGenJS(); p.layout='LAYOUT_WIDE'; p.author='Teaching Agent'; p.lang='zh-TW';
const text=(s,v,o)=>s.addText(v,{margin:0,fit:'shrink',...o});
const card=(s,x,y,w,h,fill='FFFFFF')=>s.addShape(p.ShapeType.roundRect,{x,y,w,h,rectRadius:.12,fill:{color:fill},line:{color:fill,transparency:100},shadow:{type:'outer',color:'203638',opacity:.12,blur:1,angle:45,distance:2}});
const mapping={version:'mixed-test-v0.1',title:'如何使用 Codex',pages:[{page:1,style:'poetic-image-poster',reason:'建立主題與情境'},{page:2,style:'workspace-editorial',reason:'展示操作介面與工作流程'},{page:3,style:'modular-info-cards',reason:'整理使用步驟與檢查點'}]};
fs.writeFileSync(path.join(outDir,'codex-mixed-style-spec.json'),JSON.stringify(mapping,null,2)+'\n','utf8');

// Cover: poetic image poster.
{const s=p.addSlide();s.addImage({path:warm,x:0,y:0,w:13.333,h:7.5});s.addShape(p.ShapeType.rect,{x:0,y:0,w:13.333,h:7.5,fill:{color:'142A39',transparency:25},line:{color:'142A39',transparency:100}});s.addShape(p.ShapeType.rect,{x:2.45,y:.88,w:6.25,h:5.7,fill:{color:'142A39',transparency:100},line:{color:'FFFFFF',transparency:18,width:1.2}});s.addShape(p.ShapeType.ellipse,{x:8.3,y:1.15,w:.65,h:.65,fill:{color:'F2A56F',transparency:100},line:{color:'F2A56F',width:1}});text(s,'CODEX / START HERE',{x:.76,y:.5,w:3.3,h:.2,fontFace:'Arial',fontSize:11,bold:true,charSpace:3,color:'F2C6A2'});text(s,'如何使用\nCodex',{x:3.15,y:1.55,w:3.0,h:1.8,fontFace:'Microsoft JhengHei',fontSize:40,bold:true,breakLine:true,color:'FFFFFF',align:'center'});text(s,'從問題、檔案到可驗證的成果。',{x:.76,y:6.15,w:3.4,h:.3,fontFace:'Microsoft JhengHei',fontSize:18,color:'FFFDE9'});text(s,'MIXED STYLE TEST / 01',{x:10.3,y:6.7,w:2.2,h:.16,fontFace:'Arial',fontSize:9,bold:true,charSpace:1.5,color:'FFFFFF',align:'right'});}

// Page 1: workspace editorial operation scene.
{const s=p.addSlide();s.background={color:'F0EFEB'};text(s,'01 / 操作情境',{x:.76,y:.55,w:2.2,h:.2,fontFace:'Arial',fontSize:11,bold:true,charSpace:2,color:'E34B87'});text(s,'先把問題說清楚',{x:.76,y:1.03,w:4.6,h:.4,fontFace:'Microsoft JhengHei',fontSize:30,bold:true,color:'181818'});text(s,'Codex 會依照你的目標、檔案與限制開始工作。',{x:.78,y:1.7,w:4.5,h:.3,fontFace:'Microsoft JhengHei',fontSize:16,color:'686868'});s.addShape(p.ShapeType.line,{x:.78,y:2.25,w:3.7,h:0,line:{color:'181818',width:2}});s.addShape(p.ShapeType.rect,{x:5.2,y:1.0,w:6.75,h:5.3,rotate:358,fill:{color:'D9D5CD'},line:{color:'D9D5CD'}});s.addShape(p.ShapeType.roundRect,{x:6.2,y:1.65,w:4.9,h:3.55,rectRadius:.12,fill:{color:'242424'},line:{color:'111111'}});s.addImage({path:teal,x:6.42,y:1.88,w:4.45,h:3.05});s.addShape(p.ShapeType.rect,{x:5.75,y:5.25,w:2.35,h:1.05,rotate:348,fill:{color:'FFFFFF'},line:{color:'FFFFFF'}});text(s,'問題 → 檔案 → 限制',{x:5.98,y:5.58,w:1.95,h:.18,fontFace:'Microsoft JhengHei',fontSize:13,bold:true,color:'181818',rotate:348,align:'center'});s.addShape(p.ShapeType.roundRect,{x:10.7,y:1.18,w:1.25,h:.4,fill:{color:'E34B87'},line:{color:'E34B87'}});text(s,'PROMPT',{x:10.82,y:1.3,w:1.0,h:.1,fontFace:'Arial',fontSize:8,bold:true,charSpace:1,color:'FFFFFF',align:'center'});text(s,'MIXED STYLE TEST / 02',{x:.78,y:6.72,w:2.5,h:.16,fontFace:'Arial',fontSize:9,bold:true,charSpace:1.5,color:'686868'});}

// Page 2: modular information cards.
{const s=p.addSlide();s.background={color:'F3F7F5'};s.addShape(p.ShapeType.ellipse,{x:10.8,y:-1.2,w:4.1,h:2.7,fill:{color:'BFE2DE'},line:{color:'BFE2DE',transparency:100}});text(s,'02 / 使用步驟',{x:.76,y:.55,w:2.2,h:.2,fontFace:'Arial',fontSize:11,bold:true,charSpace:2,color:'168A8A'});text(s,'讓 Codex 做事的三個階段',{x:.76,y:1.05,w:5.4,h:.42,fontFace:'Microsoft JhengHei',fontSize:29,bold:true,color:'203638'});text(s,'每一階段都要有清楚的輸入與檢查點。',{x:.78,y:1.72,w:4.6,h:.25,fontFace:'Microsoft JhengHei',fontSize:16,color:'647477'});const rows=[['01','描述目標','我要完成什麼？'],['02','提供材料','要讀哪些檔案？'],['03','檢查成果','結果是否可驗證？']];rows.forEach((r,i)=>{const x=.8+i*4.05;card(s,x,2.55,3.55,2.35,i===2?'F4A340':'FFFFFF');text(s,r[0],{x:x+.3,y:2.9,w:.65,h:.35,fontFace:'Arial',fontSize:26,bold:true,color:i===2?'203638':'168A8A'});text(s,r[1],{x:x+.3,y:3.52,w:2.6,h:.25,fontFace:'Microsoft JhengHei',fontSize:20,bold:true,color:'203638'});text(s,r[2],{x:x+.3,y:4.1,w:2.7,h:.2,fontFace:'Microsoft JhengHei',fontSize:13,color:'647477'});});text(s,'結論：清楚的任務描述，比更長的指令更重要。',{x:.82,y:6.25,w:7.0,h:.25,fontFace:'Microsoft JhengHei',fontSize:16,bold:true,color:'477A65'});text(s,'MIXED STYLE TEST / 03',{x:10.1,y:6.72,w:2.5,h:.16,fontFace:'Arial',fontSize:9,bold:true,charSpace:1.5,color:'718078',align:'right'});}

await p.writeFile({fileName:path.join(outDir,'codex-mixed-style-test-v0.1.pptx')});console.log('Generated mixed style test deck and spec.');
