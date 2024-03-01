const mongoose = require('mongoose');

// Define the item schema
const itemSchema = new mongoose.Schema({
    itemId: String,
    pictures: [String],
    names: [{ locale: String, name: String }],
    descriptions: [{ locale: String, description: String }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date }
});

// Define the portfolio schema
const portfolioSchema = new mongoose.Schema({
    city: { type: String, required: true },
    items: [itemSchema] // Use itemSchema here instead of ItemSchema
});

// Create the Portfolio model
const Portfolio = mongoose.model('Portfolio', portfolioSchema);

module.exports = Portfolio;
