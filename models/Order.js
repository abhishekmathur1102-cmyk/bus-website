const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true
    },
    razorpayPaymentId: {
        type: String,
        default: null
    },
    razorpaySignature: {
        type: String,
        default: null
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    receipt: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['created', 'paid', 'failed'],
        default: 'created'
    },
    customerDetails: {
        name: String,
        email: String,
        phone: String
    },
    busDetails: {
        busNumber: String,
        route: String,
        departureTime: Date,
        arrivalTime: Date,
        seats: [String]
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// OrderSchema.pre('save', function() {
//     this.updatedAt = Date.now();
// });

module.exports = mongoose.model('Order', OrderSchema);
