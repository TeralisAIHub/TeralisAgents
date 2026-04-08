import React from "react"
import SentimentGauge from "./SentimentGauge"
import AssetOverviewPanel from "./AssetOverviewPanel"

interface WhaleTrackerCardProps {
  address?: string
}

const WhaleTrackerCard: React.FC<WhaleTrackerCardProps> = ({ address }) => (
  <div className="p-4 bg-white rounded shadow">
    <h2 className="text-lg font-semibold mb-2">Whale Tracker</h2>
    <p>Monitoring {address || "top wallets"}...</p>
  </div>
)

export const AnalyticsDashboard: React.FC = () => (
  <div className="p-8 bg-gray-100 min-h-screen">
    <header className="mb-6">
      <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
      <p className="text-gray-600">Real-time market insights and monitoring tools</p>
    </header>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SentimentGauge symbol="SOL" />
      <AssetOverviewPanel assetId="SOL-01" />
      <WhaleTrackerCard address="Wallet-Alpha" />
    </div>
  </div>
)

export default AnalyticsDashboard
