import React, { useState } from 'react'
import { UploadCloud, CheckCircle2, AlertCircle, Database, FileSpreadsheet, Layers, ArrowRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetsApi } from '../../services/api'
import { useAppStore } from '../../store/appStore'
import DataTable from '../../components/ui/DataTable'
import { useToast } from '../../components/ui/ToastProvider'
import type { Dataset, ValidationResult } from '../../types'

const INTERNAL_FIELDS = [
  { key: 'review_text', label: 'Review Text', required: true },
  { key: 'rating', label: 'Rating (1-5)', required: true },
  { key: 'review_date', label: 'Review Date', required: false },
  { key: 'product_name', label: 'Product Name', required: true },
  { key: 'category', label: 'Category', required: false },
  { key: 'source', label: 'Feedback Source', required: false },
]

export const Intake: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { activeDatasetId, setActiveDataset } = useAppStore()

  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedDatasetId, setUploadedDatasetId] = useState<number | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [reasonsExpanded, setReasonsExpanded] = useState(false)

  // Fetch dataset list
  const { data: datasets, isLoading: loadingDatasets } = useQuery<Dataset[]>({
    queryKey: ['datasets'],
    queryFn: async () => (await datasetsApi.list()).data,
  })

  // Fetch preview when dataset uploaded
  const { data: previewData } = useQuery({
    queryKey: ['dataset-preview', uploadedDatasetId],
    queryFn: async () => (await datasetsApi.preview(uploadedDatasetId!)).data,
    enabled: uploadedDatasetId !== null,
  })

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const res = await datasetsApi.upload(file)
      return res.data
    },
    onSuccess: (data) => {
      toast('Dataset file staged successfully!', 'success')
      setUploadedDatasetId(data.id)
      setActiveDataset(data.id, data.name)
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
    onError: (err: any) => {
      toast(err?.response?.data?.detail || 'Failed to upload file', 'error')
    },
  })

  // Validate Mutation
  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedDatasetId) return
      const res = await datasetsApi.validate(uploadedDatasetId, columnMapping)
      return res.data
    },
    onSuccess: (data) => {
      toast(`Validation finished: ${data.passed} valid records.`, 'success')
      setValidationResult(data)
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
    onError: (err: any) => {
      toast(err?.response?.data?.detail || 'Validation error', 'error')
    },
  })

  // Load Warehouse Mutation
  const loadWarehouseMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedDatasetId) return
      const res = await datasetsApi.loadWarehouse(uploadedDatasetId)
      return res.data
    },
    onSuccess: () => {
      toast('Loaded into Star-Schema Dimensional Warehouse!', 'success')
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
    onError: (err: any) => {
      toast(err?.response?.data?.detail || 'Warehouse loading failed', 'error')
    },
  })

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setSelectedFile(file)
      uploadMutation.mutate(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      uploadMutation.mutate(file)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <span className="section-label">Module 1 • Data Staging & ETL</span>
        <h1 className="font-display text-3xl font-semibold text-pine mt-1">
          Data Intake & Dimensional Ingestion
        </h1>
        <p className="text-graphite font-body text-sm mt-1 max-w-2xl">
          Upload unstructured customer feedback files (CSV, Excel, JSON). Map raw schema columns, validate records against quality constraints, and load into the star-schema warehouse.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
          dragOver
            ? 'border-coral bg-coral/5 scale-[1.01]'
            : 'border-pine/30 bg-white hover:border-coral hover:bg-stone/10'
        }`}
        onClick={() => document.getElementById('feedback-file-input')?.click()}
      >
        <input
          id="feedback-file-input"
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          className="hidden"
          onChange={handleFileInput}
        />
        <div className="w-14 h-14 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mx-auto mb-4">
          <UploadCloud size={28} />
        </div>
        <h3 className="font-display text-lg font-semibold text-pine">
          {uploadMutation.isPending
            ? 'Staging and parsing file on server...'
            : selectedFile
            ? selectedFile.name
            : 'Drag and drop feedback dataset here'}
        </h3>
        <p className="text-xs text-graphite font-body mt-1">
          Supported file standards: Comma-Separated Values, Microsoft Excel, or JSON array.
        </p>

        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="badge-neutral">.CSV</span>
          <span className="badge-neutral">.XLSX</span>
          <span className="badge-neutral">.JSON</span>
        </div>
      </div>

      {/* Preview & Column Mapping (Visible after upload or selecting preview) */}
      {previewData && (
        <div className="space-y-6">
          <div className="card-editorial space-y-4">
            <div className="flex items-center justify-between border-b border-stone/50 pb-3">
              <div>
                <span className="section-label">Schema Mapping</span>
                <h3 className="font-display text-xl text-pine font-semibold">
                  Field Alignment & Dimensional Mapping
                </h3>
              </div>
              <button
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending}
                className="btn-primary"
              >
                {validateMutation.isPending ? 'Validating...' : 'Validate Schema'}
              </button>
            </div>

            <p className="text-xs text-graphite font-body">
              Map incoming raw table headers to internal canonical attributes for dimensional star schema insertion.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {INTERNAL_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs font-mono font-medium text-pine flex items-center gap-1">
                    {f.label}
                    {f.required && <span className="text-coral">*</span>}
                  </label>
                  <select
                    value={columnMapping[f.key] || ''}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    className="w-full text-xs font-mono p-2.5 rounded-lg border border-stone bg-ivory/30 focus:border-teal outline-none"
                  >
                    <option value="">-- Match incoming column --</option>
                    {(previewData.columns || []).map((col: string) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Validation Report */}
          {validationResult && (
            <div className="card-editorial space-y-4 border-l-4 border-l-teal">
              <div className="flex items-center justify-between">
                <div>
                  <span className="section-label">Quality Validation</span>
                  <h3 className="font-display text-xl text-pine font-semibold">Validation Results</h3>
                </div>
                <button
                  onClick={() => loadWarehouseMutation.mutate()}
                  disabled={loadWarehouseMutation.isPending || validationResult.passed === 0}
                  className="btn-coral flex items-center gap-2"
                >
                  <Database size={16} />
                  {loadWarehouseMutation.isPending ? 'Loading Warehouse...' : 'Load to Warehouse'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3 rounded-lg bg-teal/10">
                  <p className="text-xs font-mono text-teal">Records Passed</p>
                  <p className="font-mono text-2xl font-bold text-teal">{validationResult.passed}</p>
                </div>
                <div className="p-3 rounded-lg bg-coral/10">
                  <p className="text-xs font-mono text-coral">Records Failed</p>
                  <p className="font-mono text-2xl font-bold text-coral">{validationResult.failed}</p>
                </div>
                <div className="p-3 rounded-lg bg-stone/40">
                  <p className="text-xs font-mono text-graphite">Pass Rate</p>
                  <p className="font-mono text-2xl font-bold text-pine">
                    {(
                      (validationResult.passed /
                        Math.max(1, validationResult.passed + validationResult.failed)) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              </div>

              {validationResult.rejection_reasons?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => setReasonsExpanded(!reasonsExpanded)}
                    className="text-xs font-mono text-coral underline"
                  >
                    {reasonsExpanded ? 'Hide rejection details' : 'View rejection reasons'}
                  </button>
                  {reasonsExpanded && (
                    <div className="p-3 rounded-lg bg-coral/5 border border-coral/20 text-xs font-mono space-y-1">
                      {validationResult.rejection_reasons.map((r, i) => (
                        <p key={i}>
                          • <span className="font-semibold">{r.reason}</span>: {r.count} rows rejected
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Staged Data Preview Table */}
          <div className="space-y-2">
            <span className="section-label">Staging Preview (First 50 Rows)</span>
            <DataTable
              columns={(previewData.columns || []).map((col: string) => ({
                key: col,
                header: col,
              }))}
              data={previewData.rows || []}
              pageSize={8}
            />
          </div>
        </div>
      )}

      {/* Dataset History Table */}
      <div className="card-editorial space-y-4">
        <div className="flex items-center justify-between border-b border-stone/50 pb-3">
          <div>
            <span className="section-label">Repository</span>
            <h3 className="font-display text-xl text-pine font-semibold">Dataset Registry</h3>
          </div>
          <span className="text-xs font-mono text-graphite">
            {datasets?.length || 0} datasets registered
          </span>
        </div>

        <DataTable<Dataset>
          columns={[
            { key: 'name', header: 'Dataset Name' },
            { key: 'file_type', header: 'Format' },
            { key: 'total_records', header: 'Raw Rows', align: 'right' },
            { key: 'valid_records', header: 'Validated', align: 'right' },
            { key: 'warehouse_records', header: 'Warehouse Rows', align: 'right' },
            {
              key: 'status',
              header: 'Status',
              render: (d) => (
                <span
                  className={
                    d.status === 'loaded'
                      ? 'badge-positive'
                      : d.status === 'validated'
                      ? 'badge-citron'
                      : 'badge-neutral'
                  }
                >
                  {d.status}
                </span>
              ),
            },
            {
              key: 'action',
              header: 'Select',
              render: (d) => (
                <button
                  onClick={() => {
                    setActiveDataset(d.id, d.name)
                    setUploadedDatasetId(d.id)
                    toast(`Selected ${d.name} as active dataset`, 'info')
                  }}
                  className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
                    activeDatasetId === d.id
                      ? 'bg-teal text-white'
                      : 'hover:bg-stone/40 text-pine'
                  }`}
                >
                  {activeDatasetId === d.id ? 'Active' : 'Use'}
                </button>
              ),
            },
          ]}
          data={datasets || []}
          pageSize={5}
        />
      </div>
    </div>
  )
}
export default Intake
