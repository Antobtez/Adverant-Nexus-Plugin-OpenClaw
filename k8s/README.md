# OpenClaw Kubernetes Manifests

This directory contains all Kubernetes manifests for deploying the OpenClaw plugin to the Nexus K3s cluster.

## Files

- **deployment.yaml** - Main deployment with Service and HorizontalPodAutoscaler
- **virtualservice.yaml** - Istio VirtualService for routing (WebSocket, UI, API)
- **destinationrule.yaml** - Istio DestinationRule for traffic management
- **networkpolicy.yaml** - Network policies for zero-trust security
- **serviceaccount.yaml** - ServiceAccount with RBAC permissions
- **secrets.yaml.example** - Example secrets file (DO NOT commit actual secrets)

## Prerequisites

Before deploying, ensure:

1. **Namespace exists**: `kubectl get namespace nexus`
2. **Secrets are created**: See [Creating Secrets](#creating-secrets) below
3. **Dependencies are running**:
   - PostgreSQL (nexus-postgres)
   - Redis (nexus-redis)
   - GraphRAG Enhanced (nexus-graphrag-enhanced)
   - MageAgent (mageagent)
   - Istio Gateway (istio-system/nexus-stack-gateway)

## Creating Secrets

Before first deployment, create required secrets:

```bash
# Create nexus-secrets (if not already exists)
kubectl create secret generic nexus-secrets -n nexus \
  --from-literal=POSTGRES_PASSWORD='your-postgres-password' \
  --from-literal=NEXUS_API_KEY='your-nexus-api-key' \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  --dry-run=client -o yaml | kubectl apply -f -

# Create api-keys (if not already exists)
kubectl create secret generic api-keys -n nexus \
  --from-literal=ANTHROPIC_API_KEY='sk-ant-...' \
  --from-literal=OPENROUTER_API_KEY='sk-or-...' \
  --dry-run=client -o yaml | kubectl apply -f -

# Verify secrets
kubectl get secrets -n nexus | grep -E 'nexus-secrets|api-keys'
```

## Deployment

### Deploy All Resources

```bash
# From plugin root directory
kubectl apply -f k8s/

# Or apply in specific order
kubectl apply -f k8s/serviceaccount.yaml
kubectl apply -f k8s/networkpolicy.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/destinationrule.yaml
kubectl apply -f k8s/virtualservice.yaml
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n nexus -l app=nexus-openclaw

# Check service
kubectl get svc -n nexus nexus-openclaw

# Check HPA
kubectl get hpa -n nexus nexus-openclaw-hpa

# Check Istio routing
kubectl get virtualservice -n nexus nexus-openclaw
kubectl get destinationrule -n nexus nexus-openclaw

# Check network policy
kubectl get networkpolicy -n nexus nexus-openclaw-policy

# Check logs
kubectl logs -n nexus -l app=nexus-openclaw --tail=100 -f
```

### Test Endpoints

```bash
# Health check
curl https://api.adverant.ai/openclaw/health

# Readiness check
curl https://api.adverant.ai/openclaw/ready

# Liveness check
curl https://api.adverant.ai/openclaw/live

# UI access
curl -I https://api.adverant.ai/openclaw/ui

# API endpoints
curl https://api.adverant.ai/openclaw/api/v1/sessions
```

## Scaling

### Manual Scaling

```bash
# Scale to 3 replicas
kubectl scale deployment nexus-openclaw -n nexus --replicas=3

# Check scaling status
kubectl get pods -n nexus -l app=nexus-openclaw
```

### Auto-scaling (HPA)

HPA is configured to scale between 2-5 replicas based on:
- CPU: 70% utilization
- Memory: 80% utilization

```bash
# Check HPA status
kubectl get hpa -n nexus nexus-openclaw-hpa

# Detailed HPA info
kubectl describe hpa -n nexus nexus-openclaw-hpa
```

## Updates

### Rolling Update

```bash
# Update image
kubectl set image deployment/nexus-openclaw \
  openclaw=localhost:5000/nexus-openclaw:new-version \
  -n nexus

# Watch rollout
kubectl rollout status deployment/nexus-openclaw -n nexus

# Check rollout history
kubectl rollout history deployment/nexus-openclaw -n nexus
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/nexus-openclaw -n nexus

# Rollback to specific revision
kubectl rollout undo deployment/nexus-openclaw -n nexus --to-revision=2
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl get pods -n nexus -l app=nexus-openclaw

# Describe pod
kubectl describe pod -n nexus -l app=nexus-openclaw

# Check events
kubectl get events -n nexus --sort-by='.lastTimestamp' | grep openclaw

# Check logs
kubectl logs -n nexus -l app=nexus-openclaw --previous
```

### Connection Issues

```bash
# Check service endpoints
kubectl get endpoints -n nexus nexus-openclaw

# Test internal connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n nexus -- \
  curl http://nexus-openclaw:8080/openclaw/health

# Check network policy
kubectl describe networkpolicy -n nexus nexus-openclaw-policy
```

### Istio Routing Issues

```bash
# Check VirtualService
kubectl describe virtualservice -n nexus nexus-openclaw

# Check DestinationRule
kubectl describe destinationrule -n nexus nexus-openclaw

# Check Istio proxy logs
kubectl logs -n nexus -l app=nexus-openclaw -c istio-proxy --tail=100

# Verify Istio sidecar injection
kubectl get pod -n nexus -l app=nexus-openclaw -o jsonpath='{.items[0].spec.containers[*].name}'
# Should show: openclaw, istio-proxy
```

### Database Connection Issues

```bash
# Check PostgreSQL connectivity
kubectl run -it --rm pg-test --image=postgres:16-alpine --restart=Never -n nexus -- \
  psql -h nexus-postgres.nexus-data.svc.cluster.local -U nexus -d unified_nexus -c '\l'

# Check Redis connectivity
kubectl run -it --rm redis-test --image=redis:alpine --restart=Never -n nexus -- \
  redis-cli -h nexus-redis.nexus-data.svc.cluster.local ping
```

### Secret Issues

```bash
# Verify secrets exist
kubectl get secret nexus-secrets -n nexus
kubectl get secret api-keys -n nexus

# Check if pod can access secrets
kubectl exec -n nexus -l app=nexus-openclaw -- env | grep -E 'POSTGRES|API_KEY'
```

## Cleanup

```bash
# Delete all OpenClaw resources
kubectl delete -f k8s/

# Or delete individually
kubectl delete deployment nexus-openclaw -n nexus
kubectl delete service nexus-openclaw -n nexus
kubectl delete hpa nexus-openclaw-hpa -n nexus
kubectl delete virtualservice nexus-openclaw -n nexus
kubectl delete destinationrule nexus-openclaw -n nexus
kubectl delete networkpolicy nexus-openclaw-policy -n nexus
kubectl delete serviceaccount nexus-openclaw -n nexus
kubectl delete role nexus-openclaw-role -n nexus
kubectl delete rolebinding nexus-openclaw-rolebinding -n nexus
```

## Monitoring

### Metrics

```bash
# Prometheus metrics endpoint
curl https://api.adverant.ai/openclaw/metrics

# Check HPA metrics
kubectl get hpa -n nexus nexus-openclaw-hpa -o yaml

# Pod resource usage
kubectl top pods -n nexus -l app=nexus-openclaw
```

### Logs

```bash
# Stream logs from all pods
kubectl logs -n nexus -l app=nexus-openclaw -f

# Logs from specific container
kubectl logs -n nexus <pod-name> -c openclaw

# Previous pod logs (if crashed)
kubectl logs -n nexus <pod-name> --previous

# Export logs to file
kubectl logs -n nexus -l app=nexus-openclaw --tail=1000 > openclaw-logs.txt
```

## Security

### Security Context

The deployment enforces Pod Security Standard "restricted":
- `runAsNonRoot: true`
- `runAsUser: 1001`
- `fsGroup: 1001`
- `allowPrivilegeEscalation: false`
- `capabilities.drop: ALL`
- `seccompProfile: RuntimeDefault`

### Network Policy

Network policy enforces zero-trust:
- Default deny all ingress/egress
- Explicit allow rules for required connections
- Blocks access to private IP ranges from external egress

### RBAC

ServiceAccount has minimal permissions:
- Read-only access to specific secrets
- Read-only access to services and endpoints
- No write permissions

## Advanced Configuration

### Environment Variables

Override environment variables in deployment:

```bash
kubectl set env deployment/nexus-openclaw -n nexus \
  LOG_LEVEL=debug \
  MAX_SESSIONS=200
```

### Resource Limits

Adjust resource limits:

```bash
kubectl set resources deployment/nexus-openclaw -n nexus \
  --limits=cpu=6000m,memory=12Gi \
  --requests=cpu=1500m,memory=3Gi
```

### Add ConfigMap

```bash
kubectl create configmap openclaw-config -n nexus \
  --from-literal=FEATURE_FLAG_X=true \
  --from-literal=TIMEOUT_SECONDS=300
```

Then mount in deployment.yaml:

```yaml
envFrom:
- configMapRef:
    name: openclaw-config
```

## References

- [Nexus Plugin Development Guide](https://docs.adverant.ai/plugins/development)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Istio Documentation](https://istio.io/docs/)
- [K3s Documentation](https://docs.k3s.io/)
