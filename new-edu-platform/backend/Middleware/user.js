const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    className: {
        type: String,
        required: true
    },

    subject: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["student", "admin"],
        default: "student"
    },

    isActive: {
        type: Boolean,
        default: true
    },

    subscriptionEnd: {
        type: Date,
        default: null
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);