# Full pipeline showcase (Windows). Backend must be running on port 3001.
# Usage: powershell -ExecutionPolicy Bypass -File .\demo.ps1
#
# Thin wrapper around demo.js so the demo logic lives in one place.

node "$PSScriptRoot\demo.js"
