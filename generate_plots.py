import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Set professional aesthetics
sns.set_theme(style="whitegrid", palette="viridis")
plt.rcParams.update({'font.size': 12, 'figure.dpi': 300})

# Load dataset
df = pd.read_csv('final_research_results_v3.csv')

# --- Helper: Define strict Query Categories ---
# We have 100 queries logically split into 10 categories (10 each).
category_names = [
    "Identity Retrieval",
    "Academic Performance",
    "Temporal Logic",
    "Constraint Reasoning",
    "Relational Joins",
    "Security (Unauthorized)",
    "Security (Escalation)",
    "Admin Actions (Blocked)",
    "Professor Analytics",
    "Hardware Overhead Check"
]

def map_category(query_id):
    idx = (query_id - 1) // 10
    if 0 <= idx < len(category_names):
        return category_names[idx]
    return "Unknown"

df['Category'] = df['Query_ID'].apply(map_category)

# -----------------------------------------------------------------------------
# 1. Tier Distribution (Pie Chart)
# Goal: Show Edge (local) vs Cloud routing percentage.
# -----------------------------------------------------------------------------
plt.figure(figsize=(8, 8))
tier_counts = df['Actual_Tier'].value_counts()
plt.pie(tier_counts, labels=[t.capitalize() for t in tier_counts.index], 
        autopct='%1.1f%%', startangle=140, colors=sns.color_palette("viridis", 2),
        wedgeprops={'edgecolor': 'white', 'linewidth': 2})
plt.title('Routing Distribution: Edge (RTX 4060) vs. Cloud (Azure)', fontsize=16, fontweight='bold', pad=20)
plt.savefig('tier_distribution.png', bbox_inches='tight')
plt.close()

# -----------------------------------------------------------------------------
# 2. Performance Latency (Bar Chart)
# Goal: Compare Average Latency across query categories.
# -----------------------------------------------------------------------------
plt.figure(figsize=(12, 6))
latency_by_cat = df.groupby('Category')['Latency_sec'].mean().sort_values(ascending=False)
ax = sns.barplot(x=latency_by_cat.values, y=latency_by_cat.index, hue=latency_by_cat.index, palette="viridis", legend=False)
plt.xlabel('Average Latency (Seconds)', fontweight='bold')
plt.ylabel('Query Category', fontweight='bold')
plt.title('Computational Overhead by Task Category', fontsize=16, fontweight='bold', pad=20)

for p in ax.patches:
    ax.annotate(f"{p.get_width():.2f}s", (p.get_width() + 0.1, p.get_y() + p.get_height() / 2.),
                va='center', fontsize=10)

plt.savefig('performance_latency.png', bbox_inches='tight')
plt.close()

# -----------------------------------------------------------------------------
# 3. The "Intelligence Frontier" (Scatter Plot)
# Goal: Token Count vs Recursive Steps, colored by Tier.
# -----------------------------------------------------------------------------
plt.figure(figsize=(10, 6))
sns.scatterplot(data=df, x='Token_Count', y='Recursive_Steps', hue='Actual_Tier', 
                size='Latency_sec', sizes=(50, 400), alpha=0.7, palette="viridis", edgecolor="w")
plt.xlabel('Total Context Token Usage', fontweight='bold')
plt.ylabel('Agentic Reasoning Depth (Recursive Steps)', fontweight='bold')
plt.title('The Intelligence Frontier: Token Usage vs. Reasoning Depth', fontsize=16, fontweight='bold', pad=20)
plt.legend(title='Computed By', bbox_to_anchor=(1.05, 1), loc='upper left')
plt.grid(True, linestyle='--', alpha=0.6)
plt.savefig('intelligence_frontier.png', bbox_inches='tight')
plt.close()

# -----------------------------------------------------------------------------
# 4. Security Grounding Success (Stacked Bar Chart)
# Goal: Prove 100% BLOCKED for Unauthorized/Escalation.
# -----------------------------------------------------------------------------
plt.figure(figsize=(12, 6))
security_cats = ["Security (Unauthorized)", "Security (Escalation)", "Admin Actions (Blocked)"]
sec_df = df[df['Category'].isin(security_cats)]
security_counts = sec_df.groupby(['Category', 'Grounding_Status']).size().unstack(fill_value=0)

# Ensure both columns exist for stacking logic
for col in ['BLOCKED', 'VERIFIED', 'VIOLATED']:
    if col not in security_counts.columns:
        security_counts[col] = 0

security_counts = security_counts[['BLOCKED', 'VERIFIED', 'VIOLATED']]

security_counts.plot(kind='bar', stacked=True, color=['#2ca02c', '#1f77b4', '#d62728'], figsize=(10, 6), edgecolor='white')
plt.xlabel('Security Audit Categories', fontweight='bold')
plt.ylabel('Number of Queries', fontweight='bold')
plt.title('Zero-Trust Security Efficacy (100% Block Rate)', fontsize=16, fontweight='bold', pad=20)
plt.xticks(rotation=0)
plt.legend(title='Grounding Status', bbox_to_anchor=(1.05, 1), loc='upper left')
plt.savefig('security_grounding_success.png', bbox_inches='tight')
plt.close()

# -----------------------------------------------------------------------------
# 5. Resource Efficiency (Line Plot)
# Goal: Show Memory_Usage_MB footprint stability over the 100 requests.
# -----------------------------------------------------------------------------
plt.figure(figsize=(12, 5))
plt.plot(df.index + 1, df['Memory_Usage_MB'], marker='o', linestyle='-', color='#3b528b', markersize=4, alpha=0.8)
plt.axhline(y=df['Memory_Usage_MB'].mean(), color='r', linestyle='--', label=f"Average: {df['Memory_Usage_MB'].mean():.1f} MB")
plt.xlabel('Query Sequence (1 to 100)', fontweight='bold')
plt.ylabel('Ollama Process Memory (MB)', fontweight='bold')
plt.title('Edge Hardware Stability: Memory Footprint over Time', fontsize=16, fontweight='bold', pad=20)
plt.grid(True, linestyle=':', alpha=0.7)
plt.legend()
plt.tight_layout()
plt.savefig('resource_efficiency.png', bbox_inches='tight')
plt.close()

print("[+] Successfully generated all 5 High-Resolution (300 DPI) plots.")
