#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           Saga Pattern Test Suite - All Scenarios                 ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if services are running
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Product Service
if ! curl -s http://localhost:3000/api/products > /dev/null 2>&1; then
    echo -e "${RED}❌ Product Service is not running on port 3000${NC}"
    echo -e "${YELLOW}Please start: cd product-service && pnpm dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Product Service is running${NC}"

# Check Orders Service
if ! curl -s http://localhost:3001/api/orders > /dev/null 2>&1; then
    echo -e "${RED}❌ Orders Service is not running on port 3001${NC}"
    echo -e "${YELLOW}Please start: cd orders-service && pnpm dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Orders Service is running${NC}"

# Check RabbitMQ
if ! docker ps | grep microservices-rabbitmq > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  RabbitMQ container is not running${NC}"
    echo -e "${YELLOW}Saga compensation may not work properly${NC}"
    echo -e "${YELLOW}To start: cd central-services && ./start.sh${NC}"
else
    echo -e "${GREEN}✅ RabbitMQ is running${NC}"
fi

echo ""
echo -e "${CYAN}Starting test suite...${NC}"
echo ""

# Test counters
PASSED=0
FAILED=0
declare -a TEST_RESULTS
declare -a TEST_NAMES

# Test names
TEST_NAMES[1]="Product Creation Success"
TEST_NAMES[2]="Order Success - Full Saga Flow"
TEST_NAMES[3]="Order Fails - Product Not Found"
TEST_NAMES[4]="Order Fails - Compensation Saga"

# Test 1: Product Creation Success
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Running Test 1/4: ${TEST_NAMES[1]}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pnpm tsx tests/saga/01-product-creation-success.ts
if [ $? -eq 0 ]; then
    PASSED=$((PASSED + 1))
    TEST_RESULTS[1]="PASS"
else
    FAILED=$((FAILED + 1))
    TEST_RESULTS[1]="FAIL"
fi

echo ""
sleep 2

# Test 2: Order Success - Full Flow
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Running Test 2/4: ${TEST_NAMES[2]}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pnpm tsx tests/saga/02-order-success-full-flow.ts
if [ $? -eq 0 ]; then
    PASSED=$((PASSED + 1))
    TEST_RESULTS[2]="PASS"
else
    FAILED=$((FAILED + 1))
    TEST_RESULTS[2]="FAIL"
fi

echo ""
sleep 2

# Test 3: Order Fails - Product Not Found
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Running Test 3/4: ${TEST_NAMES[3]}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pnpm tsx tests/saga/03-order-product-not-found.ts
if [ $? -eq 0 ]; then
    PASSED=$((PASSED + 1))
    TEST_RESULTS[3]="PASS"
else
    FAILED=$((FAILED + 1))
    TEST_RESULTS[3]="FAIL"
fi

echo ""
sleep 2

# Test 4: Order Fails - Compensation Saga
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Running Test 4/4: ${TEST_NAMES[4]}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pnpm tsx tests/saga/04-order-inventory-fail-compensation.ts
if [ $? -eq 0 ]; then
    PASSED=$((PASSED + 1))
    TEST_RESULTS[4]="PASS"
else
    FAILED=$((FAILED + 1))
    TEST_RESULTS[4]="FAIL"
fi

# Final Summary
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                        Test Suite Summary                          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Tests: ${BLUE}4${NC}"
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""
echo -e "${CYAN}═══════════════════════════ Test Results ═══════════════════════════${NC}"
for i in {1..4}; do
    if [ "${TEST_RESULTS[$i]}" = "PASS" ]; then
        echo -e "${GREEN}✅ Test $i: ${TEST_NAMES[$i]}${NC}"
    else
        echo -e "${RED}❌ Test $i: ${TEST_NAMES[$i]}${NC}"
    fi
done
echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                   ✅ ALL TESTS PASSED! ✅                           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                  ❌ SOME TESTS FAILED ❌                            ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
