#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
export const ACTIONS = new Set(["idle","walk","run","talk","point","sit","think","wave","jump","fall","celebrate"]);
export const EXPRESSIONS = new Set(["neutral","happy","sad","angry","surprised","thinking"]);
export function validateStoryboard(input) {
 const errors=[];
 if(!input||typeof input!=="object"||Array.isArray(input))return ["Storyboard must be a JSON object."];
 if(typeof input.title!=="string"||!input.title.trim())errors.push("title must be a non-empty string.");
 if(!Array.isArray(input.scenes))return [...errors,"scenes must be an array."];
 if(input.scenes.length<50||input.scenes.length>100)errors.push("Use 50–100 scenes for long-form pacing.");
 let total=0;
 input.scenes.forEach((s,i)=>{
  const n=i+1;
  if(!s||typeof s!=="object"||Array.isArray(s)){errors.push("Scene "+n+" must be an object.");return;}
  const d=Number(s.duration);
  if(!Number.isFinite(d)||d<3||d>15)errors.push("Scene "+n+" duration must be 3–15 seconds.");else total+=d;
  if(typeof s.narration!=="string"||!s.narration.trim())errors.push("Scene "+n+" needs narration text.");
  if(s.action&&!ACTIONS.has(s.action))errors.push("Scene "+n+" has unsupported action: "+s.action);
  if(s.expression&&!EXPRESSIONS.has(s.expression))errors.push("Scene "+n+" has unsupported expression: "+s.expression);
 });
 if(total<480||total>600)errors.push("Total duration must be 480–600 seconds; got "+total+".");
 for(const k of ["voiceover","music"])if(input[k]&&typeof input[k]!=="string")errors.push(k+" must be a file path.");
 return errors;
}
function run(command,args,cwd){const r=spawnSync(command,args,{cwd,stdio:"inherit",shell:false});if(r.status!==0)throw new Error(command+" failed (status "+String(r.status)+").");}
function slug(v){return String(v).normalize("NFKD").replace(/[^\p{L}\p{N}._-]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,80)||"stickman-story";}
function main(){
 const args=process.argv.slice(2),inputPath=args.find(a=>!a.startsWith("--"));
 if(!inputPath||args.includes("--help")){console.log("Usage: node scripts/stickman-longform.mjs <storyboard.json> [--render] [--output <directory>]");process.exitCode=inputPath?0:2;return;}
 const render=args.includes("--render"),oi=args.indexOf("--output"),storyPath=path.resolve(inputPath);
 const story=JSON.parse(fs.readFileSync(storyPath,"utf8")),errors=validateStoryboard(story);
 if(errors.length)throw new Error("Invalid storyboard:\n- "+errors.join("\n- "));
 if(oi>=0&&!args[oi+1])throw new Error("--output requires a directory.");
 const out=path.resolve(oi>=0?args[oi+1]:path.join(path.dirname(storyPath),"stickman-output-"+slug(story.title)));
 const protectedOutputs=["index.html","package.json","storyboard.json","visual.mp4","final.mp4"];
 if(fs.existsSync(out)&&protectedOutputs.some(name=>fs.existsSync(path.join(out,name)))) throw new Error("Output directory already contains generated project/media files; choose a new --output directory to preserve existing work.");
 const voice=story.voiceover?path.resolve(path.dirname(storyPath),story.voiceover):"";
 const music=story.music?path.resolve(path.dirname(storyPath),story.music):"";
 if(voice&&!fs.existsSync(voice))throw new Error("Voiceover not found: "+voice);
 if(music&&!fs.existsSync(music))throw new Error("Music not found: "+music);
 fs.mkdirSync(out,{recursive:true});
 const seconds=story.scenes.reduce((sum,s)=>sum+Number(s.duration),0);
 const template=fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../templates/stickman-longform/index.html"),"utf8");
 const safe=JSON.stringify(story).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
 const html=template.replace('data-duration="480"','data-duration="'+seconds+'"').replace("/*__STORYBOARD__*/","const STORYBOARD = "+safe+";");
 fs.writeFileSync(path.join(out,"index.html"),html);
 fs.writeFileSync(path.join(out,"package.json"),JSON.stringify({name:"book-video-stickman-longform",private:true,type:"module"},null,2)+"\n");
 fs.writeFileSync(path.join(out,"storyboard.json"),JSON.stringify(story,null,2)+"\n");
 console.log(JSON.stringify({status:"project_generated",title:story.title,scenes:story.scenes.length,durationSeconds:seconds,outputDir:out,renderRequested:render},null,2));
 if(!render){console.log("Review the project, then rerun with --render.");return;}
 run("npx",["--yes","hyperframes@0.7.33","render","-c","index.html","-o","visual.mp4"],out);
 const visual=path.join(out,"visual.mp4");
 if(!fs.existsSync(visual))throw new Error("HyperFrames completed but visual.mp4 is missing.");
 if(!voice&&!music){run("ffmpeg",["-y","-i",visual,"-vf","fps=24","-c:v","libx264","-preset","veryfast","-crf","20","-pix_fmt","yuv420p","-an","-t",String(seconds),"-movflags","+faststart",path.join(out,"final.mp4")],out);console.log("Created visual-only final.mp4 at 24 fps.");return;}
 const a=["-y","-i",visual];if(voice){if(!fs.existsSync(voice))throw new Error("Voiceover not found: "+voice);a.push("-i",voice);}if(music){if(!fs.existsSync(music))throw new Error("Music not found: "+music);a.push("-stream_loop","-1","-i",music);}
 const filters=[],parts=[];let idx=1;
 if(voice)parts.push("["+idx+++":a]volume=1.0[voice]");
 if(music)parts.push("["+idx+++":a]volume=0.12[music]");
 filters.push(parts.join(";"));
 if(voice&&music)filters.push("[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]");else filters.push("["+(voice?"voice":"music")+"]anull[aout]");
 a.push("-filter_complex",filters.join(";"),"-map","0:v:0","-map","[aout]","-vf","fps=24","-c:v","libx264","-preset","veryfast","-crf","20","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-t",String(seconds),"-movflags","+faststart",path.join(out,"final.mp4"));
 run("ffmpeg",a,out);console.log("Created "+path.join(out,"final.mp4"));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main();
