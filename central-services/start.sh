#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting RabbitMQ for Microservices${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Navigate to central-services directory
cd "$(dirname "$0")"

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚙️  Creating .env file from .env.example${NC}"
    cp .env.example .env
fi

# Stop existing containers if running
echo -e "${YELLOW}🛑 Stopping existing RabbitMQ containers...${NC}"
docker-compose down > /dev/null 2>&1

# Start RabbitMQ
echo -e "${GREEN}🐰 Starting RabbitMQ...${NC}"
docker-compose up -d

# Wait for RabbitMQ to be ready
echo -e "${YELLOW}⏳ Waiting for RabbitMQ to be ready...${NC}"
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker exec microservices-rabbitmq rabbitmq-diagnostics ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ RabbitMQ is ready!${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo -n "."
    sleep 1
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}❌ RabbitMQ failed to start within expected time${NC}"
    echo -e "${YELLOW}Check logs with: docker-compose logs rabbitmq${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ RabbitMQ is running successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📡 Access Points:${NC}"
echo -e "   AMQP Protocol: ${GREEN}amqp://localhost:5672${NC}"
echo -e "   Management UI: ${GREEN}http://localhost:15672${NC}"
echo ""
echo -e "${YELLOW}🔐 Credentials:${NC}"
echo -e "   Username: ${GREEN}admin${NC}"
echo -e "   Password: ${GREEN}admin123${NC}"
echo ""
echo -e "${YELLOW}📋 Useful Commands:${NC}"
echo -e "   View logs:       ${GREEN}docker-compose logs -f rabbitmq${NC}"
echo -e "   Stop RabbitMQ:   ${GREEN}docker-compose down${NC}"
echo -e "   Restart:         ${GREEN}docker-compose restart${NC}"
echo -e "   Status:          ${GREEN}docker-compose ps${NC}"
echo ""
echo -e "${YELLOW}🔍 Pre-configured Resources:${NC}"
echo -e "   Exchanges: orders.exchange, products.exchange, order-feedback.exchange"
echo -e "   Queues: order-feedback, orders.created, products.created, and more"
echo ""
echo -e "${GREEN}✅ Ready to connect from microservices!${NC}"
echo ""
