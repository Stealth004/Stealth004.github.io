# CSR PBQ implementation notes

Locked rules:
- Private key remains protected locally and is never included in the CSR.
- SAN is the hostname identity field for TLS validation; CN is retained as subject/legacy context.
- `C=US` in the realistic X.509 subject.
- `serverAuth` is the HTTPS/TLS server EKU.
- Certificate Policies OID and AIA/OCSP are separate.
- Root trust requires a trusted root store; self-signed alone does not imply trust.
- Wildcard `*.intellectualpoint.com` matches exactly one left-most label, not the apex or deeper names.
- OCSP = on-demand individual status; CRL = published revocation list.
- Private-key compromise requires revoke + new key pair + new CSR/certificate.
