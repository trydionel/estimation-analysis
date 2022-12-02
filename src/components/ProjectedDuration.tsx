import addBusinessDays from 'date-fns/addBusinessDays'
import React, { useEffect, useState } from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { analyzeSingleRecord } from '../data/analyzeEstimateData'
import { loadRecordAnalysisData } from '../data/loadEstimationData'
import { FeedbackTooltip } from './FeedbackTooltip'
import { Parameters } from './Parameters'
import { RiskBadge } from './RiskBadge'
import { StatusTransitions } from './StatusTransitions'

interface ProjectedDurationProps {
  record: Aha.RecordUnion
  settings: Aha.Settings
}

function unwrapParameters(settings: Aha.Settings): RecordAnalysisSettings {
  return {
    estimateUncertainty: parseFloat(settings.estimateUncertainty as unknown as string),
    fancyMath: (settings.fancyMath as boolean),
    defaultEstimate: parseFloat(settings.defaultEstimate as unknown as string),
    defaultVelocity: parseFloat(settings.defaultVelocity as unknown as string),
    startDate: new Date().toISOString(),
    analyzeProgress: true
  }
}

export const ProjectedDuration = ({ record, settings }: ProjectedDurationProps) => {
  const [loading, setLoading] = useState(true)
  const [parameters, setParameters] = useState<RecordAnalysisSettings>(() => unwrapParameters(settings))
  const [data, setData] = useState<EstimatationDataRespose | null>(null)
  const [analysis, setAnalysis] = useState<RecordAnalysis | null>(null)
  const updateAnalysis = (parameters: RecordAnalysisSettings) => {
    const analysis = analyzeSingleRecord(data, parameters)
    setAnalysis(analysis)
  }

  useEffect(() => {
    (async () => {
      try {
        const data = await loadRecordAnalysisData(record)
        setData(data)
      } catch (e) {
        console.warn(`Unable to load estimation data for ${record.id}`, e)
      } finally {
        setLoading(false)
      }
    })()
  }, [record])

  useEffect(() => {
    setParameters(unwrapParameters(settings))
  }, [settings])

  useDeepCompareEffect(() => {
    if (!data) return

    try {
      updateAnalysis(parameters)
    } catch (e) {
      console.warn(`Unable to analyze estimate data for ${record.id}`, e)
    }
  }, [data, parameters])

  if (loading) {
    return <aha-spinner />
  }

  if (!analysis) {
    return <div className="ml-2" style={{ color: "var(--theme-accent-icon)" }}>Insufficient data</div>
  }

  return (
    <>
      <div className="ml-2 mt-1">
        {
          analysis.progress ?
            <StatusTransitions transitions={analysis.progress.transitions} className="mb-4" /> :
            ''
        }

        <div style={{ display: 'flex', justifyContent: 'space-between' }} className="mb-4">
          <div>
            <h6>Forecasted delivery</h6>
            <span>
              { addBusinessDays(Date.parse(analysis.settings.startDate), analysis.duration.remaining.projected[0]).toLocaleDateString() }
              <span className="mx-1">&mdash;</span>
              { addBusinessDays(Date.parse(analysis.settings.startDate), analysis.duration.remaining.projected[1]).toLocaleDateString() }
            </span>
            <span className="ml-1">
              <aha-tooltip-default-trigger aria-describedby="projected-duration-tooltip"></aha-tooltip-default-trigger>
              <aha-tooltip id="projected-duration-tooltip">
                <span>
                  Total development time forecasted at {analysis.duration.remaining.projected[0].toFixed(1)}
                  <span className="m-1">&mdash;</span>
                  {analysis.duration.remaining.projected[1].toFixed(1)} working days.
                  <br />
                  Based on velocity of {analysis.duration.velocity.toFixed(2)}p / day
                  and {analysis.settings.estimateUncertainty}% estimate uncertainty.
                </span>
              </aha-tooltip>
            </span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <h6>Time in progress</h6>
            <div>
              <RiskBadge risk={analysis.progress.risk} />
              &nbsp;
              {analysis.progress.timeInProgress.toFixed(1)}d
            </div>
          </div>
        </div>

        <FeedbackTooltip />
      </div>

      <Parameters defaultValue={parameters} onChange={updateAnalysis} />
    </>
  )
}