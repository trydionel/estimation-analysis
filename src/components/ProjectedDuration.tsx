import React, { useEffect, useState } from 'react'
import { analyzeSingleRecord, RecordAnalysis, EstimateAnalysisSettings } from '../data/analyzeEstimateData'
import { EstimatationDataRespose, loadRecordAnalysisData } from '../data/loadEstimationData'
import { FeedbackTooltip } from './FeedbackTooltip'
import { Parameters } from './Parameters'
import { RiskBadge } from './RiskBadge'
import { StatusTransitions } from './StatusTransitions'

interface ProjectedDurationProps {
  record: Aha.RecordUnion
  settings: EstimateAnalysisSettings
}

export const ProjectedDuration = ({ record, settings }: ProjectedDurationProps) => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<EstimatationDataRespose | null>(null)
  const [analysis, setAnalysis] = useState<RecordAnalysis | null>(null)
  const updateAnalysis = (settings: EstimateAnalysisSettings) => {
    const analysis = analyzeSingleRecord(data, {
      ...settings,
      analyzeProgress: true
    })
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
    if (!data) return

    try {
      updateAnalysis({
        estimateUncertainty: settings.estimateUncertainty,
        totalAssignees: settings.totalAssignees,
        fancyMath: settings.fancyMath,
        defaultEstimate: settings.defaultEstimate,
        analyzeProgress: true
      })
    } catch (e) {
      console.warn(`Unable to analyze estimate data for ${record.id}`, e)
    }
  }, [data, settings])

  if (loading) {
    return <aha-spinner />
  }

  if (!analysis) {
    return <div className="ml-2" style={{ color: "var(--theme-accent-icon)" }}>Insufficient data</div>
  }

  return (
    <>
      <div className="ml-2 mt-1">
        <StatusTransitions transitions={analysis.progress.transitions} className="mb-4" />

        <div style={{ display: 'flex', justifyContent: 'space-between' }} className="mb-4">
          <div>
            <h6>Projected duration</h6>
            <span>
              {analysis.duration.projected[0].toFixed(1)}d
              <span className="m-1">&mdash;</span>
              {analysis.duration.projected[1].toFixed(1)}d
            </span>
            <span className="ml-1">
              <aha-tooltip-default-trigger aria-describedby="projected-duration-tooltip"></aha-tooltip-default-trigger>
              <aha-tooltip id="projected-duration-tooltip">
                <span>
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

      <Parameters defaultValue={settings} onChange={updateAnalysis} />
    </>
  )
}