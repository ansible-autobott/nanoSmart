<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Divider from 'primevue/divider'

const route = useRoute()
const router = useRouter()
const deviceId = computed(() => route.params.id)

// Sample detailed device data - in a real app, this would come from your SMART monitoring API
const device = ref({
    id: 1,
    name: '/dev/sda',
    model: 'Samsung SSD 860 EVO',
    serial: 'S3EWNF0M803234X',
    firmware: 'RVT02B6Q',
    size: '500GB',
    health: 'Good',
    temperature: 35,
    powerOnHours: 8760,
    lastCheck: '2024-01-15 10:30:00',
    smartAttributes: [
        { id: 1, name: 'Raw Read Error Rate', value: 100, worst: 100, threshold: 50, raw: '0', status: 'Good' },
        { id: 5, name: 'Reallocated Sectors Count', value: 100, worst: 100, threshold: 50, raw: '0', status: 'Good' },
        { id: 9, name: 'Power-On Hours', value: 95, worst: 95, threshold: 0, raw: '8760', status: 'Good' },
        { id: 12, name: 'Power Cycles', value: 99, worst: 99, threshold: 0, raw: '1234', status: 'Good' },
        { id: 177, name: 'Wear Leveling Count', value: 85, worst: 85, threshold: 0, raw: '15', status: 'Good' },
        { id: 194, name: 'Temperature Celsius', value: 65, worst: 35, threshold: 0, raw: '35', status: 'Good' },
        { id: 196, name: 'Reallocation Event Count', value: 100, worst: 100, threshold: 50, raw: '0', status: 'Good' },
        { id: 197, name: 'Current Pending Sectors', value: 100, worst: 100, threshold: 50, raw: '0', status: 'Good' },
        { id: 198, name: 'Offline Uncorrectable', value: 100, worst: 100, threshold: 50, raw: '0', status: 'Good' },
        { id: 199, name: 'UDMA CRC Error Count', value: 100, worst: 100, threshold: 50, raw: '0', status: 'Good' }
    ],
    errorLog: [
        { timestamp: '2024-01-15 10:30:00', type: 'Command Timeout', count: 0 },
        { timestamp: '2024-01-15 10:30:00', type: 'Hardware ECC Recovered', count: 0 },
        { timestamp: '2024-01-15 10:30:00', type: 'Reallocated Sectors', count: 0 }
    ],
    selftestLog: [
        { timestamp: '2024-01-15 10:30:00', type: 'Short offline', status: 'Completed without error', duration: '00:02:15' },
        { timestamp: '2024-01-14 10:30:00', type: 'Extended offline', status: 'Completed without error', duration: '00:45:30' },
        { timestamp: '2024-01-13 10:30:00', type: 'Short offline', status: 'Completed without error', duration: '00:02:10' }
    ]
})

const attributeSeverity = (status) => {
    switch (status) {
        case 'Good': return 'success'
        case 'Warning': return 'warn'
        case 'Critical': return 'danger'
        default: return 'info'
    }
}

const goBack = () => {
    router.push('/')
}

onMounted(() => {
    // In a real app, fetch device details based on deviceId
    console.log(`Detail view mounted for device ${deviceId.value}`)
})
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
                    </div>
                    <div class="summary-row">
                        <div class="summary-item">
                            <label>Size:</label>
                            <span>{{ device.size }}</span>
                        </div>
                        <div class="summary-item">
                            <label>Health Status:</label>
                            <Tag :value="device.health" :severity="attributeSeverity(device.health)" />
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
                            <Column field="id" header="ID" sortable style="width: 60px"></Column>
                            <Column field="name" header="Attribute Name" sortable></Column>
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

                    <!-- Error Log Tab -->
                    <TabPanel header="Error Log">
                        <DataTable 
                            :value="device.errorLog" 
                            :rows="100"
                            responsiveLayout="scroll"
                            class="error-table"
                        >
                            <Column field="timestamp" header="Timestamp" sortable></Column>
                            <Column field="type" header="Error Type" sortable></Column>
                            <Column field="count" header="Count" sortable style="width: 100px">
                                <template #body="{ data }">
                                    <Tag 
                                        :value="data.count.toString()" 
                                        :severity="data.count > 0 ? 'danger' : 'success'"
                                    />
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
                            <Column field="timestamp" header="Timestamp" sortable></Column>
                            <Column field="type" header="Test Type" sortable></Column>
                            <Column field="status" header="Status" sortable>
                                <template #body="{ data }">
                                    <Tag 
                                        :value="data.status" 
                                        :severity="data.status.includes('error') ? 'danger' : 'success'"
                                    />
                                </template>
                            </Column>
                            <Column field="duration" header="Duration" sortable style="width: 120px"></Column>
                        </DataTable>
                    </TabPanel>
                </TabView>
            </template>
        </Card>
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
    grid-template-columns: 1fr 1fr;
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
.error-table,
.selftest-table {
    margin-top: 1rem;
}

.value-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.value-progress {
    height: 0.5rem;
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