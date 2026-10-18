import assert from "node:assert/strict";
import { validateStoryboard } from "../stickman-longform.mjs";
const scenes=Array.from({length:60},(_,i)=>({duration:8,narration:"Scene "+(i+1),action:["walk","talk","point","think"][i%4],expression:["neutral","happy","thinking"][i%3]}));
assert.deepEqual(validateStoryboard({title:"A test story",scenes}),[]);
assert.ok(validateStoryboard({title:"",scenes}).some(e=>e.includes("title")));
assert.ok(validateStoryboard({title:"Too short",scenes:scenes.slice(0,10)}).some(e=>e.includes("50–100")));
assert.ok(validateStoryboard({title:"Bad action",scenes:scenes.map((s,i)=>i===0?{...s,action:"zoom-still"}:s)}).some(e=>e.includes("unsupported action")));
assert.ok(validateStoryboard({title:"Bad duration",scenes:scenes.map(s=>({...s,duration:2}))}).some(e=>e.includes("3–15 seconds")));
console.log("PASS stickman storyboard validation");
