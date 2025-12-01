#!/bin/bash

# Start both services for saga testing

echo "🚀 Starting Microservices..."
echo ""

# Kill any existing services
echo "🧹 Cleaning up existing processes..."
pkill -f "tsx watch src/index.ts" 2>/dev/null
sleep 2

# Start Product Service
echo "📦 Starting Product Service on port 3000..."
cd /home/dhruvpatel/Goals/2025/MicroServices/product-service
pnpm dev > /tmp/product-service.log 2>&1 &
PRODUCT_PID=$!
echo "   PID: $PRODUCT_PID"

# Start Orders Service
echo "🛒 Starting Orders Service on port 3001..."
cd /home/dhruvpatel/Goals/2025/MicroServices/orders-service
pnpm dev > /tmp/orders-service.log 2>&1 &
ORDERS_PID=$!
echo "   PID: $ORDERS_PID"

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are running
echo ""
echo "✅ Service Status:"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "   ✅ Product Service (port 3000) - RUNNING"
else
    echo "   ❌ Product Service (port 3000) - NOT RESPONDING"
    echo "   📋 Check logs: tail -f /tmp/product-service.log"
fi

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ Orders Service (port 3001) - RUNNING"
else
    echo "   ❌ Orders Service (port 3001) - NOT RESPONDING"
    echo "   📋 Check logs: tail -f /tmp/orders-service.log"
fi

echo ""
echo "📋 Log Files:"
echo "   Product: /tmp/product-service.log"
echo "   Orders:  /tmp/orders-service.log"
echo ""
echo "🎯 Ready to run tests:"
echo "   cd /home/dhruvpatel/Goals/2025/MicroServices/orders-service/tests/saga"
echo "   ./run-all-tests.sh"
echo ""
echo "🛑 To stop services:"
echo "   pkill -f 'tsx watch src/index.ts'"
