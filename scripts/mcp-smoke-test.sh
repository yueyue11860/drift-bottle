#!/usr/bin/env bash

set -euo pipefail

MCP_BASE_URL="${MCP_BASE_URL:-http://localhost:3000/api/mcp}"
MCP_BEARER_TOKEN="${MCP_BEARER_TOKEN:-}"
AUTO_ACCEPT_REQUEST="${AUTO_ACCEPT_REQUEST:-false}"

TEST_BOTTLE_ID="${TEST_BOTTLE_ID:-}"
TEST_CHAT_ID="${TEST_CHAT_ID:-}"
TEST_REQUEST_ID="${TEST_REQUEST_ID:-}"
TEST_FRIEND_ID="${TEST_FRIEND_ID:-}"

LAST_RESPONSE=''

require_token() {
  if [[ -z "$MCP_BEARER_TOKEN" ]]; then
    echo "Missing MCP_BEARER_TOKEN"
    exit 1
  fi
}

call_no_auth() {
  local payload="$1"
  curl -sS -X POST "$MCP_BASE_URL" \
    -H 'Content-Type: application/json' \
    -d "$payload"
}

call_auth() {
  local payload="$1"
  require_token
  curl -sS -X POST "$MCP_BASE_URL" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $MCP_BEARER_TOKEN" \
    -d "$payload"
}

pretty_print() {
  local response="$1"
  RESPONSE_JSON="$response" node <<'NODE'
const input = process.env.RESPONSE_JSON || ''
try {
  const parsed = JSON.parse(input)
  process.stdout.write(JSON.stringify(parsed, null, 2))
} catch {
  process.stdout.write(input)
}
NODE
}

extract_mcp_data_value() {
  local response="$1"
  local path="$2"
  RESPONSE_JSON="$response" RESPONSE_PATH="$path" node <<'NODE'
const input = process.env.RESPONSE_JSON || ''
const path = process.env.RESPONSE_PATH || ''

function getValue(root, dottedPath) {
  return dottedPath.split('.').filter(Boolean).reduce((current, segment) => {
    if (current == null) return undefined
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      return current[Number(segment)]
    }
    return current[segment]
  }, root)
}

const parsed = JSON.parse(input)
const content = parsed?.result?.content
const jsonContent = Array.isArray(content)
  ? content.find((item) => item?.type === 'json' && item?.json?.ok)
  : undefined
const data = jsonContent?.json?.data
const value = getValue(data, path)

if (value == null) {
  process.exit(1)
}

if (typeof value === 'object') {
  process.stdout.write(JSON.stringify(value))
} else {
  process.stdout.write(String(value))
}
NODE
}

extract_mcp_error() {
  local response="$1"
  RESPONSE_JSON="$response" node <<'NODE'
const input = process.env.RESPONSE_JSON || ''
const parsed = JSON.parse(input)
const message = parsed?.error?.message
const appCode = parsed?.error?.data?.appCode
if (!message) {
  process.exit(1)
}
process.stdout.write(appCode ? `${message} (${appCode})` : String(message))
NODE
}

set_if_missing() {
  local var_name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    return
  fi
  if [[ -z "${!var_name}" ]]; then
    printf -v "$var_name" '%s' "$value"
  fi
}

run_step() {
  local label="$1"
  local auth_mode="$2"
  local payload="$3"

  echo "== $label =="

  if [[ "$auth_mode" == "auth" ]]; then
    LAST_RESPONSE="$(call_auth "$payload")"
  else
    LAST_RESPONSE="$(call_no_auth "$payload")"
  fi

  pretty_print "$LAST_RESPONSE"
  echo

  local error_text=''
  error_text="$(extract_mcp_error "$LAST_RESPONSE" 2>/dev/null || true)"
  if [[ -n "$error_text" ]]; then
    echo "warning: $label returned error: $error_text"
    echo
  fi
}

show_resolved_ids() {
  echo "Resolved IDs:"
  echo "  bottleId: ${TEST_BOTTLE_ID:-<empty>}"
  echo "  chatId: ${TEST_CHAT_ID:-<empty>}"
  echo "  requestId: ${TEST_REQUEST_ID:-<empty>}"
  echo "  friendId: ${TEST_FRIEND_ID:-<empty>}"
  echo
}

run_step "initialize" "no-auth" '{"jsonrpc":"2.0","id":"init_001","method":"initialize","params":{"clientInfo":{"name":"smoke-test","version":"0.1.0"}}}'

run_step "tools/list" "no-auth" '{"jsonrpc":"2.0","id":"tools_001","method":"tools/list","params":{}}'

run_step "browse_bottles" "auth" '{"jsonrpc":"2.0","id":"call_001","method":"tools/call","params":{"name":"browse_bottles","arguments":{"page":1}}}'
set_if_missing TEST_BOTTLE_ID "$(extract_mcp_data_value "$LAST_RESPONSE" 'items.0.id' 2>/dev/null || true)"

run_step "throw_bottle" "auth" '{"jsonrpc":"2.0","id":"call_002","method":"tools/call","params":{"name":"throw_bottle","arguments":{"content":"这是 mcp smoke test 消息","contentType":"discussion"}}}'

show_resolved_ids

if [[ -n "$TEST_BOTTLE_ID" ]]; then
  run_step "start_bottle_chat" "auth" "{\"jsonrpc\":\"2.0\",\"id\":\"call_003\",\"method\":\"tools/call\",\"params\":{\"name\":\"start_bottle_chat\",\"arguments\":{\"bottleId\":\"$TEST_BOTTLE_ID\"}}}"
  set_if_missing TEST_CHAT_ID "$(extract_mcp_data_value "$LAST_RESPONSE" 'chatId' 2>/dev/null || true)"
fi

if [[ -n "$TEST_CHAT_ID" ]]; then
  run_step "send_bottle_chat_message" "auth" "{\"jsonrpc\":\"2.0\",\"id\":\"call_004\",\"method\":\"tools/call\",\"params\":{\"name\":\"send_bottle_chat_message\",\"arguments\":{\"chatId\":\"$TEST_CHAT_ID\",\"content\":\"你好，我对这条漂流瓶很感兴趣。\"}}}"

  run_step "request_friendship" "auth" "{\"jsonrpc\":\"2.0\",\"id\":\"call_006\",\"method\":\"tools/call\",\"params\":{\"name\":\"request_friendship\",\"arguments\":{\"chatId\":\"$TEST_CHAT_ID\"}}}"
  set_if_missing TEST_REQUEST_ID "$(extract_mcp_data_value "$LAST_RESPONSE" 'requestId' 2>/dev/null || true)"
fi

run_step "list_pending_friend_requests" "auth" '{"jsonrpc":"2.0","id":"call_007","method":"tools/call","params":{"name":"list_pending_friend_requests","arguments":{}}}'
set_if_missing TEST_REQUEST_ID "$(extract_mcp_data_value "$LAST_RESPONSE" 'requests.0.id' 2>/dev/null || true)"

show_resolved_ids

if [[ "$AUTO_ACCEPT_REQUEST" == "true" && -n "$TEST_REQUEST_ID" ]]; then
  run_step "respond_friend_request" "auth" "{\"jsonrpc\":\"2.0\",\"id\":\"call_008\",\"method\":\"tools/call\",\"params\":{\"name\":\"respond_friend_request\",\"arguments\":{\"requestId\":\"$TEST_REQUEST_ID\",\"action\":\"accept\"}}}"
elif [[ "$AUTO_ACCEPT_REQUEST" == "true" ]]; then
  echo "== respond_friend_request =="
  echo "Skipped: AUTO_ACCEPT_REQUEST=true but no requestId was found"
  echo
fi

run_step "list_friends" "auth" '{"jsonrpc":"2.0","id":"call_009","method":"tools/call","params":{"name":"list_friends","arguments":{}}}'
set_if_missing TEST_FRIEND_ID "$(extract_mcp_data_value "$LAST_RESPONSE" 'friends.0.friend.id' 2>/dev/null || true)"

show_resolved_ids

if [[ -n "$TEST_FRIEND_ID" ]]; then
  run_step "get_private_messages" "auth" "{\"jsonrpc\":\"2.0\",\"id\":\"call_010\",\"method\":\"tools/call\",\"params\":{\"name\":\"get_private_messages\",\"arguments\":{\"friendId\":\"$TEST_FRIEND_ID\",\"limit\":20}}}"

  run_step "send_private_message" "auth" "{\"jsonrpc\":\"2.0\",\"id\":\"call_011\",\"method\":\"tools/call\",\"params\":{\"name\":\"send_private_message\",\"arguments\":{\"friendId\":\"$TEST_FRIEND_ID\",\"content\":\"你好，之后我们在这里继续聊。\"}}}"
else
  echo "== private_chat_flow =="
  echo "Skipped: no friendId was found. Set TEST_FRIEND_ID manually or accept a friend request first."
  echo
fi

echo "Smoke test finished."