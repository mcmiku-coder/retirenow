import re

# Read the file
with open('d:/AI/retirenow/retirenow/frontend/src/utils/database.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all instances of password parameter with masterKey
content = re.sub(r'\(email, password, data\)', '(email, masterKey, data)', content)
content = re.sub(r'\(email, password\)', '(email, masterKey)', content)

# Replace password references in error messages and logs
content = re.sub(r"'Email and password are required'", "'Email and master key are required'", content)
content = re.sub(r'"Email and password are required"', '"Email and master key are required"', content)
content = re.sub(r'No password provided', 'No master key provided', content)
content = re.sub(r'Missing email or password', 'Missing email or masterKey', content)

# Replace encryption function calls
content = re.sub(r'const salt = generateSalt\(\);', '', content)
content = re.sub(r'await encryptData\(data, password, salt\)', 'await encryptDataWithMasterKey(data, masterKey)', content)
content = re.sub(r'await encryptData\(data, masterKey, salt\)', 'await encryptDataWithMasterKey(data, masterKey)', content)

# Replace decryption function calls - remove salt parameter
content = re.sub(
    r'await decryptData\(\{\s*encryptedData: record\.encryptedData,\s*salt: record\.salt,\s*iv: record\.iv\s*\}, (password|masterKey)\)',
    r'await decryptDataWithMasterKey({\n      encryptedData: record.encryptedData,\n      iv: record.iv\n    }, masterKey)',
    content
)

# Remove salt from put operations
content = re.sub(r',?\s*salt: encrypted\.salt,?', '', content)

# Write back
with open('d:/AI/retirenow/retirenow/frontend/src/utils/database.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Database.js updated successfully!")
