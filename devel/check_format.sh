#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Check TypeScript/JavaScript code formatting
echo "Checking TypeScript/JavaScript code formatting..."
cd "$PROJECT_ROOT"
if ! npm run format:check; then
    echo "TypeScript/JavaScript code is not properly formatted!"
    echo "Please run './devel/format_code.sh' to format the code"
    exit 1
fi

echo "All code is properly formatted!"
exit 0
