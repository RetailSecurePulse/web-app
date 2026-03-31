#!/usr/bin/env bash

set -euo pipefail

# Configurable variables
IMAGE_NAME="${IMAGE_NAME:-rp-web-app}"
TAG="${TAG:-v0.1.0}"
LOCAL_REPO="${LOCAL_REPO:-localhost:5000}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"

FULL_IMAGE_NAME="${LOCAL_REPO}/${IMAGE_NAME}:${TAG}"

if [[ "${PLATFORMS}" == *","* ]]; then
  if ! docker buildx version >/dev/null 2>&1; then
    echo "docker buildx is required for multi-architecture builds." >&2
    exit 1
  fi

  # Multi-architecture image build and push
  docker buildx build \
    --platform "${PLATFORMS}" \
    -t "${FULL_IMAGE_NAME}" \
    --push \
    .
else
  # Single-architecture image build and push
  docker build \
    --platform "${PLATFORMS}" \
    -t "${FULL_IMAGE_NAME}" \
    .

  docker push "${FULL_IMAGE_NAME}"
fi
