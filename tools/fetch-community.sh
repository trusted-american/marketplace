#!/usr/bin/env bash
#
# Clone the community upstream repos listed in .gitmodules.
#
# These are deliberately not git submodules — see the note in .gitmodules.
# Each [submodule] section supplies `path`, `url` and `rev`; this fetches the
# exact `rev` (shallow) and checks it out at `path`.
#
# Idempotent: an existing path is left alone.

set -euo pipefail

cd "$(dirname "$0")/.."

mapfile -t sections < <(
  git config -f .gitmodules --name-only --get-regexp '^submodule\..*\.path$' |
    sed 's/\.path$//'
)

for section in "${sections[@]}"; do
  path=$(git config -f .gitmodules --get "$section.path")
  url=$(git config -f .gitmodules --get "$section.url")
  rev=$(git config -f .gitmodules --get "$section.rev")

  if [ -e "$path" ]; then
    echo "skip: $path already present"
    continue
  fi

  echo "fetch: $url @ ${rev:0:10} -> $path"
  git init --quiet "$path"
  git -C "$path" remote add origin "$url"
  git -C "$path" fetch --quiet --depth 1 origin "$rev"
  git -C "$path" checkout --quiet --detach FETCH_HEAD
done
