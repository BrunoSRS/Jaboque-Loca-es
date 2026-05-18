import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardApi, formatCurrency } from '../api/client';
import { PageHeader, KpiCard, Card, CardBody, Loading } from '../components/ui';

const COLORS = ['#012169', '#F58220', '#003399', '#27ae60', '#95a5a6'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [mes] = useState(new Date().getMonth() + 1);
  const [ano] = useState(new Date().getFullYear());

  useEffect(() => {
    dashboardApi.resumo(mes, ano).then((r) => setData(r.data));
  }, [mes, ano]);

  if (!data) return <Loading full />;

  const { kpis, os_por_status, faturamento_diario, proximas_entregas } = data;

  return (
  <>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do seu negócio"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="OS Abertas"
          value={kpis.os_abertas}
          subtitle={`${kpis.os_em_andamento} em andamento`}
          accent
        />
        <KpiCard title="Máquinas Alugadas" value={kpis.maquinas_alugadas} subtitle="5 para devolver hoje" accent />
        <KpiCard
          title="Faturamento (Mês)"
          value={formatCurrency(kpis.faturamento_mes)}
          subtitle={`+${kpis.faturamento_variacao_percent}% vs mês anterior`}
          accent
        />
        <KpiCard
          title="Peças em Baixa"
          value={kpis.pecas_baixa}
          subtitle="Estoque abaixo do mínimo"
          warning
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-jaboque-navy mb-4">OS por Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={os_por_status} dataKey="quantidade" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                  {os_por_status.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold text-jaboque-navy mb-4">Faturamento</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={faturamento_diario}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="valor" stroke="#012169" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-jaboque-navy mb-4">Próximas Entregas / Devoluções</h3>
          <div className="space-y-3">
            {proximas_entregas.map((e) => (
              <Link
                key={e.id_os}
                to={`/oficina/ordens/${e.id_os}/editar`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div>
                  <span className="text-xs font-bold text-jaboque-orange">{e.tipo}</span>
                  <p className="font-medium text-sm">{e.equipamento}</p>
                  <p className="text-xs text-gray-500">{e.cliente}</p>
                </div>
                <span className="text-sm text-gray-600">{e.data}</span>
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
