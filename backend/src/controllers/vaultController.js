const Vault = require('../models/Vault');
const { encrypt, decrypt } = require('../utils/encryptionUtils');

exports.createVaultEntry = async (req, res) => {
  try {
    const { title, category, content, description } = req.body;
    
    const encryptedContent = encrypt(content);
    
    const entry = await Vault.create({
      title,
      category,
      content: encryptedContent,
      description,
      createdBy: req.user.id
    });
    
    res.status(201).json({ message: 'Entry secured in vault', id: entry._id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to secure entry' });
  }
};

exports.getVaultEntries = async (req, res) => {
  try {
    const entries = await Vault.find().sort({ createdAt: -1 });
    
    // Decrypt content for response (only admin sees this anyway)
    const decryptedEntries = entries.map(entry => ({
      ...entry._doc,
      content: decrypt(entry.content)
    }));
    
    res.json(decryptedEntries);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch vault' });
  }
};

exports.deleteVaultEntry = async (req, res) => {
  try {
    await Vault.findByIdAndDelete(req.params.id);
    res.json({ message: 'Entry purged from vault' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete entry' });
  }
};
