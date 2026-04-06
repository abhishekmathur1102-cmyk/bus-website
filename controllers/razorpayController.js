const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

module.exports = {
    createOrder: async (req, res) => {
        try {
            const { amount, currency = 'INR', receipt, customerDetails, busDetails } = req.body;
            
            const order = await razorpay.orders.create({
                amount: amount * 100, // Convert to paise
                currency,
                receipt,
                payment_capture: 1
            });

            // Save order to database
            const newOrder = new Order({
                razorpayOrderId: order.id,
                amount,
                currency,
                receipt,
                customerDetails,
                busDetails,
                status: 'created'
            });

            await newOrder.save();

            res.json({
                success: true,
                order: {
                    id: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    receipt: order.receipt
                },
                key_id: process.env.RAZORPAY_KEY_ID
            });
        } catch (error) {
            console.error('Error creating Razorpay order:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    },

    verifyPayment: async (req, res) => {
        try {
            const { paymentId, orderId, signature } = req.body;
            
            const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
            hmac.update(orderId + "|" + paymentId);
            const generatedSignature = hmac.digest('hex');

            if (generatedSignature === signature) {
                // Update order in database
                await Order.findOneAndUpdate(
                    { razorpayOrderId: orderId },
                    { 
                        razorpayPaymentId: paymentId,
                        razorpaySignature: signature,
                        status: 'paid'
                    }
                );

                res.json({ 
                    success: true,
                    message: 'Payment verified successfully',
                    status: 'success'
                });
            } else {
                await Order.findOneAndUpdate(
                    { razorpayOrderId: orderId },
                    { status: 'failed' }
                );

                res.json({ 
                    success: false,
                    message: 'Payment verification failed',
                    status: 'failure'
                });
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    },

    getOrderStatus: async (req, res) => {
        try {
            const { orderId } = req.params;
            const order = await Order.findOne({ razorpayOrderId: orderId });
            
            if (!order) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Order not found' 
                });
            }

            res.json({
                success: true,
                order: {
                    id: order.razorpayOrderId,
                    amount: order.amount,
                    currency: order.currency,
                    status: order.status,
                    customerDetails: order.customerDetails,
                    busDetails: order.busDetails,
                    createdAt: order.createdAt
                }
            });
        } catch (error) {
            console.error('Error fetching order status:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }
};
