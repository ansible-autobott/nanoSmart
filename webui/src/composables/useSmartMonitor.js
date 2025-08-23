import { useQuery, useQueryClient } from '@tanstack/vue-query'
import axios from 'axios'
import { computed, watchEffect, ref, unref } from 'vue'

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV

// API Endpoints - these would be configured based on your backend setup
const API_BASE_URL = import.meta.env.VITE_SMART_API_URL || '/api/smart'
const INDEX_ENDPOINT = `${API_BASE_URL}/index.json`

// Sample data endpoints for development
const SAMPLE_BASE_URL = '/sampledata'
const SAMPLE_INDEX_ENDPOINT = `${SAMPLE_BASE_URL}/index.json`


// Helper: standard response handlers
const extractData = (res) => res.data
const extractItems = (res) => res.data.items || []

/**
 * Fetches the index.json file which contains metadata about all available SMART data
 * @returns {Promise<Object>} Index data with device list and metadata
 */
const fetchIndex = async () => {
    if (isDevelopment) {
        console.log('📊 Development: Fetching sample index data from sampledata folder')
        try {
            const { data } = await axios.get(SAMPLE_INDEX_ENDPOINT)
            return data
        } catch (error) {
            throw error
        }
    }
    
    const { data } = await axios.get(INDEX_ENDPOINT)
    return data
}

/**
 * Fetches SMART data for a specific device
 * @param {string} deviceName - Device name (e.g., 'sda', 'nvme0n1')
 * @returns {Promise<Object>} Device SMART data
 */
const fetchDeviceData = async (deviceName) => {
    if (isDevelopment) {
        try {
            const deviceEndpoint = `${SAMPLE_BASE_URL}/${deviceName}_smart.json`
            const { data } = await axios.get(deviceEndpoint)
            return data
        } catch (error) {
            throw error
        }
    }
    
    const deviceEndpoint = `${API_BASE_URL}/${deviceName}_smart.json`
    const { data } = await axios.get(deviceEndpoint)
    return data
}

/**
 * Fetches SMART data for multiple devices
 * @param {Array<string>} deviceNames - Array of device names
 * @returns {Promise<Array>} Array of device SMART data
 */
const fetchMultipleDevices = async (deviceNames) => {

    if (isDevelopment) {
        const promises = deviceNames.map(deviceName => {
            const deviceEndpoint = `${SAMPLE_BASE_URL}/${deviceName}_smart.json`
            return axios.get(deviceEndpoint).then(res => res.data)
        })
        
        try {
            const results = await Promise.allSettled(promises)
            const successfulResults = results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value)
            return successfulResults
        } catch (error) {
            throw error
        }
    }
    
    const promises = deviceNames.map(deviceName => fetchDeviceData(deviceName))
    const results = await Promise.allSettled(promises)
    
    // Filter out failed requests and return successful ones
    return results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
}

/**
 * Transforms raw SMART data into a format suitable for the UI
 * @param {Object} deviceData - Raw device data from the JSON
 * @returns {Object} Transformed device data
 */
const transformDeviceData = (deviceData) => {

    if (!deviceData || !deviceData.smart_data) {
        return null
    }

    const { smart_data } = deviceData

    const deviceInfo = smart_data.device_info || {}
    const smartAttrs = smart_data.smart_attributes || {}
    const smartHealth = smart_data.smart_health || {}
    const smartErrors = smart_data.smart_errors || {}
    const smartSelftest = smart_data.smart_selftest || {}

    // Handle different device info structures
    const model = deviceInfo.model_name || deviceInfo.Device_Model || deviceInfo.Model_Family || 'Unknown Model'
    const serial = deviceInfo.serial_number || deviceInfo.Serial_Number || 'Unknown Serial'
    const firmware = deviceInfo.firmware_version || deviceInfo.Firmware_Version || 'Unknown Firmware'
    
    // Extract device type information
    let deviceType = 'Unknown'
    if (deviceInfo.device?.type) {
        deviceType = deviceInfo.device.type.toUpperCase()
    } else if (deviceInfo.device?.protocol) {
        deviceType = deviceInfo.device.protocol
    } else if (smartAttrs.nvme_smart_health_information_log) {
        deviceType = 'NVMe'
    } else {
        deviceType = 'SATA/SCSI'
    }
    

    // Handle different capacity fields
    let size = 'Unknown Size'
    if (deviceInfo.nvme_total_capacity) {
        size = `${Math.round(deviceInfo.nvme_total_capacity / (1024**3))}GB`
    } else if (deviceInfo.user_capacity?.bytes) {
        size = `${Math.round(deviceInfo.user_capacity.bytes / (1024**3))}GB`
    } else if (deviceInfo.User_Capacity_Bytes) {
        size = `${Math.round(deviceInfo.User_Capacity_Bytes / (1024**3))}GB`
    }

    // Determine health status
    let health = 'Unknown'
    if (smartHealth.smart_status?.passed !== undefined) {
        health = smartHealth.smart_status.passed ? 'Good' : 'Warning'
    } else if (smartHealth.smart_status?.overall_health) {
        health = smartHealth.smart_status.overall_health === 'PASSED' ? 'Good' : 'Warning'
    } else if (smart_data.smart_status?.passed !== undefined) {
        // Handle case where smart_status is at root level (like in sample data)
        health = smart_data.smart_status.passed ? 'Good' : 'Warning'
    }

    // Extract power on hours from various possible locations
    let powerOnHours = 0
    if (smartAttrs.Power_On_Hours?.raw) {
        powerOnHours = parseInt(smartAttrs.Power_On_Hours.raw) || 0
    } else if (smartAttrs['9']?.raw) {
        powerOnHours = parseInt(smartAttrs['9'].raw) || 0
    } else if (smartAttrs.power_on_time?.hours) {
        powerOnHours = parseInt(smartAttrs.power_on_time.hours) || 0
    } else if (smartAttrs.nvme_smart_health_information_log?.power_on_hours) {
        powerOnHours = parseInt(smartAttrs.nvme_smart_health_information_log.power_on_hours) || 0
    }

    // Extract temperature from various possible locations
    let temperature = null
    if (smartAttrs.nvme_smart_health_information_log?.temperature) {
        temperature = smartAttrs.nvme_smart_health_information_log.temperature
    } else if (smartAttrs.temperature?.current) {
        temperature = smartAttrs.temperature.current
    } else if (smartAttrs.ata_smart_attributes?.table) {
        // Look for temperature attribute (ID 194) in ATA SMART table
        const tempAttr = smartAttrs.ata_smart_attributes.table.find(attr => attr.id === 194)
        if (tempAttr?.raw?.value) {
            temperature = tempAttr.raw.value
        }
    }

    // Format timestamp
    const lastCheck = deviceData.timestamp ? 
        new Date(deviceData.timestamp * 1000).toLocaleString() : 'Unknown'

    // Transform SMART attributes - handle both traditional and NVMe formats
    let smartAttributes = []
    
    // Check if this is NVMe data with nvme_smart_health_information_log
    if (smartAttrs.nvme_smart_health_information_log) {
        const nvmeData = smartAttrs.nvme_smart_health_information_log
        smartAttributes = [
            {
                id: 'critical_warning',
                name: 'Critical Warning',
                value: nvmeData.critical_warning === 0 ? 100 : 0,
                worst: nvmeData.critical_warning === 0 ? 100 : 0,
                threshold: 0,
                raw: nvmeData.critical_warning.toString(),
                status: nvmeData.critical_warning === 0 ? 'Good' : 'Warning'
            },
            {
                id: 'temperature',
                name: 'Temperature',
                value: nvmeData.temperature < 70 ? 100 : 50,
                worst: nvmeData.temperature < 70 ? 100 : 50,
                threshold: 70,
                raw: nvmeData.temperature.toString(),
                status: nvmeData.temperature < 70 ? 'Good' : 'Warning'
            },
            {
                id: 'available_spare',
                name: 'Available Spare',
                value: nvmeData.available_spare,
                worst: nvmeData.available_spare,
                threshold: nvmeData.available_spare_threshold,
                raw: nvmeData.available_spare.toString(),
                status: nvmeData.available_spare > nvmeData.available_spare_threshold ? 'Good' : 'Warning'
            },
            {
                id: 'percentage_used',
                name: 'Percentage Used',
                value: 100 - nvmeData.percentage_used,
                worst: 100 - nvmeData.percentage_used,
                threshold: 0,
                raw: nvmeData.percentage_used.toString(),
                status: nvmeData.percentage_used < 80 ? 'Good' : 'Warning'
            },
            {
                id: 'power_on_hours',
                name: 'Power-On Hours',
                value: nvmeData.power_on_hours < 8760 ? 100 : 85,
                worst: nvmeData.power_on_hours < 8760 ? 100 : 85,
                threshold: 0,
                raw: nvmeData.power_on_hours.toString(),
                status: 'Good'
            },
            {
                id: 'power_cycles',
                name: 'Power Cycles',
                value: nvmeData.power_cycles < 1000 ? 100 : 90,
                worst: nvmeData.power_cycles < 1000 ? 100 : 90,
                threshold: 0,
                raw: nvmeData.power_cycles.toString(),
                status: 'Good'
            },
            {
                id: 'media_errors',
                name: 'Media Errors',
                value: nvmeData.media_errors === 0 ? 100 : 0,
                worst: nvmeData.media_errors === 0 ? 100 : 0,
                threshold: 0,
                raw: nvmeData.media_errors.toString(),
                status: nvmeData.media_errors === 0 ? 'Good' : 'Warning'
            },
            {
                id: 'num_err_log_entries',
                name: 'Error Log Entries',
                value: nvmeData.num_err_log_entries === 0 ? 100 : 50,
                worst: nvmeData.num_err_log_entries === 0 ? 100 : 50,
                threshold: 0,
                raw: nvmeData.num_err_log_entries.toString(),
                status: nvmeData.num_err_log_entries === 0 ? 'Good' : 'Warning'
            },
            {
                id: 'unsafe_shutdowns',
                name: 'Unsafe Shutdowns',
                value: nvmeData.unsafe_shutdowns === 0 ? 100 : 50,
                worst: nvmeData.unsafe_shutdowns === 0 ? 100 : 50,
                threshold: 0,
                raw: nvmeData.unsafe_shutdowns.toString(),
                status: nvmeData.unsafe_shutdowns === 0 ? 'Good' : 'Warning'
            }
        ]
    } else {
        // Traditional SMART attributes format - check for ATA SMART attributes table
        if (smartAttrs.ata_smart_attributes?.table) {
            // ATA SMART attributes are in a table format
            smartAttributes = smartAttrs.ata_smart_attributes.table.map(attr => ({
                id: attr.id,
                name: attr.name,
                value: attr.value,
                worst: attr.worst,
                threshold: attr.thresh, // Note: ATA uses 'thresh' not 'threshold'
                raw: attr.raw?.string || attr.raw?.value?.toString() || '0',
                status: attr.value > attr.thresh ? 'Good' : 'Warning'
            }))
        } else {
            // Fallback to generic SMART attributes format
            smartAttributes = Object.entries(smartAttrs)
                .filter(([key, attr]) => attr && typeof attr === 'object' && attr.id)
                .map(([key, attr]) => ({
                    id: attr.id || key,
                    name: attr.name || key,
                    value: attr.value || 0,
                    worst: attr.worst || 0,
                    threshold: attr.threshold || 0,
                    raw: attr.raw || '0',
                    status: (attr.value || 0) > (attr.threshold || 0) ? 'Good' : 'Warning'
                }))
        }
        
        // Add error-related SMART attributes for traditional drives
        if (smartHealth.smart_status?.passed !== undefined) {
            smartAttributes.push({
                id: 'smart_status',
                name: 'SMART Status',
                value: smartHealth.smart_status.passed ? 100 : 0,
                worst: smartHealth.smart_status.passed ? 100 : 0,
                threshold: 0,
                raw: smartHealth.smart_status.passed ? 'PASSED' : 'FAILED',
                status: smartHealth.smart_status.passed ? 'Good' : 'Warning'
            })
        }
    }

    // Transform self-test log - handle both traditional and NVMe formats
    let selftestLog = []
    if (smartAttrs.nvme_smart_health_information_log) {
        // NVMe devices typically don't have traditional self-tests
        selftestLog = [
            {
                timestamp: lastCheck,
                type: 'NVMe Health Check',
                status: 'Completed without error',
                duration: 'N/A'
            }
        ]
    } else {
        // Traditional self-test log format - check for ATA self-test log
        if (smartSelftest.ata_smart_self_test_log?.standard?.table) {
            // ATA self-test log is in a table format
            selftestLog = smartSelftest.ata_smart_self_test_log.standard.table.map(test => ({
                timestamp: test.lifetime_hours ? `${test.lifetime_hours} hours` : lastCheck,
                type: test.type?.string || 'Unknown',
                status: test.status?.string || 'Unknown',
                duration: 'N/A'
            }))
        } else {
            // Fallback to generic self-test log format
            selftestLog = Object.entries(smartSelftest)
                .filter(([key, test]) => test && typeof test === 'object')
                .map(([key, test]) => ({
                    timestamp: test.timestamp || lastCheck,
                    type: test.type || key,
                    status: test.status || 'Unknown',
                    duration: test.duration || 'Unknown'
                }))
        }
    }

    const result = {
        id: (deviceData.device || 'unknown').replace('/dev/', ''),
        name: (deviceData.device || 'unknown').replace('/dev/', ''),
        model,
        serial,
        firmware,
        deviceType,
        size,
        health,
        powerOnHours,
        temperature,
        lastCheck,
        smartAttributes,
        errorLog: [], // No longer separate error log, included in smartAttributes
        selftestLog
    }

    
    return result
}

/**
 * Main composable for SMART monitoring data
 * 
 * This composable automatically handles the loading sequence:
 * 1. First loads the index.json to get the list of available devices
 * 2. Then automatically loads SMART data for all devices found in json_files
 * 3. Provides reactive data that updates when either the index or device data changes
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} SMART monitoring data and functions
 */
export function useSmartMonitor(options = {}) {
    const queryClient = useQueryClient()
    
    // Query keys
    const indexQueryKey = ['smart', 'index']
    const deviceQueryKey = (deviceName) => ['smart', 'device', deviceName]
    const devicesQueryKey = (deviceNames) => ['smart', 'devices', deviceNames]

    // Simple approach: manually trigger data loading
    const allDevicesData = ref([])
    const isAllDevicesLoading = ref(false)
    const isAllDevicesError = ref(false)
    const allDevicesError = ref(null)

    // Function to load all data
    const loadAllData = async () => {
        isAllDevicesLoading.value = true
        isAllDevicesError.value = false
        allDevicesError.value = null
        
        try {
            // First fetch the index
            const indexData = await fetchIndex()

            if (!indexData?.json_files || indexData.json_files.length === 0) {
                allDevicesData.value = []
                return
            }
            
            // Extract device names
            const deviceNames = indexData.json_files.map(filename => 
                filename.replace('_smart.json', '')
            )

            // Then fetch device data
            const devicesData = await fetchMultipleDevices(deviceNames)

            // Transform the data
            const transformedData = devicesData.map(transformDeviceData).filter(Boolean)

            allDevicesData.value = transformedData
        } catch (error) {
            isAllDevicesError.value = true
            allDevicesError.value = error
        } finally {
            isAllDevicesLoading.value = false
        }
    }

    // Load data when component mounts
    loadAllData()

    // Fetch data for a specific device
    const deviceQuery = (deviceName) => useQuery({
        queryKey: deviceQueryKey(deviceName),
        queryFn: () => fetchDeviceData(deviceName),
        enabled: !!deviceName,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,   // 10 minutes
        select: transformDeviceData
    })

    // Fetch data for multiple devices
    const devicesQuery = (deviceNames) => useQuery({
        queryKey: devicesQueryKey(deviceNames),
        queryFn: () => fetchMultipleDevices(deviceNames),
        enabled: !!deviceNames && deviceNames.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,   // 10 minutes
        select: (devicesData) => devicesData.map(transformDeviceData).filter(Boolean)
    })

    // Computed properties for all devices data
    const allDevicesDataComputed = computed(() => {
        const data = allDevicesData.value
        return data
    })
    const isAllDevicesLoadingComputed = computed(() => {
        const loading = isAllDevicesLoading.value
        return loading
    })
    const isAllDevicesErrorComputed = computed(() => {
        const error = isAllDevicesError.value
        return error
    })
    const allDevicesErrorComputed = computed(() => {
        const err = allDevicesError.value
        return err
    })

    // Refresh all data
    const refreshAll = () => {
        loadAllData()
    }

    // Refresh specific device
    const refreshDevice = (deviceName) => {
        queryClient.invalidateQueries({ queryKey: deviceQueryKey(deviceName) })
    }

    return {
        // Index data
        index: allDevicesDataComputed,
        isIndexLoading: isAllDevicesLoadingComputed,
        isIndexError: isAllDevicesErrorComputed,
        indexError: allDevicesErrorComputed,
        
        // Device queries
        deviceQuery,
        devicesQuery,
        
        // All devices data (automatically loaded after index)
        allDevicesData: allDevicesDataComputed,
        isAllDevicesLoading: isAllDevicesLoadingComputed,
        isAllDevicesError: isAllDevicesErrorComputed,
        allDevicesError: allDevicesErrorComputed,
        
        // Helper functions
        refreshAll,
        refreshDevice,
        
        // Transform function for external use
        transformDeviceData,
        
        // Export fetch functions for direct use
        fetchDeviceData,
        fetchIndex
    }
}

/**
 * Simplified composable for overview page
 * @returns {Object} Overview data and functions
 */
export function useSmartOverview() {
    const { 
        index, 
        isIndexLoading, 
        isIndexError, 
        indexError, 
        allDevicesData, 
        isAllDevicesLoading, 
        isAllDevicesError, 
        allDevicesError, 
        refreshAll 
    } = useSmartMonitor()
    

    const devices = computed(() => {
        const data = allDevicesData.value
        return data
    })
    
    const isLoading = computed(() => {
        const loading = isIndexLoading.value || isAllDevicesLoading.value
        return loading
    })
    const isError = computed(() => {
        const error = isIndexError.value || isAllDevicesError.value
        return error
    })
    const error = computed(() => {
        const err = indexError.value || allDevicesError.value
        return err
    })
    
    return {
        devices,
        isLoading,
        isError,
        error,
        refreshAll,
        totalDevices: computed(() => devices.value.length),
        healthyDevices: computed(() => devices.value.filter(d => d.health === 'Good').length),
        warningDevices: computed(() => devices.value.filter(d => d.health === 'Warning').length),
        lastCheck: computed(() => devices.value[0]?.lastCheck || 'N/A')
    }
}

/**
 * Composable for device detail page
 * @param {string|Ref<string>} deviceName - Device name to fetch details for
 * @returns {Object} Device detail data and functions
 */
export function useSmartDevice(deviceName) {
    const { deviceQuery, refreshDevice } = useSmartMonitor()
    
    // Get the device name value
    const name = unref(deviceName)

    if (!name) {
        return {
            device: ref(null),
            isLoading: ref(false),
            isError: ref(false),
            error: ref(null),
            refresh: () => {}
        }
    }
    
    // Call deviceQuery at the top level (this is required for Vue Query)
    const deviceQueryInstance = deviceQuery(name)

    return {
        device: computed(() => deviceQueryInstance.data || null),
        isLoading: computed(() => deviceQueryInstance.isLoading || false),
        isError: computed(() => deviceQueryInstance.isError || false),
        error: computed(() => deviceQueryInstance.error || null),
        refresh: () => {
            if (name) {
                refreshDevice(name)
            }
        }
    }
} 

// Export these functions at module level for direct import
export { fetchIndex, fetchDeviceData, transformDeviceData } 