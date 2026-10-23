const invalid=(message,status=400)=>{throw Object.assign(Error(message),{status})};
export const MAX_PHOTO_LENGTH=350000;
export function photoData(value){
 if(value===undefined||value===null||value==='')return '';
 if(typeof value!=='string')invalid('Choose a JPG, PNG or WebP photo.');
 if(value.length>MAX_PHOTO_LENGTH)invalid('That photo is too large after compression. Choose a smaller photo.',413);
 const match=value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
 if(!match||match[2].length%4)invalid('Invalid photo. Choose a JPG, PNG or WebP.');
 const bytes=Buffer.from(match[2],'base64');
 if(bytes.toString('base64')!==match[2])invalid('Invalid photo encoding.');
 const type=match[1];
 const valid=type==='png'?bytes.length>=45&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.subarray(12,16).toString()==='IHDR'&&bytes.subarray(-8,-4).toString()==='IEND':type==='jpeg'?bytes.length>=16&&bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217:bytes.length>=20&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'&&bytes.readUInt32LE(4)+8===bytes.length;
 if(!valid)invalid('This photo does not match its file type. Choose another image.');
 return value;
}
