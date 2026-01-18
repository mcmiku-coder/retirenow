import re

file_path = 'd:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"File size: {len(content)}")

idx_assets = content.find("currentAssets.map")
idx_debts = content.find("desiredOutflows.map")

print(f"currentAssets.map index: {idx_assets}")
print(f"desiredOutflows.map index: {idx_debts}")

# Find all occurrences of updateDebt
print("\nOccurrences of 'updateDebt':")
count = 0
start = 0
while True:
    idx = content.find("updateDebt", start)
    if idx == -1:
        break
    
    # Determine which section it is in
    section = "UNKNOWN"
    if idx < idx_assets:
        section = "BEFORE ASSETS"
    elif idx < idx_debts:
        section = "INSIDE ASSETS (POTENTIAL BUG)"
    else:
        section = "INSIDE DEBTS (OK)"
        
    print(f"  - Found at {idx} [{section}]")
    
    # Print context
    context = content[idx-20:idx+40].replace('\n', ' ')
    print(f"    Context: ...{context}...")
    
    start = idx + 1
    count += 1

print(f"Total 'updateDebt' found: {count}")

# Find all occurrences of debt.something
print("\nOccurrences of 'debt.':")
start = 0
while True:
    idx = content.find("debt.", start)
    if idx == -1:
        break
        
    section = "UNKNOWN"
    if idx < idx_assets:
        section = "BEFORE ASSETS"
    elif idx < idx_debts:
        section = "INSIDE ASSETS (POTENTIAL BUG)"
    else:
        section = "INSIDE DEBTS (OK)"
        
    print(f"  - Found at {idx} [{section}]")
    start = idx + 1
