import re

# Read the file
with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace ALL instances of \' with '
content = content.replace("\\'", "'")

# Write the modified content back
with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed all escaped quotes!")
