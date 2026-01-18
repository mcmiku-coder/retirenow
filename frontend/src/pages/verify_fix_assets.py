import re

file_path = 'd:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = 'currentAssets.map'
end_marker = 'desiredOutflows.map'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not locate sections.")
    exit(1)

pre_assets = content[:start_idx]
assets_section = content[start_idx:end_idx]
post_assets = content[end_idx:]

print(f"Analyzing Assets section ({len(assets_section)} chars)...")

# Count occurrences before
print("Occurrences of 'debt.id':", assets_section.count('debt.id'))
print("Occurrences of 'updateDebt':", assets_section.count('updateDebt'))
print("Occurrences of 'madeAvailableType':", assets_section.count('madeAvailableType'))

# Perform replacements
# 1. Update function calls
assets_section = assets_section.replace('updateDebt', 'updateAsset')

# 2. Update variable references
assets_section = assets_section.replace('debt.id', 'asset.id')
assets_section = assets_section.replace('debt.madeAvailableType', 'asset.availabilityType')
assets_section = assets_section.replace('debt.madeAvailableTimeframe', 'asset.availabilityTimeframe')
assets_section = assets_section.replace('debt.madeAvailableDate', 'asset.availabilityDate')

# 3. Update field name strings
assets_section = assets_section.replace("'madeAvailableType'", "'availabilityType'")
assets_section = assets_section.replace("'madeAvailableTimeframe'", "'availabilityTimeframe'")
assets_section = assets_section.replace("'madeAvailableDate'", "'availabilityDate'")

# Count occurrences after
print("Occurrences of 'debt.id' after:", assets_section.count('debt.id'))
print("Occurrences of 'updateDebt' after:", assets_section.count('updateDebt'))

# Verify we didn't miss specific patterns
if "debt." in assets_section:
    print("WARNING: 'debt.' still found in Assets section!")
    # Print context
    idx = assets_section.find("debt.")
    print("Context:", assets_section[idx-20:idx+20])
    
    # Try generic replacement for remaining cases if safe?
    # assets_section = assets_section.replace('debt.', 'asset.')
    pass

new_content = pre_assets + assets_section + post_assets

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Finished processing Assets table.")
