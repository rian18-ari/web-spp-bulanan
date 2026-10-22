import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, getMonthName } from '../../utils/formatters';

export const MonthlyPaymentChart: React.FC = () => {
  const { bills, settings } = useApp();
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  // Academic semester: Juli (7) to Desember (12)
  const semesterMonths = [7, 8, 9, 10, 11, 12];
  const year = settings.activeYear;

  const chartData = semesterMonths.map((m) => {
    const monthBills = bills.filter((b) => b.month === m && b.year === year);
    const target = monthBills.reduce((sum, b) => sum + b.amount, 0);
    const received = monthBills
      .filter((b) => b.status === 'paid')
      .reduce((sum, b) => sum + (b.paidAmount || b.amount), 0);

    return {
      month: m,
      name: getMonthName(m),
      shortName: getMonthName(m).slice(0, 3),
      target: target || 6500000, // projected if not yet generated
      received,
      percentage: target > 0 ? Math.round((received / target) * 100) : 0,
      isCurrent: m === settings.activeMonth,
    };
  });

  const maxVal = Math.max(...chartData.map((d) => Math.max(d.target, d.received)), 8000000);

  return (
    <div className="bg-white p-5 rounded-lg border border-neutral-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-100">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Grafik Pembayaran Bulanan</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Perbandingan target tagihan vs realisasi penerimaan kas SPP (Semester Ganjil {year})
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-neutral-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-neutral-200 rounded-xs inline-block" />
            <span>Target Tagihan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-emerald-700 rounded-xs inline-block" />
            <span>Realisasi Diterima</span>
          </div>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="pt-6 pb-2">
        <div className="h-56 flex items-end justify-between gap-3 sm:gap-6 px-2">
          {chartData.map((d) => {
            const targetHeightPercent = Math.max(8, (d.target / maxVal) * 100);
            const receivedHeightPercent = Math.max(4, (d.received / maxVal) * 100);
            const isHovered = hoveredMonth === d.month;

            return (
              <div
                key={d.month}
                className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                onMouseEnter={() => setHoveredMonth(d.month)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-16 z-20 bg-neutral-900 text-white text-[11px] py-1.5 px-3 rounded shadow-lg whitespace-nowrap pointer-events-none transition-all">
                    <div className="font-semibold">{d.name} {year}</div>
                    <div className="text-neutral-300">
                      Realisasi: <span className="font-mono text-emerald-400">{formatRupiah(d.received)}</span>
                    </div>
                    <div className="text-neutral-400">
                      Target: <span className="font-mono">{formatRupiah(d.target)}</span> ({d.percentage}%)
                    </div>
                  </div>
                )}

                {/* Bars group */}
                <div className="w-full max-w-[48px] flex items-end justify-center gap-1.5 h-full">
                  {/* Target Bar */}
                  <div
                    className="w-1/2 bg-neutral-200 rounded-t-sm transition-all duration-300 group-hover:bg-neutral-300"
                    style={{ height: `${targetHeightPercent}%` }}
                    title={`Target: ${formatRupiah(d.target)}`}
                  />
                  {/* Received Bar */}
                  <div
                    className={`w-1/2 rounded-t-sm transition-all duration-300 ${
                      d.received > 0
                        ? 'bg-emerald-700 group-hover:bg-emerald-800'
                        : 'bg-neutral-100'
                    }`}
                    style={{ height: `${receivedHeightPercent}%` }}
                    title={`Diterima: ${formatRupiah(d.received)}`}
                  />
                </div>

                {/* X-axis Month Label */}
                <div className="mt-3 text-center">
                  <span
                    className={`text-xs block font-medium ${
                      d.isCurrent ? 'text-emerald-800 font-bold' : 'text-neutral-600'
                    }`}
                  >
                    {d.shortName}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono tabular-nums block">
                    {d.received > 0 ? `${d.percentage}%` : '-'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
