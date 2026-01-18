import re

# Read the file
with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Target the specific block in Debts table
# It is inside desiredOutflows.map((debt) => { ... })
# We look for the block that uses 'asset' incorrectly

# We can match the render block starting from the Select for availabilityType which uses `asset`
pattern = r'(<Select\s+value=\{asset\.availabilityType \|\| \(asset\.availabilityTimeframe \? \'Period\' : \'Date\'\)\}\s+onValueChange=\{\(value\) => updateAsset\(asset\.id, \'availabilityType\', value\)\}\s+>[\s\S]*?</Select>\s*</div>\s*</td>)'

# Wait, the previous replacement might have removed the <div ...>. 
# Let's look at the file view again.
# Lines 1647-1659:
# <td className="p-3">
#   <Select
#     value={asset.availabilityType || (asset.availabilityTimeframe ? 'Period' : 'Date')}
#     onValueChange={(value) => updateAsset(asset.id, 'availabilityType', value)}
#   >
#   ...
#   </Select>
# </td>
# <td className="p-3">
#   {(asset.availabilityType === 'Period' || (!asset.availabilityType && asset.availabilityTimeframe)) ? (
#     <Select ... updateAsset ... availabilityTimeframe ... >
#   ) : (
#     <Input ... updateAsset ... availabilityDate ... />
#   )}
# </td>

# I need to match this WHOLE block and replace it with debt equivalent.
# Since there are TWO occurrences of this block (one in Assets, one in Debts incorrectly), 
# I need to be careful to only replace the second one (Debts).
# OR replace based on context.

# The Assets one is inside `currentAssets.map(...)`
# The Debts one is inside `desiredOutflows.map(...)`

# Let's try to find the index of `desiredOutflows.map` and replace after that.

map_index = content.find('desiredOutflows.map')
if map_index == -1:
    print("Could not find desiredOutflows.map")
    exit(1)

# Get the content after the map
post_map_content = content[map_index:]

# Define the incorrect asset block pattern
incorrect_block = r'''<td className="p-3">
                            <Select
                              value={asset.availabilityType || \(asset.availabilityTimeframe \? 'Period' : 'Date'\)}
                              onValueChange={\(value\) => updateAsset\(asset.id, 'availabilityType', value\)}
                            >
                              <SelectTrigger className="max-w-\[120px\]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Date">\{language === 'fr' \? 'Date' : 'Date'\}</SelectItem>
                                <SelectItem value="Period">\{language === 'fr' \? 'Période' : 'Period'\}</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3">
                            \{\(asset.availabilityType === 'Period' \|\| \(!asset.availabilityType && asset.availabilityTimeframe\)\) \? \(
                              <Select
                                value={asset.availabilityTimeframe || 'Select'}
                                onValueChange={\(value\) => updateAsset\(asset.id, 'availabilityTimeframe', value === 'Select' \? '' : value\)}
                              >
                                <SelectTrigger className="max-w-\[150px\]">
                                  <SelectValue placeholder={language === 'fr' \? 'Sélectionner' : 'Select'} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Select">\{language === 'fr' \? 'Sélectionner' : 'Select'\}</SelectItem>
                                  <SelectItem value="within_20_to_25y">\{language === 'fr' \? 'dans 20 à 25 ans' : 'within 20 to 25y'\}</SelectItem>
                                  <SelectItem value="within_15_to_20y">\{language === 'fr' \? 'dans 15 à 20 ans' : 'within 15 to 20y'\}</SelectItem>
                                  <SelectItem value="within_10_to_15y">\{language === 'fr' \? 'dans 10 à 15 ans' : 'within 10 to 15y'\}</SelectItem>
                                  <SelectItem value="within_5_to_10y">\{language === 'fr' \? 'dans 5 à 10 ans' : 'within 5 to 10y'\}</SelectItem>
                                </SelectContent>
                              </Select>
                            \) : \(
                              <Input
                                type="date"
                                value={asset.availabilityDate || ''}
                                onChange={\(e\) => updateAsset\(asset.id, 'availabilityDate', e.target.value\)}
                                className="max-w-\[140px\]"
                              />
                            \)\}
                          </td>'''

# Construct the correct debt block
correct_block = r'''<td className="p-3">
                            <Select
                              value={debt.madeAvailableType || (debt.madeAvailableTimeframe ? 'Period' : 'Date')}
                              onValueChange={(value) => updateDebt(debt.id, 'madeAvailableType', value)}
                            >
                              <SelectTrigger className="max-w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Date">{language === 'fr' ? 'Date' : 'Date'}</SelectItem>
                                <SelectItem value="Period">{language === 'fr' ? 'Période' : 'Period'}</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3">
                            {(debt.madeAvailableType === 'Period' || (!debt.madeAvailableType && debt.madeAvailableTimeframe)) ? (
                              <Select
                                value={debt.madeAvailableTimeframe || 'Select'}
                                onValueChange={(value) => updateDebt(debt.id, 'madeAvailableTimeframe', value === 'Select' ? '' : value)}
                              >
                                <SelectTrigger className="max-w-[150px]">
                                  <SelectValue placeholder={language === 'fr' ? 'Sélectionner' : 'Select'} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Select">{language === 'fr' ? 'Sélectionner' : 'Select'}</SelectItem>
                                  <SelectItem value="within_20_to_25y">{language === 'fr' ? 'dans 20 à 25 ans' : 'within 20 to 25y'}</SelectItem>
                                  <SelectItem value="within_15_to_20y">{language === 'fr' ? 'dans 15 à 20 ans' : 'within 15 to 20y'}</SelectItem>
                                  <SelectItem value="within_10_to_15y">{language === 'fr' ? 'dans 10 à 15 ans' : 'within 10 to 15y'}</SelectItem>
                                  <SelectItem value="within_5_to_10y">{language === 'fr' ? 'dans 5 à 10 ans' : 'within 5 to 10y'}</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type="date"
                                value={debt.madeAvailableDate || ''}
                                onChange={(e) => updateDebt(debt.id, 'madeAvailableDate', e.target.value)}
                                className="max-w-[140px]"
                              />
                            )}
                          </td>'''

# Perform replacement ONLY in the second half of the file (safest bet) or using regex on the substring
# The whitespace in regex is tricky.

# Simpler approach: 
# The incorrect block uses `asset.` and `updateAsset`.
# The correct block should use `debt.` and `updateDebt`.
# But they look identical in structure.

# Let's replace `asset.` with `debt.` and `updateAsset` with `updateDebt` and the field names
# BUT ONLY inside the `desiredOutflows.map` section.

# 1. Extract the part of content starting from `desiredOutflows.map`
pre_map_content = content[:map_index]
map_content = content[map_index:]

# 2. In `map_content`, replace the incorrect usages.
# I need to match exactly the availability part to avoid replacing other things (though there shouldn't be 'asset' usages in debt section)

# Let's verify if there are valid `asset` usages in debt section. Unlikely.
# So I can just replace `asset.` -> `debt.` and `updateAsset` -> `updateDebt` 
# AND `availabilityType` -> `madeAvailableType` etc.

# Replacements in map_content:
map_content = map_content.replace('asset.availabilityType', 'debt.madeAvailableType')
map_content = map_content.replace('asset.availabilityTimeframe', 'debt.madeAvailableTimeframe')
map_content = map_content.replace('asset.availabilityDate', 'debt.madeAvailableDate')
map_content = map_content.replace('asset.id', 'debt.id')
map_content = map_content.replace('updateAsset', 'updateDebt')

# Recombine
new_content = pre_map_content + map_content

with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Fixed asset reference in Debts table!")
