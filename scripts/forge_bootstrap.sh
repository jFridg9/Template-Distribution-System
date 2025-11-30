#!/bin/bash
MEMORY_DIR="$HOME/.forge_memory"
mkdir -p "$MEMORY_DIR"
touch "$MEMORY_DIR/project-cache.json" "$MEMORY_DIR/vector-db.json"
[ -f "$MEMORY_DIR/project-cache.json" ] && echo "$MEMORY_DIR/project-cache.json already exists; not overwriting."
[ -f "$MEMORY_DIR/vector-db.json" ] && echo "$MEMORY_DIR/vector-db.json already exists; not overwriting."
echo "Bootstrap complete. Review files in $MEMORY_DIR."
