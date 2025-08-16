<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import { useSmartDevice } from '@/composables/useSmartMonitor'

const route = useRoute()
const router = useRouter()
const deviceId = computed(() => route.params.id)

// Use the SMART monitoring composable for device details
const { device, isLoading, isError, error, refresh } = useSmartDevice(deviceId.value)

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