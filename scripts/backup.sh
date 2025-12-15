#!/bin/bash

################################################################################
# MongoDB Backup Script for ZAIA Chatbot
################################################################################
# This script performs automated backups of the MongoDB database with:
# - Timestamped backup directories
# - Compressed archives (gzip)
# - 30-day retention policy
# - Comprehensive logging
#
# Usage:
#   ./backup.sh
#
# Requirements:
#   - mongodump installed
#   - Docker and docker-compose
#   - Sufficient disk space for backups
#
# Schedule with cron (daily at 2 AM):
#   0 2 * * * /home/ubuntu/zaia-chatbot/scripts/backup.sh >> /var/log/zaia-backup.log 2>&1
################################################################################

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/mongodb}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="mongodb_backup_${TIMESTAMP}"
LOG_FILE="${LOG_FILE:-$PROJECT_ROOT/backups/backup.log}"

# MongoDB Configuration (from .env or defaults)
MONGO_USER="${MONGO_USER:-zaia_admin}"
MONGO_PASSWORD="${MONGO_PASSWORD}"
MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_CONTAINER="${MONGO_CONTAINER:-zaia-mongodb}"

# ------------------------------------------------------------------------------
# Logging Functions
# ------------------------------------------------------------------------------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" | tee -a "$LOG_FILE"
}

# ------------------------------------------------------------------------------
# Pre-flight Checks
# ------------------------------------------------------------------------------
preflight_checks() {
    log "Starting pre-flight checks..."

    # Check if running from correct directory
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        log_error "docker-compose.yml not found. Are you in the correct directory?"
        exit 1
    fi

    # Check if MongoDB container is running
    if ! docker ps | grep -q "$MONGO_CONTAINER"; then
        log_error "MongoDB container '$MONGO_CONTAINER' is not running"
        exit 1
    fi

    # Check if mongodump is available (via Docker)
    if ! docker exec "$MONGO_CONTAINER" which mongodump > /dev/null 2>&1; then
        log_error "mongodump not available in MongoDB container"
        exit 1
    fi

    # Check MongoDB password is set
    if [ -z "$MONGO_PASSWORD" ]; then
        log_error "MONGO_PASSWORD is not set. Please set it in .env file or environment"
        exit 1
    fi

    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"

    # Check available disk space (require at least 1GB free)
    AVAILABLE_SPACE=$(df -BG "$BACKUP_DIR" | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 1 ]; then
        log_error "Insufficient disk space. At least 1GB required, only ${AVAILABLE_SPACE}GB available"
        exit 1
    fi

    log_success "Pre-flight checks passed"
}

# ------------------------------------------------------------------------------
# Backup Function
# ------------------------------------------------------------------------------
perform_backup() {
    log "Starting MongoDB backup: $BACKUP_NAME"

    local backup_path="$BACKUP_DIR/$BACKUP_NAME"
    mkdir -p "$backup_path"

    # Perform mongodump via Docker container
    log "Executing mongodump..."
    if docker exec "$MONGO_CONTAINER" mongodump \
        --username="$MONGO_USER" \
        --password="$MONGO_PASSWORD" \
        --authenticationDatabase=admin \
        --out="/tmp/$BACKUP_NAME" \
        --gzip 2>&1 | tee -a "$LOG_FILE"; then

        # Copy backup from container to host
        log "Copying backup from container to host..."
        docker cp "$MONGO_CONTAINER:/tmp/$BACKUP_NAME" "$backup_path/"

        # Clean up backup in container
        docker exec "$MONGO_CONTAINER" rm -rf "/tmp/$BACKUP_NAME"

        # Create tarball of backup
        log "Creating compressed archive..."
        cd "$BACKUP_DIR"
        tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"

        # Remove uncompressed backup directory
        rm -rf "$backup_path"

        # Get backup size
        BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)

        log_success "Backup completed successfully: ${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})"

        # Create backup metadata file
        cat > "${BACKUP_NAME}.meta.json" <<EOF
{
  "backup_name": "$BACKUP_NAME",
  "timestamp": "$(date -Iseconds)",
  "mongo_host": "$MONGO_HOST",
  "mongo_port": "$MONGO_PORT",
  "backup_size": "$BACKUP_SIZE",
  "retention_days": $RETENTION_DAYS
}
EOF

        return 0
    else
        log_error "Backup failed"
        return 1
    fi
}

# ------------------------------------------------------------------------------
# Cleanup Old Backups
# ------------------------------------------------------------------------------
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."

    local deleted_count=0

    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        log "Deleting old backup: $(basename "$file")"
        rm -f "$file"
        # Also delete associated metadata file
        rm -f "${file%.tar.gz}.meta.json"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "mongodb_backup_*.tar.gz" -type f -mtime +"$RETENTION_DAYS" -print0)

    if [ $deleted_count -gt 0 ]; then
        log_success "Deleted $deleted_count old backup(s)"
    else
        log "No old backups to delete"
    fi
}

# ------------------------------------------------------------------------------
# Backup Verification
# ------------------------------------------------------------------------------
verify_backup() {
    log "Verifying backup integrity..."

    local backup_file="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"

    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi

    # Test tar file integrity
    if tar -tzf "$backup_file" > /dev/null 2>&1; then
        log_success "Backup file integrity verified"
        return 0
    else
        log_error "Backup file is corrupted"
        return 1
    fi
}

# ------------------------------------------------------------------------------
# Send Notification (Optional)
# ------------------------------------------------------------------------------
send_notification() {
    local status=$1
    local message=$2

    # TODO: Implement notification system (email, Slack, etc.)
    # Example: Send email or webhook notification
    log "Notification: $status - $message"
}

# ------------------------------------------------------------------------------
# Main Execution
# ------------------------------------------------------------------------------
main() {
    log "=========================================="
    log "ZAIA MongoDB Backup Script Starting"
    log "=========================================="

    # Load environment variables from .env
    if [ -f "$PROJECT_ROOT/.env" ]; then
        log "Loading environment variables from .env"
        set -a
        source "$PROJECT_ROOT/.env"
        set +a
    else
        log_error ".env file not found at $PROJECT_ROOT/.env"
        exit 1
    fi

    # Run pre-flight checks
    preflight_checks

    # Perform backup
    if perform_backup; then
        # Verify backup
        if verify_backup; then
            # Cleanup old backups
            cleanup_old_backups

            # Send success notification
            send_notification "SUCCESS" "MongoDB backup completed successfully: $BACKUP_NAME"

            log "=========================================="
            log "Backup process completed successfully"
            log "=========================================="
            exit 0
        else
            send_notification "ERROR" "Backup verification failed"
            log_error "Backup verification failed"
            exit 1
        fi
    else
        send_notification "ERROR" "Backup process failed"
        log_error "Backup process failed"
        exit 1
    fi
}

# ------------------------------------------------------------------------------
# Script Entry Point
# ------------------------------------------------------------------------------
main "$@"
