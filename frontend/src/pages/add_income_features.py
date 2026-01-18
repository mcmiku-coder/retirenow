import re

# Read the file
with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add addIncome function after addCost function
add_income_function = '''
  const addIncome = () => {
    const newId = Date.now();
    const newIncome = {
      id: newId,
      name: language === 'fr' ? 'Nouveau revenu' : 'New income',
      amount: '',
      adjustedAmount: '',
      frequency: 'Monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: deathDate || '',
      locked: false
    };
    setIncomes([...incomes, newIncome]);
  };
'''

# Find the position after addCost function
pattern1 = r'(const addCost = \(\) => \{[^}]+\};\s+setCosts\(\[\.\.\.costs, newCost\]\);\s+\};)'
content = re.sub(pattern1, r'\1' + add_income_function, content)

# 2. Add style prop to income Input for color coding
# Find the income adjusted value Input and add style prop
pattern2 = r'(<Input\s+data-testid=\{`income-adjusted-\$\{index\}`\}\s+type="number"\s+value=\{income\.adjustedAmount\}\s+onChange=\{[^}]+\}\s+className="max-w-\[150px\] ml-auto")'
replacement2 = r'\1\n                              style={{\n                                backgroundColor: parseFloat(income.adjustedAmount) < parseFloat(income.amount) ? \'rgba(34, 197, 94, 0.1)\' : parseFloat(income.adjustedAmount) > parseFloat(income.amount) ? \'rgba(239, 68, 68, 0.1)\' : \'transparent\'\n                              }}'

content = re.sub(pattern2, replacement2, content)

# 3. Add "+ add periodic inflow" button before "Reset to defaults" in income section
pattern3 = r'(<div className="mt-4">\s*<Button\s+onClick=\{resetIncomesToDefaults\})'
replacement3 = r'<div className="mt-4 flex gap-2">\n                <Button\n                  onClick={addIncome}\n                  variant="outline"\n                  size="sm"\n                  className="flex items-center gap-2"\n                >\n                  <Plus className="h-4 w-4" />\n                  {language === \'fr\' ? \'+ ajouter un revenu périodique\' : \'+ add periodic inflow\'}\n                </Button>\n                <Button\n                  onClick={resetIncomesToDefaults}'

content = re.sub(pattern3, replacement3, content)

# Write the modified content back
with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added income enhancements successfully!")
