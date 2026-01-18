import re

# Read the file
with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the explicit "One-time" text for 3a with null
# Pattern:
# {income.name === '3a' ? (
#   <span className="text-muted-foreground">{t('scenario.oneTime')}</span>
# ) :

pattern = r'(\{income\.name === \'3a\' \? \(\s*)<span className="text-muted-foreground">\{t\(\'scenario\.oneTime\'\)\}</span>(\s*\) :)'

# Replace with null
replacement = r'\1null\2'

content = re.sub(pattern, replacement, content)

# Write the modified content back
with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated 3a End Date visibility successfully!")
