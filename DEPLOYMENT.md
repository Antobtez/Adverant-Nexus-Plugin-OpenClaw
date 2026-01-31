# OpenClaw Plugin Deployment Guide

Complete deployment guide for the OpenClaw plugin to Nexus K3s cluster on server 157.173.102.118.

## Prerequisites

### Required Infrastructure
- ✅ Nexus K3s cluster running on 157.173.102.118
- ✅ Istio service mesh installed
- ✅ PostgreSQL database (nexus-postgres)
- ✅ Redis cache (nexus-redis)
- ✅ Neo4j graph database (optional)
- ✅ Local Docker registry (localhost:5000)

### Required Services
- ✅ nexus-graphrag-enhanced (GraphRAG service)
- ✅ mageagent (Multi-agent orchestration)
- ✅ nexus-gateway (API Gateway)
- ✅ nexus-auth (Authentication service)

### Required Secrets
- API Keys (Anthropic, OpenRouter)
- Database credentials
- JWT secrets

## Phase 1: Pre-Deployment Checklist

### 1.1 Verify Repository Structure

```bash
# On local machine
cd /Users/don/Adverant/Adverant-Nexus-Plugin-OpenClaw

# Check directory structure
tree -L 3
```

Expected structure:
```
Adverant-Nexus-Plugin-OpenClaw/
├── services/
│   └── nexus-openclaw/
│       ├── src/
│       ├── package.json
│       ├── Dockerfile
│       └── .dockerignore
├── k8s/
│   ├── deployment.yaml
│   ├── virtualservice.yaml
│   ├── destinationrule.yaml
│   ├── networkpolicy.yaml
│   ├── serviceaccount.yaml
│   ├── secrets.yaml.example
│   ├── kustomization.yaml
│   └── README.md
├── ui/
│   └── (Next.js UI components)
├── skills/
│   └── (Skill definitions)
├── database/
│   └── migrations/
└── nexus.manifest.json
```

### 1.2 Commit and Push to GitHub

```bash
# On local machine
git add .
git commit -m "feat(openclaw): Add Phase 5 - Kubernetes deployment manifests and Dockerfile"
git push origin main
```

## Phase 2: Server Preparation

### 2.1 SSH into Server

```bash
# From local machine
ssh root@157.173.102.118
```

### 2.2 Clone or Update Repository

```bash
# On server
cd /root
git clone https://github.com/adverant/Adverant-Nexus-Plugin-OpenClaw.git

# Or update existing repo
cd /root/Adverant-Nexus-Plugin-OpenClaw
git pull origin main
```

### 2.3 Verify Namespace Exists

```bash
# Check if nexus namespace exists
k3s kubectl get namespace nexus

# If not, create it
k3s kubectl create namespace nexus
```

## Phase 3: Create Secrets

### 3.1 Check Existing Secrets

```bash
# List existing secrets in nexus namespace
k3s kubectl get secrets -n nexus

# Check if required secrets exist
k3s kubectl get secret nexus-secrets -n nexus 2>/dev/null && echo "✅ nexus-secrets exists" || echo "❌ nexus-secrets missing"
k3s kubectl get secret api-keys -n nexus 2>/dev/null && echo "✅ api-keys exists" || echo "❌ api-keys missing"
```

### 3.2 Create Missing Secrets

**Option A: From Environment Variables**

```bash
# Set environment variables (replace with actual values)
export POSTGRES_PASSWORD="your-postgres-password"
export NEXUS_API_KEY="your-nexus-api-key"
export JWT_SECRET="your-jwt-secret"
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENROUTER_API_KEY="sk-or-..."

# Create nexus-secrets
k3s kubectl create secret generic nexus-secrets -n nexus \
  --from-literal=POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  --from-literal=NEXUS_API_KEY="${NEXUS_API_KEY}" \
  --from-literal=JWT_SECRET="${JWT_SECRET}" \
  --dry-run=client -o yaml | k3s kubectl apply -f -

# Create api-keys
k3s kubectl create secret generic api-keys -n nexus \
  --from-literal=ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
  --from-literal=OPENROUTER_API_KEY="${OPENROUTER_API_KEY}" \
  --dry-run=client -o yaml | k3s kubectl apply -f -
```

**Option B: From Files**

```bash
# Create secret files (one value per file)
mkdir -p /tmp/secrets
echo -n "your-postgres-password" > /tmp/secrets/POSTGRES_PASSWORD
echo -n "your-api-key" > /tmp/secrets/ANTHROPIC_API_KEY

# Create secrets from files
k3s kubectl create secret generic nexus-secrets -n nexus \
  --from-file=POSTGRES_PASSWORD=/tmp/secrets/POSTGRES_PASSWORD \
  --from-file=NEXUS_API_KEY=/tmp/secrets/NEXUS_API_KEY \
  --from-file=JWT_SECRET=/tmp/secrets/JWT_SECRET

k3s kubectl create secret generic api-keys -n nexus \
  --from-file=ANTHROPIC_API_KEY=/tmp/secrets/ANTHROPIC_API_KEY \
  --from-file=OPENROUTER_API_KEY=/tmp/secrets/OPENROUTER_API_KEY

# Clean up
rm -rf /tmp/secrets
```

### 3.3 Verify Secrets

```bash
# List secrets
k3s kubectl get secrets -n nexus | grep -E 'nexus-secrets|api-keys'

# Check secret keys (not values)
k3s kubectl describe secret nexus-secrets -n nexus
k3s kubectl describe secret api-keys -n nexus
```

## Phase 4: Build Docker Image

### 4.1 Generate Build Metadata

```bash
# On server, in plugin directory
cd /root/Adverant-Nexus-Plugin-OpenClaw

export SERVICE="nexus-openclaw"
export BUILD_ID="${SERVICE}-$(date +%Y%m%d)-$(openssl rand -hex 4)"
export BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export GIT_COMMIT=$(git rev-parse --short HEAD)
export GIT_BRANCH=$(git branch --show-current)
export VERSION=$(grep '"version"' services/nexus-openclaw/package.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')

# Print build info
echo "Build ID: $BUILD_ID"
echo "Timestamp: $BUILD_TIMESTAMP"
echo "Git Commit: $GIT_COMMIT"
echo "Git Branch: $GIT_BRANCH"
echo "Version: $VERSION"
```

### 4.2 Build Docker Image

```bash
# Build with all metadata
docker build \
  --build-arg BUILD_ID="${BUILD_ID}" \
  --build-arg BUILD_TIMESTAMP="${BUILD_TIMESTAMP}" \
  --build-arg GIT_COMMIT="${GIT_COMMIT}" \
  --build-arg GIT_BRANCH="${GIT_BRANCH}" \
  --build-arg VERSION="${VERSION}" \
  --no-cache \
  -t localhost:5000/nexus-openclaw:${BUILD_ID} \
  -t localhost:5000/nexus-openclaw:latest \
  -f services/nexus-openclaw/Dockerfile \
  .

# This will take several minutes...
```

### 4.3 Verify Build

```bash
# Check image exists
docker images | grep nexus-openclaw

# Inspect image labels
docker inspect localhost:5000/nexus-openclaw:latest | jq '.[0].Config.Labels'

# Verify build metadata
docker run --rm localhost:5000/nexus-openclaw:latest env | grep NEXUS_
```

### 4.4 Push to Local Registry

```bash
# Push both tags
docker push localhost:5000/nexus-openclaw:${BUILD_ID}
docker push localhost:5000/nexus-openclaw:latest

# Verify in registry
curl -s http://localhost:5000/v2/nexus-openclaw/tags/list | jq
```

## Phase 5: Deploy to Kubernetes

### 5.1 Apply Kubernetes Manifests

```bash
# Apply in order (dependencies first)
cd /root/Adverant-Nexus-Plugin-OpenClaw/k8s

# 1. ServiceAccount and RBAC
k3s kubectl apply -f serviceaccount.yaml

# 2. NetworkPolicy
k3s kubectl apply -f networkpolicy.yaml

# 3. Deployment, Service, and HPA
k3s kubectl apply -f deployment.yaml

# 4. Istio DestinationRule
k3s kubectl apply -f destinationrule.yaml

# 5. Istio VirtualService
k3s kubectl apply -f virtualservice.yaml

# Or apply all at once
k3s kubectl apply -f .
```

### 5.2 Watch Rollout

```bash
# Watch deployment rollout
k3s kubectl rollout status deployment/nexus-openclaw -n nexus

# Watch pod creation
watch k3s kubectl get pods -n nexus -l app=nexus-openclaw
```

### 5.3 Verify Deployment

```bash
# Check pods are running
k3s kubectl get pods -n nexus -l app=nexus-openclaw

# Check service
k3s kubectl get svc -n nexus nexus-openclaw

# Check HPA
k3s kubectl get hpa -n nexus nexus-openclaw-hpa

# Check Istio resources
k3s kubectl get virtualservice -n nexus nexus-openclaw
k3s kubectl get destinationrule -n nexus nexus-openclaw

# Check network policy
k3s kubectl get networkpolicy -n nexus nexus-openclaw-policy
```

## Phase 6: Post-Deployment Verification

### 6.1 Check Pod Health

```bash
# Get pod status
k3s kubectl get pods -n nexus -l app=nexus-openclaw -o wide

# Describe pod (check events)
k3s kubectl describe pod -n nexus -l app=nexus-openclaw

# Check logs
k3s kubectl logs -n nexus -l app=nexus-openclaw --tail=50

# Check Istio sidecar
k3s kubectl get pod -n nexus -l app=nexus-openclaw -o jsonpath='{.items[0].spec.containers[*].name}'
# Should output: openclaw istio-proxy
```

### 6.2 Test Internal Connectivity

```bash
# Test from within cluster
k3s kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n nexus -- \
  curl -v http://nexus-openclaw:8080/openclaw/health

# Expected response: {"status":"ok","timestamp":"..."}
```

### 6.3 Test External Access

```bash
# Health check
curl https://api.adverant.ai/openclaw/health

# Readiness check
curl https://api.adverant.ai/openclaw/ready

# Liveness check
curl https://api.adverant.ai/openclaw/live

# UI access (should return HTML)
curl -I https://api.adverant.ai/openclaw/ui

# API endpoint
curl https://api.adverant.ai/openclaw/api/v1/sessions
```

### 6.4 Verify Build Metadata

```bash
# Check running pod's build info
POD_NAME=$(k3s kubectl get pod -n nexus -l app=nexus-openclaw -o jsonpath='{.items[0].metadata.name}')
k3s kubectl exec -n nexus $POD_NAME -- env | grep NEXUS_

# Expected output:
# NEXUS_BUILD_ID=nexus-openclaw-20240131-a7c3f2e1
# NEXUS_BUILD_TIMESTAMP=2024-01-31T12:34:56Z
# NEXUS_GIT_COMMIT=abc1234
# NEXUS_GIT_BRANCH=main
# NEXUS_VERSION=1.0.0
```

### 6.5 Verify WebSocket Connection

```bash
# Test WebSocket endpoint (requires wscat or similar)
# Install wscat if needed: npm install -g wscat

wscat -c wss://api.adverant.ai/openclaw/ws

# Or use curl with upgrade headers
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: $(echo $RANDOM | base64)" \
  https://api.adverant.ai/openclaw/ws
```

## Phase 7: Monitoring and Troubleshooting

### 7.1 Monitor Logs

```bash
# Stream logs from all pods
k3s kubectl logs -n nexus -l app=nexus-openclaw -f

# Filter for errors
k3s kubectl logs -n nexus -l app=nexus-openclaw --tail=100 | grep -i error

# Check Istio proxy logs
k3s kubectl logs -n nexus -l app=nexus-openclaw -c istio-proxy --tail=50
```

### 7.2 Check Metrics

```bash
# Get pod resource usage
k3s kubectl top pods -n nexus -l app=nexus-openclaw

# Check HPA metrics
k3s kubectl get hpa -n nexus nexus-openclaw-hpa -o yaml

# Prometheus metrics
curl https://api.adverant.ai/openclaw/metrics
```

### 7.3 Common Issues and Fixes

**Issue: Pods in CrashLoopBackOff**

```bash
# Check logs from previous run
k3s kubectl logs -n nexus -l app=nexus-openclaw --previous

# Check pod events
k3s kubectl describe pod -n nexus -l app=nexus-openclaw | grep -A 20 Events

# Common causes:
# - Missing secrets
# - Database connection failed
# - Port already in use
```

**Issue: Service Not Accessible**

```bash
# Check service endpoints
k3s kubectl get endpoints -n nexus nexus-openclaw

# If no endpoints, pods aren't ready - check readiness probe
k3s kubectl get pods -n nexus -l app=nexus-openclaw -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")]}'

# Check Istio routing
k3s kubectl describe virtualservice -n nexus nexus-openclaw
```

**Issue: 503 Service Unavailable**

```bash
# Check if Istio sidecar is ready
k3s kubectl get pods -n nexus -l app=nexus-openclaw -o jsonpath='{.items[*].status.containerStatuses[*].ready}'

# Check Istio proxy logs
k3s kubectl logs -n nexus -l app=nexus-openclaw -c istio-proxy --tail=100

# Restart pods (forces sidecar re-injection)
k3s kubectl rollout restart deployment/nexus-openclaw -n nexus
```

**Issue: Database Connection Failed**

```bash
# Check PostgreSQL is running
k3s kubectl get pods -n nexus-data -l app=postgres

# Test connection from OpenClaw pod
POD_NAME=$(k3s kubectl get pod -n nexus -l app=nexus-openclaw -o jsonpath='{.items[0].metadata.name}')
k3s kubectl exec -n nexus $POD_NAME -- sh -c 'nc -zv nexus-postgres.nexus-data.svc.cluster.local 5432'

# Check network policy allows PostgreSQL
k3s kubectl describe networkpolicy -n nexus nexus-openclaw-policy | grep -A 5 postgres
```

## Phase 8: Scaling and Performance

### 8.1 Manual Scaling

```bash
# Scale to 3 replicas
k3s kubectl scale deployment nexus-openclaw -n nexus --replicas=3

# Watch scaling
watch k3s kubectl get pods -n nexus -l app=nexus-openclaw
```

### 8.2 Adjust Resource Limits

```bash
# Increase CPU/memory limits
k3s kubectl set resources deployment/nexus-openclaw -n nexus \
  --limits=cpu=6000m,memory=12Gi \
  --requests=cpu=1500m,memory=3Gi

# Verify changes
k3s kubectl describe deployment -n nexus nexus-openclaw | grep -A 5 Limits
```

### 8.3 Configure HPA

```bash
# Modify HPA thresholds
k3s kubectl patch hpa nexus-openclaw-hpa -n nexus --patch '
spec:
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
'

# Watch autoscaling
watch k3s kubectl get hpa -n nexus nexus-openclaw-hpa
```

## Phase 9: Rollback (If Needed)

### 9.1 Check Rollout History

```bash
# View deployment history
k3s kubectl rollout history deployment/nexus-openclaw -n nexus
```

### 9.2 Rollback to Previous Version

```bash
# Undo last deployment
k3s kubectl rollout undo deployment/nexus-openclaw -n nexus

# Rollback to specific revision
k3s kubectl rollout undo deployment/nexus-openclaw -n nexus --to-revision=2

# Watch rollback
k3s kubectl rollout status deployment/nexus-openclaw -n nexus
```

## Phase 10: Cleanup (Optional)

### 10.1 Delete Resources

```bash
# Delete all OpenClaw resources
cd /root/Adverant-Nexus-Plugin-OpenClaw/k8s
k3s kubectl delete -f .

# Or delete individually
k3s kubectl delete deployment nexus-openclaw -n nexus
k3s kubectl delete service nexus-openclaw -n nexus
k3s kubectl delete hpa nexus-openclaw-hpa -n nexus
k3s kubectl delete virtualservice nexus-openclaw -n nexus
k3s kubectl delete destinationrule nexus-openclaw -n nexus
k3s kubectl delete networkpolicy nexus-openclaw-policy -n nexus
k3s kubectl delete serviceaccount nexus-openclaw -n nexus
```

### 10.2 Delete Secrets (Careful!)

```bash
# Only delete if you're sure
k3s kubectl delete secret nexus-secrets -n nexus
k3s kubectl delete secret api-keys -n nexus
```

### 10.3 Delete Docker Images

```bash
# Delete from local registry
docker rmi localhost:5000/nexus-openclaw:latest
docker rmi localhost:5000/nexus-openclaw:${BUILD_ID}

# Clean up build cache
docker system prune -f
```

## Summary Checklist

- [ ] Repository pushed to GitHub
- [ ] Server repository cloned/updated
- [ ] Namespace `nexus` exists
- [ ] Secrets created and verified
- [ ] Docker image built with metadata
- [ ] Image pushed to localhost:5000
- [ ] Kubernetes manifests applied
- [ ] Pods running (2/2 replicas)
- [ ] Health checks passing
- [ ] External endpoints accessible
- [ ] WebSocket connection working
- [ ] Logs show no errors
- [ ] HPA functioning
- [ ] Istio routing configured
- [ ] Network policy enforced

## Next Steps

After successful deployment:

1. **Configure Channels**: Set up WhatsApp, Telegram, Discord channels via UI
2. **Load Skills**: Import 100+ skills from skills directory
3. **Test Workflows**: Execute sample skills and verify Nexus integration
4. **Monitor Performance**: Watch metrics and adjust resource limits
5. **Enable Observability**: Configure Prometheus, Grafana dashboards
6. **Set Up Alerts**: Configure alerting for pod failures, resource limits

## Support

For issues during deployment:
- Check logs: `k3s kubectl logs -n nexus -l app=nexus-openclaw --tail=200`
- Review events: `k3s kubectl get events -n nexus --sort-by='.lastTimestamp'`
- Contact support: openclaw-support@adverant.ai
- GitHub issues: https://github.com/adverant/Adverant-Nexus-Plugin-OpenClaw/issues
