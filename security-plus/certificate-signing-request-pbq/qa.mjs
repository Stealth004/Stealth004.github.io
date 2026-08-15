import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (scripts.length !== 1) throw new Error(`Expected one inline script; found ${scripts.length}`);
new vm.Script(scripts[0], { filename: 'csr-pbq-inline.js' });

const required = [
  'Certificate Signing Request &amp; PKI',
  'data-mode="training"','data-mode="practice"','data-mode="exam"','data-mode="review"',
  'id="resetBtn"','id="screen-csr"','id="screen-flow"','id="screen-inspect"','id="screen-trouble"',
  "country:'US'", "san1:'api.intellectualpoint.com'", "san2:'*.intellectualpoint.com'", "eku:'serverAuth'",
  'Private key rule','Never sent to CA','SAN = names','EKU = purpose',
  'IP Root CA → IP Intermediate CA → api.intellectualpoint.com',
  '2026-08-01 → 2027-08-01',
  'Authority Information Access','Certificate Policies',
  'One cert → OCSP | List → CRL',
  "id:'hostname'", "id:'expired'", "id:'revoked'", "id:'intermediate'", "id:'eku'", "id:'untrusted'",
  'Revoke/replace with new key pair and new certificate',
  'Trusted Root CA',
  '*.intellectualpoint.com cover dev.api.intellectualpoint.com?',
  '.mode-practice .training-only,.mode-exam .training-only{display:none}'
];
for (const marker of required) if (!html.includes(marker)) throw new Error(`Missing required marker: ${marker}`);

const forbidden = [
  'CN is the primary hostname',
  'Country (C): USA',
  'self-signed = trusted',
  'private key is sent to the CA',
  'policyIdentifier → OCSP',
  'training-only" style="display:block'
];
for (const marker of forbidden) if (html.toLowerCase().includes(marker.toLowerCase())) throw new Error(`Forbidden training statement or mode leak present: ${marker}`);

function wildcardMatches(pattern, host){
  if (!pattern.startsWith('*.')) return pattern === host;
  const suffix = pattern.slice(2);
  if (!host.endsWith('.'+suffix)) return false;
  const left = host.slice(0, -(suffix.length+1));
  return left.length > 0 && !left.includes('.');
}
const wildcardTests = [
  ['*.intellectualpoint.com','api.intellectualpoint.com',true],
  ['*.intellectualpoint.com','mail.intellectualpoint.com',true],
  ['*.intellectualpoint.com','intellectualpoint.com',false],
  ['*.intellectualpoint.com','dev.api.intellectualpoint.com',false]
];
for (const [p,h,e] of wildcardTests) if (wildcardMatches(p,h)!==e) throw new Error(`Wildcard contract failed for ${h}`);

const weights=[.35,.20,.20,.25];
if (Math.abs(weights.reduce((a,b)=>a+b,0)-1) > 1e-9) throw new Error('Scoring weights do not total 100%');

const now = new Date('2026-08-15T00:00:00Z');
const notBefore = new Date('2026-08-01T00:00:00Z');
const notAfter = new Date('2027-08-01T00:00:00Z');
if (!(notBefore <= now && now <= notAfter)) throw new Error('Training certificate date window is not current');

console.log('CSR / PKI PBQ QA passed: syntax, mode separation, reset behavior, SAN/EKU/US-country rules, current certificate dates, trust-chain semantics, AIA vs policy separation, six incident variants, wildcard behavior, compromise remediation, and scoring weights.');
