import assert from 'node:assert/strict';
await import('./ticket.js');
const context={font:'',measureText(value){return {width:Array.from(value).length*Number.parseInt(this.font)*.58}}};
const plan=PickADateTicket.layout(context,{name1:'Alex'.repeat(7),name2:'Sam'.repeat(10),message:'memory'.repeat(41)},{day:'2027-12-03',time:'18:15',timezone:'Asia/Kolkata',activity:'adventure'.repeat(11),vibe:'cozy',rule:'wonderful'.repeat(16),agreementNote:'a little more us '.repeat(15)},'accepted');
assert.ok(plan.height>1200);assert.equal(plan.width,1000);for(const line of plan.lines){context.font=line.size+'px Georgia';assert.ok(context.measureText(line.text).width<=820);assert.ok(line.y<plan.height-60)}assert.ok(plan.lines.some(l=>l.text.includes('Asia/Kolkata')));assert.equal(plan.lines.at(-1).text,'a little more us.');assert.equal(PickADateTicket.wrap(context,'a\nb',820).length,2);
console.log('PASS: long ticket text and unbroken words fit within dynamic image bounds, timezone included, footer retained');
