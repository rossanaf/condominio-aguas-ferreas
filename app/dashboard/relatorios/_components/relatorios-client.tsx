'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FadeIn } from '@/components/ui/animate';
import { BarChart3, Info } from 'lucide-react';
// import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

function formatCurrency(val: number | null | undefined): string {
  return (val ?? 0)?.toLocaleString?.('pt-PT', { style: 'currency', currency: 'EUR' }) ?? '0,00 €';
}

export function RelatoriosClient() {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [cotas, setCotas] = useState<any[]>([]);
  const [outrasDividas, setOutrasDividas] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [orcamento, setOrcamento] = useState<any | null>(null);
  const ANO_INICIAL = 2026;
  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/pagamentos?ano=${ano}`).then(r => r?.json?.()),
      fetch(`/api/cotas?ano=${ano}`).then(r => r?.json?.()),
      fetch(`/api/outras-dividas`).then(r => r?.json?.()).catch(() => []),
      fetch(`/api/despesas?ano=${ano}`).then(r => r?.json?.()),
      fetch(`/api/orcamento?ano=${ano}`).then(r => r?.json?.()).catch(() => null),
    ])
      .then(([p, c, od, d, o]: any) => {
        setPagamentos(Array.isArray(p) ? p : []);
        setCotas(Array.isArray(c) ? c : []);
        setOutrasDividas(Array.isArray(od) ? od : []);
        setDespesas(Array.isArray(d) ? d : []);
        setOrcamento(o ?? null);
      })
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));
  }, [ano]);
  
  // Carrega lista de anos, a partir de 2026
  const anos = Array.from(
    { length: anoAtual - ANO_INICIAL + 1 },
    (_, i) => String(ANO_INICIAL + i)
  ).reverse();

  // Criar resumo por rubrica de despesa, ano corrente
  const totalReceitas = (pagamentos ?? []).reduce((acc: number, p: any) => acc + Number(p?.valor ?? 0), 0);
  const totalDespesas = (despesas ?? []).reduce((acc: number, d: any) => acc + Number(d?.valor ?? 0), 0);
  
  function normalizarCategoria(categoria: string) {
    if (!categoria) {
      console.warn("Despesa sem categoria:", categoria);
      return null;
    }

    const t = categoria.trim().toUpperCase();

    if (t.includes("EDP")) return "EDP";
    if (t.includes("LIMPEZA")) return "Limpeza";
    if (t.includes("JARDIN")) return "Jardinagem";
    if (t.includes("ASSIST")) return "Assistência Técnica";
    if (t.includes("ADMIN")) return "Despesas Administrativas";
    if (t.includes("BANC")) return "Despesas Bancárias";
    console.warn("Categoria não mapeada:", categoria);
    return null;
  }

  const resumoDespesas: Record<string, number> = {};

  for (const d of despesas ?? []) {
    if (!d?.paga) continue;

    const categoria = normalizarCategoria(d?.categoria);

    if (!categoria) continue; // 👈 ignora inválidos

    if (!resumoDespesas[categoria]) {
      resumoDespesas[categoria] = 0;
    }

    resumoDespesas[categoria] += Number(d?.valor ?? 0);
  }


  const chartData = Object.entries(resumoDespesas)
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    }))
    .filter(d => d.value > 0);

  // Despesas - componente gráfica
  const CORES_RUBRICAS: Record<string, string> = {
    "EDP": "#60B5FF",
    "Limpeza": "#FF9149",
    "Jardinagem": "#FF9898",
    "Assistência Técnica": "#80D8C3",
    "Despesas Administrativas": "#A19AD3",
    "Despesas Bancárias": "#FF6363"
  };

  function GraficoDespesas({ data }: { data: any[] }) {
    return (
      <PieChart width={300} height={300}>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={CORES_RUBRICAS[entry.name]}
            />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
      </PieChart>
    );
  }
  
  // Despesas - criar tabela lateral
  const ORDEM = [
    "EDP",
    "Limpeza",
    "Jardinagem",
    "Assistência Técnica",
    "Despesas Administrativas",
    "Despesas Bancárias"
  ];

  function normalizarChave(texto: string) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos
      .toUpperCase()
      .trim();
  }

  const detalheDespesas = ORDEM.map((nome) => ({
    label: nome,
    value: resumoDespesas[nome] || 0
  })).filter(d => d.value > 0);

  const subtotalDespesas = detalheDespesas.reduce(
    (acc, item) => acc + item.value,
    0
  );

  function DetalheDespesas({ data }: { data: any[] }) {
    const subtotal = data.reduce((acc, item) => acc + item.value, 0);
    return (
      <div className="space-y-2">
        {data.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: CORES_RUBRICAS[item.label]
                }}
              />
              <span className="text-sm">{item.label}</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
        <div className="pt-2 border-t border-border">
          <div className="flex justify-between">
            <span className="text-sm font-semibold">Subtotal</span>
            <span className="font-mono text-sm font-bold">
              {formatCurrency(subtotal)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Comparativo Orçamento
  const orcamentoPorCategoria: Record<string, number> = {
    "EDP": Number(orcamento?.valorEDP ?? 0),
    "Limpeza": Number(orcamento?.valorLimpeza ?? 0),
    "Jardinagem": Number(orcamento?.valorJardinagem ?? 0),
    "Assistência Técnica": Number(orcamento?.valorAssistencia ?? 0),
    "Despesas Administrativas": Number(orcamento?.valorAdministrativas ?? 0),
    "Despesas Bancárias": Number(orcamento?.valorBancarias ?? 0),
  };

  const COMPARATIVO_ORDEM = [
    "EDP",
    "Limpeza",
    "Jardinagem",
    "Assistência Técnica",
    "Despesas Administrativas",
    "Despesas Bancárias"
  ];

  const comparativoDespesas = COMPARATIVO_ORDEM.map((categoria) => {
    const orcado = Number(orcamentoPorCategoria[categoria] ?? 0);
    const real = Number(resumoDespesas[categoria] ?? 0);
    const diferenca = real - orcado;
    const execucaoPercent =
      orcado > 0 ? (real / orcado) * 100 : 0;

    return {
      categoria,
      orcado: Number(orcado.toFixed(2)),
      real: Number(real.toFixed(2)),
      diferenca: Number(diferenca.toFixed(2)),
      execucaoPercent: Number(execucaoPercent.toFixed(1)),
    };
  });

  function getDiferencaClass(value: number) {
    if (value > 0) return "text-red-600";
    if (value < 0) return "text-green-600";
    return "text-muted-foreground";
  }

  function TabelaComparativo({ data }: { data: any[] }) {
    const totalOrcado = data.reduce((acc, item) => acc + item.orcado, 0);
    const totalReal = data.reduce((acc, item) => acc + item.real, 0);
    const totalDiferenca = totalReal - totalOrcado;
    const totalExecucao = totalOrcado > 0 ? (totalReal / totalOrcado) * 100 : 0;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 font-semibold">Rubrica</th>
              <th className="text-right py-2 font-semibold">Orçamento</th>
              <th className="text-right py-2 font-semibold">Real</th>
              <th className="text-right py-2 font-semibold">Diferença</th>
              <th className="text-right py-2 font-semibold">Execução</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} className="border-b border-border/50">
                <td className="py-2">{item.categoria}</td>
                <td className="py-2 text-right font-mono">
                  {formatCurrency(item.orcado)}
                </td>
                <td className="py-2 text-right font-mono">
                  {formatCurrency(item.real)}
                </td>
                <td className={`py-2 text-right font-mono ${getDiferencaClass(item.diferenca)}`}>
                  {formatCurrency(item.diferenca)}
                </td>
                <td className="py-2 text-right font-mono">
                  {item.execucaoPercent.toFixed(1)}%
                </td>
              </tr>
            ))}

            <tr className="border-t border-border font-semibold">
              <td className="py-3">Total</td>
              <td className="py-3 text-right font-mono">
                {formatCurrency(totalOrcado)}
              </td>
              <td className="py-3 text-right font-mono">
                {formatCurrency(totalReal)}
              </td>
              <td className={`py-3 text-right font-mono ${getDiferencaClass(totalDiferenca)}`}>
                {formatCurrency(totalDiferenca)}
              </td>
              <td className="py-3 text-right font-mono">
                {totalExecucao.toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-tight font-bold">Relatórios</h1>
            <p className="text-muted-foreground text-sm mt-1">.............................</p>
          </div>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map((anoItem) => (
                <SelectItem key={anoItem} value={anoItem}>
                  {anoItem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FadeIn>
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>A carregar...</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <GraficoDespesas data={chartData} />
              <DetalheDespesas data={detalheDespesas} />
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Comparação Orçamento vs Real</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>A carregar...</p>
          ) : (
            <TabelaComparativo data={comparativoDespesas} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
