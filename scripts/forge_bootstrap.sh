#!/usr/bin/env bash
# Forge bootstrap helper - creates local memory files for you (run locally)
set -e

MEMDIR="${HOME}/.forge_memory"
mkdir -p "${MEMDIR}"

if [ ! -f "${MEMDIR}/project-cache.json" ]; then
  echo "[]" > "${MEMDIR}/project-cache.json"
  echo "Created ${MEMDIR}/project-cache.json"
else
  echo "${MEMDIR}/project-cache.json already exists; not overwriting."
fi

if [ ! -f "${MEMDIR}/vector-db.json" ]; then
  echo "[]" > "${MEMDIR}/vector-db.json"
  echo "Created ${MEMDIR}/vector-db.json"
else
  echo "${MEMDIR}/vector-db.json already exists; not overwriting."
fi

echo "Bootstrap complete. Review files in ${MEMDIR}."
