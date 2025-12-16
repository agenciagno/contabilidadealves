import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface CategoryPieChartProps {
  data: CategoryData[];
  title: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null; // Don't show labels for small slices
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      className="text-xs font-medium"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.color }}
          />
          <span className="font-medium text-foreground">{data.name}</span>
        </div>
        <p className="text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
      </div>
    );
  }
  return null;
};

export function CategoryPieChart({ data, title }: CategoryPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (data.length === 0) {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Sem dados para exibir
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="h-[200px] w-full lg:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Category list */}
          <div className="w-full lg:w-1/2 space-y-2 max-h-[200px] overflow-y-auto">
            {data.slice(0, 6).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
                  <span className="text-xs text-muted-foreground">
                    ({((item.value / total) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
            {data.length > 6 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{data.length - 6} categorias
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
