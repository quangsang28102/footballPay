'use client';

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  gradient: 'blue' | 'green' | 'orange' | 'purple';
}

const gradientStyles = {
  blue: {
    border: 'from-indigo-500 to-blue-500',
    icon: 'from-indigo-500/20 to-blue-500/20',
    iconColor: 'text-indigo-400',
  },
  green: {
    border: 'from-emerald-500 to-teal-500',
    icon: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-400',
  },
  orange: {
    border: 'from-amber-500 to-orange-500',
    icon: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
  },
  purple: {
    border: 'from-purple-500 to-pink-500',
    icon: 'from-purple-500/20 to-pink-500/20',
    iconColor: 'text-purple-400',
  },
};

export default function StatCard({ title, value, icon: Icon, trend, gradient }: StatCardProps) {
  const styles = gradientStyles[gradient];

  return (
    <div className="glass-card relative overflow-hidden p-6 hover:-translate-y-1 transition-transform duration-300">
      {/* Gradient border top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${styles.border}`} />

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${styles.icon} flex items-center justify-center`}>
          <Icon className={styles.iconColor} size={24} />
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-white">{value}</h3>
          <p className="text-slate-400 text-sm">{title}</p>
        </div>

        {/* Trend */}
        {trend && (
          <div className="text-xs text-slate-500">{trend}</div>
        )}
      </div>
    </div>
  );
}
