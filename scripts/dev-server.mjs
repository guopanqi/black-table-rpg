import {createServer} from "node:http";
import {readFile,stat} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
const root=resolve(process.cwd());
const port=Number(process.env.PORT||4173);
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",
  ".md":"text/plain; charset=utf-8",".svg":"image/svg+xml"};
createServer(async(req,res)=>{
  try {
    const url=new URL(req.url||"/","http://localhost");
    const path=resolve(root,"."+decodeURIComponent(url.pathname === "/"?"/index.html":url.pathname));
    if(path!==root && !path.startsWith(root+sep)) {res.writeHead(403);res.end("Forbidden");return;}
    const f=await stat(path);
    if(!f.isFile()) throw new Error("Not a file");
    const bytes=await readFile(path);
    res.writeHead(200,{"Content-Type":mime[extname(path)]||"application/octet-stream",
      "Cache-Control":"no-store"});res.end(bytes);
  }catch{
    res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});res.end("Not found");
  }
}).listen(port,()=>console.log("Black Table RPG: http://localhost:"+port));
