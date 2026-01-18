import re

file_path = 'd:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Debug: verify content has the error
pattern_error = "value={debt.madeAvailableType"
first_idx = content.find(pattern_error)
if first_idx == -1:
    print(f"Error pattern '{pattern_error}' NOT FOUND in file!")
    # Maybe check for 'updateDebt(debt.id'
    check2 = content.find("updateDebt(debt.id")
    print(f"Pattern 'updateDebt(debt.id' found at: {check2}")
    
    # Dump a chunk around the Assets table to see what's there
    map_idx = content.find("currentAssets.map")
    print(f"currentAssets.map found at: {map_idx}")
    if map_idx != -1:
        print("Snippet after currentAssets.map:")
        print(content[map_idx:map_idx+500])
    exit(1)

print(f"Found error pattern at index: {first_idx}")

# Verify it is inside Assets table (before desiredOutflows.map)
debts_map_idx = content.find("desiredOutflows.map")
if debts_map_idx != -1 and first_idx > debts_map_idx:
    print("WARNING: The found occurrence is AFTER desiredOutflows.map. This might be the valid one in Debts table!")
    print("Searching for an earlier one...")
    # This implies the Assets table doesn't have it?
    pass
else:
    print("Confirmed: Error is before desiredOutflows.map (inside Assets table).")

    # Determine the block to fix
    # We want to search/replace in the chunk between currentAssets.map and desiredOutflows.map
    start_chunk = content.rfind("currentAssets.map", 0, first_idx)
    end_chunk = debts_map_idx
    
    if start_chunk == -1:
        print("Could not find start of Assets map.")
        exit(1)
        
    chunk = content[start_chunk:end_chunk]
    
    # Perform replacements in this chunk
    # 1. Variable references
    chunk = chunk.replace("debt.id", "asset.id")
    
    # 2. Function calls
    chunk = chunk.replace("updateDebt", "updateAsset")
    
    # 3. Field names (variable access)
    chunk = chunk.replace("debt.madeAvailableType", "asset.availabilityType")
    chunk = chunk.replace("debt.madeAvailableTimeframe", "asset.availabilityTimeframe")
    chunk = chunk.replace("debt.madeAvailableDate", "asset.availabilityDate")
    
    # 4. Field name string literals
    chunk = chunk.replace("'madeAvailableType'", "'availabilityType'")
    chunk = chunk.replace("'madeAvailableTimeframe'", "'availabilityTimeframe'")
    chunk = chunk.replace("'madeAvailableDate'", "'availabilityDate'")

    # Apply changes
    new_content = content[:start_chunk] + chunk + content[end_chunk:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print("Successfully replaced content in Assets table.")
