#!/bin/bash

# Function to print status messages
print_status() {
    echo ">>> $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

# Check if script is run with appropriate permissions
if [ "$(id -u)" -eq 0 ]; then
    print_status "Please run this script without sudo"
    exit 1
fi

# Detect operating system
OS=$(detect_os)
if [ "$OS" == "unknown" ]; then
    print_status "Unsupported operating system. This script works on macOS and Linux."
    exit 1
fi

# Check if Ollama is already installed
if command_exists ollama; then
    print_status "Ollama is already installed"
else
    print_status "Installing Ollama..."
    
    if [ "$OS" == "macos" ]; then
        # Install using Homebrew on macOS
        if ! command_exists brew; then
            print_status "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install ollama
    elif [ "$OS" == "linux" ]; then
        # Install on Linux
        curl -fsSL https://ollama.ai/install.sh | sh
    fi
    
    if [ $? -ne 0 ]; then
        print_status "Failed to install Ollama"
        exit 1
    fi
fi

# Set default port or use custom port from environment variable
OLLAMA_PORT=${OLLAMA_PORT:-11434}
print_status "Ollama will be exposed on port: $OLLAMA_PORT"

# Check if port is already in use
if lsof -i :$OLLAMA_PORT >/dev/null 2>&1; then
    print_status "Port $OLLAMA_PORT is already in use. Please specify a different port using OLLAMA_PORT environment variable"
    exit 1
fi

# Check if Ollama is running
if pgrep -x "ollama" >/dev/null; then
    print_status "Ollama is already running"
else
    print_status "Starting Ollama on port $OLLAMA_PORT..."
    OLLAMA_HOST=0.0.0.0 OLLAMA_PORT=$OLLAMA_PORT ollama serve &
    
    # Wait for Ollama to start
    sleep 5
    
    if pgrep -x "ollama" >/dev/null; then
        print_status "Ollama started successfully"
        print_status "Ollama API is accessible at: http://0.0.0.0:$OLLAMA_PORT"
    else
        print_status "Failed to start Ollama"
        exit 1
    fi
fi

print_status "Verifying Ollama installation..."
if ollama --version >/dev/null 2>&1; then
    print_status "Ollama is installed and working correctly"
    print_status "You can now use Ollama! Try running: ollama run llama2"
    print_status "API endpoint: http://0.0.0.0:$OLLAMA_PORT"
else
    print_status "Ollama verification failed"
    exit 1
fi