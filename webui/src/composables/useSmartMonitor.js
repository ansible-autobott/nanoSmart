import { useQuery, useQueryClient } from '@tanstack/vue-query'
import axios from 'axios'
import { computed, watchEffect, ref, unref } from 'vue'

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV
console.log('🔍 DEBUG: Environment check - isDevelopment =', isDevelopment)
console.log('🔍 DEBUG: import.meta.env =', import.meta.env)
console.log('🔍 DEBUG: VITE_SMART_API_URL =', import.meta.env.VITE_SMART_API_URL)

// API Endpoints - these would be configured based on your backend setup
const API_BASE_URL = import.meta.env.VITE_SMART_API_URL || '/api/smart'
const INDEX_ENDPOINT = `${API_BASE_URL}/index.json`

// Sample data endpoints for development
const SAMPLE_BASE_URL = '/sampledata'
const SAMPLE_INDEX_ENDPOINT = `${SAMPLE_BASE_URL}/index.json`

console.log('🔍 DEBUG: API endpoints configured:')
console.log('🔍 DEBUG: API_BASE_URL =', API_BASE_URL)
console.log('🔍 DEBUG: INDEX_ENDPOINT =', INDEX_ENDPOINT)
console.log('🔍 DEBUG: SAMPLE_BASE_URL =', SAMPLE_BASE_URL)
console.log('🔍 DEBUG: SAMPLE_INDEX_ENDPOINT =', SAMPLE_INDEX_ENDPOINT)

// Helper: standard response handlers
const extractData = (res) => res.data
const extractItems = (res) => res.data.items || []

/**
 * Fetches the index.json file which contains metadata about all available SMART data
 * @returns {Promise<Object>} Index data with device list and metadata
 */
const fetchIndex = async () => {
    console.log('🔍 DEBUG: fetchIndex called')
    if (isDevelopment) {
        console.log('📊 Development: Fetching sample index data from sampledata folder')
        try {
            const { data } = await axios.get(SAMPLE_INDEX_ENDPOINT)
            console.log('🔍 DEBUG: Sample index data received:', data)
            return data
        } catch (error) {
            console.error('🔍 DEBUG: Error fetching sample index:', error)
            throw error
        }
    }
    
    console.log('📊 Production: Fetching index data from API')
    const { data } = await axios.get(INDEX_ENDPOINT)
    return data
}

/**
 * Fetches SMART data for a specific device
 * @param {string} deviceName - Device name (e.g., 'sda', 'nvme0n1')
 * @returns {Promise<Object>} Device SMART data
 */
const fetchDeviceData = async (deviceName) => {
    console.log('🔍 DEBUG: fetchDeviceData called for:', deviceName)
    if (isDevelopment) {
        console.log(`📊 Development: Fetching sample device data for ${deviceName} from sampledata folder`)
        try {
            const deviceEndpoint = `${SAMPLE_BASE_URL}/${deviceName}_smart.json`
            console.log('🔍 DEBUG: Sample device endpoint:', deviceEndpoint)
            const { data } = await axios.get(deviceEndpoint)
            console.log('🔍 DEBUG: Sample device data received for', deviceName, ':', data)
            return data
        } catch (error) {
            console.error('🔍 DEBUG: Error fetching sample device data for', deviceName, ':', error)
            throw error
        }
    }
    
    console.log(`📊 Production: Fetching device data for ${deviceName} from API`)
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
    console.log('🔍 DEBUG: fetchMultipleDevices called with deviceNames =', deviceNames)
    
    if (isDevelopment) {
        console.log(`📊 Development: Fetching multiple sample device data for ${deviceNames.join(', ')} from sampledata folder`)
        const promises = deviceNames.map(deviceName => {
            const deviceEndpoint = `${SAMPLE_BASE_URL}/${deviceName}_smart.json`
            console.log('🔍 DEBUG: Fetching from sample endpoint:', deviceEndpoint)
            return axios.get(deviceEndpoint).then(res => res.data)
        })
        
        try {
            const results = await Promise.allSettled(promises)
            const successfulResults = results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value)
            console.log('🔍 DEBUG: fetchMultipleDevices successful results count:', successfulResults.length)
            return successfulResults
        } catch (error) {
            console.error('🔍 DEBUG: Error in fetchMultipleDevices:', error)
            throw error
        }
    }
    
    console.log(`📊 Production: Fetching multiple device data for ${deviceNames.join(', ')} from API`)
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
    console.log('🔍 DEBUG: transformDeviceData called with:', deviceData)
    
    if (!deviceData || !deviceData.smart_data) {
        console.log('🔍 DEBUG: No deviceData or smart_data, returning null')
        return null
    }

    const { smart_data } = deviceData
    console.log('🔍 DEBUG: smart_data structure:', smart_data)
    
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
        console.log('🔍 DEBUG: Device type from device.type:', deviceType)
    } else if (deviceInfo.device?.protocol) {
        deviceType = deviceInfo.device.protocol
        console.log('🔍 DEBUG: Device type from device.protocol:', deviceType)
    } else if (smartAttrs.nvme_smart_health_information_log) {
        deviceType = 'NVMe'
        console.log('🔍 DEBUG: Device type inferred as NVMe from smart attributes')
    } else {
        deviceType = 'SATA/SCSI'
        console.log('🔍 DEBUG: Device type inferred as SATA/SCSI')
    }
    
    console.log('🔍 DEBUG: Final deviceType value:', deviceType)

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
        lastCheck,
        smartAttributes,
        errorLog: [], // No longer separate error log, included in smartAttributes
        selftestLog
    }
    
    console.log('🔍 DEBUG: transformDeviceData returning result:', result)
    console.log('🔍 DEBUG: deviceType in result:', result.deviceType)
    
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
        console.log('🔍 DEBUG: loadAllData called')
        isAllDevicesLoading.value = true
        isAllDevicesError.value = false
        allDevicesError.value = null
        
        try {
            // First fetch the index
            const indexData = await fetchIndex()
            console.log('🔍 DEBUG: Index data fetched:', indexData)
            
            if (!indexData?.json_files || indexData.json_files.length === 0) {
                console.log('🔍 DEBUG: No json_files found, setting empty array')
                allDevicesData.value = []
                return
            }
            
            // Extract device names
            const deviceNames = indexData.json_files.map(filename => 
                filename.replace('_smart.json', '')
            )
            console.log('🔍 DEBUG: Device names extracted:', deviceNames)
            
            // Then fetch device data
            const devicesData = await fetchMultipleDevices(deviceNames)
            console.log('🔍 DEBUG: Devices data fetched:', devicesData)
            
            // Transform the data
            const transformedData = devicesData.map(transformDeviceData).filter(Boolean)
            console.log('🔍 DEBUG: Data transformed:', transformedData)
            
            allDevicesData.value = transformedData
        } catch (error) {
            console.error('🔍 DEBUG: Error in loadAllData:', error)
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
        console.log('🔍 DEBUG: allDevicesData computed =', data)
        return data
    })
    const isAllDevicesLoadingComputed = computed(() => {
        const loading = isAllDevicesLoading.value
        console.log('🔍 DEBUG: isAllDevicesLoading computed =', loading)
        return loading
    })
    const isAllDevicesErrorComputed = computed(() => {
        const error = isAllDevicesError.value
        console.log('🔍 DEBUG: isAllDevicesError computed =', error)
        return error
    })
    const allDevicesErrorComputed = computed(() => {
        const err = allDevicesError.value
        console.log('🔍 DEBUG: allDevicesError computed =', err)
        return err
    })

    // Refresh all data
    const refreshAll = () => {
        console.log('🔍 DEBUG: refreshAll called')
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
    
    console.log('🔍 DEBUG: useSmartOverview called')
    console.log('🔍 DEBUG: allDevicesData =', allDevicesData)
    console.log('🔍 DEBUG: isIndexLoading =', isIndexLoading)
    console.log('🔍 DEBUG: isAllDevicesLoading =', isAllDevicesLoading)
    
    const devices = computed(() => {
        const data = allDevicesData.value
        console.log('🔍 DEBUG: devices computed =', data)
        return data
    })
    
    const isLoading = computed(() => {
        const loading = isIndexLoading.value || isAllDevicesLoading.value
        console.log('🔍 DEBUG: isLoading computed =', loading)
        return loading
    })
    const isError = computed(() => {
        const error = isIndexError.value || isAllDevicesError.value
        console.log('🔍 DEBUG: isError computed =', error)
        return error
    })
    const error = computed(() => {
        const err = indexError.value || allDevicesError.value
        console.log('🔍 DEBUG: error computed =', err)
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
    console.log('🔍 DEBUG: useSmartDevice - deviceName:', name)
    
    if (!name) {
        console.log('🔍 DEBUG: useSmartDevice - no device name, returning empty state')
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
    console.log('🔍 DEBUG: useSmartDevice - deviceQuery result:', deviceQueryInstance)
    
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