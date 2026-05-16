#!/bin/sh
# Gera /etc/nginx/conf.d/default.conf sem envsubst global (evita $$uri e "invalid variable name").
set -e
: "${SIMCAG_GATEWAY_UPSTREAM:=http://host.docker.internal:5000}"
export SIMCAG_GATEWAY_UPSTREAM
envsubst '${SIMCAG_GATEWAY_UPSTREAM}' < /etc/nginx/default.conf.in > /etc/nginx/conf.d/default.conf
