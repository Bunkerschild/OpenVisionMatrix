# Security Policy

## Supported Versions
OpenVisionMatrix is actively developed. Security fixes are provided only for
current releases and the latest main branch.

| Version | Supported |
|--------|-----------|
| Latest release / main | ✅ |
| Older releases | ❌ |

Please update to the latest version before reporting security issues.

## Reporting a Vulnerability
If you discover a security vulnerability in OpenVisionMatrix, please do not
open a public GitHub issue.

Report it responsibly via:
- Email: security@bunkerschild.de (preferred)
- GitHub Security Advisories (if enabled)

Please include:
- A clear description of the issue
- Affected component(s)
- Steps to reproduce (if possible)
- Potential impact
- Any proof-of-concept (optional)

We aim to acknowledge reports within 72 hours.

## Responsible Disclosure
We kindly ask security researchers to follow responsible disclosure practices:
- Do not publicly disclose vulnerabilities before a fix is available
- Allow reasonable time for investigation and mitigation

## Scope
This security policy applies to:
- PWA application code in `apps/pwa/`
- Shared packages in `packages/core/` and `packages/renderer/`
- Build tooling and repository scripts

It does not apply to:
- Third-party dependencies
- Local deployments modified outside this repository
- Misconfiguration or unsupported changes

## Security Measures
- No telemetry or network calls beyond user-initiated actions
- Local-first operation (assets are user-provided)
- Minimal dependency surface

Thank you for helping keep OpenVisionMatrix secure.
