#!/usr/bin/env bash
set -uo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

[ -z "$file_path" ] && exit 0

case "$file_path" in
  *.tsx|*.jsx)
    npx eslint --fix "$file_path"
    npx prettier --write "$file_path"
    ;;
  *.md)
    npx prettier --write "$file_path"
    ;;
esac

exit 0
