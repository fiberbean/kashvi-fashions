/**
 * Kashvi Fashions - KPI Cards Module
 * Handles dynamic data rendering and metric formatting
 */

const kpiData = {
  todaySales: { label: "Today's Sales", value: "₹ 48,250", change: "+14.2%", trend: "up", note: "vs yesterday", icon: "💵", color: "rgba(0, 168, 107, 0.15)" },
  revenueMtd: { label: "Total Revenue MTD", value: "₹ 6,85,400", change: "72%", trend: "neutral", note: "Monthly Target", icon: "📈", color: "rgba(197, 160, 89, 0.2)" },
  totalOrders: { label: "Total Orders", value: "28", change: "+4 Orders", trend: "up", note: "6 Pending dispatch", icon: "📦", color: "rgba(37, 99, 235, 0.15)" },
  avgOrderValue: { label: "Average Order Value", value: "₹ 1,723", change: "+2.1%", trend: "up", note: "Healthy basket", icon: "🏷️", color: "rgba(125, 0, 34, 0.15)" },
  newCustomers: { label: "New Customers", value: "19", change: "+6", trend: "up", note: "New registrations", icon: "👥", color: "rgba(0, 168, 107, 0.15)" },
  conversionRate: { label: "Conversion Rate", value: "3.64%", change: "+0.4%", trend: "up", note: "Traffic: 780 visits", icon: "🎯", color: "rgba(245, 158, 11, 0.15)" },
  cartAbandonment: { label: "Cart Abandonment", value: "38.2%", change: "-2.1%", trend: "up", note: "11 Abandoned carts", icon: "🛒", color: "rgba(234, 57, 67, 0.15)" },
  refundRate: { label: "Refund Rate", value: "1.2%", change: "Low Risk", trend: "neutral", note: "1 Return request", icon: "↩️", color: "rgba(110, 120, 143, 0.15)" }
};

export function renderKpiCards(containerId = "kpiGridContainer") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = Object.values(kpiData).map(item => `
    <div class="glass-panel kpi-card">
      <div class="kpi-top">
        <span class="kpi-title">${item.label}</span>
        <div class="kpi-icon" style="background: ${item.color};">${item.icon}</div>
      </div>
      <div class="kpi-value">${item.value}</div>
      <div class="kpi-footer">
        <span class="badge-${item.trend === 'up' ? 'up' : item.trend === 'down' ? 'down' : 'neutral'}">${item.change}</span>
        <span class="kpi-subtext">${item.note}</span>
      </div>
    </div>
  `).join('');
}