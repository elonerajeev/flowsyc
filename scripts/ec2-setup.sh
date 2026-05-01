#!/bin/bash
# ============================================================
# Flowsyc EC2 Backend Setup Script
# Run this on a fresh Ubuntu EC2 instance
# ============================================================

set -e

echo "🚀 Starting Flowsyc Backend Setup on EC2..."

# ──────────────────────────────────────────────────────
# 1. UPDATE SYSTEM
# ──────────────────────────────────────────────────────
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# ──────────────────────────────────────────────────────
# 2. INSTALL DOCKER
# ──────────────────────────────────────────────────────
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed!"
else
    echo "✅ Docker already installed"
fi

# Install docker-compose plugin
echo "📦 Installing docker-compose plugin..."
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version

# ──────────────────────────────────────────────────────
# 3. INSTALL GIT & NODE.JS (for initial clone)
# ──────────────────────────────────────────────────────
echo "📦 Installing Git and Node.js..."
sudo apt install -y git curl

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

node --version
npm --version

# ──────────────────────────────────────────────────────
# 4. CLONE REPOSITORY
# ──────────────────────────────────────────────────────
echo "📥 Cloning Flowsyc repository..."
cd /home/$USER
if [ ! -d "CRM" ]; then
    git clone https://github.com/elonerajeev/flowsyc.git
    cd CRM
else
    echo "✅ Repository already exists, pulling latest..."
    cd CRM
    git pull origin main
fi

# ──────────────────────────────────────────────────────
# 5. SETUP ENVIRONMENT FILE
# ──────────────────────────────────────────────────────
echo "⚙️ Setting up environment..."
cd backend

if [ ! -f ".env" ]; then
    cp .env.production .env
    echo "✅ Created .env from .env.production"
    echo "⚠️  IMPORTANT: Edit backend/.env and fill in:"
    echo "   - SMTP_PASS (Gmail App Password)"
    echo "   - GRAFANA_ADMIN_PASSWORD"
else
    echo "✅ .env file already exists"
fi

# ──────────────────────────────────────────────────────
# 6. CONFIGURE FIREWALL (UFW)
# ──────────────────────────────────────────────────────
echo "🔥 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp  # Backend API
sudo ufw allow 22/tcp    # SSH
echo "y" | sudo ufw enable || true

# ──────────────────────────────────────────────────────
# 7. START DOCKER SERVICES
# ──────────────────────────────────────────────────────
echo "🐳 Starting Docker services..."
cd /home/$USER/CRM
docker compose up -d

# ──────────────────────────────────────────────────────
# 8. VERIFY DEPLOYMENT
# ──────────────────────────────────────────────────────
echo "⏳ Waiting for services to start..."
sleep 20

echo "🏥 Running health check..."
HEALTH=$(curl -sf http://localhost:3000/api/health || echo "FAILED")
if echo "$HEALTH" | grep -q "FAILED"; then
    echo "❌ Health check failed!"
    echo "Check logs: docker compose logs backend"
    exit 1
else
    echo "✅ Health check passed!"
    echo "$HEALTH"
fi

# ──────────────────────────────────────────────────────
# 9. SHOW STATUS
# ──────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Service Status:"
docker compose ps
echo ""
echo "🌐 Backend API: http://$(curl -s ifconfig.me):3000"
echo "📍 EC2 Public IP: $(curl -s ifconfig.me)"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Edit backend/.env and fill SMTP_PASS"
echo "2. Run: cd /home/$USER/CRM && docker compose restart backend"
echo "3. Update Google Cloud Console with your EC2 IP"
echo "4. Connect frontend to: http://$(curl -s ifconfig.me):3000"
echo ""
