#!/usr/bin/env node
/* ONE-TIME migration utility. Remove after staging manifests pass review.
   Reads existing project HTML; never changes originals itself. */
import fs from "node:fs";import path from "node:path";import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),previews=path.join(root,"previews"),out=path.join(previews,"projects");
const slugs=["74-chisholms-avenue","boscobel-heights-residence","chateau-de-chanel","experimental-circular-home","lot-18-mount-boon","mannings-hill-road-apartment-complex","rhynie-drive","tiny-living","tyre-warehouse-automotive"];
const plain=s=>String(s||"").replace(/<br\s*\/?>/gi," ").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/\s+/g," ").trim();
const attr=(s,k)=>(String(s||"").match(new RegExp("\\b"+k+'=["\\x27]([^"\\x27]*)["\\x27]','i'))||[])[1]||"";
const val=(s,re)=>s.match(re)?.[1]||"";
const slugify=s=>plain(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"details";
function images(section){const out=[];for(const m of section.matchAll(/<img\b([^>]*?)\/?>/gi)){const src=attr(m[1],"src");if(!src||src.includes("criocreatives.com/assets/logos"))continue;const before=section.slice(0,m.index),start=before.lastIndexOf("<figure"),close=before.lastIndexOf("</figure>"),end=section.indexOf("</figure>",m.index);let caption="",full="";if(start>close&&end!==-1){const fig=section.slice(start,end+9);caption=plain(val(fig,/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i));const href=val(fig,/<a\b[^>]*href=["']([^"']+)["']/i);if(/\.(?:jpe?g|png|webp|avif)(?:\?|$)/i.test(href))full=href}out.push({src,alt:attr(m[1],"alt")||"Architectural visualization",...(caption?{caption}:{}),...(full?{full}:{})})}return out}
function fromHtml(slug,doc){
if(!/^<!doctype html>/i.test(doc)||!doc.includes("</html>"))throw Error("Incomplete HTML "+slug);
const sections=[...doc.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)].map(x=>({attrs:x[1],body:x[2],html:x[0]}));
const hi=sections.findIndex(s=>/\b(hero|cover)\b/.test(attr(s.attrs,"class")));if(hi<0)throw Error("No hero: "+slug);
const h=sections[hi].html,rawTitle=val(h,/<h1[^>]*>([\s\S]*?)<\/h1>/i);const lines=rawTitle.replace(/<br\s*\/?>/gi,"|").replace(/<\/?(?:span|em)[^>]*>/gi,"").split("|").map(plain).filter(Boolean);
const lead=val(h,/<p\b[^>]*class=["'][^"']*(?:lead|lede)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)||val(h,/<div[^>]*class=["'][^"']*hero-meta[^"']*["'][^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i)||val(h,/<div[^>]*class=["'][^"']*cover-side[^"']*["'][^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
const title=plain(val(doc,/<title>([\s\S]*?)<\/title>/i));
const description=attr(doc.match(/<meta\b[^>]*name=["']description["'][^>]*>/i)?.[0]||"","content")||plain(lead)||title+" architectural visualization by Crio Creatives.";
const hImage=images(h)[0];
const navsrc=val(doc,/<nav[^>]*class=["']arch-salisbury-links["'][^>]*>([\s\S]*?)<\/nav>/i);
const nav=[...navsrc.matchAll(/<a\b([^>]+)>([\s\S]*?)<\/a>/gi)].map(x=>({id:attr(x[1],"href").replace(/^#/,""),label:plain(x[2])})).filter(x=>x.id&&x.label);
const result=[],used=new Set();let closing;
for(let i=0;i<sections.length;i++){if(i===hi)continue;const s=sections[i];if(/\b(closing|end-section)\b/.test(attr(s.attrs,"class"))){let close=plain(val(s.body,/<h2[^>]*>([\s\S]*?)<\/h2>/i));if(close)closing={title:close};continue}
const stripped=s.body.replace(/<figure\b[\s\S]*?<\/figure>/gi,"");const entries=images(s.body),name=plain(val(stripped,/<h2[^>]*>([\s\S]*?)<\/h2>/i))||plain(val(stripped,/<h3[^>]*>([\s\S]*?)<\/h3>/i));
let id=attr(s.attrs,"id")||slugify(name||"section-"+i);if(used.has(id))id=id+"-"+i;used.add(id);
const paragraphs=[...stripped.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x=>plain(x[1])).filter(x=>x.length>18);
const items=[...stripped.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(x=>plain(x[1])).filter(Boolean);
const embeds=[...stripped.matchAll(/<iframe\b[^>]*src=["']([^"']+)["']/gi)].map(x=>x[1]).filter(x=>/^https?:\/\//.test(x));
let groups;if(entries.length){groups=entries.length===2?[2]:entries.length>2?[1,...Array(Math.floor((entries.length-1)/2)).fill(2),...((entries.length-1)%2?[1]:[])]:[1]}
result.push({id,kind:entries.length?"gallery":"text",title:name,paragraphs,...(items.length?{items}:{}),...(embeds.length?{embeds}:{}),...(entries.length?{images:entries,groups}:{})});
}
return {schema_version:2,category:"arch-viz",slug,title:plain(rawTitle)||slug.replace(/-/g," "),indexable:!/<meta[^>]*name=["']robots["'][^>]*noindex/i.test(doc),seo:{title,description},hero:{src:hImage?.src||null,alt:hImage?.alt||"",eyebrow:plain(val(h,/<(?:p|div)[^>]*class=["'][^"']*(?:eyebrow|cover-topline)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div)>/i))||"CRIO CREATIVES / PROJECT PREVIEW",lines:lines.length?lines:[plain(rawTitle)],description:plain(lead),focus:"center center"},nav:nav.filter(x=>used.has(x.id)).slice(0,8),sections:result,...(closing?{closing}:{})};
}
function tiny(t){return {schema_version:2,category:"arch-viz",slug:t.slug,title:t.title,indexable:t.indexable,seo:t.seo,hero:{src:"./"+t.hero.image,alt:t.hero.alt,eyebrow:t.hero.eyebrow,lines:t.hero.headline,description:t.hero.description,focus:"center center"},nav:t.navigation.map(x=>({id:x.section,label:x.label})),sections:[{kind:"text",id:"overview",title:t.overview.headline.join(" "),paragraphs:[t.overview.description],items:t.overview.tags},...t.gallery.sections.map(s=>({kind:"gallery",id:s.id,title:s.heading.join(" "),label:s.label,paragraphs:[s.description],images:s.images.map(i=>typeof i==="string"?{src:"./"+i,alt:s.label+" architectural visualization"}:{src:"./"+i.file,alt:i.alt||s.label+" architectural visualization",caption:i.caption||""}),groups:s.images.length===2?[2]:s.images.length>2?[1,...Array(Math.floor((s.images.length-1)/2)).fill(2),...((s.images.length-1)%2?[1]:[])]:[1]}))],closing:{title:t.closing.headline.join(" ")}}}
for(const slug of slugs){const dest=path.join(out,slug+".json");if(fs.existsSync(dest)){const old=JSON.parse(fs.readFileSync(dest,"utf8"));if(old.schema_version===2){console.log("KEEP: "+slug);continue}if(slug!=="tiny-living")throw Error("Unknown existing manifest "+slug);const m=tiny(old);fs.writeFileSync(dest,JSON.stringify(m,null,2)+"\n");console.log("IMPORT: "+slug);continue}
const doc=fs.readFileSync(path.join(previews,slug,"index.html"),"utf8"),m=fromHtml(slug,doc);fs.writeFileSync(dest,JSON.stringify(m,null,2)+"\n");console.log("IMPORT: "+slug+" "+m.sections.length+" sections")}
