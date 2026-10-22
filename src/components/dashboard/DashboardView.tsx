import React from 'react';
import { StatCards } from './StatCards';
import { MonthlyPaymentChart } from './MonthlyPaymentChart';
import { PaymentStatusSummary } from './PaymentStatusSummary';
import { RecentPaymentsTable } from './RecentPaymentsTable';

export const DashboardView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 4 Summary Stat Cards */}
      <StatCards />

      {/* 2-Column: Monthly Trend Chart & Payment Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MonthlyPaymentChart />
        </div>
        <div className="lg:col-span-1">
          <PaymentStatusSummary />
        </div>
      </div>

      {/* Recent Payments High Density Table */}
      <RecentPaymentsTable />
    </div>
  );
};
