import re

# Read the file
with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the desiredOutflows map section again
map_index = content.find('desiredOutflows.map')
if map_index == -1:
    print("Could not find desiredOutflows.map")
    exit(1)

pre_map_content = content[:map_index]
map_content = content[map_index:]

# Fix string literals in the debts section
map_content = map_content.replace("'availabilityType'", "'madeAvailableType'")
map_content = map_content.replace("'availabilityTimeframe'", "'madeAvailableTimeframe'")
map_content = map_content.replace("'availabilityDate'", "'madeAvailableDate'")

# Recombine
new_content = pre_map_content + map_content

with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Fixed field name strings in Debts table!")
