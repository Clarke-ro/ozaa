import Ajv2020 from 'ajv/dist/2020.js'; import addFormats from 'ajv-formats'; import yaml from 'js-yaml'; import fs from 'node:fs';
// Checks every fixture against api/openapi.yaml. Needs: npm i -D ajv ajv-formats js-yaml
const k=new URL('../../', import.meta.url).pathname;
const spec=yaml.load(fs.readFileSync(k+'api/openapi.yaml','utf8'));
const ajv=new Ajv2020({strict:false,allErrors:true}); addFormats(ajv);
ajv.addSchema({$id:'oas',components:spec.components});
const ref=n=>({$ref:'oas#/components/schemas/'+n});
const listOf=n=>({type:'object',required:['items'],properties:{items:{type:'array',items:ref(n)}}});
const map={venues:ref('VenuePublic'),menus:ref('Menu'),stories:listOf('Story'),loyaltyCards:ref('LoyaltyCard'),wifi:ref('Wifi'),offers:listOf('Offer'),orders:ref('Order'),
 leaderboards:{$id:'lb',...JSON.parse(JSON.stringify(spec.paths['/venues/{venueSlug}/game/leaderboard'].get.responses['200'].content['application/json'].schema).replaceAll('"#/components','"oas#/components'))}};
let bad=0;
for(const [f,s] of Object.entries(map)){const data=JSON.parse(fs.readFileSync(k+'api/fixtures/'+f+'.json'));const v=ajv.compile(s);
 for(const [slug,d] of Object.entries(data)){ if(!v(d)){bad++;console.log(f,slug,JSON.stringify(v.errors.slice(0,3)));} }}
console.log(bad?'FAIL '+bad:'all fixtures match the contract');
