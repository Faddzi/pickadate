const text=(v,max=250)=>typeof v==='string'?v.trim().slice(0,max):'';
function invalid(message){throw Object.assign(Error(message),{status:400})}
export function instantFor(day,time,timezone){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))invalid('Choose a valid day and time.');
 const target=Date.parse(day+'T'+time+':00Z');if(!Number.isFinite(target)||new Date(target).toISOString().slice(0,10)!==day)invalid('Choose a real calendar date.');
 let formatter;try{formatter=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}catch{invalid('Choose a valid timezone.')}
 const localParts=value=>Object.fromEntries(formatter.formatToParts(new Date(value)).map(p=>[p.type,p.value]));let guess=target;
 for(let n=0;n<4;n++){const p=localParts(guess);const local=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);const offset=target-local;if(!offset)break;guess+=offset}
 const p=localParts(guess);if(`${p.year}-${p.month}-${p.day}`!==day||`${p.hour}:${p.minute}`!==time)invalid('That time does not exist in this timezone. Choose another time.');
 return new Date(guess).toISOString();
}
export function datePlan(input,base={}){const result={};for(const [key,max]of Object.entries({day:10,time:5,vibe:100,activity:100,rule:150,timezone:80})){result[key]=text(input[key],max)||base[key]|| (key==='timezone'?'Asia/Kolkata':'')};if(!result.vibe||!result.activity||!result.rule)invalid('Complete your date details.');result.startsAt=instantFor(result.day,result.time,result.timezone);return result}
export function makeReply(input,details,status){
 if(!['accepted','counter','reschedule'].includes(input.status))invalid('Choose a reply.');
 const message=text(input.message);if(input.status==='counter'&&!message&&!['activity','vibe','rule','time','day'].some(k=>text(input[k])))invalid('Suggest a change or leave a note.');if(input.status==='reschedule'&&!text(input.day))invalid('Suggest a new day.');
 const changes={};for(const k of ['day','time','activity','vibe','rule','timezone'])if(text(input[k]))changes[k]=input[k];
 return {message,day:text(input.day,10),proposal:input.status==='accepted'?null:datePlan(changes,details),previousStatus:status==='accepted'?'accepted':'proposed',decision:'pending'};
}
export function reviewedPlan(details,reply,action){if(action!=='accept'&&action!=='decline')invalid('Choose accept or decline.');if(!reply)invalid('This suggestion has no plan to review.');reply={...reply,proposal:reply.proposal||datePlan({day:reply.day},details)};return action==='accept'?{...datePlan(reply.proposal,details),revision:(details.revision||0)+1,agreementNote:reply.message||''}:{...details,revision:(details.revision||0)+1}}
