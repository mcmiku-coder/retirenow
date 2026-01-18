import re

# Read the file
with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add addCost function after deleteFutureInflow
add_cost_function = '''
  const addCost = () => {
    const newId = Date.now();
    const newCost = {
      id: newId,
      name: language === 'fr' ? 'Nouvelle sortie' : 'New outflow',
      amount: '',
      adjustedAmount: '',
      frequency: 'Monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: deathDate || '',
      locked: false
    };
    setCosts([...costs, newCost]);
  };
'''

# Find the position after deleteFutureInflow function
pattern1 = r'(const deleteFutureInflow = \(id\) => \{[^}]+\};\s*)'
content = re.sub(pattern1, r'\1' + add_cost_function + '\n', content)

# 2. Add style prop to costs Input for color coding
# Find the costs adjusted value Input and add style prop
pattern2 = r'(<Input\s+data-testid=\{`cost-adjusted-\$\{index\}`\}\s+type="number"\s+value=\{cost\.adjustedAmount\}\s+onChange=\{[^}]+\}\s+className="max-w-\[150px\] ml-auto")'
replacement2 = r'\1\n                              style={{\n                                backgroundColor: parseFloat(cost.adjustedAmount) < parseFloat(cost.amount) ? \'rgba(34, 197, 94, 0.1)\' : parseFloat(cost.adjustedAmount) > parseFloat(cost.amount) ? \'rgba(239, 68, 68, 0.1)\' : \'transparent\'\n                              }}'

content = re.sub(pattern2, replacement2, content)

# 3. Add "+ add periodic outflow" button before "Reset to defaults" in costs section
pattern3 = r'(<div className="mt-4">\s*<Button\s+onClick=\{resetCostsToDefaults\})'
replacement3 = r'<div className="mt-4 flex gap-2">\n                <Button\n                  onClick={addCost}\n                  variant="outline"\n                  size="sm"\n                  className="flex items-center gap-2"\n                >\n                  <Plus className="h-4 w-4" />\n                  {language === \'fr\' ? \'+ ajouter une sortie périodique\' : \'+ add periodic outflow\'}\n                </Button>\n                <Button\n                  onClick={resetCostsToDefaults}'

content = re.sub(pattern3, replacement3, content)

# Write the modified content back
with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File updated successfully!")
