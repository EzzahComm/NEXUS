# GitHub Actions — Required Secrets

Configure these in: **GitHub → Settings → Secrets and variables → Actions**

## Deployment Secrets

| Secret | Description |
|---|---|
| `VPS_HOST` | VPS IP address or hostname |
| `VPS_USER` | SSH username (e.g. `ubuntu`) |
| `VPS_SSH_KEY` | Private SSH key (full contents of `~/.ssh/id_rsa`) |
| `VPS_PORT` | SSH port — defaults to `22` if not set |
| `APP_URL` | Production URL e.g. `https://nexus.ezzahcomm.com` |

## Generating an SSH Deploy Key

```bash
# On your local machine
ssh-keygen -t ed25519 -C "nexus-deploy" -f ~/.ssh/nexus_deploy

# Add public key to VPS
ssh-copy-id -i ~/.ssh/nexus_deploy.pub ubuntu@your-vps-ip

# Paste the PRIVATE key contents into VPS_SSH_KEY secret
cat ~/.ssh/nexus_deploy
```
