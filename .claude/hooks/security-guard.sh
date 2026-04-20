#!/bin/bash
# PreToolUse hook: Block obviously dangerous bash commands
# Supplement to settings.json deny list — defense in depth
INPUT=$(head -c 65536)
if ! printf '%s' "$INPUT" | jq -e . >/dev/null 2>&1; then
  echo '{"decision": "approve"}'
  exit 0
fi

CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')

# Block patterns (hardcoded, not sourced from files)
BLOCKED=(
  "rm -rf /"
  "sudo rm"
  "mkfs"
  "dd if="
  "> /dev/sd"
  "chmod -R 777"
  "curl.*| sh"
  "curl.*| bash"
  "wget.*| sh"
  "wget.*| bash"
)

for pattern in "${BLOCKED[@]}"; do
  if printf '%s' "$CMD" | grep -qE "$pattern"; then
    jq -n --arg p "$pattern" '{"decision":"block","reason":("Blocked dangerous command matching: "+$p)}'
    exit 0
  fi
done

echo '{"decision": "approve"}'
