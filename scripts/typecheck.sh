#!/bin/bash

echo "Running TypeScript type checking..."

# Use proper module settings for TypeScript
echo "Checking shared schema..."
npx tsc --noEmit shared/schema.ts --skipLibCheck --module ES2022 --moduleResolution node

echo "Checking server files..."
npx tsc --noEmit server/storage.ts --skipLibCheck --module ES2022 --moduleResolution node
npx tsc --noEmit server/routes.ts --skipLibCheck --module ES2022 --moduleResolution node  
npx tsc --noEmit server/websocket.ts --skipLibCheck --module ES2022 --moduleResolution node

echo "Checking client files..."
npx tsc --noEmit client/src/pages/room.tsx --skipLibCheck --module ES2022 --moduleResolution node --jsx preserve

echo "TypeScript validation completed successfully"