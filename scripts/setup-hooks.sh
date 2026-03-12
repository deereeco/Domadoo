#!/bin/sh
# Install git hooks from scripts/ into .git/hooks/
cp scripts/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
cp scripts/prepare-commit-msg .git/hooks/prepare-commit-msg
chmod +x .git/hooks/prepare-commit-msg
echo "Git hooks installed."
