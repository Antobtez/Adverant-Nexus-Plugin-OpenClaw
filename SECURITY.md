# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please **DO NOT** open a public issue.

Instead, report it privately to:
- **Email**: security@adverant.ai
- **Subject**: [SECURITY] OpenClaw Plugin - Brief Description

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Fix Timeline**: Varies by severity (see below)

### Severity Levels

- **Critical**: Fix within 24-48 hours
- **High**: Fix within 1 week
- **Medium**: Fix within 1 month
- **Low**: Fix in next scheduled release

## Security Measures

OpenClaw implements the following security measures:

### Authentication & Authorization
- JWT token validation
- Multi-tenant isolation
- RBAC permissions
- API key support

### Network Security
- Kubernetes NetworkPolicy (zero-trust)
- Istio mTLS
- Default deny ingress/egress

### Data Protection
- AES-256-GCM encryption for credentials
- PostgreSQL row-level security
- Secrets stored in Kubernetes Secrets

### Runtime Security
- Execution Mode 3 (hardened Docker)
- runAsNonRoot, runAsUser 1001
- Drop ALL capabilities
- Read-only root filesystem (where possible)

### Monitoring
- Security audit logs
- Failed authentication tracking
- Rate limiting per tier
- Quota enforcement

## Best Practices

When deploying OpenClaw:

1. **Use Strong Secrets**
   - Generate cryptographically secure passwords
   - Rotate secrets regularly
   - Never commit secrets to git

2. **Keep Dependencies Updated**
   - Run `npm audit` regularly
   - Update dependencies monthly
   - Monitor security advisories

3. **Network Isolation**
   - Use NetworkPolicy
   - Limit egress to required services only
   - Enable mTLS

4. **Monitoring**
   - Monitor failed authentication attempts
   - Set up alerts for security events
   - Review logs regularly

## Security Compliance

OpenClaw is designed to meet:
- OWASP Top 10 security best practices
- Kubernetes Pod Security Standards (Restricted)
- NIST Cybersecurity Framework guidelines

For questions, contact: security@adverant.ai
