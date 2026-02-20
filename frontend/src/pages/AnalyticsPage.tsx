import React, { useMemo } from 'react';
import { useTreasuryContext } from '../contexts/TreasuryContext';
import PerformanceChart from '../components/performance/PerformanceChart';

const AnalyticsPage: React.FC = () => {
  const { strategies, performance, latestPerf, rankedStrategies } = useTreasuryContext();

  const activeStrategies = rankedStrategies.filter(s => s.status === 'Active');

  const metrics = useMemo(() => {
    const perfs = Object.values(latestPerf);
    if (perfs.length === 0) return null;
    const bestReturn = perfs.reduce((a, b) => a.cumulativeReturn > b.cumulativeReturn ? a : b);
    const worstDrawdown = perfs.reduce((a, b) => a.maxDrawdown > b.maxDrawdown ? a : b);
    const avgReturn = perfs.reduce((s, p) => s + p.cumulativeReturn, 0) / perfs.length;
    return { bestReturn, worstDrawdown, avgReturn };
  }, [latestPerf]);

  return (
    <>
      <div className="ts-page-header">
        <h1 className="ts-page-title">Analytics</h1>
        <p className="ts-page-subtitle">Performance data and strategy metrics</p>
      </div>

      {metrics && (
        <div className="ts-analytics-metrics">
          <div className="ts-analytics-metric">
            <div className="ts-analytics-metric-label">Best Strategy</div>
            <div className="ts-analytics-metric-value ts-positive">
              {(metrics.bestReturn.cumulativeReturn * 100).toFixed(2)}%
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              {metrics.bestReturn.strategyName}
            </div>
          </div>
          <div className="ts-analytics-metric">
            <div className="ts-analytics-metric-label">Avg Return</div>
            <div className={`ts-analytics-metric-value ${metrics.avgReturn >= 0 ? 'ts-positive' : 'ts-negative'}`}>
              {(metrics.avgReturn * 100).toFixed(2)}%
            </div>
          </div>
          <div className="ts-analytics-metric">
            <div className="ts-analytics-metric-label">Worst Drawdown</div>
            <div className="ts-analytics-metric-value ts-negative">
              {(metrics.worstDrawdown.maxDrawdown * 100).toFixed(2)}%
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              {metrics.worstDrawdown.strategyName}
            </div>
          </div>
          <div className="ts-analytics-metric">
            <div className="ts-analytics-metric-label">Active Strategies</div>
            <div className="ts-analytics-metric-value" style={{ color: '#818cf8' }}>
              {activeStrategies.length}
            </div>
          </div>
        </div>
      )}

      <section className="ts-section">
        <div className="ts-section-header"><h2>Cumulative Performance</h2></div>
        <div className="ts-chart-wrap">
          <PerformanceChart performance={performance} strategies={strategies} />
        </div>
      </section>

      {performance.length > 0 && (
        <section className="ts-section">
          <div className="ts-section-header"><h2>Performance Table</h2></div>
          <div className="ts-table-wrap">
            <table className="ts-table">
              <thead>
                <tr>
                  <th>Strategy</th><th>Epoch</th><th>Epoch Return</th>
                  <th>Cumulative</th><th>Max Drawdown</th>
                </tr>
              </thead>
              <tbody>
                {performance
                  .slice()
                  .sort((a, b) => b.epoch - a.epoch || b.cumulativeReturn - a.cumulativeReturn)
                  .map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{p.strategyName}</td>
                      <td><span className="ts-epoch-cell">{p.epoch}</span></td>
                      <td className={p.epochReturn >= 0 ? 'ts-positive' : 'ts-negative'}>
                        {(p.epochReturn * 100).toFixed(2)}%
                      </td>
                      <td className={p.cumulativeReturn >= 0 ? 'ts-positive' : 'ts-negative'}>
                        {(p.cumulativeReturn * 100).toFixed(2)}%
                      </td>
                      <td className="ts-negative">{(p.maxDrawdown * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
};

export default AnalyticsPage;
