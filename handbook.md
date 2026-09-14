# Nexora EKS Rebuild Runbook

Run these in order whenever recreating the cluster after `terraform destroy`.
Each step assumes the previous one succeeded — don't skip ahead.

---

## 1. Provision core infra (Terraform)

```bash
terraform init
terraform plan
terraform apply
```
**What this does:** Creates VPC, EKS control plane, managed node group (ASG underneath), and the OIDC provider. This is the slowest step (15-20 min) — everything after this depends on it finishing.

---

## 2. Point kubectl at the new cluster

```bash
aws eks update-kubeconfig --region <your-region> --name <your-cluster-name>
kubectl get nodes
```
**What this does:** Updates your local kubeconfig to talk to the freshly created cluster. `kubectl get nodes` confirms nodes are `Ready` before you proceed.

---

## 3. Confirm ECR repos and images exist

```bash
aws ecr describe-repositories
```
**What this does:** ECR is NOT destroyed by `terraform destroy` unless you explicitly included it as a managed resource — check here rather than assuming. If the repos and your last-pushed images are still there, skip straight to step 6. If not, rebuild and push:

```bash
docker build -t nexora-backend ./backend
docker build --build-arg VITE_API_URL=/api -t nexora-frontend ./frontend

aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com

docker tag nexora-backend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/nexora-backend:latest
docker tag nexora-frontend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/nexora-frontend:latest

docker push <account-id>.dkr.ecr.<region>.amazonaws.com/nexora-backend:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/nexora-frontend:latest
```

---

## 4. Set up OIDC provider and IRSA for the ALB Controller (manual)

This is done by hand, not via Terraform, so it's a required step every rebuild — the cluster's OIDC issuer URL is unique per cluster, so a fresh cluster always needs this redone from scratch.

**a. Check for an existing OIDC provider, create one if none matches:**
```bash
aws eks describe-cluster --name <your-cluster-name> --query "cluster.identity.oidc.issuer" --output text

aws iam list-open-id-connect-providers

eksctl utils associate-iam-oidc-provider --cluster <your-cluster-name> --approve
```
**What this does:** Confirms whether an OIDC provider already exists for this specific cluster (it won't, on a fresh cluster) and associates one if not — this is what lets Kubernetes service accounts assume IAM roles.

**b. Download the IAM policy for the ALB Controller:**
```bash
curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json
```
**What this does:** Defines the exact AWS permissions (ALB/target group management, EC2 describe calls, etc.) the controller needs. Note: if this policy already exists from a previous rebuild, `create-policy` will fail with "already exists" — that's fine, just reuse the existing policy ARN.

**c. Check for an existing service account, create the IAM service account if missing:**
```bash
kubectl get sa aws-load-balancer-controller -n kube-system

eksctl create iamserviceaccount \
  --cluster <your-cluster-name> \
  --namespace kube-system \
  --name aws-load-balancer-controller \
  --attach-policy-arn arn:aws:iam::<account-id>:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve
```
**What this does:** Creates the Kubernetes ServiceAccount and the IAM role together, wired to the OIDC provider from step (a), so the ALB Controller pod can actually make AWS API calls once it's running.

---

## 5. Install AWS Load Balancer Controller

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=<your-cluster-name> \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```
**What this does:** This is what actually creates the real ALB once your Ingress is applied. `serviceAccount.create=false` matters here — it tells Helm to use the service account you already created in step 4c rather than making a new, unlinked one.

---

## 6. Apply application manifests

```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/nexora-secret.yaml   # manual, not tracked in Git
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/backend-service.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml
kubectl apply -f kubernetes/frontend-service.yaml
kubectl apply -f kubernetes/hpa.yaml
kubectl apply -f kubernetes/netpol.yaml
kubectl apply -f kubernetes/ingress.yaml
```
**What this does:** Brings up your workloads and the Ingress, which triggers the ALB Controller to provision the real ALB. Check progress with:
```bash
kubectl get pods -n nexora
kubectl get ingress -n nexora
```
Wait for the Ingress to show an `ADDRESS` (the ALB's DNS name) before testing.

---

## 7. Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```
**What this does:** ArgoCD lives inside the cluster, so it's wiped on every `terraform destroy` and needs a fresh install every time — nothing carries over between rebuilds.

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
kubectl port-forward svc/argocd-server -n argocd 8081:443
```
Log in at `https://localhost:8081` (or via CLI), then immediately:
```bash
argocd account update-password
```

---

## 8. Re-connect Git repo and re-apply the Application

```bash
argocd repo add https://github.com/<your-username>/<your-repo>.git \
  --username <your-username> --password <token>

kubectl apply -f nexora-argocd-application.yaml
```
**What this does:** Re-establishes ArgoCD's watch on your manifests. Since the live cluster state (from step 5) should already match Git, this sync should come back `Synced / Healthy` immediately with no changes applied — that's the expected, correct outcome, not a sign something's wrong.

---

## 9. Verify Jenkins is reachable (if its EC2 instance persisted)

```bash
# from your machine or browser
curl -I http://<jenkins-ec2-public-ip>:8080
```
**What this does:** Jenkins' EC2 instance is outside the Terraform/EKS teardown cycle, so it may still be running even after a full `tf destroy`. If it's up, no reinstall needed — just re-trigger the Nexora pipeline job once to confirm it still builds/pushes/commits correctly against the new cluster's ECR repos. If the instance itself was torn down, you'll need to reprovision EC2, reinstall Jenkins, and reconfigure the pipeline job from scratch.

---

## 10. Full verification pass

- Load the app via the ALB's Ingress address
- Register → OTP email → login → create a post with an image → like/comment → follow → real-time chat (the actual stickiness test)
- Confirm HPA is present: `kubectl get hpa -n nexora`
- Confirm NetworkPolicies are present: `kubectl get netpol -n nexora`
- Trigger one Jenkins build and confirm it flows through to a live pod rollout via ArgoCD

---

## 11. When done demoing — tear down to stop the cost clock

```bash
terraform destroy
```
Note: this does **not** remove ECR repos/images (per step 3) or the Jenkins EC2 instance (per step 9) unless those are also Terraform-managed resources — confirm what's actually in scope before assuming a full teardown.