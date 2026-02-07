#!/bin/bash

echo "🚀 Starting AgentList setup..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed. Please install Homebrew first."
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "⚠️ Node.js not found. Attempting to install via Homebrew..."
    brew install node
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Node.js. Please install it manually."
        exit 1
    fi
    
    echo "✅ Node.js installed successfully."
else
    echo "✅ Node.js is already installed."
fi

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Check if dependencies installed correctly
if [ $? -ne 0 ]; then
    echo "❌ npm install failed."
    exit 1
fi

echo "✅ Dependencies installed."

# Check for .env.local
if [ ! -f .env.local ]; then
    echo "⚠️ .env.local not found. Creating from template..."
    echo "NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL_HERE" > .env.local
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE" >> .env.local
    echo "📝 Created .env.local - Please update it with your Supabase credentials!"
fi

echo "🎉 Setup complete! You can now run 'npm run dev' to start the server."
