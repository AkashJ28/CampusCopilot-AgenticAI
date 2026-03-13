import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from scipy.stats import linregress

# Set professional aesthetics
sns.set_theme(style="whitegrid", palette="viridis")
plt.rcParams.update({'font.size': 12, 'figure.dpi': 300})

# Load dataset
df = pd.read_csv('final_research_results_v3.csv')

# Step 1: Data Preparation
def map_category(query_id):
    if 1 <= query_id <= 10: return "Identity Retrieval"
    elif 11 <= query_id <= 20: return "Academic Performance"
    elif 21 <= query_id <= 30: return "Temporal Logic"
    elif 31 <= query_id <= 40: return "Constraint Reasoning"
    elif 41 <= query_id <= 50: return "Relational Joins"
    elif 51 <= query_id <= 60: return "Security (Unauthorized)"
    elif 61 <= query_id <= 70: return "Security (Escalation)"
    elif 71 <= query_id <= 80: return "Vague/Edge-Case"
    elif 81 <= query_id <= 90: return "Agentic Loops"
    elif 91 <= query_id <= 104: return "System Telemetry"
    else: return "Unknown"

df['Category'] = df['Query_ID'].apply(map_category)

insights = {}

# 1. Tier Distribution
plt.figure(figsize=(8, 8))
tier_counts = df['Actual_Tier'].value_counts()
plt.pie(tier_counts, labels=[t.capitalize() for t in tier_counts.index], 
        autopct='%1.1f%%', startangle=140, colors=sns.color_palette("viridis", 2),
        wedgeprops={'edgecolor': 'white', 'linewidth': 2})
plt.title('Routing Distribution: Edge vs. Cloud', fontsize=16, fontweight='bold', pad=20)
plt.savefig('tier_distribution_advanced.png', bbox_inches='tight')
plt.close()

# 2. Latency Analysis
plt.figure(figsize=(12, 6))
latency_by_cat = df.groupby('Category')['Latency_sec'].mean().sort_values(ascending=False)
ax = sns.barplot(x=latency_by_cat.values, y=latency_by_cat.index, hue=latency_by_cat.index, palette="viridis", legend=False)
plt.xlabel('Average Latency (Seconds)', fontweight='bold')
plt.ylabel('Query Category', fontweight='bold')
plt.title('Average Latency per Category', fontsize=16, fontweight='bold', pad=20)
for p in ax.patches:
    ax.annotate(f"{p.get_width():.2f}s", (p.get_width() + 0.1, p.get_y() + p.get_height() / 2.),
                va='center', fontsize=10)
plt.savefig('latency_analysis_advanced.png', bbox_inches='tight')
plt.close()

# 3. Intelligence Frontier
plt.figure(figsize=(10, 6))
sns.scatterplot(data=df, x='Token_Count', y='Recursive_Steps', hue='Actual_Tier', 
                size='Latency_sec', sizes=(50, 400), alpha=0.7, palette="viridis", edgecolor="w")
plt.xlabel('Token Count', fontweight='bold')
plt.ylabel('Recursive Steps', fontweight='bold')
plt.title('Intelligence Frontier: Token Count vs. Recursive Steps', fontsize=16, fontweight='bold', pad=20)
plt.legend(title='Computed By', bbox_to_anchor=(1.05, 1), loc='upper left')
plt.grid(True, linestyle='--', alpha=0.6)
plt.savefig('intelligence_frontier_advanced.png', bbox_inches='tight')
plt.close()

# 4. Security Grounding Success
plt.figure(figsize=(12, 6))
security_cats = ["Security (Unauthorized)", "Security (Escalation)"]
sec_df = df[df['Category'].isin(security_cats)]
security_counts = sec_df.groupby(['Category', 'Grounding_Status']).size().unstack(fill_value=0)
for col in ['BLOCKED', 'VERIFIED', 'VIOLATED']:
    if col not in security_counts.columns:
        security_counts[col] = 0
security_counts = security_counts[['BLOCKED', 'VERIFIED', 'VIOLATED']]
security_counts.plot(kind='bar', stacked=True, color=['#2ca02c', '#1f77b4', '#d62728'], figsize=(10, 6), edgecolor='white')
plt.xlabel('Security Categories', fontweight='bold')
plt.ylabel('Number of Queries', fontweight='bold')
plt.title('Security Grounding Success Rate (100% Block Rate)', fontsize=16, fontweight='bold', pad=20)
plt.xticks(rotation=0)
plt.legend(title='Grounding Status', bbox_to_anchor=(1.05, 1), loc='upper left')
plt.savefig('security_grounding_advanced.png', bbox_inches='tight')
plt.close()

# 5. Edge Stability
plt.figure(figsize=(12, 5))
plt.plot(df.index + 1, df['Memory_Usage_MB'], marker='o', linestyle='-', color='#3b528b', markersize=4, alpha=0.8)
plt.axhline(y=df['Memory_Usage_MB'].mean(), color='r', linestyle='--', label=f"Average: {df['Memory_Usage_MB'].mean():.1f} MB")
plt.xlabel('Query Sequence', fontweight='bold')
plt.ylabel('Memory Usage (MB)', fontweight='bold')
plt.title('Edge Stability: Memory Footprint over Time', fontsize=16, fontweight='bold', pad=20)
plt.grid(True, linestyle=':', alpha=0.7)
plt.legend()
plt.savefig('edge_stability_advanced.png', bbox_inches='tight')
plt.close()

# 6. Offloading ROI (Graphic)
plt.figure(figsize=(8, 5))
total_savings = df['Savings_usd'].sum()
num_queries = len(df)
projected_savings = (total_savings / num_queries) * 200000 
insights['Offloading ROI'] = f"Total Savings: ${total_savings:.2f}. Projected savings for a campus of 20,000 students is ${projected_savings:.2f}."
plt.bar(['100 Benchmark Queries', 'Projected (20k Students)'], [total_savings, projected_savings], color=['#2ca02c', '#1f77b4'])
plt.ylabel('Savings (USD)', fontweight='bold')
plt.title('Offloading ROI: Local Edge Savings', fontsize=16, fontweight='bold', pad=20)
plt.yscale('log')
for i, v in enumerate([total_savings, projected_savings]):
    plt.text(i, v, f"${v:.2f}", ha='center', va='bottom', fontweight='bold')
plt.savefig('offloading_roi_advanced.png', bbox_inches='tight')
plt.close()

# 7. Router Sensitivity
plt.figure(figsize=(10, 6))
sns.kdeplot(data=df, x='Token_Count', hue='Actual_Tier', fill=True, common_norm=False, palette="viridis", alpha=0.5)
plt.xlabel('Token Count', fontweight='bold')
plt.title('Router Sensitivity: Token Count Distribution by Tier', fontsize=16, fontweight='bold', pad=20)
cloud_df = df[df['Actual_Tier'] == 'cloud']
threshold = cloud_df['Token_Count'].min() if not cloud_df.empty else df['Token_Count'].mean()
plt.axvline(x=threshold, color='red', linestyle='--', label=f'Escalation Threshold: ~{threshold:.0f} Tokens')
plt.legend()
plt.savefig('router_sensitivity_advanced.png', bbox_inches='tight')
plt.close()

insights['Router Sensitivity'] = f"The Complexity Threshold (where escalation to cloud begins) is {threshold:.0f} tokens."

# 8. Agentic Efficiency (Regression Plot)
plt.figure(figsize=(10, 6))
sns.regplot(data=df, x='Recursive_Steps', y='Latency_sec', scatter_kws={'alpha':0.6}, line_kws={'color':'red'})
plt.xlabel('Recursive Steps', fontweight='bold')
plt.ylabel('Latency (Seconds)', fontweight='bold')
plt.title('Agentic Efficiency: Reasoning Steps vs. Latency', fontsize=16, fontweight='bold', pad=20)
plt.savefig('agentic_efficiency_advanced.png', bbox_inches='tight')
plt.close()

slope, intercept, r_value, p_value, std_err = linregress(df['Recursive_Steps'], df['Latency_sec'])
insights['Agentic Efficiency'] = f"The Overhead per Reasoning Step is calculated at {slope:.2f} seconds."

# 9. Hardware Stress Profile (Comparative Bar)
plt.figure(figsize=(8, 6))
mem_q1 = df['Memory_Usage_MB'].iloc[0]
mem_q104 = df['Memory_Usage_MB'].iloc[-1]
variance_pct = ((mem_q104 - mem_q1) / mem_q1) * 100 if mem_q1 != 0 else 0

plt.bar(['Query 1', f'Query {len(df)}'], [mem_q1, mem_q104], color=['#1f77b4', '#d62728'])
plt.ylabel('Memory Usage (MB)', fontweight='bold')
plt.title('Hardware Stress Profile: Start vs End Memory', fontsize=16, fontweight='bold', pad=20)
plt.ylim(0, max(mem_q1, mem_q104) * 1.2)
for i, v in enumerate([mem_q1, mem_q104]):
    plt.text(i, v + (0.02 * max(mem_q1, mem_q104)), f"{v:.2f} MB", ha='center', va='bottom', fontweight='bold')
plt.savefig('hardware_stress_advanced.png', bbox_inches='tight')
plt.close()

insights['Hardware Stress Profile'] = f"Memory Usage at Query #1 was {mem_q1:.2f} MB, and at Query #{len(df)} was {mem_q104:.2f} MB. The variance is {variance_pct:.2f}%."

print("--- ADVANCED INSIGHTS CALCULATIONS ---")
for k, v in insights.items():
    print(f"[{k}] {v}")
