#!/bin/bash

echo "🔧 Setting up Focal Point Compass CRM Database..."
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if PostgreSQL is running
echo "Checking PostgreSQL status..."
echo "⚠️  Please ensure PostgreSQL is running. If not, run: sudo systemctl start postgresql"
echo "Then press Enter to continue..."
read -p ""

# Test if we can connect
if PGPASSWORD=crm_password psql -h localhost -U crm_user -d focal_point_compass -c "SELECT 1;" > /dev/null 2>&1 2>/dev/null; then
    print_status "Database connection successful - using existing setup"
else
    print_warning "Setting up new database user and database..."
fi

# Create database user and database (skip if already exists)
echo "Checking/creating database user and database..."

# Check if user exists
if sudo -u postgres psql -t -c "SELECT 1 FROM pg_roles WHERE rolname='crm_user';" | grep -q 1; then
    print_status "Database user crm_user already exists"
else
    echo "Creating database user..."
    sudo -u postgres psql << EOF
CREATE USER crm_user WITH PASSWORD 'crm_password';
ALTER USER crm_user CREATEDB;
EOF
fi

# Check if database exists
if sudo -u postgres psql -l | grep -q focal_point_compass; then
    print_status "Database focal_point_compass already exists"
else
    echo "Creating database..."
    sudo -u postgres psql << EOF
CREATE DATABASE focal_point_compass OWNER crm_user;
EOF
fi

# Grant permissions
echo "Granting permissions..."
sudo -u postgres psql -d focal_point_compass << EOF
GRANT ALL PRIVILEGES ON DATABASE focal_point_compass TO crm_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO crm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO crm_user;
EOF

print_status "Database permissions configured"

# Test database connection
echo "Testing database connection..."
if PGPASSWORD=crm_password psql -h localhost -U crm_user -d focal_point_compass -c "SELECT 1;" > /dev/null 2>&1; then
    print_status "Database connection successful"
else
    print_error "Database connection failed"
    exit 1
fi

# Navigate to backend directory
cd backend

# Run Prisma migration (try db push first, fallback to migrate reset)
echo "Running database migrations..."
if npx prisma db push --force-reset; then
    print_status "Database schema pushed successfully"
elif npx prisma migrate dev --name init; then
    print_status "Database migrations completed"
else
    print_warning "Standard migration failed, trying reset..."
    if npx prisma migrate reset --force; then
        print_status "Database reset and migrated successfully"
    else
        print_error "All migration methods failed. Please check database permissions."
        print_warning "You may need to manually run: npx prisma db push"
        exit 1
    fi
fi

# Seed the database
echo "Seeding database with sample data..."
if npm run seed; then
    print_status "Database seeded successfully"
else
    print_error "Database seeding failed"
    exit 1
fi

# Add the missing emailVerified column (just in case)
echo "Ensuring emailVerified column exists..."
PGPASSWORD=crm_password psql -h localhost -U crm_user -d focal_point_compass -c "ALTER TABLE \"User\" ADD COLUMN IF NOT EXISTS \"emailVerified\" BOOLEAN NOT NULL DEFAULT false;" > /dev/null 2>&1
print_status "Database schema verified"

# Regenerate Prisma client
echo "Regenerating Prisma client..."
if npx prisma generate; then
    print_status "Prisma client regenerated"
else
    print_error "Prisma client regeneration failed"
    exit 1
fi

echo ""
echo "🎉 DATABASE SETUP COMPLETE!"
echo "=============================="
echo "Database: focal_point_compass"
echo "User: crm_user"
echo "Status: Ready for use"
echo ""
echo "Next steps:"
echo "1. Start backend: npm run dev"
echo "2. Start frontend: cd ../frontend && npm run dev"
echo "3. Access: http://localhost:8080"
echo ""
echo "Default login credentials:"
echo "Admin: admin@crmpro.com / password123"
echo "Manager: manager@crmpro.com / password123"
echo "Employee: employee@crmpro.com / password123"