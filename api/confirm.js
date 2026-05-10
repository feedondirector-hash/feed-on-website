const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;

module.exports = async (req, res) => {
    const { orderId, paymentKey, amount } = req.query;

    if (!orderId || !paymentKey || !amount) {
        return res.redirect('/?payment=fail&reason=missing_params');
    }

    try {
        const confirmResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(TOSS_SECRET_KEY + ':').toString('base64'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId, paymentKey, amount: parseInt(amount) })
        });

        const paymentResult = await confirmResponse.json();

        if (!confirmResponse.ok) {
            console.error('결제 승인 실패:', paymentResult);
            return res.redirect(`/?payment=fail&reason=${encodeURIComponent(paymentResult.code || 'confirm_failed')}`);
        }

        return res.redirect(`/?payment=success&orderId=${orderId}&amount=${paymentResult.totalAmount}`);

    } catch (error) {
        console.error('결제 처리 오류:', error);
        return res.redirect('/?payment=fail&reason=server_error');
    }
};
