import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown, Wifi, WifiOff } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { datasetsApi, healthApi } from '../../services/api'
import { useAppStore } from '../../store/appStore'
import type { Dataset, HealthStatus } from '../../types'

const routeTitles: Record<string, string> = {
  '/': 'Signal Command Center',
  '/intake': 'Data Intake Center',
  '/preparation': 'Data Preparation Studio',
  '/analytics': 'OLAP Explorer',
  '/mining': 'Mining Lab',
  '/signals': 'Emerging Complaint Radar',
  '/opportunities': 'Product Opportunity Map',
  '/features': 'Feature Request Intelligence',
  '/roadmap': 'Roadmap Simulator',
  '/reports': 'Analytical Reports',
}

export default function CommandBar() {
  const location = useLocation()
  const { activeDatasetId, setActiveDataset } = useAppStore()
  const [open, setOpen] = useState(false)

  const title = routeTitles[location.pathname] ?? 'SignalWeave'

  const { data: datasets } = useQuery<Dataset[]>({
    queryKey: ['datasets'],
    queryFn: async () => (await datasetsApi.list()).data,
    refetchInterval: 15000,
  })

  const { data: health } = useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: async () => (await healthApi.check()).data,
    refetchInterval: 30000,
    retry: false,
  })

  const activeDataset = datasets?.find(d => d.id === activeDatasetId)

  return (
    <header
      style={{ borderBottom: '1px solid #D9D8CC', backgroundColor: '#F3F0E6' }}
      className="flex items-center justify-between px-6 py-3 sticky top-0 z-10"
    >
      <h1
        style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 600, color: '#182D29' }}
      >
        {title}
      </h1>

      <div className="flex items-center gap-4">
        {/* Dataset Selector */}
        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #D9D8CC',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: '#182D29',
            }}
          >
            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeDataset?.name ?? 'Select Dataset'}
            </span>
            <ChevronDown size={14} />
          </button>

          {open && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: 4,
                width: 220,
                backgroundColor: 'white',
                border: '1px solid #D9D8CC',
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              {!datasets?.length ? (
                <div style={{ padding: '12px 16px', fontSize: 13, color: '#596662' }}>No datasets yet</div>
              ) : (
                datasets.map(ds => (
                  <button
                    key={ds.id}
                    onClick={() => { setActiveDataset(ds.id, ds.name); setOpen(false) }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 16px',
                      fontSize: 13,
                      color: ds.id === activeDatasetId ? '#377E75' : '#182D29',
                      backgroundColor: ds.id === activeDatasetId ? 'rgba(55,126,117,0.08)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                      {ds.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'IBM Plex Mono, monospace',
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: ds.status === 'loaded' ? 'rgba(55,126,117,0.12)' : 'rgba(217,216,204,0.5)',
                        color: ds.status === 'loaded' ? '#377E75' : '#596662',
                        flexShrink: 0,
                      }}
                    >
                      {ds.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Backend health */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {health?.status === 'ok' ? (
            <Wifi size={14} style={{ color: '#377E75' }} />
          ) : (
            <WifiOff size={14} style={{ color: '#E36B4B' }} />
          )}
          <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: '#596662' }}>
            {health?.status === 'ok' ? 'API connected' : 'API offline'}
          </span>
        </div>
      </div>
    </header>
  )
}
