<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import { useSmartMonitor } from '@/composables/useSmartMonitor'
import { fetchDeviceData, transformDeviceData } from '@/composables/useSmartMonitor'

const route = useRoute()
const router = useRouter()
const deviceId = computed(() => route.params.id)


// Use the SMART monitoring composable for helper functions

// Use useQuery directly - this is the correct way to handle reactive parameters
const deviceQuery = useQuery({
    queryKey: ['smart', 'device', deviceId],
    queryFn: () => {
        if (!deviceId.value) return null
        return fetchDeviceData(deviceId.value)
    },
    enabled: computed(() => !!deviceId.value),
    select: (data) => {
        if (!data) return null
        return transformDeviceData(data)
    }
})

// Extract the reactive data
const device = computed(() => deviceQuery.data.value || null)
const isLoading = computed(() => deviceQuery.isLoading.value || false)
const isError = computed(() => deviceQuery.isError.value || false)
const error = computed(() => deviceQuery.error.value || null)

// Function to refresh device data
const refresh = () => {
    if (deviceId.value) {
        deviceQuery.refetch()
    }
}

const attributeSeverity = (status) => {
    switch (status) {
        case 'Good': return 'success'
        case 'Warning': return 'warn'
        case 'Critical': return 'danger'
        default: return 'info'
    }
}

const getAttributeDescription = (attributeName) => {
    const descriptions = {
        // NVMe attributes
        'Critical Warning': 'Overall health status of the device',
        'Available Spare': 'Percentage of spare blocks available',
        'Percentage Used': 'Estimated percentage of device life used',
        'Media Errors': 'Number of media errors detected during read/write operations',
        'Error Log Entries': 'Total count of error log entries recorded',
        'Unsafe Shutdowns': 'Number of times the device was shut down unexpectedly',
        
        // Common ATA SMART attributes
        'Raw_Read_Error_Rate': 'Rate of uncorrected read errors',
        'Throughput_Performance': 'Overall device performance indicator',
        'Spin_Up_Time': 'Time required to spin up the drive from stop',
        'Start_Stop_Count': 'Number of start/stop cycles',
        'Reallocated_Sector_Ct': 'Number of reallocated sectors',
        'Seek_Error_Rate': 'Rate of seek errors during operation',
        'Seek_Time_Performance': 'Average seek time performance',
        'Power_On_Hours': 'Total time the device has been powered on',
        'Spin_Retry_Count': 'Number of retries to spin up the drive',
        'Helium_Level': 'Helium level in helium-filled drives',
        'Power-Off_Retract_Count': 'Number of power-off retracts',
        'Load_Cycle_Count': 'Number of load/unload cycles',
        'Temperature_Celsius': 'Current operating temperature',
        'Reallocated_Event_Count': 'Number of reallocation events',
        'Current_Pending_Sector': 'Number of sectors waiting to be reallocated',
        'Offline_Uncorrectable': 'Number of uncorrectable sectors found offline',
        'UDMA_CRC_Error_Count': 'UltraDMA CRC error count',
        
        // Alternative naming variations
        'Temperature': 'Current operating temperature in Celsius',
        'Power-On Hours': 'Total time the device has been powered on',
        'Power Cycles': 'Number of power on/off cycles',
        'SMART Status': 'Overall SMART health status of the device',
        'Reallocated Sectors Count': 'Number of reallocated sectors',
        'Current Pending Sectors': 'Number of sectors waiting to be reallocated',
        'Uncorrectable Sectors': 'Number of sectors that cannot be corrected',
        'Spin Retry Count': 'Number of retries to spin up the drive',
        'Calibration Retry Count': 'Number of calibration retries',
        'Power Cycle Count': 'Number of power cycles',
        'Soft Read Error Rate': 'Rate of soft read errors',
        'End-to-End Error': 'Data integrity errors',
        'Reported Uncorrectable Errors': 'Uncorrectable errors reported',
        'High Fly Writes': 'Writes while head was flying high',
        'Airflow Temperature': 'Temperature of airflow around the drive',
        'G-Sense Error Rate': 'Rate of G-sense errors',
        'Power-Off Retract Count': 'Number of power-off retracts',
        'Load Cycle Count': 'Number of load/unload cycles',
        'Hardware ECC Recovered': 'Hardware ECC errors recovered',
        'Reallocation Event Count': 'Number of reallocation events',
        'Current Pending Sector Count': 'Sectors pending reallocation',
        'Offline Uncorrectable': 'Uncorrectable sectors found offline',
        'UltraDMA CRC Error Count': 'UltraDMA CRC errors',
        'Multi Zone Error Rate': 'Multi-zone error rate',
        'Seek Error Rate': 'Rate of seek errors',
        'Spin Up Time': 'Time to spin up from stop',
        'Start Stop Count': 'Number of start/stop cycles',
        'Reallocated Sector Count': 'Number of reallocated sectors',
        'Seek Time Performance': 'Seek time performance',
        'Power On Hours Count': 'Total power-on time'
    }
    
    // First try exact match
    if (descriptions[attributeName]) {
        return descriptions[attributeName]
    }
    
    // If no exact match, try fuzzy matching for common patterns
    const attrLower = attributeName.toLowerCase()
    
    if (attrLower.includes('error') && attrLower.includes('rate')) {
        return 'Rate of errors during operation'
    } else if (attrLower.includes('error') && attrLower.includes('count')) {
        return 'Count of errors detected'
    } else if (attrLower.includes('temperature')) {
        return 'Current operating temperature'
    } else if (attrLower.includes('power') && attrLower.includes('on')) {
        return 'Total time the device has been powered on'
    } else if (attrLower.includes('power') && attrLower.includes('cycle')) {
        return 'Number of power on/off cycles'
    } else if (attrLower.includes('reallocated') || attrLower.includes('reallocation')) {
        return 'Number of reallocated sectors'
    } else if (attrLower.includes('pending')) {
        return 'Number of sectors waiting to be processed'
    } else if (attrLower.includes('uncorrectable')) {
        return 'Number of sectors that cannot be corrected'
    } else if (attrLower.includes('seek')) {
        return 'Seek time and performance metrics'
    } else if (attrLower.includes('spin')) {
        return 'Drive spin-up performance metrics'
    } else if (attrLower.includes('load') && attrLower.includes('cycle')) {
        return 'Number of load/unload cycles'
    } else if (attrLower.includes('crc')) {
        return 'CRC error detection and counting'
    } else if (attrLower.includes('throughput')) {
        return 'Overall device performance indicator'
    } else if (attrLower.includes('helium')) {
        return 'Helium level in helium-filled drives'
    }
    
    return `SMART monitoring attribute: ${attributeName}`
}

const getSelftestDescription = (testType) => {
    const descriptions = {
        'Short Self-Test': 'Quick diagnostic check of drive health (typically 1-2 minutes)',
        'Extended Self-Test': 'Comprehensive diagnostic check of drive health (typically 1-4 hours)',
        'Conveyance Test': 'Test performed during drive movement and transportation',
        'Power-On Self-Test': 'Automatic test performed when drive is powered on',
        'Power-Off Self-Test': 'Test performed when drive is powered off',
        'Load/Unload Cycle': 'Test of drive head loading and unloading mechanism',
        'Calibration': 'Test to ensure accurate head positioning and alignment',
        'NVMe Health Check': 'NVMe-specific health monitoring and diagnostic test',
        'SMART Self-Test': 'Standard SMART monitoring self-test',
        'Background Scan': 'Background scanning and monitoring test',
        'Selective Test': 'Targeted test of specific drive components',
        'Other': 'Self-test of unspecified type'
    }
    
    // If no exact match, try to provide a generic description based on the test type
    if (!descriptions[testType]) {
        if (testType.toLowerCase().includes('short')) {
            return 'Quick diagnostic test of drive health'
        } else if (testType.toLowerCase().includes('extended')) {
            return 'Comprehensive diagnostic test of drive health'
        } else if (testType.toLowerCase().includes('nvme')) {
            return 'NVMe-specific health monitoring test'
        } else if (testType.toLowerCase().includes('smart')) {
            return 'SMART monitoring diagnostic test'
        } else if (testType.toLowerCase().includes('health')) {
            return 'Health monitoring and diagnostic test'
        } else if (testType.toLowerCase().includes('background')) {
            return 'Background monitoring and scanning test'
        } else {
            return `Test type: ${testType}`
        }
    }
    
    return descriptions[testType]
}

const getSelftestStatusSeverity = (status) => {
    if (!status) return 'info'
    
    const statusLower = status.toLowerCase()
    
    // Check for successful completion first
    if (statusLower.includes('completed without error') || 
        statusLower.includes('passed') || 
        statusLower.includes('success') ||
        statusLower.includes('ok')) {
        return 'success'
    }
    
    // Check for failures or errors
    if (statusLower.includes('failed') || 
        statusLower.includes('error') || 
        statusLower.includes('aborted') ||
        statusLower.includes('interrupted')) {
        return 'danger'
    }
    
    // Check for warnings
    if (statusLower.includes('warning') || 
        statusLower.includes('caution')) {
        return 'warn'
    }
    
    // Default to info for unknown statuses
    return 'info'
}

const goBack = () => {
    router.push('/')
}
</script>

<template>
    <div class="detail-container">
        <div class="header-section">
            <div class="header-left">
                <Button 
                    icon="pi pi-arrow-left" 
                    label="Back to Overview" 
                    @click="goBack"
                    class="back-button"
                />
                <h1>Device Details</h1>
            </div>
        </div>

        <!-- Device Summary Card -->
        <div v-if="isLoading" class="loading-state">
            <i class="pi pi-spin pi-spinner" style="font-size: 2rem;"></i>
            <p>Loading device details...</p>
        </div>
        
        <div v-else-if="isError" class="error-state">
            <i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: var(--c-danger-500);"></i>
            <p>Error loading device details: {{ error?.message || 'Unknown error' }}</p>
            <Button @click="refresh" label="Retry" icon="pi pi-refresh" />
        </div>
        
        <template v-else-if="device">
            <Card class="summary-card">
                <template #title>
                    <div class="card-title">
                        <i class="pi pi-hdd"></i>
                        Device Information
                    </div>
                </template>
                <template #content>
                    <div class="device-summary">
                        <div class="summary-row">
                            <div class="summary-item">
                                <label>Device Name:</label>
                                <code>{{ device.name }}</code>
                            </div>
                            <div class="summary-item">
                                <label>Model:</label>
                                <span>{{ device.model }}</span>
                            </div>
                            <div class="summary-item">
                                <label>Device Type:</label>
                                <span>{{ device.deviceType }}</span>
                            </div>
                        </div>
                        <div class="summary-row">
                            <div class="summary-item">
                                <label>Serial Number:</label>
                                <span>{{ device.serial }}</span>
                            </div>
                            <div class="summary-item">
                                <label>Firmware:</label>
                                <span>{{ device.firmware }}</span>
                            </div>
                            <div class="summary-item">
                                <label>Size:</label>
                                <span>{{ device.size }}</span>
                            </div>
                        </div>
                        <div class="summary-row">
                            <div class="summary-item">
                                <label>Power On Hours:</label>
                                <span>{{ device.powerOnHours.toLocaleString() }}h</span>
                            </div>
                            <div class="summary-item">
                                <label>Last Check:</label>
                                <span>{{ device.lastCheck }}</span>
                            </div>
                            <div class="summary-item">
                                <label>Health Status:</label>
                                <Tag :value="device.health" :severity="attributeSeverity(device.health)" />
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Detailed Information Tabs -->
            <Card class="tabs-card">
                <template #content>
                    <TabView class="detail-tabs">
                        <!-- SMART Attributes Tab -->
                        <TabPanel header="SMART Attributes">
                            <DataTable 
                                :value="device.smartAttributes" 
                                :rows="100"
                                responsiveLayout="scroll"
                                class="attributes-table"
                            >
                                <Column field="name" header="Attribute Name" sortable style="width: 150px"></Column>
                                <Column field="description" header="Description" sortable style="width: 250px">
                                    <template #body="{ data }">
                                        <span class="attribute-description">{{ getAttributeDescription(data.name) }}</span>
                                    </template>
                                </Column>
                                <Column field="value" header="Value" sortable style="width: 80px">
                                    <template #body="{ data }">
                                        <div class="value-cell">
                                            <span>{{ data.value }}</span>
                                            <ProgressBar 
                                                :value="data.value" 
                                                :max="100"
                                                :showValue="false"
                                                class="value-progress"
                                            />
                                        </div>
                                    </template>
                                </Column>
                                <Column field="worst" header="Worst" sortable style="width: 80px"></Column>
                                <Column field="threshold" header="Threshold" sortable style="width: 100px"></Column>
                                <Column field="raw" header="Raw Value" sortable style="width: 120px">
                                    <template #body="{ data }">
                                        <code>{{ data.raw }}</code>
                                    </template>
                                </Column>
                                <Column field="status" header="Status" sortable style="width: 100px">
                                    <template #body="{ data }">
                                        <Tag :value="data.status" :severity="attributeSeverity(data.status)" />
                                    </template>
                                </Column>
                            </DataTable>
                        </TabPanel>

                        <!-- Self-Test Log Tab -->
                        <TabPanel header="Self-Test Log">
                            <DataTable 
                                :value="device.selftestLog" 
                                :rows="100"
                                responsiveLayout="scroll"
                                class="selftest-table"
                            >
                                <Column field="timestamp" header="Timestamp" sortable style="width: 150px"></Column>
                                <Column field="type" header="Test Type" sortable style="width: 120px"></Column>
                                <Column field="description" header="Description" sortable style="width: 250px">
                                    <template #body="{ data }">
                                        <span class="attribute-description">{{ getSelftestDescription(data.type) }}</span>
                                    </template>
                                </Column>
                                <Column field="status" header="Status" sortable style="width: 100px">
                                    <template #body="{ data }">
                                        <Tag 
                                            :value="data.status" 
                                            :severity="getSelftestStatusSeverity(data.status)"
                                        />
                                    </template>
                                </Column>
                                <Column field="duration" header="Duration" sortable style="width: 120px"></Column>
                            </DataTable>
                        </TabPanel>
                    </TabView>
                </template>
            </Card>
        </template>
    </div>
</template>

<style scoped>
.detail-container {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
}

.header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.header-left h1 {
    color: var(--c-primary-600);
    margin: 0;
    font-size: 2rem;
}

.back-button {
    margin-right: 1rem;
}

.summary-card {
    margin-bottom: 2rem;
}

.card-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.1rem;
}

.device-summary {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.summary-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr; /* Changed from 1fr 1fr to 1fr 1fr 1fr */
    gap: 2rem;
    align-items: center;
}

.summary-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.summary-item label {
    font-weight: 600;
    color: var(--c-text-color-secondary);
    font-size: 0.9rem;
}

.summary-item span,
.summary-item code {
    font-size: 1rem;
}

.tabs-card {
    margin-bottom: 2rem;
}

.detail-tabs {
    margin-top: 1rem;
}

.attributes-table,
.selftest-table {
    margin-top: 1rem;
}

.attribute-description {
    font-size: 0.9rem;
    color: var(--c-text-color-secondary);
    line-height: 1.3;
}

.value-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.value-progress {
    height: 0.5rem;
}

.loading-state, .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    color: var(--c-text-color-secondary);
    font-size: 1.1rem;
}

.loading-state i, .error-state i {
    margin-bottom: 1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .detail-container {
        padding: 1rem;
    }
    
    .header-section {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
    }
    
    .summary-row {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    
    .header-left h1 {
        font-size: 1.5rem;
    }
}
</style> 