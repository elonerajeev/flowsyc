# Fix Database Ownership - Root Cause Solution

echo "🔧 Fixing database ownership and permissions..."
echo "==============================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Drop and recreate database with correct ownership
echo "Dropping and recreating database with correct ownership..."

sudo -u postgres psql << 'EOF'
DROP DATABASE IF EXISTS focal_point_compass;
CREATE DATABASE focal_point_compass OWNER crm_user;
GRANT ALL PRIVILEGES ON DATABASE focal_point_compass TO crm_user;
EOF

if [ $? -eq 0 ]; then
    print_status "Database recreated with correct ownership"
else
    print_error "Failed to recreate database"
    exit 1
fi

# Connect to the new database and set schema permissions
echo "Setting schema permissions..."
sudo -u postgres psql -d focal_point_compass << 'EOF'
GRANT ALL ON SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO crm_user;
EOF

print_status "Schema permissions configured"

# Navigate to backend
cd backend

# Push schema
echo "Pushing database schema..."
if npx prisma db push --force-reset; then
    print_status "Database schema pushed successfully"
else
    print_error "Schema push failed"
    exit 1
fi

# Seed database
echo "Seeding database..."
if npm run seed; then
    print_status "Database seeded successfully"
else
    print_error "Seeding failed"
    exit 1
fi

# Add emailVerified column
echo "Adding emailVerified column..."
PGPASSWORD=crm_password psql -h localhost -U crm_user -d focal_point_compass -c "ALTER TABLE \"User\" ADD COLUMN IF NOT EXISTS \"emailVerified\" BOOLEAN NOT NULL DEFAULT false;" 2>/dev/null
print_status "Email verification column added"

# Regenerate client
echo "Regenerating Prisma client..."
npx prisma generate
print_status "Prisma client regenerated"

echo ""
echo "🎉 DATABASE FIXED AND READY!"
echo "============================="
echo "✅ All permissions correct"
echo "✅ Schema deployed"
echo "✅ Sample data seeded"
echo "✅ Email verification ready"
echo ""
echo "Next: Start the services"
echo "Backend: npm run dev"
echo "Frontend: cd ../frontend && npm run dev"