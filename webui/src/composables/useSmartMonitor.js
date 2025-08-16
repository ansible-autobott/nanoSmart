import { useQuery, useQueryClient } from '@tanstack/vue-query'
import axios from 'axios'
import { computed } from 'vue'

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
        const { data } = await axios.get(SAMPLE_INDEX_ENDPOINT)
        return data
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
        console.log(`📊 Development: Fetching sample device data for ${deviceName} from sampledata folder`)
        const deviceEndpoint = `${SAMPLE_BASE_URL}/${deviceName}_smart.json`
        const { data } = await axios.get(deviceEndpoint)
        return data
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
        console.log(`📊 Development: Fetching multiple sample device data for ${deviceNames.join(', ')} from sampledata folder`)
        const promises = deviceNames.map(deviceName => fetchDeviceData(deviceName))
        const results = await Promise.allSettled(promises)
        return results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value)
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
            }
        ]
    } else {
        // Traditional SMART attributes format
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

    // Transform error log - handle both traditional and NVMe formats
    let errorLog = []
    if (smartAttrs.nvme_smart_health_information_log) {
        const nvmeData = smartAttrs.nvme_smart_health_information_log
        errorLog = [
            {
                timestamp: lastCheck,
                type: 'Media Errors',
                count: nvmeData.media_errors || 0
            },
            {
                timestamp: lastCheck,
                type: 'Error Log Entries',
                count: nvmeData.num_err_log_entries || 0
            },
            {
                timestamp: lastCheck,
                type: 'Unsafe Shutdowns',
                count: nvmeData.unsafe_shutdowns || 0
            }
        ]
    } else {
        // Traditional error log format
        errorLog = Object.entries(smartErrors)
            .filter(([key, error]) => error && typeof error === 'object')
            .map(([key, error]) => ({
                timestamp: lastCheck,
                type: key,
                count: error.count || error.value || 0
            }))
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
        // Traditional self-test log format
        selftestLog = Object.entries(smartSelftest)
            .filter(([key, test]) => test && typeof test === 'object')
            .map(([key, test]) => ({
                timestamp: test.timestamp || lastCheck,
                type: test.type || key,
                status: test.status || 'Unknown',
                duration: test.duration || 'Unknown'
            }))
    }

    return {
        id: deviceData.device || 'unknown',
        name: deviceData.device || 'unknown',
        model,
        serial,
        firmware,
        size,
        health,
        powerOnHours,
        lastCheck,
        smartAttributes,
        errorLog,
        selftestLog
    }
}

/**
 * Main composable for SMART monitoring data
 * @param {Object} options - Configuration options
 * @returns {Object} SMART monitoring data and functions
 */
export function useSmartMonitor(options = {}) {
    const queryClient = useQueryClient()
    
    // Query keys
    const indexQueryKey = ['smart', 'index']
    const deviceQueryKey = (deviceName) => ['smart', 'device', deviceName]
    const devicesQueryKey = (deviceNames) => ['smart', 'devices', deviceNames]

    // Fetch index data
    const indexQuery = useQuery({
        queryKey: indexQueryKey,
        queryFn: fetchIndex,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000,   // 10 minutes
    })

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

    // Helper function to get all devices data
    const getAllDevices = computed(() => {
        if (!indexQuery.data?.json_files) return []
        
        const deviceNames = indexQuery.data.json_files.map(filename => 
            filename.replace('_smart.json', '')
        )
        
        return devicesQuery(deviceNames)
    })

    // Refresh all data
    const refreshAll = () => {
        queryClient.invalidateQueries({ queryKey: ['smart'] })
    }

    // Refresh specific device
    const refreshDevice = (deviceName) => {
        queryClient.invalidateQueries({ queryKey: deviceQueryKey(deviceName) })
    }

    return {
        // Index data
        index: indexQuery.data,
        isIndexLoading: indexQuery.isLoading,
        isIndexError: indexQuery.isError,
        indexError: indexQuery.error,
        
        // Device queries
        deviceQuery,
        devicesQuery,
        getAllDevices,
        
        // Helper functions
        refreshAll,
        refreshDevice,
        
        // Transform function for external use
        transformDeviceData
    }
}

/**
 * Simplified composable for overview page
 * @returns {Object} Overview data and functions
 */
export function useSmartOverview() {
    const { index, isIndexLoading, isIndexError, indexError, getAllDevices, refreshAll } = useSmartMonitor()
    
    const devices = computed(() => {
        const devicesQuery = getAllDevices.value
        return devicesQuery?.data?.value || []
    })
    
    const isLoading = computed(() => isIndexLoading.value || getAllDevices.value?.isLoading)
    const isError = computed(() => isIndexError.value || getAllDevices.value?.isError)
    const error = computed(() => indexError.value || getAllDevices.value?.error)
    
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
 * @param {string} deviceName - Device name to fetch details for
 * @returns {Object} Device detail data and functions
 */
export function useSmartDevice(deviceName) {
    const { deviceQuery, refreshDevice } = useSmartMonitor()
    
    const deviceQueryInstance = deviceQuery(deviceName)
    
    return {
        device: deviceQueryInstance.data,
        isLoading: deviceQueryInstance.isLoading,
        isError: deviceQueryInstance.isError,
        error: deviceQueryInstance.error,
        refresh: () => refreshDevice(deviceName)
    }
} 