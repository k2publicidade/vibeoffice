import React from 'react';
import { Session } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';

interface DashboardStatsProps {
  sessions: Session[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4'];

const DashboardStats: React.FC<DashboardStatsProps> = ({ sessions }) => {
  
  // Prepare data for Type Distribution (Flattening the types array)
  const typeCounts = sessions.reduce((acc, curr) => {
    curr.type.forEach(t => {
      acc[t] = (acc[t] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

  // Prepare data for Sessions per Month
  const monthCounts = sessions.reduce((acc, curr) => {
    const month = new Date(curr.date).toLocaleString('pt-BR', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const monthData = Object.entries(monthCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      
      {/* Chart 1: Distribution */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">
          Tipos de Sessão
        </h3>
        <div className="h-64 w-full">
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 text-sm">
              Sem dados suficientes
            </div>
          )}
        </div>
      </div>

      {/* Chart 2: Volume */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">
          Volume por Mês
        </h3>
        <div className="h-64 w-full">
        {monthData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthData}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{fill: '#334155'}}
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
              />
              <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 text-sm">
              Sem dados suficientes
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;