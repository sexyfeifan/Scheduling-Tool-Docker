#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${IMAGE_NAME:-scheduling-tool}"
DOCKERHUB_NAMESPACE="${DOCKERHUB_NAMESPACE:-}"
VERSION="${VERSION:-}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
PUSH_LATEST="${PUSH_LATEST:-1}"
BUILDER_NAME="${BUILDER_NAME:-scheduling-tool-multiarch}"

if [[ -z "${DOCKERHUB_NAMESPACE}" ]]; then
  echo "DOCKERHUB_NAMESPACE is required"
  exit 1
fi

if [[ -z "${VERSION}" ]]; then
  echo "VERSION is required"
  exit 1
fi

FULL_IMAGE="${DOCKERHUB_NAMESPACE}/${IMAGE_NAME}"

if ! docker buildx inspect "${BUILDER_NAME}" >/dev/null 2>&1; then
  docker buildx create --name "${BUILDER_NAME}" --use
else
  docker buildx use "${BUILDER_NAME}"
fi

TAGS=(
  "--tag" "${FULL_IMAGE}:${VERSION}"
)

if [[ "${PUSH_LATEST}" == "1" ]]; then
  TAGS+=("--tag" "${FULL_IMAGE}:latest")
fi

docker buildx build \
  --platform "${PLATFORMS}" \
  "${TAGS[@]}" \
  --push \
  "${ROOT_DIR}"
