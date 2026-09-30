#!/bin/bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
    printf 'Usage: %s BACKEND_IMAGE FRONTEND_IMAGE\n' "$0" >&2
    exit 1
fi

backend_image="$1"
frontend_image="$2"

backend_pattern='^ghcr\.io/anrunt/f1-analysis-backend@sha256:[0123456789abcdef]{64}$'
frontend_pattern='^ghcr\.io/anrunt/f1-analysis-frontend@sha256:[0123456789abcdef]{64}$'

if [[ ! "$backend_image" =~ $backend_pattern ]]; then
    printf 'Invalid backend image: expected ghcr.io/anrunt/f1-analysis-backend@sha256: followed by 64 lowercase hexadecimal characters.\n' >&2
    exit 1
fi

if [[ ! "$frontend_image" =~ $frontend_pattern ]]; then
    printf 'Invalid frontend image: expected ghcr.io/anrunt/f1-analysis-frontend@sha256: followed by 64 lowercase hexadecimal characters.\n' >&2
    exit 1
fi

if [[ $EUID -ne 0 ]]; then
    printf 'This script must be run as root.\n' >&2
    exit 1
fi

readonly deployment_dir='/opt/f1-analysis'
readonly site_address='f1-analysis.duckdns.org'
readonly trusted_path='/usr/sbin:/usr/bin:/sbin:/bin'
readonly active_env="$deployment_dir/.env.production"
export PATH="$trusted_path"

rollback_required=false
candidate_env=''
backup_dir=''
rollback_env=''
health_response=''

# Reuse the same trusted Compose configuration for deployment and recovery.
run_compose() {
    local env_file="$1"
    shift

    env -i PATH="$trusted_path" HOME=/root \
        docker compose \
        --project-name f1-analysis-prod \
        --env-file "$env_file" \
        -f "$deployment_dir/compose.prod.yaml" \
        "$@"
}

check_https() {
    local attempt
    local http_status

    for ((attempt = 1; attempt <= 6; attempt++)); do
        if http_status=$(env -i PATH="$trusted_path" HOME=/root \
            curl -q \
            --fail --silent --show-error \
            --proto '=https' --noproxy '*' \
            --connect-timeout 3 --max-time 5 \
            --output "$health_response" \
            --write-out '%{http_code}' \
            "https://$site_address/api/health"); then
            if [[ "$http_status" == '200' ]] && \
                env -i PATH="$trusted_path" HOME=/root python3 -I -c '
import json
import sys

try:
    response = json.load(sys.stdin)
except (ValueError, UnicodeError):
    sys.exit(1)

sys.exit(0 if isinstance(response, dict) and response.get("status") == "ok" else 1)
' < "$health_response"; then
                return 0
            fi
        fi

        printf 'HTTPS health check attempt %s/6 failed.\n' "$attempt" >&2
        if [[ $attempt -lt 6 ]]; then
            if ! sleep 2; then
                return 1
            fi
        fi
    done

    printf 'HTTPS health check failed: expected HTTP 200 and JSON status "ok".\n' >&2
    return 1
}

restore_previous_release() {
    printf 'Restoring previous production configuration.\n' >&2

    if ! rollback_env=$(mktemp "$deployment_dir/.env.rollback.XXXXXX"); then
        printf 'Could not create the rollback environment file.\n' >&2
        return 1
    fi

    if ! cp -- "$backup_dir/.env.production" "$rollback_env"; then
        printf 'Could not copy the previous environment file.\n' >&2
        return 1
    fi

    if ! mv -fT -- "$rollback_env" "$active_env"; then
        printf 'Could not restore the active environment file.\n' >&2
        return 1
    fi
    rollback_env=''

    if ! run_compose "$active_env" up --no-build --pull never --wait --wait-timeout 120; then
        printf 'Could not start the previous release.\n' >&2
        return 1
    fi

    if ! check_https; then
        printf 'The previous release did not pass the HTTPS health check.\n' >&2
        return 1
    fi

    printf 'Previous release restored and verified. The deployment still failed.\n' >&2
    return 0
}

handle_exit() {
    local exit_status=$?
    local temporary_file

    trap - EXIT
    # Finish recovery without re-entering it on another handled signal.
    trap '' HUP INT TERM PIPE
    set +e

    if [[ "$rollback_required" == true ]]; then
        if [[ $exit_status -eq 0 ]]; then
            exit_status=1
        fi

        if ! restore_previous_release; then
            printf 'ROLLBACK FAILED. Manual recovery is required. Backup: %s\n' "$backup_dir" >&2
            exit_status=1
        fi
    fi

    for temporary_file in "$candidate_env" "$rollback_env" "$health_response"; do
        if [[ -n "$temporary_file" ]]; then
            if ! rm -f -- "$temporary_file"; then
                printf 'Could not remove temporary file: %s\n' "$temporary_file" >&2
                exit_status=1
            fi
        fi
    done

    exit "$exit_status"
}

for required_command in docker curl python3 flock; do
    if ! command -v "$required_command" > /dev/null; then
        printf 'Required command is unavailable: %s\n' "$required_command" >&2
        exit 1
    fi
done

umask 077
exec 9>>"$deployment_dir/.deploy.lock"
if ! flock -n 9; then
    printf 'Another deployment is already running.\n' >&2
    exit 1
fi

trap handle_exit EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 141' PIPE

candidate_env=$(mktemp "$deployment_dir/.env.candidate.XXXXXX")
health_response=$(mktemp "$deployment_dir/.health.response.XXXXXX")

printf 'BACKEND_IMAGE=%s\nFRONTEND_IMAGE=%s\nSITE_ADDRESS=%s\n' \
    "$backend_image" \
    "$frontend_image" \
    "$site_address" > "$candidate_env"

run_compose "$candidate_env" config --quiet
run_compose "$candidate_env" pull

mkdir -p "$deployment_dir/backups"
backup_dir=$(mktemp -d "$deployment_dir/backups/previous.XXXXXX")

cp -- \
    "$active_env" \
    "$deployment_dir/compose.prod.yaml" \
    "$backup_dir/"

printf 'Previous production configuration backed up to: %s\n' "$backup_dir"

rollback_required=true
mv -fT -- "$candidate_env" "$active_env"
candidate_env=''

run_compose "$active_env" up --no-build --pull never --wait --wait-timeout 120
check_https

rollback_required=false
printf 'Production deployment completed and verified successfully.\n'
