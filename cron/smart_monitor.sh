#!/bin/bash

# SMART Monitor Script for Cron
# Runs smartctl on all devices and outputs JSON files
# Usage: ./smart_monitor.sh [options]

set -euo pipefail

# Default configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/smart_monitor.conf"
OUTPUT_DIR="${SCRIPT_DIR}/output"
LOG_FILE="${SCRIPT_DIR}/smart_monitor.log"
JSON_FORMAT="pretty"
DEVICE_PATTERN="/dev/sd* /dev/nvme* /dev/hd*"
EXCLUDE_PATTERNS=""
DRY_RUN=false
VERBOSE=false

# Load configuration file if it exists
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
fi

# Function to print usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -c, --config FILE      Configuration file (default: $CONFIG_FILE)
    -o, --output DIR       Output directory (default: $OUTPUT_DIR)
    -l, --log FILE         Log file (default: $LOG_FILE, use "" to disable logging)
    -d, --devices PATTERN  Device pattern to scan (default: "$DEVICE_PATTERN")
    -e, --exclude PATTERN  Exclude devices matching pattern
    -f, --format FORMAT    JSON format: pretty, compact (default: $JSON_FORMAT)
    -n, --dry-run          Show what would be done without executing
    -v, --verbose          Verbose output
    -h, --help             Show this help message

Examples:
    $0                                    # Run with defaults
    $0 -o /var/log/smart                 # Custom output directory
    $0 -l ""                              # Disable logging
    $0 -d "/dev/sd*" -e "/dev/sda"      # Only scan /dev/sd* devices, exclude /dev/sda
    $0 -f compact                        # Output compact JSON

EOF
}

# Function to log messages
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [[ -n "$LOG_FILE" ]]; then
        # Write to both log file and stdout/stderr
        echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
    else
        # Only write to stdout/stderr, no log file
        echo "[$timestamp] [$level] $message"
    fi
}

# Function to check if smartctl is available
check_dependencies() {
    if ! command -v smartctl &> /dev/null; then
        log "ERROR" "smartctl not found. Please install smartmontools."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log "WARNING" "jq not found. JSON formatting will be basic."
        JSON_FORMAT="basic"
    fi
}

# Function to validate JSON (basic validation without jq)
validate_json_basic() {
    local json_string="$1"
    # Basic JSON validation: check if it starts with { and ends with }
    if [[ "$json_string" =~ ^\{.*\}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to get device information
get_device_info() {
    local device="$1"
    local info_file="/tmp/smart_device_info_$$"
    
    # Log debug messages to stderr to avoid contaminating function output
    log "DEBUG" "Getting SMART info for device: $device" >&2
    
    # Get device info in JSON format
    local device_info="{}"
    if smartctl -i -j "$device" >/dev/null 2>&1; then
        local temp_info=$(smartctl -i -j "$device" 2>/dev/null || echo "{}")
        # Validate JSON output
        if command -v jq &> /dev/null; then
            if echo "$temp_info" | jq empty >/dev/null 2>&1; then
                device_info="$temp_info"
            else
                log "WARNING" "Invalid JSON from device info for $device, using empty object"
                device_info="{}"
            fi
        else
            if validate_json_basic "$temp_info"; then
                device_info="$temp_info"
            else
                log "WARNING" "Invalid JSON from device info for $device, using empty object"
                device_info="{}"
            fi
        fi
    else
        device_info="{}"
    fi
    
    # Get SMART attributes in JSON format
    local smart_attrs="{}"
    if smartctl -A -j "$device" >/dev/null 2>&1; then
        local temp_attrs=$(smartctl -A -j "$device" 2>/dev/null || echo "{}")
        # Validate JSON output
        if command -v jq &> /dev/null; then
            if echo "$temp_attrs" | jq empty >/dev/null 2>&1; then
                smart_attrs="$temp_attrs"
            else
                log "WARNING" "Invalid JSON from SMART attributes for $device, using empty object"
                smart_attrs="{}"
            fi
        else
            if validate_json_basic "$temp_attrs"; then
                smart_attrs="$temp_attrs"
            else
                log "WARNING" "Invalid JSON from SMART attributes for $device, using empty object"
                smart_attrs="{}"
            fi
        fi
    else
        smart_attrs="{}"
    fi
    
    # Get SMART health status in JSON format
    local smart_health="{}"
    if smartctl -H -j "$device" >/dev/null 2>&1; then
        local temp_health=$(smartctl -H -j "$device" 2>/dev/null || echo "{}")
        # Validate JSON output
        if command -v jq &> /dev/null; then
            if echo "$temp_health" | jq empty >/dev/null 2>&1; then
                smart_health="$temp_health"
            else
                log "WARNING" "Invalid JSON from SMART health for $device, using empty object"
                smart_health="{}"
            fi
        else
            if validate_json_basic "$temp_health"; then
                smart_health="$temp_health"
            else
                log "WARNING" "Invalid JSON from SMART health for $device, using empty object"
                smart_health="{}"
            fi
        fi
    else
        smart_health="{}"
    fi
    
    # Get SMART error log in JSON format
    local smart_errors="{}"
    if smartctl -l error -j "$device" >/dev/null 2>&1; then
        local temp_errors=$(smartctl -l error -j "$device" 2>/dev/null || echo "{}")
        # Validate JSON output
        if command -v jq &> /dev/null; then
            if echo "$temp_errors" | jq empty >/dev/null 2>&1; then
                smart_errors="$temp_errors"
            else
                log "WARNING" "Invalid JSON from error log for $device, using empty object"
                smart_errors="{}"
            fi
        else
            if validate_json_basic "$temp_errors"; then
                smart_errors="$temp_errors"
            else
                log "WARNING" "Invalid JSON from error log for $device, using empty object"
                smart_errors="{}"
            fi
        fi
    else
        smart_errors="{}"
    fi
    
    # Get SMART selftest log in JSON format
    local smart_selftest="{}"
    if smartctl -l selftest -j "$device" >/dev/null 2>&1; then
        local temp_selftest=$(smartctl -l selftest -j "$device" 2>/dev/null || echo "{}")
        # Validate JSON output
        if command -v jq &> /dev/null; then
            if echo "$temp_selftest" | jq empty >/dev/null 2>&1; then
                smart_selftest="$temp_selftest"
            else
                log "WARNING" "Invalid JSON from selftest log for $device, using empty object"
                smart_selftest="{}"
            fi
        else
            if validate_json_basic "$temp_selftest"; then
                smart_selftest="$temp_selftest"
            else
                log "WARNING" "Invalid JSON from selftest log for $device, using empty object"
                smart_selftest="{}"
            fi
        fi
    else
        smart_selftest="{}"
    fi
    
    # Combine all JSON information into a single JSON structure
    cat > "$info_file" << EOF
{
  "device_info": $device_info,
  "smart_attributes": $smart_attrs,
  "smart_health": $smart_health,
  "smart_errors": $smart_errors,
  "smart_selftest": $smart_selftest
}
EOF
    
    # Log the completion message to stderr
    log "DEBUG" "SMART info collected for device: $device" >&2
    
    # Return only the filename
    echo "$info_file"
}

# Function to convert smartctl output to JSON
convert_to_json() {
    local input_file="$1"
    local device="$2"
    
    if [[ "$JSON_FORMAT" == "basic" ]]; then
        # Basic JSON conversion without jq - add timestamp and device to existing JSON
        # Read the input file content
        local smart_data=$(cat "$input_file")
        
        cat > "$input_file.json" << EOF
{
  "device": "$device",
  "timestamp": $(date +%s),
  "smart_data": $smart_data
}
EOF
    else
        # Use jq for proper JSON formatting
        if command -v jq &> /dev/null; then
            if [[ "$JSON_FORMAT" == "compact" ]]; then
                jq -c -n \
                    --arg device "$device" \
                    --argjson timestamp "$(date +%s)" \
                    --slurpfile smart_data "$input_file" \
                    '{
                        device: $device,
                        timestamp: $timestamp,
                        smart_data: $smart_data[0]
                    }' > "$input_file.json"
            else
                jq -n \
                    --arg device "$device" \
                    --argjson timestamp "$(date +%s)" \
                    --slurpfile smart_data "$input_file" \
                    '{
                        device: $device,
                        timestamp: $timestamp,
                        smart_data: $smart_data[0]
                    }' > "$input_file.json"
            fi
        else
            # Fallback to basic if jq is not available
            JSON_FORMAT="basic"
            convert_to_json "$input_file" "$device"
            return
        fi
    fi
}

# Function to create index.json file
create_index() {
    local devices=("$@")
    local index_file="${OUTPUT_DIR}/index.json"
    local current_timestamp=$(date +%s)
    local json_files=()
    
    # Build list of JSON files that should exist
    for device in "${devices[@]}"; do
        local device_name=$(basename "$device")
        local json_file="${device_name}_smart.json"
        json_files+=("$json_file")
    done
    
    # Create index.json
    if [[ "$JSON_FORMAT" == "basic" ]]; then
        cat > "$index_file" << EOF
{
  "last_run": $current_timestamp,
  "last_run_iso": "$(date -Iseconds)",
  "total_devices": ${#devices[@]},
  "json_files": [
EOF
        # Add each JSON file to the list
        for ((i=0; i<${#json_files[@]}; i++)); do
            if [[ $i -gt 0 ]]; then
                echo "    ," >> "$index_file"
            fi
            echo "    \"${json_files[$i]}\"" >> "$index_file"
        done
        
        cat >> "$index_file" << EOF
  ]
}
EOF
    else
        # Use jq for proper JSON formatting
        if command -v jq &> /dev/null; then
            if [[ "$JSON_FORMAT" == "compact" ]]; then
                jq -c -n \
                    --argjson last_run "$current_timestamp" \
                    --arg last_run_iso "$(date -Iseconds)" \
                    --argjson total_devices "${#devices[@]}" \
                    --argjson json_files "$(printf '%s\n' "${json_files[@]}" | jq -R . | jq -s .)" \
                    '{
                        last_run: $last_run,
                        last_run_iso: $last_run_iso,
                        total_devices: $total_devices,
                        json_files: $json_files
                    }' > "$index_file"
            else
                jq -n \
                    --argjson last_run "$current_timestamp" \
                    --arg last_run_iso "$(date -Iseconds)" \
                    --argjson total_devices "${#devices[@]}" \
                    --argjson json_files "$(printf '%s\n' "${json_files[@]}" | jq -R . | jq -s .)" \
                    '{
                        last_run: $last_run,
                        last_run_iso: $last_run_iso,
                        total_devices: $total_devices,
                        json_files: $json_files
                    }' > "$index_file"
            fi
        else
            # Fallback to basic if jq is not available
            JSON_FORMAT="basic"
            create_index "${devices[@]}"
            return
        fi
    fi
    
    log "INFO" "Created index.json with ${#devices[@]} devices"
}

# Function to process a single device
process_device() {
    local device="$1"
    local device_name=$(basename "$device")
    local output_file="${OUTPUT_DIR}/${device_name}_smart.json"
    
    log "INFO" "Processing device: $device"
    
    # Check if device exists and is accessible
    if [[ ! -b "$device" ]]; then
        log "WARNING" "Device $device is not accessible, skipping"
        return 1
    fi
    
    # Get device information
    local info_file=$(get_device_info "$device")
    log "DEBUG" "get_device_info returned: '$info_file'"
    
    # Convert to JSON
    convert_to_json "$info_file" "$device"
    
    # Move JSON file to output directory
    mv "$info_file.json" "$output_file"
    
    # Clean up temporary file
    rm -f "$info_file"
    
    log "INFO" "Successfully processed $device -> $output_file"
    return 0
}

# Function to check if a device is actually a disk (not a partition)
is_disk_device() {
    local device="$1"
    
    # Skip if device doesn't exist
    if [[ ! -b "$device" ]]; then
        if [[ "$VERBOSE" == "true" ]]; then
            log "DEBUG" "Device $device is not a block device"
        fi
        return 1
    fi
    
    local device_name=$(basename "$device")
    
    # Skip partitions (devices ending with numbers like sda1, sda2, etc.)
    # But allow NVMe disks like nvme0n1, nvme1n1, etc.
    if [[ "$device_name" =~ ^[a-z]+[0-9]+$ && ! "$device_name" =~ ^nvme[0-9]+n[0-9]+$ ]]; then
        if [[ "$VERBOSE" == "true" ]]; then
            log "DEBUG" "Device $device ($device_name) matches partition pattern, excluding"
        fi
        return 1
    fi
    
    # Use lsblk to check if it's a disk (TYPE=disk) not a partition (TYPE=part)
    if command -v lsblk &> /dev/null; then
        local device_type=$(lsblk -d -no TYPE "$device" 2>/dev/null || echo "")
        if [[ "$VERBOSE" == "true" ]]; then
            log "DEBUG" "Device $device ($device_name) has lsblk type: '$device_type'"
        fi
        if [[ "$device_type" == "part" ]]; then
            if [[ "$VERBOSE" == "true" ]]; then
                log "DEBUG" "Device $device ($device_name) is a partition according to lsblk, excluding"
            fi
            return 1
        fi
        # Include if it's a disk or if we can't determine (fallback)
        if [[ "$device_type" == "disk" || -z "$device_type" ]]; then
            if [[ "$VERBOSE" == "true" ]]; then
                log "DEBUG" "Device $device ($device_name) is a disk or undetermined, including"
            fi
            return 0
        else
            if [[ "$VERBOSE" == "true" ]]; then
                log "DEBUG" "Device $device ($device_name) has unknown type '$device_type', excluding"
            fi
            return 1
        fi
    fi
    
    # Fallback: if lsblk is not available, use the regex checks above
    if [[ "$VERBOSE" == "true" ]]; then
        log "DEBUG" "Device $device ($device_name) - lsblk not available, using fallback logic"
    fi
    return 0
}

# Function to scan and process devices
scan_devices() {
    local devices=()
    local excluded_devices=()
    local filtered_partitions=()
    
    # Build device list - only include actual disk devices, not partitions
    for pattern in $DEVICE_PATTERN; do
        log "DEBUG" "Scanning pattern: $pattern"
        for device in $pattern; do
            log "DEBUG" "Checking device: $device"
            if [[ -b "$device" ]]; then
                log "DEBUG" "Device $device is a block device"
                if is_disk_device "$device"; then
                    log "DEBUG" "Device $device passed disk check"
                    # Check if device should be excluded
                    local should_exclude=false
                    for exclude_pattern in $EXCLUDE_PATTERNS; do
                        if [[ "$device" == $exclude_pattern ]]; then
                            should_exclude=true
                            break
                        fi
                    done
                    
                    if [[ "$should_exclude" == "false" ]]; then
                        log "DEBUG" "Adding device $device to processing list"
                        devices+=("$device")
                    else
                        log "DEBUG" "Device $device is excluded"
                        excluded_devices+=("$device")
                    fi
                else
                    log "DEBUG" "Device $device failed disk check"
                    # This is a partition that was filtered out
                    filtered_partitions+=("$device")
                fi
            else
                log "DEBUG" "Device $device is not a block device"
            fi
        done
    done
    
    log "INFO" "Found ${#devices[@]} disk devices to process (partitions excluded)"
    if [[ ${#excluded_devices[@]} -gt 0 ]]; then
        log "INFO" "Excluded ${#excluded_devices[@]} devices: ${excluded_devices[*]}"
    fi
    if [[ "$VERBOSE" == "true" && ${#filtered_partitions[@]} -gt 0 ]]; then
        log "INFO" "Filtered out ${#filtered_partitions[@]} partitions: ${filtered_partitions[*]}"
    fi
    
    # Show all devices that would be processed in dry run mode
    if [[ "$DRY_RUN" == "true" ]]; then
        log "INFO" "DRY RUN: Would process the following disk devices:"
        for device in "${devices[@]}"; do
            local device_name=$(basename "$device")
            local output_file="${OUTPUT_DIR}/${device_name}_smart.json"
            log "INFO" "  $device -> $output_file"
        done
        
        # Create index.json even in dry run mode
        create_index "${devices[@]}"
        return 0
    fi
    
    # Process each device
    local success_count=0
    local error_count=0
    
    log "INFO" "Starting to process ${#devices[@]} devices..."
    log "DEBUG" "Device list: ${devices[*]}"
    
    for device in "${devices[@]}"; do
        log "INFO" "About to process device: $device"
        
        # Use a subshell to catch any errors and continue processing
        if (
            set +e  # Temporarily disable exit on error for this device
            process_device "$device"
            exit_code=$?
            set -e  # Re-enable exit on error
            exit $exit_code
        ); then
            log "INFO" "Device $device processed successfully"
            ((success_count++))
        else
            log "WARNING" "Device $device failed to process, continuing with next device"
            ((error_count++))
        fi
        
        log "INFO" "Completed processing device: $device (success: $success_count, errors: $error_count)"
        log "DEBUG" "Continuing to next device..."
    done
    
    # Create index.json after processing all devices
    create_index "${devices[@]}"
    
    log "INFO" "Processing complete: $success_count successful, $error_count errors"
    return $error_count
}

# Function to create configuration file
create_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log "INFO" "Creating configuration file: $CONFIG_FILE"
        cat > "$CONFIG_FILE" << EOF
# SMART Monitor Configuration File
# Edit these values as needed

# Output directory for JSON files
OUTPUT_DIR="${OUTPUT_DIR}"

# Log file location (set to "" to disable logging)
LOG_FILE="${LOG_FILE}"

# Device patterns to scan (space-separated)
DEVICE_PATTERN="${DEVICE_PATTERN}"

# Device patterns to exclude (space-separated)
EXCLUDE_PATTERNS="${EXCLUDE_PATTERNS}"

# JSON format: pretty, compact, or basic
JSON_FORMAT="${JSON_FORMAT}"
EOF
        log "INFO" "Configuration file created. Edit $CONFIG_FILE to customize settings."
    fi
}

# Main function
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -c|--config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            -o|--output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            -l|--log)
                LOG_FILE="$2"
                shift 2
                ;;
            -d|--devices)
                DEVICE_PATTERN="$2"
                shift 2
                ;;
            -e|--exclude)
                EXCLUDE_PATTERNS="$2"
                shift 2
                ;;
            -f|--format)
                JSON_FORMAT="$2"
                shift 2
                ;;
            -n|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Reload configuration if it exists
    if [[ -f "$CONFIG_FILE" ]]; then
        source "$CONFIG_FILE"
    fi
    
    # Create output directory if it doesn't exist
    mkdir -p "$OUTPUT_DIR"
    
    # Create log file directory if it doesn't exist and LOG_FILE is specified
    if [[ -n "$LOG_FILE" ]]; then
        mkdir -p "$(dirname "$LOG_FILE")"
        # Initialize log file
        log "INFO" "Starting SMART monitor script"
    fi
    
    log "INFO" "Output directory: $OUTPUT_DIR"
    if [[ -n "$LOG_FILE" ]]; then
        log "INFO" "Log file: $LOG_FILE"
    else
        log "INFO" "Log file: None (logging disabled)"
    fi
    log "INFO" "Device pattern: $DEVICE_PATTERN"
    log "INFO" "JSON format: $JSON_FORMAT"
    
    # Check dependencies
    check_dependencies
    
    # Create configuration file if it doesn't exist
    create_config
    
    # Temporarily disable strict error handling for device processing
    set +e
    # Scan and process devices
    scan_devices
    scan_exit_code=$?
    set -e
    
    log "INFO" "SMART monitor script completed successfully"
    exit $scan_exit_code
}

# Run main function with all arguments
main "$@" 